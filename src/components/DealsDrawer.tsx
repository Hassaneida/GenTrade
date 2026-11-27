import Decimal from 'decimal.js';
import { useEffect, useState } from 'react';
import {
  D,
  calculateEarlyCashOut,
  formatCountdown,
  formatPrice,
  formatUsd,
} from '../lib/decimal';
import { INSTRUMENTS, TRADING_PAIRS } from '../lib/instruments';
import { useTradingStore } from '../store/useTradingStore';

type DealsTab = 'open' | 'closed' | 'stats';

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function DealsDrawer() {
  const [tab, setTab] = useState<DealsTab>('open');
  const [nowMs, setNowMs] = useState(() => Date.now());

  const activeAccountType = useTradingStore((s) => s.activeAccountType);
  const setAccountType = useTradingStore((s) => s.setAccountType);
  const openDealsAll = useTradingStore((s) => s.openDeals);
  const dealHistoryAll = useTradingStore((s) => s.dealHistory);
  const demoWinsCount = useTradingStore((s) => s.demoWinsCount);
  const demoLossesCount = useTradingStore((s) => s.demoLossesCount);
  const liveWinsCount = useTradingStore((s) => s.liveWinsCount);
  const liveLossesCount = useTradingStore((s) => s.liveLossesCount);
  const demoCompanyProfit = useTradingStore((s) => s.demoCompanyProfit);
  const liveCompanyProfit = useTradingStore((s) => s.liveCompanyProfit);
  const demoBalance = useTradingStore((s) => s.demoBalance);
  const demoInitialBalance = useTradingStore((s) => s.demoInitialBalance);
  const liveBalance = useTradingStore((s) => s.liveBalance);
  const liveNetFunded = useTradingStore((s) => s.liveNetFunded);
  const tickers = useTradingStore((s) => s.tickers);
  const setActiveSymbol = useTradingStore((s) => s.setActiveSymbol);
  const setRailView = useTradingStore((s) => s.setRailView);
  const cashOutDealEarly = useTradingStore((s) => s.cashOutDealEarly);

  const openDeals = openDealsAll.filter((d) => d.accountType === activeAccountType);
  const dealHistory = dealHistoryAll.filter((d) => d.accountType === activeAccountType);
  const winsCount = activeAccountType === 'LIVE' ? liveWinsCount : demoWinsCount;
  const lossesCount = activeAccountType === 'LIVE' ? liveLossesCount : demoLossesCount;
  const companyProfit = D(
    activeAccountType === 'LIVE' ? liveCompanyProfit : demoCompanyProfit
  );
  const netTotal =
    activeAccountType === 'LIVE'
      ? D(liveBalance).minus(D(liveNetFunded))
      : D(demoBalance).minus(D(demoInitialBalance));

  useEffect(() => {
    if (openDeals.length === 0) return;
    const id = setInterval(() => setNowMs(Date.now()), 150);
    return () => clearInterval(id);
  }, [openDeals.length]);

  const decided = winsCount + lossesCount;
  const winRate = decided > 0 ? ((winsCount / decided) * 100).toFixed(1) : '0.0';
  const totalVolume = dealHistory.reduce((acc, d) => acc.plus(D(d.stake)), new Decimal(0));

  return (
    <section className="flex-1 bg-[#0B1018] flex flex-col min-h-0 overflow-hidden">
      {/* Header & Tabs */}
      <div className="px-5 pt-4 pb-0 bg-[#121722] border-b border-[#1E2635] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setTab('open')}
            className={`pb-3 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              tab === 'open'
                ? 'border-[#38BDF8] text-[#EAECEF]'
                : 'border-transparent text-[#8A94A6] hover:text-[#EAECEF]'
            }`}
          >
            <span>Open Deals</span>
            <span className="font-mono tabular-nums text-[11px] text-[#8A94A6]">
              ({openDeals.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab('closed')}
            className={`pb-3 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              tab === 'closed'
                ? 'border-[#38BDF8] text-[#EAECEF]'
                : 'border-transparent text-[#8A94A6] hover:text-[#EAECEF]'
            }`}
          >
            <span>Closed Deals</span>
            <span className="font-mono tabular-nums text-[11px] text-[#8A94A6]">
              ({dealHistory.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab('stats')}
            className={`pb-3 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'stats'
                ? 'border-[#38BDF8] text-[#EAECEF]'
                : 'border-transparent text-[#8A94A6] hover:text-[#EAECEF]'
            }`}
          >
            Performance Stats
          </button>
        </div>

        <div className="mb-2.5 flex items-center gap-2.5">
          <div className="flex items-center bg-[#0B1018] p-0.5 rounded border border-[#1E2635]">
            <button
              type="button"
              onClick={() => setAccountType('DEMO')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                activeAccountType === 'DEMO'
                  ? 'bg-[#1B2333] text-[#38BDF8]'
                  : 'text-[#8A94A6] hover:text-[#EAECEF]'
              }`}
            >
              Demo
            </button>
            <button
              type="button"
              onClick={() => setAccountType('LIVE')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                activeAccountType === 'LIVE'
                  ? 'bg-[#0ECB81]/20 text-[#0ECB81]'
                  : 'text-[#8A94A6] hover:text-[#EAECEF]'
              }`}
            >
              Live
            </button>
          </div>

          <button
            type="button"
            onClick={() => setRailView('home')}
            className="px-3.5 py-1.5 rounded text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
          >
            Back to Chart
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        {tab === 'open' && (
          <div className="max-w-5xl mx-auto bg-[#121722] border border-[#1E2635] rounded overflow-x-auto">
            {openDeals.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <p className="text-xs text-[#8A94A6]">
                  No active {activeAccountType} deals right now.
                </p>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Return to Home to open a BUY or SELL deal on the live chart.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead className="border-b border-[#1E2635] text-[11px] text-[#8A94A6]">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Asset</th>
                    <th className="py-2.5 px-4 font-medium">Direction</th>
                    <th className="py-2.5 px-4 font-medium text-right">Amount</th>
                    <th className="py-2.5 px-4 font-medium text-right">Strike Price</th>
                    <th className="py-2.5 px-4 font-medium text-right">Live Price</th>
                    <th className="py-2.5 px-4 font-medium text-right">Status</th>
                    <th className="py-2.5 px-4 font-medium text-right">Time Left</th>
                    <th className="py-2.5 px-4 font-medium text-right">Cash Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2635]/70 text-xs">
                  {openDeals.map((deal) => {
                    const mark = D(tickers[deal.symbol].price);
                    const strike = D(deal.strikePrice);
                    const isWinning =
                      deal.direction === 'CALL' ? mark.gt(strike) : mark.lt(strike);
                    const remMs = Math.max(0, deal.expiresAt - nowMs);
                    const canSellEarly = remMs >= 500;
                    const earlyVal = calculateEarlyCashOut(deal, mark, nowMs);

                    return (
                      <tr key={deal.id} className="hover:bg-[#1B2333]/50 transition-colors">
                        <td className="py-2.5 px-4">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSymbol(deal.symbol);
                              setRailView('home');
                            }}
                            className="font-semibold text-[#EAECEF] hover:text-[#38BDF8] cursor-pointer"
                          >
                            {deal.symbol}
                          </button>
                        </td>
                        <td
                          className={`py-2.5 px-4 font-semibold ${
                            deal.direction === 'CALL' ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                          }`}
                        >
                          {deal.direction === 'CALL' ? '▲ BUY' : '▼ SELL'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#EAECEF]">
                          {formatUsd(deal.stake)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#8A94A6]">
                          {INSTRUMENTS[deal.symbol].category === 'FOREX' ? '' : '$'}
                          {formatPrice(deal.strikePrice, deal.symbol)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#EAECEF]">
                          {INSTRUMENTS[deal.symbol].category === 'FOREX' ? '' : '$'}
                          {formatPrice(mark, deal.symbol)}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-mono tabular-nums font-medium ${
                            isWinning ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                          }`}
                        >
                          {isWinning ? `Payout ${formatUsd(deal.payoutAmount)}` : 'Out of Money'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums text-[#F59E0B]">
                          {formatCountdown(remMs)}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {canSellEarly ? (
                            <button
                              type="button"
                              onClick={() => cashOutDealEarly(deal.id)}
                              className="px-2.5 py-1 rounded bg-[#F59E0B] hover:bg-[#e59209] text-[#0B0E11] text-[11px] font-mono font-bold transition-colors cursor-pointer"
                            >
                              Cash Out {formatUsd(earlyVal)}
                            </button>
                          ) : (
                            <span className="text-[11px] font-mono text-[#64748B]">Settling...</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'closed' && (
          <div className="max-w-5xl mx-auto bg-[#121722] border border-[#1E2635] rounded overflow-x-auto">
            {dealHistory.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <p className="text-xs text-[#8A94A6]">
                  No closed {activeAccountType} deals yet.
                </p>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Completed and cashed-out deals appear here.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead className="border-b border-[#1E2635] text-[11px] text-[#8A94A6]">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Closed</th>
                    <th className="py-2.5 px-4 font-medium">Asset</th>
                    <th className="py-2.5 px-4 font-medium">Direction</th>
                    <th className="py-2.5 px-4 font-medium">Result</th>
                    <th className="py-2.5 px-4 font-medium text-right">Amount</th>
                    <th className="py-2.5 px-4 font-medium text-right">Strike</th>
                    <th className="py-2.5 px-4 font-medium text-right">Close Price</th>
                    <th className="py-2.5 px-4 font-medium text-right">Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2635]/70 text-xs">
                  {dealHistory.map((item) => {
                    const net = D(item.netProfit);
                    const resultColor =
                      item.outcome === 'WON'
                        ? 'text-[#0ECB81]'
                        : item.outcome === 'TIE'
                          ? 'text-[#F59E0B]'
                          : item.outcome === 'CASHED_OUT'
                            ? net.gte(0)
                              ? 'text-[#0ECB81]'
                              : 'text-[#8A94A6]'
                            : 'text-[#F6465D]';

                    return (
                      <tr key={item.id} className="hover:bg-[#1B2333]/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono tabular-nums text-[11px] text-[#8A94A6]">
                          {formatTime(item.closedAt)}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-[#EAECEF]">
                          {item.symbol}
                        </td>
                        <td
                          className={`py-2.5 px-4 font-semibold ${
                            item.direction === 'CALL' ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                          }`}
                        >
                          {item.direction === 'CALL' ? '▲ BUY' : '▼ SELL'} ({item.durationSec}s)
                        </td>
                        <td className={`py-2.5 px-4 font-semibold text-[11px] ${resultColor}`}>
                          {item.outcome === 'CASHED_OUT' ? 'CASHED OUT' : item.outcome}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#EAECEF]">
                          {formatUsd(item.stake)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#8A94A6]">
                          {INSTRUMENTS[item.symbol].category === 'FOREX' ? '' : '$'}
                          {formatPrice(item.strikePrice, item.symbol)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#EAECEF]">
                          {INSTRUMENTS[item.symbol].category === 'FOREX' ? '' : '$'}
                          {formatPrice(item.closePrice, item.symbol)}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-mono font-semibold tabular-nums ${
                            net.gt(0)
                              ? 'text-[#0ECB81]'
                              : net.lt(0)
                                ? 'text-[#F6465D]'
                                : 'text-[#8A94A6]'
                          }`}
                        >
                          {formatUsd(net, true)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'stats' && (
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-[#121722] border border-[#1E2635] rounded p-4">
                <div className="text-xs text-[#8A94A6]">Company Profit</div>
                <div
                  className={`mt-1.5 text-xl font-mono font-bold tabular-nums ${
                    companyProfit.gte(0) ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                  }`}
                >
                  {formatUsd(companyProfit, true)}
                </div>
              </div>

              <div className="bg-[#121722] border border-[#1E2635] rounded p-4">
                <div className="text-xs text-[#8A94A6]">
                  {activeAccountType} Trader P&amp;L
                </div>
                <div
                  className={`mt-1.5 text-xl font-mono font-bold tabular-nums ${
                    netTotal.gte(0) ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                  }`}
                >
                  {formatUsd(netTotal, true)}
                </div>
              </div>

              <div className="bg-[#121722] border border-[#1E2635] rounded p-4">
                <div className="text-xs text-[#8A94A6]">Trader Win Rate</div>
                <div className="mt-1.5 text-xl font-mono font-bold tabular-nums text-[#EAECEF]">
                  {winRate}%
                </div>
                <div className="text-[11px] font-mono text-[#8A94A6] mt-0.5">
                  {winsCount}W / {lossesCount}L
                </div>
              </div>

              <div className="bg-[#121722] border border-[#1E2635] rounded p-4">
                <div className="text-xs text-[#8A94A6]">Total Turnover</div>
                <div className="mt-1.5 text-xl font-mono font-bold tabular-nums text-[#EAECEF]">
                  {formatUsd(totalVolume)}
                </div>
              </div>

              <div className="bg-[#121722] border border-[#1E2635] rounded p-4">
                <div className="text-xs text-[#8A94A6]">Completed Deals</div>
                <div className="mt-1.5 text-xl font-mono font-bold tabular-nums text-[#EAECEF]">
                  {dealHistory.length}
                </div>
              </div>
            </div>

            <div className="bg-[#121722] border border-[#1E2635] rounded overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[540px]">
                <thead className="border-b border-[#1E2635] text-[11px] text-[#8A94A6]">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Pair</th>
                    <th className="py-2.5 px-4 font-medium text-right">Payout</th>
                    <th className="py-2.5 px-4 font-medium text-right">Deals</th>
                    <th className="py-2.5 px-4 font-medium text-right">Volume</th>
                    <th className="py-2.5 px-4 font-medium text-right">Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2635]/70 text-xs">
                  {TRADING_PAIRS.map((pair) => {
                    const cfg = INSTRUMENTS[pair];
                    const deals = dealHistory.filter((d) => d.symbol === pair);
                    const vol = deals.reduce((s, d) => s.plus(D(d.stake)), new Decimal(0));
                    const profit = deals.reduce((s, d) => s.plus(D(d.netProfit)), new Decimal(0));

                    return (
                      <tr key={pair} className="hover:bg-[#1B2333]/40">
                        <td className="py-2.5 px-4 font-semibold text-[#EAECEF]">{pair}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#F59E0B]">
                          +{cfg.payoutPercent}%
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#8A94A6]">
                          {deals.length}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#EAECEF]">
                          {formatUsd(vol)}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-mono font-semibold tabular-nums ${
                            profit.gt(0)
                              ? 'text-[#0ECB81]'
                              : profit.lt(0)
                                ? 'text-[#F6465D]'
                                : 'text-[#8A94A6]'
                          }`}
                        >
                          {formatUsd(profit, true)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
