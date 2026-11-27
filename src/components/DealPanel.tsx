import Decimal from 'decimal.js';
import { ArrowDown, ArrowUp, DollarSign, Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  D,
  calculateEarlyCashOut,
  calculateOptionPayout,
  formatCountdown,
  formatPrice,
  formatUsd,
  isValidPositiveInput,
} from '../lib/decimal';
import { EXPIRATION_OPTIONS, INSTRUMENTS } from '../lib/instruments';
import { useTradingStore } from '../store/useTradingStore';
import type { OptionDirection } from '../types/trading';

const AMOUNT_CHIPS = ['10', '50', '100', '500', '1000'] as const;

export function DealPanel() {
  const activeAccountType = useTradingStore((s) => s.activeAccountType);
  const demoBalance = useTradingStore((s) => s.demoBalance);
  const liveBalance = useTradingStore((s) => s.liveBalance);
  const activeSymbol = useTradingStore((s) => s.activeSymbol);
  const tickers = useTradingStore((s) => s.tickers);
  const openDeals = useTradingStore((s) => s.openDeals);
  const selectedDuration = useTradingStore((s) => s.selectedDuration);
  const setSelectedDuration = useTradingStore((s) => s.setSelectedDuration);
  const placeOptionDeal = useTradingStore((s) => s.placeOptionDeal);
  const cashOutDealEarly = useTradingStore((s) => s.cashOutDealEarly);
  const setRailView = useTradingStore((s) => s.setRailView);

  const [amountInput, setAmountInput] = useState('100');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 150);
    return () => clearInterval(id);
  }, []);

  const cfg = INSTRUMENTS[activeSymbol];
  const livePrice = tickers[activeSymbol].price;
  const activeBalance = activeAccountType === 'LIVE' ? liveBalance : demoBalance;
  const available = D(activeBalance);
  const stake = isValidPositiveInput(amountInput) ? D(amountInput) : new Decimal(0);
  const expectedPayout = calculateOptionPayout(stake, cfg.payoutPercent);
  const netProfit = expectedPayout.minus(stake);

  const activeBuyDeal = openDeals.find(
    (d) =>
      d.symbol === activeSymbol &&
      d.direction === 'CALL' &&
      d.accountType === activeAccountType
  );
  const activeSellDeal = openDeals.find(
    (d) =>
      d.symbol === activeSymbol &&
      d.direction === 'PUT' &&
      d.accountType === activeAccountType
  );

  const buyCashOutVal = activeBuyDeal
    ? calculateEarlyCashOut(activeBuyDeal, livePrice, nowMs)
    : null;
  const sellCashOutVal = activeSellDeal
    ? calculateEarlyCashOut(activeSellDeal, livePrice, nowMs)
    : null;

  const buyRemMs = activeBuyDeal ? Math.max(0, activeBuyDeal.expiresAt - nowMs) : 0;
  const sellRemMs = activeSellDeal ? Math.max(0, activeSellDeal.expiresAt - nowMs) : 0;

  const buyMark = D(livePrice);
  const buyStrike = activeBuyDeal ? D(activeBuyDeal.strikePrice) : null;
  const sellStrike = activeSellDeal ? D(activeSellDeal.strikePrice) : null;

  const buyInMoney = buyStrike ? buyMark.gt(buyStrike) : false;
  const buyAtStrike = buyStrike ? buyMark.eq(buyStrike) : false;
  const sellInMoney = sellStrike ? buyMark.lt(sellStrike) : false;
  const sellAtStrike = sellStrike ? buyMark.eq(sellStrike) : false;

  const expiryTimeStr = new Date(nowMs + selectedDuration * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const stepDuration = (delta: number) => {
    const idx = EXPIRATION_OPTIONS.findIndex((o) => o.sec === selectedDuration);
    const nextIdx = Math.min(EXPIRATION_OPTIONS.length - 1, Math.max(0, idx + delta));
    setSelectedDuration(EXPIRATION_OPTIONS[nextIdx].sec);
  };

  const stepAmount = (delta: number) => {
    setErrorMsg(null);
    const next = Decimal.max(1, stake.plus(delta));
    setAmountInput(next.toFixed(0));
  };

  const placeNewDeal = (direction: OptionDirection) => {
    setErrorMsg(null);
    if (!isValidPositiveInput(amountInput) || stake.lt(1)) {
      setErrorMsg('Enter an amount of at least $1.00.');
      return;
    }

    const res = placeOptionDeal({
      symbol: activeSymbol,
      direction,
      stakeUsd: amountInput,
      durationSec: selectedDuration,
    });

    if (!res.ok && res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleCashOut = (dealId: string) => {
    setErrorMsg(null);
    const res = cashOutDealEarly(dealId);
    if (!res.ok && res.error) setErrorMsg(res.error);
  };

  const handleAllIn = () => {
    setErrorMsg(null);
    const max = available.toDecimalPlaces(2, Decimal.ROUND_DOWN);
    setAmountInput(max.gte(1) ? max.toFixed(2) : '0');
  };

  const needsLiveFunding = activeAccountType === 'LIVE' && available.lt(1);
  const isHedged = Boolean(activeBuyDeal && activeSellDeal);

  return (
    <aside className="bg-[#151B26] border-t lg:border-t-0 lg:border-l border-[#1E2635] p-3.5 flex flex-col gap-3">
      {/* Active Account & Live Rate Header */}
      <div className="bg-[#0E131B] border border-[#1E2635] rounded p-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span
              className={`font-semibold ${
                activeAccountType === 'LIVE' ? 'text-[#0ECB81]' : 'text-[#38BDF8]'
              }`}
            >
              {activeAccountType === 'LIVE' ? 'LIVE ACCOUNT' : 'DEMO ACCOUNT'}
            </span>
            <span className="text-[#64748B]">·</span>
            <span className="text-[#8A94A6]">{cfg.name}</span>
          </div>
          <div className="text-sm font-semibold text-[#EAECEF]">
            {cfg.baseAsset}/{cfg.quoteAsset}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-[#8A94A6]">Live Rate</div>
          <div className="text-sm font-mono font-semibold tabular-nums text-[#38BDF8]">
            {cfg.category === 'FOREX'
              ? formatPrice(livePrice, activeSymbol)
              : `$${formatPrice(livePrice, activeSymbol)}`}
          </div>
        </div>
      </div>

      {needsLiveFunding && (
        <div className="bg-[#0ECB81]/10 border border-[#0ECB81]/30 rounded p-2.5 flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#EAECEF]">
            Live balance is <span className="font-mono font-semibold">$0.00</span>
          </span>
          <button
            type="button"
            onClick={() => setRailView('deposit')}
            className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#0ECB81] hover:bg-[#0bb874] text-[#0B0E11] cursor-pointer shrink-0"
          >
            Deposit M-Pesa
          </button>
        </div>
      )}

      {/* Side-by-Side BUY / CASH OUT and SELL / CASH OUT Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        {activeBuyDeal && buyCashOutVal ? (
          <button
            type="button"
            onClick={() => handleCashOut(activeBuyDeal.id)}
            className={`py-3 px-2.5 rounded border font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              buyInMoney
                ? 'bg-[#0ECB81]/20 hover:bg-[#0ECB81]/30 border-[#0ECB81] text-[#0ECB81]'
                : 'bg-[#F59E0B] hover:bg-[#e59209] border-[#F59E0B] text-[#0B0E11]'
            }`}
          >
            <span className="flex items-center gap-1 font-bold tracking-wide">
              <DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />
              CASH OUT BUY
            </span>
            <span className="text-xs font-mono font-bold tabular-nums">
              {formatUsd(buyCashOutVal)}
            </span>
            <span className="text-[10px] font-mono tabular-nums opacity-85">
              ▲ {buyInMoney ? 'WINNING' : buyAtStrike ? 'AT STRIKE' : 'OUT'} · {formatCountdown(buyRemMs)}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => placeNewDeal('CALL')}
            className="py-3.5 px-3 rounded bg-[#0ECB81] hover:bg-[#0bb874] text-[#0B0E11] font-bold text-sm tracking-wide flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              BUY
            </span>
            <span className="text-[11px] font-mono font-semibold opacity-85">
              +{cfg.payoutPercent}%
            </span>
          </button>
        )}

        {activeSellDeal && sellCashOutVal ? (
          <button
            type="button"
            onClick={() => handleCashOut(activeSellDeal.id)}
            className={`py-3 px-2.5 rounded border font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              sellInMoney
                ? 'bg-[#0ECB81]/20 hover:bg-[#0ECB81]/30 border-[#0ECB81] text-[#0ECB81]'
                : 'bg-[#F59E0B] hover:bg-[#e59209] border-[#F59E0B] text-[#0B0E11]'
            }`}
          >
            <span className="flex items-center gap-1 font-bold tracking-wide">
              <DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />
              CASH OUT SELL
            </span>
            <span className="text-xs font-mono font-bold tabular-nums">
              {formatUsd(sellCashOutVal)}
            </span>
            <span className="text-[10px] font-mono tabular-nums opacity-85">
              ▼ {sellInMoney ? 'WINNING' : sellAtStrike ? 'AT STRIKE' : 'OUT'} · {formatCountdown(sellRemMs)}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => placeNewDeal('PUT')}
            className="py-3.5 px-3 rounded bg-[#F6465D] hover:bg-[#e03a50] text-white font-bold text-sm tracking-wide flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <ArrowDown className="w-4 h-4 stroke-[2.5]" />
              SELL
            </span>
            <span className="text-[11px] font-mono font-semibold opacity-90">
              +{cfg.payoutPercent}%
            </span>
          </button>
        )}
      </div>

      {isHedged && (
        <div className="text-[11px] text-[#8A94A6] bg-[#0E131B] border border-[#1E2635] rounded px-2.5 py-1.5">
          BUY + SELL open: one settles +{cfg.payoutPercent}% and the other -100% (or cash out either side early).
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="text-xs text-[#F6465D] bg-[#F6465D]/10 border border-[#F6465D]/30 rounded px-2.5 py-2 flex items-center justify-between gap-2"
        >
          <span>{errorMsg}</span>
          {activeAccountType === 'LIVE' && (
            <button
              type="button"
              onClick={() => setRailView('deposit')}
              className="text-[11px] font-semibold text-[#0ECB81] underline shrink-0 cursor-pointer"
            >
              Deposit
            </button>
          )}
        </div>
      )}

      {/* Amount Section */}
      <div className="bg-[#0E131B] border border-[#1E2635] rounded p-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="deal-amount" className="font-medium text-[#EAECEF]">
            Amount
          </label>
          <button
            type="button"
            onClick={handleAllIn}
            className="text-[11px] font-mono font-semibold text-[#F59E0B] hover:underline cursor-pointer"
          >
            ALL-IN ({formatUsd(available)})
          </button>
        </div>

        <div className="flex items-center bg-[#151B26] border border-[#1E2635] focus-within:border-[#38BDF8] rounded">
          <button
            type="button"
            onClick={() => stepAmount(-50)}
            aria-label="Decrease amount"
            className="p-2.5 text-[#8A94A6] hover:text-[#EAECEF] hover:bg-[#1B2333] transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs font-mono text-[#8A94A6] mr-0.5">$</span>
            <input
              id="deal-amount"
              type="number"
              min="1"
              step="any"
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setErrorMsg(null);
              }}
              className="w-24 bg-transparent text-center font-mono font-semibold text-sm tabular-nums text-[#EAECEF] outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => stepAmount(50)}
            aria-label="Increase amount"
            className="p-2.5 text-[#8A94A6] hover:text-[#EAECEF] hover:bg-[#1B2333] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {AMOUNT_CHIPS.map((chip) => {
            const label = Number(chip) >= 1000 ? `$${Number(chip) / 1000}k` : `$${chip}`;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setAmountInput(chip);
                  setErrorMsg(null);
                }}
                className={`py-1 rounded text-[11px] font-mono tabular-nums border transition-colors cursor-pointer ${
                  amountInput === chip
                    ? 'bg-[#1B2333] border-[#38BDF8] text-[#38BDF8]'
                    : 'bg-[#151B26] border-[#1E2635] text-[#8A94A6] hover:text-[#EAECEF]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration Section (10s, 15s, 30s, 1m, 3m, 5m) */}
      <div className="bg-[#0E131B] border border-[#1E2635] rounded p-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[#EAECEF]">Duration</span>
          <span className="font-mono tabular-nums text-[#8A94A6] text-[11px]">
            Closes {expiryTimeStr}
          </span>
        </div>

        <div className="flex items-center bg-[#151B26] border border-[#1E2635] rounded">
          <button
            type="button"
            onClick={() => stepDuration(-1)}
            aria-label="Decrease duration"
            className="p-2 text-[#8A94A6] hover:text-[#EAECEF] hover:bg-[#1B2333] transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1 text-center font-mono font-semibold text-xs tabular-nums text-[#EAECEF]">
            {selectedDuration === 30
              ? '30 sec'
              : EXPIRATION_OPTIONS.find((o) => o.sec === selectedDuration)?.label ??
                `${selectedDuration}s`}
          </div>
          <button
            type="button"
            onClick={() => stepDuration(1)}
            aria-label="Increase duration"
            className="p-2 text-[#8A94A6] hover:text-[#EAECEF] hover:bg-[#1B2333] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-6 gap-1">
          {EXPIRATION_OPTIONS.map((opt) => (
            <button
              key={opt.sec}
              type="button"
              onClick={() => setSelectedDuration(opt.sec)}
              className={`py-1 rounded text-[11px] font-mono tabular-nums border transition-colors cursor-pointer ${
                selectedDuration === opt.sec
                  ? 'bg-[#1B2333] border-[#38BDF8] text-[#38BDF8] font-semibold'
                  : 'bg-[#151B26] border-[#1E2635] text-[#8A94A6] hover:text-[#EAECEF]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Profit & Payout Preview */}
      <div className="mt-auto bg-[#0E131B] border border-[#1E2635] rounded p-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8A94A6]">Net Profit (+{cfg.payoutPercent}%)</span>
          <span className="font-mono font-semibold text-[#0ECB81] tabular-nums">
            {formatUsd(netProfit, true)}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1.5 border-t border-[#1E2635] text-xs">
          <span className="font-medium text-[#EAECEF]">Expected Payout</span>
          <span className="font-mono font-bold text-sm text-[#EAECEF] tabular-nums">
            {formatUsd(expectedPayout)}
          </span>
        </div>
      </div>
    </aside>
  );
}
