import type {
  CryptoPair,
  ExpirationSec,
  ForexPair,
  InstrumentConfig,
  Timeframe,
  TradingPair,
} from '../types/trading';

export const FOREX_PAIRS: ForexPair[] = [
  'EUR-USD',
  'GBP-USD',
  'USD-JPY',
  'USD-CHF',
  'AUD-USD',
  'USD-CAD',
  'EUR-GBP',
];

export const CRYPTO_PAIRS: CryptoPair[] = [
  'BTC-USD',
  'ETH-USD',
  'SOL-USD',
  'XRP-USD',
  'DOGE-USD',
];

export const TRADING_PAIRS: TradingPair[] = [...FOREX_PAIRS, ...CRYPTO_PAIRS];

export const INSTRUMENTS: Record<TradingPair, InstrumentConfig> = {
  'EUR-USD': {
    symbol: 'EUR-USD',
    category: 'FOREX',
    baseAsset: 'EUR',
    quoteAsset: 'USD',
    name: 'Euro / US Dollar',
    priceDecimals: 5,
    qtyDecimals: 2,
    payoutPercent: 86,
    fallbackPrice: '1.05420',
  },
  'GBP-USD': {
    symbol: 'GBP-USD',
    category: 'FOREX',
    baseAsset: 'GBP',
    quoteAsset: 'USD',
    name: 'British Pound / US Dollar',
    priceDecimals: 5,
    qtyDecimals: 2,
    payoutPercent: 86,
    fallbackPrice: '1.26180',
  },
  'USD-JPY': {
    symbol: 'USD-JPY',
    category: 'FOREX',
    baseAsset: 'USD',
    quoteAsset: 'JPY',
    name: 'US Dollar / Japanese Yen',
    priceDecimals: 3,
    qtyDecimals: 2,
    payoutPercent: 86,
    fallbackPrice: '153.420',
  },
  'USD-CHF': {
    symbol: 'USD-CHF',
    category: 'FOREX',
    baseAsset: 'USD',
    quoteAsset: 'CHF',
    name: 'US Dollar / Swiss Franc',
    priceDecimals: 5,
    qtyDecimals: 2,
    payoutPercent: 86,
    fallbackPrice: '0.88940',
  },
  'AUD-USD': {
    symbol: 'AUD-USD',
    category: 'FOREX',
    baseAsset: 'AUD',
    quoteAsset: 'USD',
    name: 'Australian Dollar / US Dollar',
    priceDecimals: 5,
    qtyDecimals: 2,
    payoutPercent: 86,
    fallbackPrice: '0.65120',
  },
  'USD-CAD': {
    symbol: 'USD-CAD',
    category: 'FOREX',
    baseAsset: 'USD',
    quoteAsset: 'CAD',
    name: 'US Dollar / Canadian Dollar',
    priceDecimals: 5,
    qtyDecimals: 2,
    payoutPercent: 86,
    fallbackPrice: '1.39850',
  },
  'EUR-GBP': {
    symbol: 'EUR-GBP',
    category: 'FOREX',
    baseAsset: 'EUR',
    quoteAsset: 'GBP',
    name: 'Euro / British Pound',
    priceDecimals: 5,
    qtyDecimals: 2,
    payoutPercent: 86,
    fallbackPrice: '0.83540',
  },
  'BTC-USD': {
    symbol: 'BTC-USD',
    category: 'CRYPTO',
    baseAsset: 'BTC',
    quoteAsset: 'USD',
    name: 'Bitcoin',
    binanceSymbol: 'BTCUSDT',
    coinbaseProductId: 'BTC-USD',
    priceDecimals: 2,
    qtyDecimals: 6,
    payoutPercent: 86,
    fallbackPrice: '94500.00',
  },
  'ETH-USD': {
    symbol: 'ETH-USD',
    category: 'CRYPTO',
    baseAsset: 'ETH',
    quoteAsset: 'USD',
    name: 'Ethereum',
    binanceSymbol: 'ETHUSDT',
    coinbaseProductId: 'ETH-USD',
    priceDecimals: 2,
    qtyDecimals: 5,
    payoutPercent: 86,
    fallbackPrice: '3320.00',
  },
  'SOL-USD': {
    symbol: 'SOL-USD',
    category: 'CRYPTO',
    baseAsset: 'SOL',
    quoteAsset: 'USD',
    name: 'Solana',
    binanceSymbol: 'SOLUSDT',
    coinbaseProductId: 'SOL-USD',
    priceDecimals: 2,
    qtyDecimals: 4,
    payoutPercent: 86,
    fallbackPrice: '214.50',
  },
  'XRP-USD': {
    symbol: 'XRP-USD',
    category: 'CRYPTO',
    baseAsset: 'XRP',
    quoteAsset: 'USD',
    name: 'XRP',
    binanceSymbol: 'XRPUSDT',
    coinbaseProductId: 'XRP-USD',
    priceDecimals: 4,
    qtyDecimals: 2,
    payoutPercent: 86,
    fallbackPrice: '1.4250',
  },
  'DOGE-USD': {
    symbol: 'DOGE-USD',
    category: 'CRYPTO',
    baseAsset: 'DOGE',
    quoteAsset: 'USD',
    name: 'Dogecoin',
    binanceSymbol: 'DOGEUSDT',
    coinbaseProductId: 'DOGE-USD',
    priceDecimals: 5,
    qtyDecimals: 0,
    payoutPercent: 86,
    fallbackPrice: '0.38450',
  },
};

export const EXPIRATION_OPTIONS: { sec: ExpirationSec; label: string }[] = [
  { sec: 10, label: '10s' },
  { sec: 15, label: '15s' },
  { sec: 30, label: '30s' },
  { sec: 60, label: '1m' },
  { sec: 180, label: '3m' },
  { sec: 300, label: '5m' },
];

export const TIMEFRAMES: {
  label: string;
  value: Timeframe;
  seconds: number;
  binanceInterval: string;
  coinbaseGranularity: number;
}[] = [
  { label: '30s', value: '30s', seconds: 30, binanceInterval: '1m', coinbaseGranularity: 60 },
  { label: '1m', value: '1m', seconds: 60, binanceInterval: '1m', coinbaseGranularity: 60 },
  { label: '5m', value: '5m', seconds: 300, binanceInterval: '5m', coinbaseGranularity: 300 },
  { label: '15m', value: '15m', seconds: 900, binanceInterval: '15m', coinbaseGranularity: 900 },
  { label: '1h', value: '1h', seconds: 3600, binanceInterval: '1h', coinbaseGranularity: 3600 },
  { label: '1D', value: '1D', seconds: 86400, binanceInterval: '1d', coinbaseGranularity: 86400 },
];

export const BINANCE_TO_PAIR: Record<string, CryptoPair> = {
  BTCUSDT: 'BTC-USD',
  ETHUSDT: 'ETH-USD',
  SOLUSDT: 'SOL-USD',
  XRPUSDT: 'XRP-USD',
  DOGEUSDT: 'DOGE-USD',
};

export function getTimeframeSeconds(timeframe: Timeframe): number {
  return TIMEFRAMES.find((tf) => tf.value === timeframe)?.seconds ?? 60;
}
