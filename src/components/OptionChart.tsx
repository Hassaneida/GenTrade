import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
  type AreaData,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { Activity, CandlestickChart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '../lib/decimal';
import { INSTRUMENTS, TIMEFRAMES, getTimeframeSeconds } from '../lib/instruments';
import { fetchHistoricalCandles } from '../lib/marketData';
import { useTradingStore } from '../store/useTradingStore';
import type { OhlcvCandle } from '../types/trading';

interface HoverOhlc {
  open: number;
  high: number;
  low: number;
  close: number;
}

export function OptionChart() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const lastCandleRef = useRef<OhlcvCandle | null>(null);
  const priceLinesRef = useRef<
    { series: ISeriesApi<'Area'> | ISeriesApi<'Candlestick'>; line: IPriceLine }[]
  >([]);

  const activeAccountType = useTradingStore((s) => s.activeAccountType);
  const activeSymbol = useTradingStore((s) => s.activeSymbol);
  const timeframe = useTradingStore((s) => s.timeframe);
  const setTimeframe = useTradingStore((s) => s.setTimeframe);
  const chartMode = useTradingStore((s) => s.chartMode);
  const setChartMode = useTradingStore((s) => s.setChartMode);
  const activePrice = useTradingStore((s) => s.tickers[s.activeSymbol].price);
  const openDeals = useTradingStore((s) => s.openDeals);
  const simulatedFlow = useTradingStore((s) => s.simulatedFlow);
  const buyPressurePct = useTradingStore((s) => s.buyPressurePct);

  const [isLoading, setIsLoading] = useState(true);
  const [hoverOhlc, setHoverOhlc] = useState<HoverOhlc | null>(null);
  const [latestOhlc, setLatestOhlc] = useState<HoverOhlc | null>(null);

  const cfg = INSTRUMENTS[activeSymbol];

  // 1. Initialize Lightweight Charts v5 with AreaSeries + CandlestickSeries + HistogramSeries
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: '#0B1018' },
        textColor: '#8A94A6',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#131B28' },
        horzLines: { color: '#131B28' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#334155',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1B2333',
        },
        horzLine: {
          color: '#334155',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1B2333',
        },
      },
      rightPriceScale: {
        borderColor: '#1E2635',
        scaleMargins: {
          top: 0.14,
          bottom: 0.18,
        },
      },
      timeScale: {
        borderColor: '#1E2635',
        timeVisible: true,
        secondsVisible: true,
      },
      width: el.clientWidth,
      height: el.clientHeight,
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#38BDF8',
      topColor: 'rgba(56, 189, 248, 0.30)',
      bottomColor: 'rgba(56, 189, 248, 0.0)',
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#0ECB81',
      downColor: '#F6465D',
      borderVisible: false,
      wickUpColor: '#0ECB81',
      wickDownColor: '#F6465D',
      visible: false,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      visible: false,
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.84,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    areaSeriesRef.current = areaSeries;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setHoverOhlc(null);
        return;
      }

      const candlePoint = param.seriesData.get(candleSeries) as
        | CandlestickData<UTCTimestamp>
        | undefined;
      const areaPoint = param.seriesData.get(areaSeries) as AreaData<UTCTimestamp> | undefined;

      if (candlePoint) {
        setHoverOhlc({
          open: candlePoint.open,
          high: candlePoint.high,
          low: candlePoint.low,
          close: candlePoint.close,
        });
      } else if (areaPoint) {
        setHoverOhlc({
          open: areaPoint.value,
          high: areaPoint.value,
          low: areaPoint.value,
          close: areaPoint.value,
        });
      } else {
        setHoverOhlc(null);
      }
    });

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          chart.applyOptions({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });

    observer.observe(el);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      areaSeriesRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // 2. Toggle Area vs Candles visibility cleanly
  useEffect(() => {
    const areaSeries = areaSeriesRef.current;
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    if (!areaSeries || !candleSeries || !volumeSeries) return;

    areaSeries.applyOptions({ visible: chartMode === 'area' });
    candleSeries.applyOptions({ visible: chartMode === 'candles' });
    volumeSeries.applyOptions({ visible: chartMode === 'candles' });
  }, [chartMode]);

  // 3. Load historical OHLCV candles on symbol or timeframe switch
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setHoverOhlc(null);

    const areaSeries = areaSeriesRef.current;
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const chart = chartRef.current;
    if (!areaSeries || !candleSeries || !volumeSeries || !chart) return;

    const precision = cfg.priceDecimals;
    const minMove = Number((1 / Math.pow(10, precision)).toFixed(precision));
    areaSeries.applyOptions({
      priceFormat: { type: 'price', precision, minMove },
    });
    candleSeries.applyOptions({
      priceFormat: { type: 'price', precision, minMove },
    });

    chart.timeScale().applyOptions({
      timeVisible: timeframe !== '1D',
    });

    const anchor = Number(useTradingStore.getState().tickers[activeSymbol].price);

    void fetchHistoricalCandles(activeSymbol, timeframe, anchor).then(({ candles }) => {
      if (cancelled) return;
      if (
        !areaSeriesRef.current ||
        !candleSeriesRef.current ||
        !volumeSeriesRef.current ||
        !chartRef.current
      ) {
        return;
      }

      const areaData: AreaData<UTCTimestamp>[] = candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.close,
      }));

      const candleData: CandlestickData<UTCTimestamp>[] = candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

      const volumeData: HistogramData<UTCTimestamp>[] = candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(14, 203, 129, 0.25)' : 'rgba(246, 70, 93, 0.25)',
      }));

      areaSeriesRef.current.setData(areaData);
      candleSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);
      chartRef.current.timeScale().fitContent();

      const last = candles[candles.length - 1] ?? null;
      lastCandleRef.current = last;
      if (last) {
        setLatestOhlc({
          open: last.open,
          high: last.high,
          low: last.low,
          close: last.close,
        });
      }

      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeSymbol, timeframe, activeAccountType, cfg.priceDecimals]);

  // 4. Stream live ticks into active series via update() without resetting zoom/pan
  useEffect(() => {
    const areaSeries = areaSeriesRef.current;
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const last = lastCandleRef.current;
    if (!areaSeries || !candleSeries || !volumeSeries || !last || isLoading) return;

    const priceNum = Number(activePrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return;

    const stepSec = getTimeframeSeconds(timeframe);
    const nowBucket = Math.floor(Date.now() / 1000 / stepSec) * stepSec;

    let updated: OhlcvCandle;
    if (nowBucket > last.time) {
      updated = {
        time: nowBucket,
        open: last.close,
        high: Math.max(last.close, priceNum),
        low: Math.min(last.close, priceNum),
        close: priceNum,
        volume: Number((Math.random() * 4 + 0.5).toFixed(2)),
      };
    } else {
      updated = {
        time: last.time,
        open: last.open,
        high: Math.max(last.high, priceNum),
        low: Math.min(last.low, priceNum),
        close: priceNum,
        volume: Number((last.volume + Math.random() * 0.8).toFixed(2)),
      };
    }

    lastCandleRef.current = updated;

    try {
      areaSeries.update({
        time: updated.time as UTCTimestamp,
        value: updated.close,
      });

      candleSeries.update({
        time: updated.time as UTCTimestamp,
        open: updated.open,
        high: updated.high,
        low: updated.low,
        close: updated.close,
      });

      volumeSeries.update({
        time: updated.time as UTCTimestamp,
        value: updated.volume,
        color:
          updated.close >= updated.open ? 'rgba(14, 203, 129, 0.25)' : 'rgba(246, 70, 93, 0.25)',
      });
    } catch {
      // Ignore transient update mismatch during rapid series/timeframe switch
    }

    setLatestOhlc({
      open: updated.open,
      high: updated.high,
      low: updated.low,
      close: updated.close,
    });
  }, [activePrice, timeframe, isLoading]);

  // 5. Render horizontal Strike Price Lines for active deals on activeSymbol
  useEffect(() => {
    const targetSeries = chartMode === 'area' ? areaSeriesRef.current : candleSeriesRef.current;
    if (!targetSeries) return;

    for (const item of priceLinesRef.current) {
      try {
        item.series.removePriceLine(item.line);
      } catch {
        // ignore if already removed
      }
    }
    priceLinesRef.current = [];

    const activeDeals = openDeals
      .filter((d) => d.symbol === activeSymbol && d.accountType === activeAccountType)
      .slice(0, 5);
    for (const deal of activeDeals) {
      const color = deal.direction === 'CALL' ? '#0ECB81' : '#F6465D';
      const line = targetSeries.createPriceLine({
        price: Number(deal.strikePrice),
        color,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `${deal.direction === 'CALL' ? '▲ BUY' : '▼ SELL'} $${deal.stake}`,
      });
      priceLinesRef.current.push({ series: targetSeries, line });
    }
  }, [openDeals, activeSymbol, activeAccountType, chartMode, isLoading]);

  const displayedOhlc = hoverOhlc ?? latestOhlc;
  const isUp = displayedOhlc ? displayedOhlc.close >= displayedOhlc.open : true;
  const sellPressurePct = 100 - buyPressurePct;

  return (
    <section className="bg-[#0B1018] flex flex-col min-h-[420px] lg:min-h-0 h-full relative">
      {/* Top Chart Controls */}
      <div className="px-3.5 py-2 bg-[#121722] border-b border-[#1E2635] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-[#0B1018] p-0.5 rounded border border-[#1E2635]">
            <button
              type="button"
              onClick={() => setChartMode('area')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                chartMode === 'area'
                  ? 'bg-[#1B2333] text-[#38BDF8]'
                  : 'text-[#8A94A6] hover:text-[#EAECEF]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Area
            </button>
            <button
              type="button"
              onClick={() => setChartMode('candles')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                chartMode === 'candles'
                  ? 'bg-[#1B2333] text-[#38BDF8]'
                  : 'text-[#8A94A6] hover:text-[#EAECEF]'
              }`}
            >
              <CandlestickChart className="w-3.5 h-3.5" />
              Candles
            </button>
          </div>

          {displayedOhlc && (
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono tabular-nums">
              <span>
                <span className="text-[#8A94A6] mr-1">O</span>
                <span className={isUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                  {formatPrice(displayedOhlc.open, activeSymbol)}
                </span>
              </span>
              <span>
                <span className="text-[#8A94A6] mr-1">H</span>
                <span className={isUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                  {formatPrice(displayedOhlc.high, activeSymbol)}
                </span>
              </span>
              <span>
                <span className="text-[#8A94A6] mr-1">L</span>
                <span className={isUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                  {formatPrice(displayedOhlc.low, activeSymbol)}
                </span>
              </span>
              <span>
                <span className="text-[#8A94A6] mr-1">C</span>
                <span className={isUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                  {formatPrice(displayedOhlc.close, activeSymbol)}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Timeframes */}
        <div className="flex items-center gap-1 bg-[#0B1018] p-0.5 rounded border border-[#1E2635]">
          {TIMEFRAMES.map((tf) => {
            const active = tf.value === timeframe;
            return (
              <button
                key={tf.value}
                type="button"
                onClick={() => setTimeframe(tf.value)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#1B2333] text-[#38BDF8]'
                    : 'text-[#8A94A6] hover:text-[#EAECEF]'
                }`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Buy & Sell Simulation Bar */}
      <div className="px-3.5 py-1.5 bg-[#0E131B] border-b border-[#1E2635] flex items-center justify-between gap-4 overflow-hidden">
        {/* Buy vs Sell Live Pressure Gauge */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[11px] font-medium text-[#8A94A6] whitespace-nowrap">
            Live Buy / Sell
          </span>
          <span className="text-[11px] font-mono font-semibold text-[#0ECB81] tabular-nums">
            BUY {buyPressurePct}%
          </span>
          <div className="w-24 h-1.5 rounded-full overflow-hidden bg-[#F6465D] flex">
            <div
              className="h-full bg-[#0ECB81] transition-all duration-300"
              style={{ width: `${buyPressurePct}%` }}
            />
          </div>
          <span className="text-[11px] font-mono font-semibold text-[#F6465D] tabular-nums">
            {sellPressurePct}% SELL
          </span>
        </div>

        {/* Live Simulated Order Flow Ticks */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar min-w-0">
          {simulatedFlow.slice(0, 6).map((tick) => (
            <div
              key={tick.id}
              className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums whitespace-nowrap shrink-0"
            >
              <span
                className={`font-semibold ${
                  tick.side === 'BUY' ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                }`}
              >
                {tick.side}
              </span>
              <span className="text-[#EAECEF]">${tick.amountUsd}</span>
              <span className="text-[#64748B]">@ {tick.price}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chart Body with Left Buyers/Sellers Vertical Gauge */}
      <div className="relative flex-1 flex min-h-[300px]">
        <div
          className="w-8 bg-[#121722] border-r border-[#1E2635] flex flex-col items-center justify-between py-3 px-1.5 select-none shrink-0"
          title={`Live Buy/Sell sentiment: ${buyPressurePct}% Buy / ${sellPressurePct}% Sell`}
        >
          <span className="text-[10px] font-mono font-semibold text-[#0ECB81] tabular-nums">
            {buyPressurePct}%
          </span>
          <div className="flex-1 w-1.5 my-2 rounded-full overflow-hidden bg-[#F6465D] flex flex-col justify-start">
            <div
              className="w-full bg-[#0ECB81] transition-all duration-300"
              style={{ height: `${buyPressurePct}%` }}
            />
          </div>
          <span className="text-[10px] font-mono font-semibold text-[#F6465D] tabular-nums">
            {sellPressurePct}%
          </span>
        </div>

        {/* Chart Canvas */}
        <div className="relative flex-1 min-w-0">
          <div ref={containerRef} className="w-full h-full" />

          {isLoading && (
            <div className="absolute inset-0 bg-[#0B1018]/80 flex items-center justify-center pointer-events-none">
              <div className="text-xs font-mono text-[#8A94A6]">
                Loading {activeSymbol} {timeframe} market data...
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
