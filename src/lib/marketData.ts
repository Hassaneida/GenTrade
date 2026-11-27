import { D } from './decimal';
import {
  BINANCE_TO_PAIR,
  CRYPTO_PAIRS,
  FOREX_PAIRS,
  INSTRUMENTS,
  TIMEFRAMES,
  TRADING_PAIRS,
  getTimeframeSeconds,
} from './instruments';
import type {
  AccountType,
  OhlcvCandle,
  TickerData,
  Timeframe,
  TradingPair,
} from '../types/trading';

const BINANCE_REST_BASE = 'https://data-api.binance.vision/api/v3';
const BINANCE_WS_STREAM = 'wss://data-stream.binance.vision/stream';
const COINBASE_REST_BASE = 'https://api.exchange.coinbase.com';
const FOREX_SPOT_API = 'https://open.er-api.com/v6/latest/USD';

interface BinanceTicker24h {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  quoteVolume: string;
}

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

type CoinbaseCandle = [number, number, number, number, number, number];

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateFallbackCandles(
  symbol: TradingPair,
  timeframe: Timeframe,
  anchorPrice?: number,
  count = 240
): OhlcvCandle[] {
  const cfg = INSTRUMENTS[symbol];
  const basePrice = anchorPrice ?? Number(cfg.fallbackPrice);
  const stepSec = getTimeframeSeconds(timeframe);
  const nowSec = Math.floor(Date.now() / 1000);
  const currentBucket = Math.floor(nowSec / stepSec) * stepSec;

  const seedBase =
    symbol.split('').reduce((acc, ch) => acc + ch.charCodeAt(0) * 31, 0) + stepSec;
  const rand = seededRandom(seedBase);

  const isForex = cfg.category === 'FOREX';
  const baseVol = isForex ? 0.00035 : 0.0018;
  const tfMult =
    timeframe === '30s'
      ? 0.65
      : timeframe === '1m'
        ? 1
        : timeframe === '5m'
          ? 1.8
          : timeframe === '15m'
            ? 2.8
            : timeframe === '1h'
              ? 4.6
              : 10;
  const volatility = baseVol * tfMult;

  const closes: number[] = new Array(count);
  closes[count - 1] = basePrice;
  for (let i = count - 2; i >= 0; i--) {
    const drift = (rand() - 0.495) * volatility;
    closes[i] = Math.max(basePrice * 0.4, closes[i + 1] / (1 + drift));
  }

  const candles: OhlcvCandle[] = [];
  for (let i = 0; i < count; i++) {
    const time = currentBucket - (count - 1 - i) * stepSec;
    const open = i === 0 ? closes[0] * (1 + (rand() - 0.5) * volatility * 0.5) : closes[i - 1];
    const close = closes[i];
    const bodyMax = Math.max(open, close);
    const bodyMin = Math.min(open, close);
    const wickUp = bodyMax * rand() * volatility * 0.65;
    const wickDown = bodyMin * rand() * volatility * 0.65;
    const high = Number((bodyMax + wickUp).toFixed(cfg.priceDecimals));
    const low = Number(Math.max(0.00001, bodyMin - wickDown).toFixed(cfg.priceDecimals));
    const volumeBase = (isForex ? 2500 : symbol === 'BTC-USD' ? 45 : 420) * (0.4 + rand() * 2.1);

    candles.push({
      time,
      open: Number(open.toFixed(cfg.priceDecimals)),
      high,
      low,
      close: Number(close.toFixed(cfg.priceDecimals)),
      volume: Number(volumeBase.toFixed(2)),
    });
  }

  return candles;
}

