export type ForexPair =
  | 'EUR-USD'
  | 'GBP-USD'
  | 'USD-JPY'
  | 'USD-CHF'
  | 'AUD-USD'
  | 'USD-CAD'
  | 'EUR-GBP';

export type CryptoPair =
  | 'BTC-USD'
  | 'ETH-USD'
  | 'SOL-USD'
  | 'XRP-USD'
  | 'DOGE-USD';

export type TradingPair = ForexPair | CryptoPair;

export type MarketCategory = 'FOREX' | 'CRYPTO';

export type AccountType = 'DEMO' | 'LIVE';

export type Timeframe = '30s' | '1m' | '5m' | '15m' | '1h' | '1D';

export type ChartMode = 'area' | 'candles';

export type OptionDirection = 'CALL' | 'PUT';

export type ExpirationSec = 10 | 15 | 30 | 60 | 180 | 300;

export type RailView =
  | 'home'
  | 'markets'
  | 'deals'
  | 'wallet'
  | 'deposit'
  | 'withdraw'
  | 'profile';

export interface InstrumentConfig {
  symbol: TradingPair;
  category: MarketCategory;
  baseAsset: string;
  quoteAsset: string;
  name: string;
  binanceSymbol?: string;
  coinbaseProductId?: string;
  priceDecimals: number;
  qtyDecimals: number;
  payoutPercent: number;
  fallbackPrice: string;
}

export interface TickerData {
  symbol: TradingPair;
  price: string;
  change24hPercent: string;
  high24h: string;
  low24h: string;
  volume24h: string;
  updatedAt: number;
}

export interface OhlcvCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OptionDeal {
  id: string;
  accountType: AccountType;
  symbol: TradingPair;
  direction: OptionDirection;
  stake: string;
  payoutPercent: number;
  payoutAmount: string;
  strikePrice: string;
  durationSec: ExpirationSec;
  openedAt: number;
  expiresAt: number;
}

export type DealOutcome = 'WON' | 'LOST' | 'TIE' | 'CASHED_OUT';

export interface DealHistoryRecord {
  id: string;
  accountType: AccountType;
  symbol: TradingPair;
  direction: OptionDirection;
  stake: string;
  payoutPercent: number;
  strikePrice: string;
  closePrice: string;
  durationSec: ExpirationSec;
  returnAmount: string;
  netProfit: string;
  outcome: DealOutcome;
  openedAt: number;
  closedAt: number;
}

export interface SimulatedFlowTick {
  id: string;
  side: 'BUY' | 'SELL';
  price: string;
  amountUsd: string;
  timestamp: number;
}

export type PaymentMethod = 'M-Pesa' | 'Instant Card' | 'Bank Transfer' | 'USDT (TRC20)';

export interface WalletTransaction {
  id: string;
  accountType: AccountType;
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: string;
  kesAmount?: string;
  method: PaymentMethod;
  accountRef?: string;
  status: 'Completed';
  timestamp: number;
}

export interface TraderProfile {
  fullName: string;
  email: string;
  handle: string;
  country: string;
  mpesaPhone: string;
  accountTier: 'Live Verified' | 'Demo VIP' | 'Standard' | 'Pro';
  joinedAt: number;
}

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  variant: ToastVariant;
  createdAt: number;
}
