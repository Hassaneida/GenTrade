import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Globe,
  History,
  Home,
  User,
  Wallet,
} from 'lucide-react';
import { useTradingStore } from '../store/useTradingStore';
import type { RailView } from '../types/trading';

const SIDE_MENU_ITEMS: { id: RailView; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'markets', label: 'Forex Market', icon: Globe },
  { id: 'deals', label: 'Deals', icon: History },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'deposit', label: 'Deposit', icon: ArrowDownToLine },
  { id: 'withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
  { id: 'profile', label: 'Profile', icon: User },
];

export function LeftRail() {
  const railView = useTradingStore((s) => s.railView);
  const setRailView = useTradingStore((s) => s.setRailView);
  const activeAccountType = useTradingStore((s) => s.activeAccountType);
  const openDealsCount = useTradingStore(
    (s) => s.openDeals.filter((d) => d.accountType === activeAccountType).length
  );

  return (
    <aside className="bg-[#121722] border-b lg:border-b-0 lg:border-r border-[#1E2635] lg:w-44 flex lg:flex-col items-center lg:items-stretch gap-1 p-2 overflow-x-auto shrink-0">
      {SIDE_MENU_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = railView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setRailView(item.id)}
            className={`px-3 py-2.5 rounded flex items-center justify-between gap-2.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              active
                ? 'bg-[#1B2333] text-[#38BDF8]'
                : 'text-[#8A94A6] hover:text-[#EAECEF] hover:bg-[#1B2333]/50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </span>
            {item.id === 'deals' && openDealsCount > 0 && (
              <span className="text-[11px] font-mono font-semibold text-[#F59E0B] tabular-nums">
                {openDealsCount}
              </span>
            )}
          </button>
        );
      })}
    </aside>
  );
}