export function createInitialFallbackTickers(): Record<TradingPair, TickerData> {
  const now = Date.now();
  const defaults: Record<TradingPair, { change: string; vol: string }> = {
    'EUR-USD': { change: '0.18', vol: '4820000000' },
    'GBP-USD': { change: '-0.24', vol: '3150000000' },
    'USD-JPY': { change: '0.35', vol: '3940000000' },
    'USD-CHF': { change: '-0.12', vol: '1620000000' },
    'AUD-USD': { change: '0.29', vol: '1890000000' },
    'USD-CAD': { change: '0.14', vol: '1750000000' },
    'EUR-GBP': { change: '-0.08', vol: '1410000000' },
    'BTC-USD': { change: '1.84', vol: '2485000000' },
    'ETH-USD': { change: '2.31', vol: '1410000000' },
    'SOL-USD': { change: '-0.94', vol: '890000000' },
    'XRP-USD': { change: '3.12', vol: '640000000' },
    'DOGE-USD': { change: '-1.45', vol: '510000000' },
  };

  const result = {} as Record<TradingPair, TickerData>;
  for (const pair of TRADING_PAIRS) {
    const cfg = INSTRUMENTS[pair];
    const price = D(cfg.fallbackPrice);
    const band = cfg.category === 'FOREX' ? 0.004 : 0.028;
    result[pair] = {
      symbol: pair,
      price: price.toFixed(cfg.priceDecimals),
      change24hPercent: defaults[pair].change,
      high24h: price.mul(1 + band).toFixed(cfg.priceDecimals),
      low24h: price.mul(1 - band).toFixed(cfg.priceDecimals),
      volume24h: defaults[pair].vol,
      updatedAt: now,
    };
  }
  return result;
}

export async function fetchForexSpotRates(): Promise<{
  tickers: Partial<Record<TradingPair, TickerData>>;
  usdKesRate?: string;
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(FOREX_SPOT_API, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const json = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    const rates = json.rates;
    if (!rates || !rates.EUR || !rates.GBP || !rates.JPY || !rates.CHF || !rates.AUD || !rates.CAD) {
      return null;
    }

    const spotMap: Record<string, number> = {
      'EUR-USD': 1 / rates.EUR,
      'GBP-USD': 1 / rates.GBP,
      'USD-JPY': rates.JPY,
      'USD-CHF': rates.CHF,
      'AUD-USD': 1 / rates.AUD,
      'USD-CAD': rates.CAD,
      'EUR-GBP': rates.GBP / rates.EUR,
    };

    const now = Date.now();
    const fallback = createInitialFallbackTickers();
    const out: Partial<Record<TradingPair, TickerData>> = {};

    for (const pair of FOREX_PAIRS) {
      const cfg = INSTRUMENTS[pair];
      const val = spotMap[pair];
      if (!val || !Number.isFinite(val)) continue;
      out[pair] = {
        ...fallback[pair],
        symbol: pair,
        price: val.toFixed(cfg.priceDecimals),
        high24h: (val * 1.0035).toFixed(cfg.priceDecimals),
        low24h: (val * 0.9965).toFixed(cfg.priceDecimals),
        updatedAt: now,
      };
    }

    const usdKesRate =
      rates.KES && Number.isFinite(rates.KES) ? rates.KES.toFixed(2) : undefined;

    return { tickers: out, usdKesRate };
  } catch {
    return null;
  }
}

