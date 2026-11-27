import { ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { D, formatPercent, formatPrice, formatUsd } from '../lib/decimal';
import { INSTRUMENTS } from '../lib/instruments';
import { useTradingStore } from '../store/useTradingStore';

export function HeaderBar() {
  const activeSymbol = useTradingStore((s) => s.activeSymbol);
  const setRailView = useTradingStore((s) => s.setRailView);
  const tickers = useTradingStore((s) => s.tickers);
  const activeAccountType = useTradingStore((s) => s.activeAccountType);
  const setAccountType = useTradingStore((s) => s.setAccountType);
  const demoBalance = useTradingStore((s) => s.demoBalance);
  const liveBalance = useTradingStore((s) => s.liveBalance);
  const openDeals = useTradingStore((s) => s.openDeals);
  const soundEnabled = useTradingStore((s) => s.soundEnabled);
  const toggleSound = useTradingStore((s) => s.toggleSound);

  const cfg = INSTRUMENTS[activeSymbol];
  const ticker = tickers[activeSymbol];
  const change = D(ticker.change24hPercent);
  const isPositive = change.gte(0);

  const activeBalance = activeAccountType === 'LIVE' ? liveBalance : demoBalance;
  const lockedInDeals = openDeals
    .filter((d) => d.accountType === activeAccountType)
    .reduce((sum, d) => sum.plus(D(d.stake)), D(0));

  return (
    <header className="w-full bg-[#121722] border-b border-[#1E2635] px-3 lg:px-4 py-2 flex items-center justify-between gap-3">
      {/* Left: Brand & Active Market Button */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={() => setRailView('home')}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer"
        >
          <div className="w-7 h-7 rounded bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm tracking-tight">
            E
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[#EAECEF] whitespace-nowrap">
            ExpertTrade
          </span>
        </button>

        <div className="hidden sm:block h-5 w-px bg-[#1E2635]" aria-hidden="true" />

        <button
          type="button"
          onClick={() => setRailView('markets')}
          className="flex items-center gap-2.5 px-2.5 py-1 rounded bg-[#0E131B] border border-[#1E2635] hover:border-[#38BDF8]/60 transition-colors cursor-pointer shrink-0"
          title="Switch currency pair"
        >
          <span className="text-xs font-semibold text-[#EAECEF] whitespace-nowrap">
            {cfg.baseAsset}/{cfg.quoteAsset}
          </span>
          <span className="text-[11px] font-mono font-semibold text-[#F59E0B] tabular-nums">
            +{cfg.payoutPercent}%
          </span>
          <span className="text-xs font-mono tabular-nums text-[#EAECEF] hidden sm:inline">
            {cfg.category === 'FOREX' ? '' : '$'}
            {formatPrice(ticker.price, activeSymbol)}
          </span>
          <span
            className={`text-[11px] font-mono tabular-nums hidden md:inline ${
              isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'
            }`}
          >
            {formatPercent(change)}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[#8A94A6]" />
        </button>
      </div>

      {/* Right: Account Switcher (Demo / Live), Wallet Balance, Sound, Deposit */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-auto">
        <div
          className="flex items-center bg-[#0B1018] p-0.5 rounded border border-[#1E2635]"
          role="group"
          aria-label="Account mode switcher"
        >
          <button
            type="button"
            aria-pressed={activeAccountType === 'DEMO'}
            onClick={() => setAccountType('DEMO')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeAccountType === 'DEMO'
                ? 'bg-[#1B2333] text-[#38BDF8]'
                : 'text-[#8A94A6] hover:text-[#EAECEF]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                activeAccountType === 'DEMO' ? 'bg-[#38BDF8]' : 'bg-[#64748B]'
              }`}
              aria-hidden="true"
            />
            Demo
          </button>
          <button
            type="button"
            aria-pressed={activeAccountType === 'LIVE'}
            onClick={() => setAccountType('LIVE')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeAccountType === 'LIVE'
                ? 'bg-[#0ECB81]/20 text-[#0ECB81]'
                : 'text-[#8A94A6] hover:text-[#EAECEF]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                activeAccountType === 'LIVE' ? 'bg-[#0ECB81] animate-pulse' : 'bg-[#64748B]'
              }`}
              aria-hidden="true"
            />
            Live
          </button>
        </div>

        <button
          type="button"
          onClick={() => setRailView('wallet')}
          className="text-right cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="text-[11px] text-[#8A94A6] leading-tight whitespace-nowrap">
            {activeAccountType === 'LIVE' ? 'Live Account' : 'Demo Account'}
            {lockedInDeals.gt(0) && (
              <span className="ml-1.5 font-mono text-[#38BDF8] tabular-nums hidden sm:inline">
                ({formatUsd(lockedInDeals)} in play)
              </span>
            )}
          </div>
          <div
            className={`text-sm font-mono font-bold tabular-nums whitespace-nowrap ${
              activeAccountType === 'LIVE' ? 'text-[#0ECB81]' : 'text-[#38BDF8]'
            }`}
          >
            {formatUsd(activeBalance)}
          </div>
        </button>

        <button
          type="button"
          onClick={toggleSound}
          aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          className="p-2 rounded bg-[#1B2333] hover:bg-[#232D42] border border-[#263147] text-[#8A94A6] hover:text-[#EAECEF] transition-colors cursor-pointer hidden sm:inline-flex"
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-[#38BDF8]" />
          ) : (
            <VolumeX className="w-3.5 h-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setRailView('deposit')}
          className="px-3 py-1.5 rounded text-xs font-semibold bg-[#0ECB81] hover:bg-[#0bb874] text-[#0B0E11] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          Deposit
        </button>
      </div>
    </header>
  );
}
