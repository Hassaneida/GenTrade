import { useEffect } from 'react';
import { DealPanel } from './components/DealPanel';
import { DealsDrawer } from './components/DealsDrawer';
import { HeaderBar } from './components/HeaderBar';
import { LeftRail } from './components/LeftRail';
import { ForexMarketView } from './components/MarketSidebar';
import { OptionChart } from './components/OptionChart';
import { ProfileView } from './components/ProfileView';
import { ToastContainer } from './components/ToastContainer';
import { WalletView } from './components/WalletView';
import { formatPrice } from './lib/decimal';
import { INSTRUMENTS } from './lib/instruments';
import { startMarketDataStream } from './lib/marketData';
import { useTradingStore } from './store/useTradingStore';

export default function App() {
  const activeAccountType = useTradingStore((s) => s.activeAccountType);
  const processTickerUpdate = useTradingStore((s) => s.processTickerUpdate);
  const settleExpiredDeals = useTradingStore((s) => s.settleExpiredDeals);
  const setConnectionMode = useTradingStore((s) => s.setConnectionMode);
  const setUsdKesRate = useTradingStore((s) => s.setUsdKesRate);
  const activeSymbol = useTradingStore((s) => s.activeSymbol);
  const activePrice = useTradingStore((s) => s.tickers[s.activeSymbol].price);
  const railView = useTradingStore((s) => s.railView);

  useEffect(() => {
    const stopStream = startMarketDataStream(
      {
        onTickerUpdate: (symbol, update) => {
          processTickerUpdate(symbol, update);
        },
        onUsdKesRateUpdate: (rate) => {
          setUsdKesRate(rate);
        },
        onConnectionModeChange: (mode) => {
          setConnectionMode(mode);
        },
        getSymbolExposureBias: (symbol) => {
          const state = useTradingStore.getState();
          let net = 0;
          for (const d of state.openDeals) {
            if (d.symbol !== symbol || d.accountType !== state.activeAccountType) continue;
            const stake = Number(d.stake) || 0;
            net += d.direction === 'CALL' ? stake : -stake;
          }
          return net > 0 ? 1 : net < 0 ? -1 : 0;
        },
      },
      activeAccountType
    );

    const settleInterval = setInterval(() => {
      settleExpiredDeals();
    }, 150);

    return () => {
      stopStream();
      clearInterval(settleInterval);
    };
  }, [activeAccountType, processTickerUpdate, settleExpiredDeals, setConnectionMode, setUsdKesRate]);

  useEffect(() => {
    const isFx = INSTRUMENTS[activeSymbol].category === 'FOREX';
    const prefix = isFx ? '' : '$';
    document.title = `${prefix}${formatPrice(activePrice, activeSymbol)} ${activeSymbol} · ${activeAccountType} · ExpertTrade`;
  }, [activePrice, activeSymbol, activeAccountType]);

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[#0B1018] text-[#EAECEF] lg:overflow-hidden">
      <HeaderBar />

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <LeftRail />

        {/* Home View: ONLY Chart Simulator + Buy/Sell (Cash Out) + Amount & Duration */}
        {railView === 'home' && (
          <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px]">
            <OptionChart />
            <DealPanel />
          </main>
        )}

        {railView === 'markets' && <ForexMarketView />}
        {railView === 'deals' && <DealsDrawer />}
        {railView === 'wallet' && <WalletView key="wallet" initialTab="overview" />}
        {railView === 'deposit' && <WalletView key="deposit" initialTab="deposit" />}
        {railView === 'withdraw' && <WalletView key="withdraw" initialTab="withdraw" />}
        {railView === 'profile' && <ProfileView />}
      </div>

      <ToastContainer />
    </div>
  );
}