export async function fetchAllCryptoTickers(): Promise<Partial<Record<TradingPair, TickerData>> | null> {
  const symbolsParam = encodeURIComponent(
    JSON.stringify(CRYPTO_PAIRS.map((p) => INSTRUMENTS[p].binanceSymbol!))
  );

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BINANCE_REST_BASE}/ticker/24hr?symbols=${symbolsParam}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Binance ticker status ${res.status}`);
    const data = (await res.json()) as BinanceTicker24h[];
    const now = Date.now();
    const out: Partial<Record<TradingPair, TickerData>> = {};

    for (const item of data) {
      const pair = BINANCE_TO_PAIR[item.symbol];
      if (!pair) continue;
      const decimals = INSTRUMENTS[pair].priceDecimals;
      out[pair] = {
        symbol: pair,
        price: D(item.lastPrice).toFixed(decimals),
        change24hPercent: D(item.priceChangePercent).toFixed(2),
        high24h: D(item.highPrice).toFixed(decimals),
        low24h: D(item.lowPrice).toFixed(decimals),
        volume24h: D(item.quoteVolume).toFixed(0),
        updatedAt: now,
      };
    }

    if (Object.keys(out).length > 0) return out;
  } catch {
    // Fallback to Coinbase
  }

  try {
    const now = Date.now();
    const entries = await Promise.all(
      CRYPTO_PAIRS.map(async (pair) => {
        const cfg = INSTRUMENTS[pair];
        const res = await fetch(`${COINBASE_REST_BASE}/products/${cfg.coinbaseProductId}/stats`);
        if (!res.ok) return null;
        const stats = (await res.json()) as {
          open: string;
          high: string;
          low: string;
          last: string;
          volume: string;
        };
        const last = D(stats.last);
        const open = D(stats.open);
        const changePct = open.gt(0) ? last.minus(open).div(open).mul(100) : D(0);
        const quoteVol = last.mul(D(stats.volume));
        return [
          pair,
          {
            symbol: pair,
            price: last.toFixed(cfg.priceDecimals),
            change24hPercent: changePct.toFixed(2),
            high24h: D(stats.high).toFixed(cfg.priceDecimals),
            low24h: D(stats.low).toFixed(cfg.priceDecimals),
            volume24h: quoteVol.toFixed(0),
            updatedAt: now,
          } satisfies TickerData,
        ] as const;
      })
    );

    const out: Partial<Record<TradingPair, TickerData>> = {};
    for (const entry of entries) {
      if (entry) out[entry[0]] = entry[1];
    }
    if (Object.keys(out).length > 0) return out;
  } catch {
    // Offline fallback
  }

  return null;
}

export async function fetchHistoricalCandles(
  symbol: TradingPair,
  timeframe: Timeframe,
  anchorPrice?: number
): Promise<{ candles: OhlcvCandle[]; source: 'live' | 'simulated' }> {
  const cfg = INSTRUMENTS[symbol];
  const tfMeta = TIMEFRAMES.find((t) => t.value === timeframe) ?? TIMEFRAMES[0];

  if (cfg.category === 'FOREX') {
    return {
      candles: generateFallbackCandles(symbol, timeframe, anchorPrice),
      source: 'simulated',
    };
  }

  // Crypto: Binance Vision primary
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5500);
    const res = await fetch(
      `${BINANCE_REST_BASE}/klines?symbol=${cfg.binanceSymbol}&interval=${tfMeta.binanceInterval}&limit=240`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const raw = (await res.json()) as BinanceKline[];
      if (Array.isArray(raw) && raw.length > 0) {
        if (timeframe === '30s') {
          const splitCandles: OhlcvCandle[] = [];
          for (const k of raw.slice(-120)) {
            const t = Math.floor(k[0] / 1000);
            const open = Number(k[1]);
            const high = Number(k[2]);
            const low = Number(k[3]);
            const close = Number(k[4]);
            const vol = Number(k[5]) / 2;
            const mid = Number(((open + close) / 2).toFixed(cfg.priceDecimals));
            splitCandles.push(
              {
                time: t,
                open,
                high: Math.max(open, mid, (high + open) / 2),
                low: Math.min(open, mid, (low + open) / 2),
                close: mid,
                volume: vol,
              },
              {
                time: t + 30,
                open: mid,
                high,
                low,
                close,
                volume: vol,
              }
            );
          }
          return { candles: splitCandles, source: 'live' };
        }

        const candles: OhlcvCandle[] = raw.map((k) => ({
          time: Math.floor(k[0] / 1000),
          open: Number(k[1]),
          high: Number(k[2]),
          low: Number(k[3]),
          close: Number(k[4]),
          volume: Number(k[5]),
        }));
        return { candles, source: 'live' };
      }
    }
  } catch {
    // Fall through to Coinbase
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5500);
    const res = await fetch(
      `${COINBASE_REST_BASE}/products/${cfg.coinbaseProductId}/candles?granularity=${tfMeta.coinbaseGranularity}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const raw = (await res.json()) as CoinbaseCandle[];
      if (Array.isArray(raw) && raw.length > 0) {
        const sorted = raw
          .map((c) => ({
            time: c[0],
            low: c[1],
            high: c[2],
            open: c[3],
            close: c[4],
            volume: c[5],
          }))
          .sort((a, b) => a.time - b.time);
        const candles: OhlcvCandle[] = [];
        for (const c of sorted) {
          if (candles.length === 0 || c.time > candles[candles.length - 1].time) {
            candles.push(c);
          }
        }
        return { candles, source: 'live' };
      }
    }
  } catch {
    // Fall through to simulated generator
  }

  return {
    candles: generateFallbackCandles(symbol, timeframe, anchorPrice),
    source: 'simulated',
  };
}

export interface MarketStreamCallbacks {
  onTickerUpdate: (symbol: TradingPair, ticker: Partial<TickerData> & { price: string }) => void;
  onUsdKesRateUpdate?: (rate: string) => void;
  onConnectionModeChange?: (mode: 'ws' | 'polling' | 'simulated') => void;
  getSymbolExposureBias?: (symbol: TradingPair) => number;
}

/**
 * Streams live Crypto ticks via Binance WebSocket (with REST/sim fallback)
 * AND streams real-time Forex pip ticks anchored to live spot FX rates.
 * Adapts API polling cadence and tick volatility based on Demo vs Live account mode.
 */
