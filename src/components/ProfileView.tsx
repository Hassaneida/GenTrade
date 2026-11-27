import { RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { D, formatUsd, normalizeMpesaPhone } from '../lib/decimal';
import { useTradingStore } from '../store/useTradingStore';

export function ProfileView() {
  const profile = useTradingStore((s) => s.profile);
  const updateProfile = useTradingStore((s) => s.updateProfile);
  const activeAccountType = useTradingStore((s) => s.activeAccountType);
  const setAccountType = useTradingStore((s) => s.setAccountType);
  const demoBalance = useTradingStore((s) => s.demoBalance);
  const liveBalance = useTradingStore((s) => s.liveBalance);
  const demoInitialBalance = useTradingStore((s) => s.demoInitialBalance);
  const liveNetFunded = useTradingStore((s) => s.liveNetFunded);
  const demoWinsCount = useTradingStore((s) => s.demoWinsCount);
  const demoLossesCount = useTradingStore((s) => s.demoLossesCount);
  const liveWinsCount = useTradingStore((s) => s.liveWinsCount);
  const liveLossesCount = useTradingStore((s) => s.liveLossesCount);
  const dealHistory = useTradingStore((s) => s.dealHistory);
  const soundEnabled = useTradingStore((s) => s.soundEnabled);
  const toggleSound = useTradingStore((s) => s.toggleSound);
  const resetDemoAccount = useTradingStore((s) => s.resetDemoAccount);
  const setRailView = useTradingStore((s) => s.setRailView);

  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [handle, setHandle] = useState(profile.handle);
  const [country, setCountry] = useState(profile.country);
  const [mpesaPhone, setMpesaPhone] = useState(profile.mpesaPhone || '254712345678');
  const [confirmReset, setConfirmReset] = useState(false);

  const winsCount = activeAccountType === 'LIVE' ? liveWinsCount : demoWinsCount;
  const lossesCount = activeAccountType === 'LIVE' ? liveLossesCount : demoLossesCount;
  const decided = winsCount + lossesCount;
  const winRate = decided > 0 ? ((winsCount / decided) * 100).toFixed(1) : '0.0';
  const netProfit =
    activeAccountType === 'LIVE'
      ? D(liveBalance).minus(D(liveNetFunded))
      : D(demoBalance).minus(D(demoInitialBalance));
  const accountDealsCount = dealHistory.filter(
    (d) => d.accountType === activeAccountType
  ).length;

  const initials =
    profile.fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('') || 'ET';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhone = normalizeMpesaPhone(mpesaPhone) || mpesaPhone.trim();
    updateProfile({
      fullName: fullName.trim() || 'Trader',
      email: email.trim() || 'trader@experttrade.app',
      handle: handle.trim() || '@trader',
      country: country.trim() || 'Kenya',
      mpesaPhone: normalizedPhone,
    });
  };

  return (
    <section className="flex-1 bg-[#0B1018] p-5 lg:p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[#EAECEF]">Trader Profile</h1>
            <p className="text-xs text-[#8A94A6] mt-0.5">
              Manage your identity, M-Pesa payout number, and Live/Demo account preferences.
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

        {/* Profile Banner & Stats */}
        <div className="bg-[#121722] border border-[#1E2635] rounded p-5 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-bold text-lg">
              {initials}
            </div>
            <div>
              <div className="text-base font-semibold text-[#EAECEF]">{profile.fullName}</div>
              <div className="text-xs text-[#8A94A6] font-mono">
                {profile.handle} · {profile.accountTier} · {profile.country}
              </div>
              <div className="text-[11px] font-mono text-[#0ECB81] mt-0.5">
                Live: {formatUsd(liveBalance)} · Demo: {formatUsd(demoBalance)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <div className="text-[11px] text-[#8A94A6]">
                {activeAccountType} Win Rate
              </div>
              <div className="text-sm font-mono font-bold tabular-nums text-[#EAECEF]">
                {winRate}% ({winsCount}W/{lossesCount}L)
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#8A94A6]">Deals</div>
              <div className="text-sm font-mono font-bold tabular-nums text-[#EAECEF]">
                {accountDealsCount}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#8A94A6]">Net Profit</div>
              <div
                className={`text-sm font-mono font-bold tabular-nums ${
                  netProfit.gte(0) ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                }`}
              >
                {formatUsd(netProfit, true)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Edit Details Form */}
          <form
            onSubmit={handleSave}
            className="bg-[#121722] border border-[#1E2635] rounded p-5 space-y-4"
          >
            <h2 className="text-sm font-semibold text-[#EAECEF]">Account Details</h2>

            <div>
              <label htmlFor="profile-name" className="block text-xs text-[#8A94A6] mb-1">
                Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#0E131B] border border-[#1E2635] focus:border-[#38BDF8] rounded px-3 py-2 text-xs text-[#EAECEF] outline-none"
              />
            </div>

            <div>
              <label htmlFor="profile-email" className="block text-xs text-[#8A94A6] mb-1">
                Email Address
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0E131B] border border-[#1E2635] focus:border-[#38BDF8] rounded px-3 py-2 text-xs text-[#EAECEF] outline-none"
              />
            </div>

            <div>
              <label htmlFor="profile-mpesa" className="block text-xs text-[#8A94A6] mb-1">
                M-Pesa Mobile Number
              </label>
              <input
                id="profile-mpesa"
                type="tel"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="254712345678"
                className="w-full bg-[#0E131B] border border-[#1E2635] focus:border-[#0ECB81] rounded px-3 py-2 text-xs font-mono text-[#EAECEF] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="profile-handle" className="block text-xs text-[#8A94A6] mb-1">
                  Handle
                </label>
                <input
                  id="profile-handle"
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full bg-[#0E131B] border border-[#1E2635] focus:border-[#38BDF8] rounded px-3 py-2 text-xs font-mono text-[#EAECEF] outline-none"
                />
              </div>
              <div>
                <label htmlFor="profile-country" className="block text-xs text-[#8A94A6] mb-1">
                  Country
                </label>
                <input
                  id="profile-country"
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-[#0E131B] border border-[#1E2635] focus:border-[#38BDF8] rounded px-3 py-2 text-xs text-[#EAECEF] outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-colors cursor-pointer"
            >
              Save Profile
            </button>
          </form>

          {/* Account Mode, Preferences & Demo Reset */}
          <div className="bg-[#121722] border border-[#1E2635] rounded p-5 space-y-5">
            <h2 className="text-sm font-semibold text-[#EAECEF]">Account &amp; Preferences</h2>

            <div className="flex items-center justify-between py-2 border-b border-[#1E2635]">
              <div>
                <div className="text-xs font-medium text-[#EAECEF]">Active Trading Account</div>
                <div className="text-[11px] text-[#8A94A6]">
                  Switch between Real Live funds and $100k Demo practice funds.
                </div>
              </div>
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
            </div>

            <div className="flex items-center justify-between py-2 border-b border-[#1E2635]">
              <div>
                <div className="text-xs font-medium text-[#EAECEF]">Trade Sound Effects</div>
                <div className="text-[11px] text-[#8A94A6]">
                  Play audio feedback on trade execution and payout wins.
                </div>
              </div>
              <button
                type="button"
                onClick={toggleSound}
                className="px-3 py-1.5 rounded bg-[#1B2333] border border-[#263147] text-xs font-medium text-[#EAECEF] flex items-center gap-1.5 cursor-pointer"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#38BDF8]" />
                    Enabled
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-[#8A94A6]" />
                    Muted
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <div className="text-xs font-medium text-[#EAECEF]">Reset Demo Account</div>
                <div className="text-[11px] text-[#8A94A6]">
                  Restore Demo balance to $100,000.00. Your Live Account funds remain untouched.
                </div>
              </div>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-semibold bg-[#1B2333] hover:bg-[#F6465D] text-[#EAECEF] hover:text-white border border-[#263147] hover:border-[#F6465D] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reload $100,000 Demo Balance
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetDemoAccount();
                      setConfirmReset(false);
                    }}
                    className="px-3.5 py-2 rounded text-xs font-semibold bg-[#F6465D] hover:bg-[#e03a50] text-white cursor-pointer"
                  >
                    Confirm Demo Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3.5 py-2 rounded text-xs font-medium bg-[#1B2333] text-[#EAECEF] border border-[#263147] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
