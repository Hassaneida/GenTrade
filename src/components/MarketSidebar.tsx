import { Search, TrendingDown, TrendingUp, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { D, formatPercent, formatPrice } from '../lib/decimal';
import { CRYPTO_PAIRS, FOREX_PAIRS, INSTRUMENTS, TRADING_PAIRS } from '../lib/instruments';
import { useTradingStore } from '../store/useTradingStore';

type MarketFilter = 'FOREX' | 'CRYPTO' | 'ALL';

export function ForexMarketView() {
  const [filter, setFilter] = useState<MarketFilter>('FOREX');
  const [query, setQuery] = useState('');

  const activeSymbol = useTradingStore((s) => s.activeSymbol);
  const setActiveSymbol = useTradingStore((s) => s.setActiveSymbol);
  const setRailView = useTradingStore((s) => s.setRailView);
  const tickers = useTradingStore((s) => s.tickers);

  const visiblePairs = useMemo(() => {
    const baseList =
      filter === 'FOREX'
        ? FOREX_PAIRS
        : filter === 'CRYPTO'
          ? CRYPTO_PAIRS
          : TRADING_PAIRS;

    const q = query.trim().toLowerCase();
    if (!q) return baseList;
    return baseList.filter((pair) => {
      const cfg = INSTRUMENTS[pair];
      return (
        pair.toLowerCase().includes(q) ||
        cfg.baseAsset.toLowerCase().includes(q) ||
        cfg.quoteAsset.toLowerCase().includes(q) ||
        cfg.name.toLowerCase().includes(q)
      );
    });
  }, [filter, query]);

  return (
    <section className="flex-1 bg-[#0B1018] p-5 lg:p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[#EAECEF]">Forex &amp; Currency Markets</h1>
            <p className="text-xs text-[#8A94A6] mt-0.5">
              Select a currency pair to trade live rates and fixed option payouts on the Home chart.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRailView('home')}
            className="px-3.5 py-2 rounded text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
          >
            Back to Chart
          </button>
        </div>

        {/* Category Tabs & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-[#121722] p-1 rounded border border-[#1E2635]">
            {(['FOREX', 'CRYPTO', 'ALL'] as const).map((cat) => {
              const active = filter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilter(cat)}
                  className={`px-3.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#1B2333] text-[#38BDF8]'
                      : 'text-[#8A94A6] hover:text-[#EAECEF]'
                  }`}
                >
                  {cat === 'FOREX'
                    ? 'Forex Currencies'
                    : cat === 'CRYPTO'
                      ? 'Crypto Pairs'
                      : 'All Assets'}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#8A94A6] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search EUR, GBP, JPY, BTC..."
              className="w-full bg-[#121722] border border-[#1E2635] focus:border-[#38BDF8] rounded pl-8 pr-8 py-2 text-xs text-[#EAECEF] placeholder-[#64748B] outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A94A6] hover:text-[#EAECEF] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Currencies Table */}
        <div className="bg-[#121722] border border-[#1E2635] rounded overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead className="border-b border-[#1E2635] text-[11px] text-[#8A94A6]">
              <tr>
                <th className="py-3 px-4 font-medium">Currency Pair</th>
                <th className="py-3 px-4 font-medium">Market</th>
                <th className="py-3 px-4 font-medium text-right">Live Price</th>
                <th className="py-3 px-4 font-medium text-right">24h Change %</th>
                <th className="py-3 px-4 font-medium text-right">Payout %</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2635]/70 text-xs">
              {visiblePairs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#8A94A6]">
                    No currencies match &ldquo;{query}&rdquo;
                  </td>
                </tr>
              ) : (
                visiblePairs.map((pair) => {
                  const cfg = INSTRUMENTS[pair];
                  const ticker = tickers[pair];
                  const change = D(ticker.change24hPercent);
                  const isPositive = change.gte(0);
                  const isSelected = pair === activeSymbol;

                  return (
                    <tr
                      key={pair}
                      onClick={() => {
                        setActiveSymbol(pair);
                        setRailView('home');
                      }}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#1B2333]/80' : 'hover:bg-[#1B2333]/40'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#EAECEF]">
                          {cfg.baseAsset}/{cfg.quoteAsset}
                        </div>
                        <div className="text-[11px] text-[#8A94A6]">{cfg.name}</div>
                      </td>
                      <td className="py-3 px-4 text-[#8A94A6]">
                        {cfg.category === 'FOREX' ? 'Forex' : 'Crypto'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-[#EAECEF]">
                        {cfg.category === 'FOREX'
                          ? formatPrice(ticker.price, pair)
                          : `$${formatPrice(ticker.price, pair)}`}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-medium ${
                          isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1 justify-end">
                          {isPositive ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                          )}
                          {formatPercent(change)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#F59E0B]">
                        +{cfg.payoutPercent}%
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSymbol(pair);
                            setRailView('home');
                          }}
                          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#38BDF8] text-[#0B1018]'
                              : 'bg-[#1B2333] hover:bg-[#2563EB] text-[#EAECEF] border border-[#263147]'
                          }`}
                        >
                          {isSelected ? 'Trading' : 'Trade'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
