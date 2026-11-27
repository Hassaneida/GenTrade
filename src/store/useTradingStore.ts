import Decimal from 'decimal.js';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  D,
  DEFAULT_USD_KES_RATE,
  INITIAL_CASH_BALANCE,
  INITIAL_LIVE_BALANCE,
  calculateEarlyCashOut,
  calculateOptionPayout,
  formatKes,
  formatPrice,
  formatUsd,
  normalizeMpesaPhone,
} from '../lib/decimal';
import { INSTRUMENTS } from '../lib/instruments';
import { createInitialFallbackTickers } from '../lib/marketData';
import { ACCOUNT_STORAGE_KEY } from '../lib/persistence';
import { playTradeSound } from '../lib/sound';
import type {
  AccountType,
  ChartMode,
  DealHistoryRecord,
  ExpirationSec,
  OptionDeal,
  OptionDirection,
  PaymentMethod,
  RailView,
  SimulatedFlowTick,
  TickerData,
  Timeframe,
  ToastMessage,
  ToastVariant,
  TraderProfile,
  TradingPair,
  WalletTransaction,
} from '../types/trading';

export interface PlaceOptionInput {
  symbol: TradingPair;
  direction: OptionDirection;
  stakeUsd: string;
  durationSec: ExpirationSec;
}

export interface ExecutionResult {
  ok: boolean;
  error?: string;
}

interface TradingState {
  // Dual Account Balances (Demo & Real Live)
  activeAccountType: AccountType;
  demoBalance: string;
  liveBalance: string;
  demoInitialBalance: string;
  liveNetFunded: string;

  openDeals: OptionDeal[];
  dealHistory: DealHistoryRecord[];
  walletTransactions: WalletTransaction[];
  profile: TraderProfile;

  activeSymbol: TradingPair;
  timeframe: Timeframe;
  chartMode: ChartMode;
  selectedDuration: ExpirationSec;
  railView: RailView;
  soundEnabled: boolean;

  demoWinsCount: number;
  demoLossesCount: number;
  liveWinsCount: number;
  liveLossesCount: number;
  demoCompanyProfit: string;
  liveCompanyProfit: string;

  // Live Market & Buy/Sell Simulation State
  tickers: Record<TradingPair, TickerData>;
  usdKesRate: string;
  simulatedFlow: SimulatedFlowTick[];
  buyPressurePct: number;
  connectionMode: 'ws' | 'polling' | 'simulated';
  toasts: ToastMessage[];

  // Actions
  setAccountType: (accountType: AccountType) => void;
  setActiveSymbol: (symbol: TradingPair) => void;
  setTimeframe: (tf: Timeframe) => void;
  setChartMode: (mode: ChartMode) => void;
  setSelectedDuration: (sec: ExpirationSec) => void;
  setRailView: (view: RailView) => void;
  toggleSound: () => void;
  setConnectionMode: (mode: 'ws' | 'polling' | 'simulated') => void;
  setUsdKesRate: (rate: string) => void;

  processTickerUpdate: (
    symbol: TradingPair,
    update: Partial<TickerData> & { price: string }
  ) => void;

  placeOptionDeal: (input: PlaceOptionInput) => ExecutionResult;
  cashOutDealEarly: (dealId: string) => ExecutionResult;
  settleExpiredDeals: () => void;

  depositFunds: (
    amountUsd: string,
    method: PaymentMethod,
    targetAccount?: AccountType,
    accountRef?: string
  ) => ExecutionResult;
  withdrawFunds: (
    amountUsd: string,
    method: PaymentMethod,
    targetAccount?: AccountType,
    accountRef?: string
  ) => ExecutionResult;
  updateProfile: (updates: Partial<TraderProfile>) => void;