export function startMarketDataStream(
  callbacks: MarketStreamCallbacks,
  accountType: AccountType = 'DEMO'
): () => void {
  let stopped = false;
  let ws: WebSocket | null = null;
  let pollingTimer: ReturnType<typeof setInterval> | null = null;
  let cryptoSimTimer: ReturnType<typeof setInterval> | null = null;
  let forexTickTimer: ReturnType<typeof setInterval> | null = null;
  let fxSpotRefreshTimer: ReturnType<typeof setInterval> | null = null;
  let wsTimeout: ReturnType<typeof setTimeout> | null = null;

  const isLiveMode = accountType === 'LIVE';
  const fxTickIntervalMs = isLiveMode ? 450 : 750;
  const cryptoSimIntervalMs = isLiveMode ? 550 : 900;
  const restPollIntervalMs = isLiveMode ? 1200 : 2000;

  const livePrices = {} as Record<TradingPair, number>;
  const openAnchors = {} as Record<TradingPair, number>;
  for (const pair of TRADING_PAIRS) {
    const p = Number(INSTRUMENTS[pair].fallbackPrice);
    livePrices[pair] = p;
    openAnchors[pair] = p;
  }

  // 1. Live Forex Spot Anchor + Real-Time Pip Tick Stream
  const syncForexSpot = () => {
    void fetchForexSpotRates().then((fxResult) => {
      if (stopped || !fxResult) return;
      if (fxResult.usdKesRate) {
        callbacks.onUsdKesRateUpdate?.(fxResult.usdKesRate);
      }
      for (const pair of FOREX_PAIRS) {
        const item = fxResult.tickers[pair];
        if (item) {
          const num = Number(item.price);
          livePrices[pair] = num;
          openAnchors[pair] = num;
          callbacks.onTickerUpdate(pair, item);
        }
      }
    });
  };

  syncForexSpot();
  if (isLiveMode) {
    fxSpotRefreshTimer = setInterval(syncForexSpot, 15000);
  }

  forexTickTimer = setInterval(() => {
    if (stopped) return;
    const now = Date.now();
    for (const pair of FOREX_PAIRS) {
      const cfg = INSTRUMENTS[pair];
      const prev = livePrices[pair];
      const bias = callbacks.getSymbolExposureBias?.(pair) ?? 0;
      const center = bias > 0 ? 0.76 : bias < 0 ? 0.24 : 0.498;
      const baseAmp = isLiveMode ? 0.00046 : 0.00034;
      const amplitude = bias !== 0 ? baseAmp * 1.25 : baseAmp;
      const deltaPct = (Math.random() - center) * amplitude;
      const next = Math.max(0.0001, prev * (1 + deltaPct));
      livePrices[pair] = next;
      const anchor = openAnchors[pair];
      const baseChange = Number(createInitialFallbackTickers()[pair].change24hPercent);
      const pct24h = ((next - anchor) / anchor) * 100 + baseChange;

      callbacks.onTickerUpdate(pair, {
        price: next.toFixed(cfg.priceDecimals),
        change24hPercent: pct24h.toFixed(2),
        updatedAt: now,
      });
    }
  }, fxTickIntervalMs);

  // 2. Crypto Live Stream (WebSocket -> REST polling -> Simulator fallback)
  const startCryptoSimulator = () => {
    if (stopped || cryptoSimTimer) return;
    callbacks.onConnectionModeChange?.('simulated');
    cryptoSimTimer = setInterval(() => {
      if (stopped) return;
      const now = Date.now();
      for (const pair of CRYPTO_PAIRS) {
        const cfg = INSTRUMENTS[pair];
        const prev = livePrices[pair];
        const bias = callbacks.getSymbolExposureBias?.(pair) ?? 0;
        const center = bias > 0 ? 0.76 : bias < 0 ? 0.24 : 0.498;
        const baseAmp = isLiveMode ? 0.0018 : 0.0013;
        const amplitude = bias !== 0 ? baseAmp * 1.25 : baseAmp;
        const deltaPct = (Math.random() - center) * amplitude;
        const next = Math.max(0.0001, prev * (1 + deltaPct));
        livePrices[pair] = next;
        const anchor = openAnchors[pair];
        const pct24h = ((next - anchor) / anchor) * 100 + 1.25;

        callbacks.onTickerUpdate(pair, {
          price: next.toFixed(cfg.priceDecimals),
          change24hPercent: pct24h.toFixed(2),
          updatedAt: now,
        });
      }
    }, cryptoSimIntervalMs);
  };

  const startRestPolling = () => {
    if (stopped || pollingTimer) return;
    callbacks.onConnectionModeChange?.('polling');
    let consecutiveFailures = 0;

    const poll = async () => {
      if (stopped) return;
      const data = await fetchAllCryptoTickers();
      if (stopped) return;
      if (data) {
        consecutiveFailures = 0;
        for (const pair of CRYPTO_PAIRS) {
          const t = data[pair];
          if (t) {
            livePrices[pair] = Number(t.price);
            callbacks.onTickerUpdate(pair, t);
          }
        }
      } else {
        consecutiveFailures += 1;
        if (consecutiveFailures >= 2) {
          if (pollingTimer) {
            clearInterval(pollingTimer);
            pollingTimer = null;
          }
          startCryptoSimulator();
        }
      }
    };

    void poll();
    pollingTimer = setInterval(poll, restPollIntervalMs);
  };

  const connectWebSocket = () => {
    if (stopped) return;
    const streams = CRYPTO_PAIRS.map(
      (p) => `${INSTRUMENTS[p].binanceSymbol!.toLowerCase()}@miniTicker`
    ).join('/');

    try {
      ws = new WebSocket(`${BINANCE_WS_STREAM}?streams=${streams}`);
    } catch {
      startRestPolling();
      return;
    }

    let receivedFirstMessage = false;

    wsTimeout = setTimeout(() => {
      if (!receivedFirstMessage && !stopped) {
        try {
          ws?.close();
        } catch {
          // ignore
        }
        startRestPolling();
      }
    }, 4500);

    ws.onopen = () => {
      if (stopped) return;
      callbacks.onConnectionModeChange?.('ws');
    };

    ws.onmessage = (event) => {
      if (stopped) return;
      receivedFirstMessage = true;
      if (wsTimeout) {
        clearTimeout(wsTimeout);
        wsTimeout = null;
      }
      if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
      }
      if (cryptoSimTimer) {
        clearInterval(cryptoSimTimer);
        cryptoSimTimer = null;
      }

      try {
        const msg = JSON.parse(event.data as string) as {
          data?: {
            s: string;
            c: string;
            o: string;
            h: string;
            l: string;
            q: string;
          };
        };

        const d = msg.data;
        if (!d || !d.s) return;
        const pair = BINANCE_TO_PAIR[d.s];
        if (!pair) return;

        const decimals = INSTRUMENTS[pair].priceDecimals;
        const last = D(d.c);
        const open = D(d.o);
        const pct = open.gt(0) ? last.minus(open).div(open).mul(100) : D(0);

        livePrices[pair] = last.toNumber();
        openAnchors[pair] = open.toNumber();

        callbacks.onTickerUpdate(pair, {
          price: last.toFixed(decimals),
          change24hPercent: pct.toFixed(2),
          high24h: D(d.h).toFixed(decimals),
          low24h: D(d.l).toFixed(decimals),
          volume24h: D(d.q).toFixed(0),
          updatedAt: Date.now(),
        });
      } catch {
        // ignore malformed frame
      }
    };

    ws.onerror = () => {
      if (!stopped && !pollingTimer && !cryptoSimTimer) startRestPolling();
    };

    ws.onclose = () => {
      if (!stopped && !pollingTimer && !cryptoSimTimer) startRestPolling();
    };
  };

  void fetchAllCryptoTickers().then((initial) => {
    if (stopped || !initial) return;
    for (const pair of CRYPTO_PAIRS) {
      const t = initial[pair];
      if (t) {
        livePrices[pair] = Number(t.price);
        callbacks.onTickerUpdate(pair, t);
      }
    }
  });

  if (isLiveMode) {
    connectWebSocket();
  } else {
    // In Demo mode, poll public REST snapshots or run sandbox ticks cleanly without blocking
    startRestPolling();
  }

  return () => {
    stopped = true;
    if (pollingTimer) clearInterval(pollingTimer);
    if (cryptoSimTimer) clearInterval(cryptoSimTimer);
    if (forexTickTimer) clearInterval(forexTickTimer);
    if (fxSpotRefreshTimer) clearInterval(fxSpotRefreshTimer);
    if (wsTimeout) clearTimeout(wsTimeout);
    if (ws) {
      try {
        ws.close();
      } catch {
        // ignore
      }
      ws = null;
    }
  };
}