  resetDemoAccount: () => void;
  pushToast: (title: string, description: string, variant?: ToastVariant) => void;
  dismissToast: (id: string) => void;
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function generateInitialFlow(symbol: TradingPair, price: string): SimulatedFlowTick[] {
  const now = Date.now();
  const amounts = ['250', '1,200', '500', '2,500', '750', '4,000', '150', '900'];
  return amounts.map((amt, i) => ({
    id: `init_${i}`,
    side: i % 3 === 0 ? 'SELL' : 'BUY',
    price: formatPrice(price, symbol),
    amountUsd: amt,
    timestamp: now - i * 900,
  }));
}

const DEFAULT_PROFILE: TraderProfile = {
  fullName: 'Alex Morgan',
  email: 'trader@experttrade.app',
  handle: '@alexfx',
  country: 'Kenya',
  mpesaPhone: '254712345678',
  accountTier: 'Live Verified',
  joinedAt: Date.now(),
};

export const useTradingStore = create<TradingState>()(
  persist(
    (set, get) => ({
      activeAccountType: 'DEMO',
      demoBalance: INITIAL_CASH_BALANCE,
      liveBalance: INITIAL_LIVE_BALANCE,
      demoInitialBalance: INITIAL_CASH_BALANCE,
      liveNetFunded: INITIAL_LIVE_BALANCE,

      openDeals: [],
      dealHistory: [],
      walletTransactions: [],
      profile: DEFAULT_PROFILE,

      activeSymbol: 'EUR-USD',
      timeframe: '1m',
      chartMode: 'area',
      selectedDuration: 30,
      railView: 'home',
      soundEnabled: true,

      demoWinsCount: 0,
      demoLossesCount: 0,
      liveWinsCount: 0,
      liveLossesCount: 0,
      demoCompanyProfit: '0.00',
      liveCompanyProfit: '0.00',

      tickers: createInitialFallbackTickers(),
      usdKesRate: DEFAULT_USD_KES_RATE,
      simulatedFlow: generateInitialFlow('EUR-USD', INSTRUMENTS['EUR-USD'].fallbackPrice),
      buyPressurePct: 58,
      connectionMode: 'ws',
      toasts: [],

      setAccountType: (accountType) => {
        const current = get().activeAccountType;
        if (current === accountType) return;
        set({ activeAccountType: accountType });
        const bal = accountType === 'LIVE' ? get().liveBalance : get().demoBalance;
        get().pushToast(
          accountType === 'LIVE' ? 'Switched to Live Account' : 'Switched to Demo Account',
          `Active balance: ${formatUsd(bal)}`,
          accountType === 'LIVE' ? 'success' : 'info'
        );
      },

      setActiveSymbol: (symbol) =>
        set((s) => ({
          activeSymbol: symbol,
          simulatedFlow: generateInitialFlow(symbol, s.tickers[symbol].price),
        })),
      setTimeframe: (tf) => set({ timeframe: tf }),
      setChartMode: (mode) => set({ chartMode: mode }),
      setSelectedDuration: (sec) => set({ selectedDuration: sec }),
      setRailView: (view) => set({ railView: view }),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      setConnectionMode: (mode) => set({ connectionMode: mode }),
      setUsdKesRate: (rate) => {
        const d = D(rate);
        if (d.isFinite() && d.gt(50)) {
          set({ usdKesRate: d.toFixed(2) });
        }
      },

      pushToast: (title, description, variant = 'info') => {
        const id = createId('toast');
        set((s) => ({
          toasts: [{ id, title, description, variant, createdAt: Date.now() }, ...s.toasts].slice(
            0,
            4
          ),
        }));
      },

      dismissToast: (id) => {
        set((s) => ({
          toasts: s.toasts.filter((t) => t.id !== id),
        }));
      },

      processTickerUpdate: (symbol, update) => {
        const state = get();
        const prevPrice = D(state.tickers[symbol].price);
        const nextPrice = D(update.price);

        const nextTicker: TickerData = {
          ...state.tickers[symbol],
          ...update,
          symbol,
          updatedAt: update.updatedAt ?? Date.now(),
        };

        if (symbol !== state.activeSymbol) {
          set((s) => ({
            tickers: {
              ...s.tickers,
              [symbol]: nextTicker,
            },
          }));
          return;
        }

        const simSide: 'BUY' | 'SELL' = nextPrice.gt(prevPrice)
          ? 'BUY'
          : nextPrice.lt(prevPrice)
            ? 'SELL'
            : Math.random() >= 0.48
              ? 'BUY'
              : 'SELL';

        const presetAmounts = [100, 250, 500, 750, 1000, 1500, 2500, 5000];
        const randomAmt = presetAmounts[Math.floor(Math.random() * presetAmounts.length)];

        const newTick: SimulatedFlowTick = {
          id: createId('flow'),
          side: simSide,
          price: formatPrice(nextPrice, symbol),
          amountUsd: randomAmt.toLocaleString('en-US'),
          timestamp: Date.now(),
        };

        const nextFlow = [newTick, ...state.simulatedFlow].slice(0, 18);
        const buyCount = nextFlow.filter((f) => f.side === 'BUY').length;
        const pressure = Math.min(
          84,
          Math.max(16, Math.round((buyCount / Math.max(1, nextFlow.length)) * 100))
        );

        set((s) => ({
          tickers: {
            ...s.tickers,
            [symbol]: nextTicker,
          },
          simulatedFlow: nextFlow,
          buyPressurePct: pressure,
        }));
      },

      placeOptionDeal: ({ symbol, direction, stakeUsd, durationSec }) => {
        const state = get();
        const accountType = state.activeAccountType;
        const stake = D(stakeUsd);
        const livePrice = D(state.tickers[symbol].price);
        const cfg = INSTRUMENTS[symbol];

        if (!stake.isFinite() || stake.lt(1)) {
          const msg = 'Minimum deal amount is $1.00.';
          state.pushToast('Invalid Amount', msg, 'error');
          return { ok: false, error: msg };
        }

        if (livePrice.lte(0)) {
          const msg = 'Waiting for live market price feed.';
          state.pushToast('Market Unavailable', msg, 'error');
          return { ok: false, error: msg };
        }

        const available = D(accountType === 'LIVE' ? state.liveBalance : state.demoBalance);
        if (stake.gt(available)) {
          const msg =
            accountType === 'LIVE'
              ? `Insufficient Live balance (${formatUsd(available)}). Deposit via M-Pesa or switch to Demo.`
              : `Insufficient Demo balance. Need ${formatUsd(stake)}, available ${formatUsd(available)}.`;
          state.pushToast('Insufficient Balance', msg, 'error');
          return { ok: false, error: msg };
        }

        const payout = calculateOptionPayout(stake, cfg.payoutPercent);
        const now = Date.now();

        // Prevent a double-loss dead-zone when buying & selling on the same pair:
        // if an active opposite-side deal exists and livePrice is on the losing side of it,
        // align strikePrice to the opposite deal's strike so one side always wins (unless exact tie).
        let effectiveStrike = livePrice;
        const oppositeDirection: OptionDirection = direction === 'CALL' ? 'PUT' : 'CALL';
        const activeOpposite = state.openDeals.find(
          (d) =>
            d.symbol === symbol &&
            d.accountType === accountType &&
            d.direction === oppositeDirection
        );
        if (activeOpposite) {
          const oppStrike = D(activeOpposite.strikePrice);
          if (direction === 'PUT' && livePrice.lt(oppStrike)) {
            effectiveStrike = oppStrike;
          } else if (direction === 'CALL' && livePrice.gt(oppStrike)) {
            effectiveStrike = oppStrike;
          }
        }

        const deal: OptionDeal = {
          id: createId('deal'),
          accountType,
          symbol,
          direction,
          stake: stake.toFixed(2),
          payoutPercent: cfg.payoutPercent,
          payoutAmount: payout.toFixed(2),
          strikePrice: effectiveStrike.toFixed(cfg.priceDecimals),
          durationSec,
          openedAt: now,
          expiresAt: now + durationSec * 1000,
        };

        const userTick: SimulatedFlowTick = {
          id: createId('flow'),
          side: direction === 'CALL' ? 'BUY' : 'SELL',
          price: formatPrice(livePrice, symbol),
          amountUsd: stake.toNumber().toLocaleString('en-US'),
          timestamp: now,
        };

        set((s) => ({
          demoBalance:
            accountType === 'DEMO'
              ? D(s.demoBalance).minus(stake).toFixed(2)
              : s.demoBalance,
          liveBalance:
            accountType === 'LIVE'
              ? D(s.liveBalance).minus(stake).toFixed(2)
              : s.liveBalance,
          openDeals: [deal, ...s.openDeals],
          simulatedFlow: [userTick, ...s.simulatedFlow].slice(0, 18),
        }));

        playTradeSound('bet', state.soundEnabled);
        get().pushToast(
          `${accountType} ${direction === 'CALL' ? 'BUY' : 'SELL'} Opened`,
          `${symbol} · ${formatUsd(stake)} @ ${formatPrice(livePrice, symbol)} · ${durationSec}s`,
          'info'
        );
        return { ok: true };
      },

      cashOutDealEarly: (dealId) => {
        const state = get();
        const deal = state.openDeals.find((d) => d.id === dealId);
        if (!deal) return { ok: false, error: 'Deal already settled.' };

        const now = Date.now();
        if (deal.expiresAt - now < 500) {
          return { ok: false, error: 'Deal is settling at expiration.' };
        }

        const markPrice = D(state.tickers[deal.symbol].price);
        const stake = D(deal.stake);
        const returnAmount = calculateEarlyCashOut(deal, markPrice, now);
        const netProfit = returnAmount.minus(stake);
        const isWin = netProfit.gte(0);

        const record: DealHistoryRecord = {
          id: createId('hst'),
          accountType: deal.accountType,
          symbol: deal.symbol,
          direction: deal.direction,
          stake: deal.stake,
          payoutPercent: deal.payoutPercent,
          strikePrice: deal.strikePrice,
          closePrice: markPrice.toFixed(INSTRUMENTS[deal.symbol].priceDecimals),
          durationSec: deal.durationSec,
          returnAmount: returnAmount.toFixed(2),
          netProfit: netProfit.toFixed(2),
          outcome: 'CASHED_OUT',
          openedAt: deal.openedAt,
          closedAt: now,
        };

        const companyDelta = stake.minus(returnAmount);

        set((s) => ({
          demoBalance:
            deal.accountType === 'DEMO'
              ? D(s.demoBalance).plus(returnAmount).toFixed(2)
              : s.demoBalance,
          liveBalance:
            deal.accountType === 'LIVE'
              ? D(s.liveBalance).plus(returnAmount).toFixed(2)
              : s.liveBalance,
          openDeals: s.openDeals.filter((d) => d.id !== dealId),
          dealHistory: [record, ...s.dealHistory].slice(0, 400),
          demoWinsCount:
            deal.accountType === 'DEMO' ? s.demoWinsCount + (isWin ? 1 : 0) : s.demoWinsCount,
          demoLossesCount:
            deal.accountType === 'DEMO' ? s.demoLossesCount + (isWin ? 0 : 1) : s.demoLossesCount,
          liveWinsCount:
            deal.accountType === 'LIVE' ? s.liveWinsCount + (isWin ? 1 : 0) : s.liveWinsCount,
          liveLossesCount:
            deal.accountType === 'LIVE' ? s.liveLossesCount + (isWin ? 0 : 1) : s.liveLossesCount,
          demoCompanyProfit:
            deal.accountType === 'DEMO'
              ? D(s.demoCompanyProfit).plus(companyDelta).toFixed(2)
              : s.demoCompanyProfit,
          liveCompanyProfit:
            deal.accountType === 'LIVE'
              ? D(s.liveCompanyProfit).plus(companyDelta).toFixed(2)
              : s.liveCompanyProfit,
        }));

        playTradeSound(isWin ? 'win' : 'loss', state.soundEnabled);
        get().pushToast(
          `Cashed Out (${formatUsd(returnAmount)})`,
          `${deal.accountType} · ${deal.symbol} ${deal.direction === 'CALL' ? 'BUY' : 'SELL'} · Net ${formatUsd(netProfit, true)}`,
          isWin ? 'success' : 'info'
        );
        return { ok: true };
      },

      settleExpiredDeals: () => {
        const state = get();
        if (state.openDeals.length === 0) return;

        const now = Date.now();
        const expired = state.openDeals.filter((d) => now >= d.expiresAt);
        if (expired.length === 0) return;

        const expiredIds = new Set(expired.map((d) => d.id));
        let demoReturn = new Decimal(0);
        let liveReturn = new Decimal(0);
        let demoCompanyAdd = new Decimal(0);
        let liveCompanyAdd = new Decimal(0);
        let demoWinsAdd = 0;
        let demoLossesAdd = 0;
        let liveWinsAdd = 0;
        let liveLossesAdd = 0;
        const newRecords: DealHistoryRecord[] = [];
        const newToasts: ToastMessage[] = [];

        for (const deal of expired) {
          const closePrice = D(state.tickers[deal.symbol].price);
          const strike = D(deal.strikePrice);
          const stake = D(deal.stake);
          const payout = D(deal.payoutAmount);

          const isTie = closePrice.eq(strike);
          const isWin =
            !isTie &&
            (deal.direction === 'CALL' ? closePrice.gt(strike) : closePrice.lt(strike));

          if (isTie) {
            if (deal.accountType === 'LIVE') {
              liveReturn = liveReturn.plus(stake);
            } else {
              demoReturn = demoReturn.plus(stake);
            }
            newRecords.push({
              id: createId('hst'),
              accountType: deal.accountType,
              symbol: deal.symbol,
              direction: deal.direction,
              stake: deal.stake,
              payoutPercent: deal.payoutPercent,
              strikePrice: deal.strikePrice,
              closePrice: closePrice.toFixed(INSTRUMENTS[deal.symbol].priceDecimals),
              durationSec: deal.durationSec,
              returnAmount: stake.toFixed(2),
              netProfit: '0.00',
              outcome: 'TIE',
              openedAt: deal.openedAt,
              closedAt: now,
            });
            newToasts.push({
              id: createId('toast'),
              title: `${deal.accountType} Deal Tied`,
              description: `${deal.symbol} closed at strike · ${formatUsd(stake)} returned`,
              variant: 'info',
              createdAt: now,
            });
          } else if (isWin) {
            const netProfit = payout.minus(stake);
            if (deal.accountType === 'LIVE') {
              liveWinsAdd += 1;
              liveReturn = liveReturn.plus(payout);
              liveCompanyAdd = liveCompanyAdd.minus(netProfit);
            } else {
              demoWinsAdd += 1;
              demoReturn = demoReturn.plus(payout);
              demoCompanyAdd = demoCompanyAdd.minus(netProfit);
            }
            newRecords.push({
              id: createId('hst'),
              accountType: deal.accountType,
              symbol: deal.symbol,
              direction: deal.direction,
              stake: deal.stake,
              payoutPercent: deal.payoutPercent,
              strikePrice: deal.strikePrice,
              closePrice: closePrice.toFixed(INSTRUMENTS[deal.symbol].priceDecimals),
              durationSec: deal.durationSec,
              returnAmount: payout.toFixed(2),
              netProfit: netProfit.toFixed(2),
              outcome: 'WON',
              openedAt: deal.openedAt,
              closedAt: now,
            });
            newToasts.push({
              id: createId('toast'),
              title: `${deal.accountType} PROFIT +${formatUsd(netProfit)}`,
              description: `${deal.symbol} ${deal.direction === 'CALL' ? 'BUY' : 'SELL'} won · Payout ${formatUsd(payout)}`,
              variant: 'success',
              createdAt: now,
            });
          } else {
            if (deal.accountType === 'LIVE') {
              liveLossesAdd += 1;
              liveCompanyAdd = liveCompanyAdd.plus(stake);
            } else {
              demoLossesAdd += 1;
              demoCompanyAdd = demoCompanyAdd.plus(stake);
            }
            newRecords.push({
              id: createId('hst'),
              accountType: deal.accountType,
              symbol: deal.symbol,
              direction: deal.direction,
              stake: deal.stake,
              payoutPercent: deal.payoutPercent,
              strikePrice: deal.strikePrice,
              closePrice: closePrice.toFixed(INSTRUMENTS[deal.symbol].priceDecimals),
              durationSec: deal.durationSec,
              returnAmount: '0.00',
              netProfit: stake.negated().toFixed(2),
              outcome: 'LOST',
              openedAt: deal.openedAt,
              closedAt: now,
            });
            newToasts.push({
              id: createId('toast'),
              title: `${deal.accountType} Closed -${formatUsd(stake)}`,
              description: `${deal.symbol} ${deal.direction === 'CALL' ? 'BUY' : 'SELL'} closed @ ${formatPrice(closePrice, deal.symbol)}`,
              variant: 'error',
              createdAt: now,
            });
          }
        }

        if (demoWinsAdd + liveWinsAdd > 0) {
          playTradeSound('win', state.soundEnabled);
        } else if (demoLossesAdd + liveLossesAdd > 0) {
          playTradeSound('loss', state.soundEnabled);
        }

        set((s) => ({
          demoBalance: D(s.demoBalance).plus(demoReturn).toFixed(2),
          liveBalance: D(s.liveBalance).plus(liveReturn).toFixed(2),
          openDeals: s.openDeals.filter((d) => !expiredIds.has(d.id)),
          dealHistory: [...newRecords, ...s.dealHistory].slice(0, 400),
          demoWinsCount: s.demoWinsCount + demoWinsAdd,
          demoLossesCount: s.demoLossesCount + demoLossesAdd,
          liveWinsCount: s.liveWinsCount + liveWinsAdd,
          liveLossesCount: s.liveLossesCount + liveLossesAdd,
          demoCompanyProfit: D(s.demoCompanyProfit).plus(demoCompanyAdd).toFixed(2),
          liveCompanyProfit: D(s.liveCompanyProfit).plus(liveCompanyAdd).toFixed(2),
          toasts: [...newToasts, ...s.toasts].slice(0, 4),
        }));
      },

      depositFunds: (amountUsd, method, targetAccount, accountRef) => {
        const state = get();
        const accountType = targetAccount ?? state.activeAccountType;
        const amount = D(amountUsd);

        if (!amount.isFinite() || amount.lt(1)) {
          const msg = 'Minimum deposit amount is $1.00.';
          state.pushToast('Invalid Deposit', msg, 'error');
          return { ok: false, error: msg };
        }

        if (amount.gt(1_000_000)) {
          const msg = 'Maximum single deposit is $1,000,000.00.';
          state.pushToast('Deposit Limit', msg, 'error');
          return { ok: false, error: msg };
        }

        let cleanRef = accountRef?.trim() || undefined;
        let kesAmount: string | undefined;

        if (method === 'M-Pesa') {
          const normalized = normalizeMpesaPhone(accountRef || state.profile.mpesaPhone || '');
          if (!normalized) {
            const msg = 'Enter a valid Safaricom M-Pesa number (e.g. 0712345678 or 254712345678).';
            state.pushToast('Invalid M-Pesa Number', msg, 'error');
            return { ok: false, error: msg };
          }
          cleanRef = normalized;
          kesAmount = amount.mul(D(state.usdKesRate)).toFixed(0);
        }

        const tx: WalletTransaction = {
          id: createId('tx'),
          accountType,
          type: 'DEPOSIT',
          amount: amount.toFixed(2),
          kesAmount,
          method,
          accountRef: cleanRef,
          status: 'Completed',
          timestamp: Date.now(),
        };

        set((s) => ({
          activeAccountType: accountType,
          demoBalance:
            accountType === 'DEMO'
              ? D(s.demoBalance).plus(amount).toFixed(2)
              : s.demoBalance,
          liveBalance:
            accountType === 'LIVE'
              ? D(s.liveBalance).plus(amount).toFixed(2)
              : s.liveBalance,
          liveNetFunded:
            accountType === 'LIVE'
              ? D(s.liveNetFunded).plus(amount).toFixed(2)
              : s.liveNetFunded,
          walletTransactions: [tx, ...s.walletTransactions].slice(0, 200),
          profile:
            method === 'M-Pesa' && cleanRef
              ? { ...s.profile, mpesaPhone: cleanRef }
              : s.profile,
        }));

        playTradeSound('win', state.soundEnabled);
        get().pushToast(
          method === 'M-Pesa' ? 'M-Pesa Deposit Confirmed' : 'Deposit Successful',
          method === 'M-Pesa' && kesAmount
            ? `${accountType} Account credited ${formatUsd(amount)} (${formatKes(kesAmount)}) from +${cleanRef}.`
            : `${accountType} Account credited ${formatUsd(amount)} via ${method}.`,
          'success'
        );
        return { ok: true };
      },

      withdrawFunds: (amountUsd, method, targetAccount, accountRef) => {
        const state = get();
        const accountType = targetAccount ?? state.activeAccountType;
        const amount = D(amountUsd);
        const available = D(accountType === 'LIVE' ? state.liveBalance : state.demoBalance);

        if (!amount.isFinite() || amount.lt(1)) {
          const msg = 'Minimum withdrawal amount is $1.00.';
          state.pushToast('Invalid Withdrawal', msg, 'error');
          return { ok: false, error: msg };
        }

        if (amount.gt(available)) {
          const msg = `Insufficient ${accountType} balance. Available ${formatUsd(available)}.`;
          state.pushToast('Insufficient Balance', msg, 'error');
          return { ok: false, error: msg };
        }

        let cleanRef = accountRef?.trim() || undefined;
        let kesAmount: string | undefined;

        if (method === 'M-Pesa') {
          const normalized = normalizeMpesaPhone(accountRef || state.profile.mpesaPhone || '');
          if (!normalized) {
            const msg = 'Enter a valid Safaricom M-Pesa number (e.g. 0712345678 or 254712345678).';
            state.pushToast('Invalid M-Pesa Number', msg, 'error');
            return { ok: false, error: msg };
          }
          cleanRef = normalized;
          kesAmount = amount.mul(D(state.usdKesRate)).toFixed(0);
        }

        const tx: WalletTransaction = {
          id: createId('tx'),
          accountType,
          type: 'WITHDRAW',
          amount: amount.toFixed(2),
          kesAmount,
          method,
          accountRef: cleanRef,
          status: 'Completed',
          timestamp: Date.now(),
        };

        set((s) => ({
          demoBalance:
            accountType === 'DEMO'
              ? D(s.demoBalance).minus(amount).toFixed(2)
              : s.demoBalance,
          liveBalance:
            accountType === 'LIVE'
              ? D(s.liveBalance).minus(amount).toFixed(2)
              : s.liveBalance,
          liveNetFunded:
            accountType === 'LIVE'
              ? D(s.liveNetFunded).minus(amount).toFixed(2)
              : s.liveNetFunded,
          walletTransactions: [tx, ...s.walletTransactions].slice(0, 200),
          profile:
            method === 'M-Pesa' && cleanRef
              ? { ...s.profile, mpesaPhone: cleanRef }
              : s.profile,
        }));

        playTradeSound('bet', state.soundEnabled);
        get().pushToast(
          method === 'M-Pesa' ? 'M-Pesa Payout Sent' : 'Withdrawal Processed',
          method === 'M-Pesa' && kesAmount
            ? `Sent ${formatUsd(amount)} (${formatKes(kesAmount)}) to M-Pesa +${cleanRef}.`
            : `Withdrew ${formatUsd(amount)} from ${accountType} via ${method}.`,
          'success'
        );
        return { ok: true };
      },

      updateProfile: (updates) => {
        set((s) => ({
          profile: {
            ...s.profile,
            ...updates,
          },
        }));
        get().pushToast('Profile Saved', 'Your trader profile details were updated.', 'success');
      },

      resetDemoAccount: () => {
        set((s) => ({
          demoBalance: INITIAL_CASH_BALANCE,
          demoInitialBalance: INITIAL_CASH_BALANCE,
          openDeals: s.openDeals.filter((d) => d.accountType !== 'DEMO'),
          dealHistory: s.dealHistory.filter((d) => d.accountType !== 'DEMO'),
          walletTransactions: s.walletTransactions.filter((t) => t.accountType !== 'DEMO'),
          demoWinsCount: 0,
          demoLossesCount: 0,
          demoCompanyProfit: '0.00',
        }));
        get().pushToast('Demo Account Reloaded', 'Demo balance restored to $100,000.00.', 'info');
      },
    }),
    {
      name: ACCOUNT_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeAccountType: state.activeAccountType,
        demoBalance: state.demoBalance,
        liveBalance: state.liveBalance,
        demoInitialBalance: state.demoInitialBalance,
        liveNetFunded: state.liveNetFunded,
        openDeals: state.openDeals,
        dealHistory: state.dealHistory,
        walletTransactions: state.walletTransactions,
        profile: state.profile,
        activeSymbol: state.activeSymbol,
        timeframe: state.timeframe,
        chartMode: state.chartMode,
        selectedDuration: state.selectedDuration,
        soundEnabled: state.soundEnabled,
        demoWinsCount: state.demoWinsCount,
        demoLossesCount: state.demoLossesCount,
        liveWinsCount: state.liveWinsCount,
        liveLossesCount: state.liveLossesCount,
        demoCompanyProfit: state.demoCompanyProfit,
        liveCompanyProfit: state.liveCompanyProfit,
        usdKesRate: state.usdKesRate,
      }),
    }
  )
);
