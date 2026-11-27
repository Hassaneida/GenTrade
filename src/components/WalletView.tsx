import { ArrowDownToLine, ArrowUpFromLine, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  D,
  formatKes,
  formatUsd,
  isValidPositiveInput,
  normalizeMpesaPhone,
} from '../lib/decimal';
import { useTradingStore } from '../store/useTradingStore';
import type { AccountType, PaymentMethod } from '../types/trading';

const PAYMENT_METHODS: PaymentMethod[] = [
  'M-Pesa',
  'Instant Card',
  'Bank Transfer',
  'USDT (TRC20)',
];

const QUICK_AMOUNTS = ['10', '50', '100', '500', '1000'] as const;

export function WalletView({
  initialTab = 'overview',
}: {
  initialTab?: 'overview' | 'deposit' | 'withdraw';
}) {
  const activeAccountType = useTradingStore((s) => s.activeAccountType);
  const demoBalance = useTradingStore((s) => s.demoBalance);
  const liveBalance = useTradingStore((s) => s.liveBalance);
  const usdKesRate = useTradingStore((s) => s.usdKesRate);
  const profile = useTradingStore((s) => s.profile);
  const openDeals = useTradingStore((s) => s.openDeals);
  const walletTransactions = useTradingStore((s) => s.walletTransactions);
  const depositFunds = useTradingStore((s) => s.depositFunds);
  const withdrawFunds = useTradingStore((s) => s.withdrawFunds);
  const setAccountType = useTradingStore((s) => s.setAccountType);
  const setRailView = useTradingStore((s) => s.setRailView);

  const [tab, setTab] = useState<'overview' | 'deposit' | 'withdraw'>(initialTab);
  const [targetAccount, setTargetAccount] = useState<AccountType>(
    initialTab === 'deposit' || initialTab === 'withdraw' ? 'LIVE' : activeAccountType
  );
  const [amountInput, setAmountInput] = useState('100');
  const [method, setMethod] = useState<PaymentMethod>('M-Pesa');
  const [mpesaPhone, setMpesaPhone] = useState(profile.mpesaPhone || '254712345678');
  const [isProcessingMpesa, setIsProcessingMpesa] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setTab(initialTab);
    if (initialTab === 'deposit' || initialTab === 'withdraw') {
      setTargetAccount('LIVE');
    }
  }, [initialTab]);

  const targetBalance = targetAccount === 'LIVE' ? liveBalance : demoBalance;
  const liveInPlay = openDeals
    .filter((d) => d.accountType === 'LIVE')
    .reduce((sum, d) => sum.plus(D(d.stake)), D(0));

  const totalLiveDeposited = walletTransactions
    .filter((t) => t.type === 'DEPOSIT' && t.accountType === 'LIVE')
    .reduce((sum, t) => sum.plus(D(t.amount)), D(0));

  const totalLiveWithdrawn = walletTransactions
    .filter((t) => t.type === 'WITHDRAW' && t.accountType === 'LIVE')
    .reduce((sum, t) => sum.plus(D(t.amount)), D(0));

  const parsedAmount = isValidPositiveInput(amountInput) ? D(amountInput) : D(0);
  const kesPreview = parsedAmount.mul(D(usdKesRate));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isValidPositiveInput(amountInput) || parsedAmount.lt(1)) {
      setErrorMsg('Enter a valid amount of at least $1.00.');
      return;
    }

    if (method === 'M-Pesa') {
      const normalized = normalizeMpesaPhone(mpesaPhone);
      if (!normalized) {
        setErrorMsg('Enter a valid M-Pesa number (e.g. 0712345678 or 254712345678).');
        return;
      }

      if (tab === 'withdraw' && parsedAmount.gt(D(targetBalance))) {
        setErrorMsg(`Insufficient ${targetAccount} balance (${formatUsd(targetBalance)}).`);
        return;
      }

      setIsProcessingMpesa(true);
      setTimeout(() => {
        const res =
          tab === 'deposit'
            ? depositFunds(amountInput, 'M-Pesa', targetAccount, normalized)
            : withdrawFunds(amountInput, 'M-Pesa', targetAccount, normalized);
        setIsProcessingMpesa(false);
        if (!res.ok && res.error) {
          setErrorMsg(res.error);
        }
      }, 750);
      return;
    }

    const res =
      tab === 'deposit'
        ? depositFunds(amountInput, method, targetAccount)
        : withdrawFunds(amountInput, method, targetAccount);

    if (!res.ok && res.error) {
      setErrorMsg(res.error);
    }
  };

  return (
    <section className="flex-1 bg-[#0B1018] p-5 lg:p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[#EAECEF]">Wallet &amp; Accounts</h1>
            <p className="text-xs text-[#8A94A6] mt-0.5">
              Fund your Real Live Account via M-Pesa, card, or crypto, or switch back to Demo.
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => {
              setAccountType('LIVE');
              setTargetAccount('LIVE');
            }}
            className={`text-left bg-[#121722] border rounded p-4 transition-colors cursor-pointer ${
              activeAccountType === 'LIVE'
                ? 'border-[#0ECB81]'
                : 'border-[#1E2635] hover:border-[#0ECB81]/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8A94A6]">Live Account</span>
              {activeAccountType === 'LIVE' && (
                <span className="text-[10px] font-semibold text-[#0ECB81]">ACTIVE</span>
              )}
            </div>
            <div className="mt-1.5 text-xl font-mono font-bold tabular-nums text-[#0ECB81]">
              {formatUsd(liveBalance)}
            </div>
            {liveInPlay.gt(0) && (
              <div className="text-[11px] font-mono text-[#8A94A6] mt-0.5 tabular-nums">
                {formatUsd(liveInPlay)} in active deals
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setAccountType('DEMO');
              setTargetAccount('DEMO');
            }}
            className={`text-left bg-[#121722] border rounded p-4 transition-colors cursor-pointer ${
              activeAccountType === 'DEMO'
                ? 'border-[#38BDF8]'
                : 'border-[#1E2635] hover:border-[#38BDF8]/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8A94A6]">Demo Account</span>
              {activeAccountType === 'DEMO' && (
                <span className="text-[10px] font-semibold text-[#38BDF8]">ACTIVE</span>
              )}
            </div>
            <div className="mt-1.5 text-xl font-mono font-bold tabular-nums text-[#38BDF8]">
              {formatUsd(demoBalance)}
            </div>
          </button>

          <div className="bg-[#121722] border border-[#1E2635] rounded p-4">
            <div className="text-xs text-[#8A94A6]">Live Total Deposited</div>
            <div className="mt-1.5 text-xl font-mono font-bold tabular-nums text-[#EAECEF]">
              {formatUsd(totalLiveDeposited)}
            </div>
          </div>

          <div className="bg-[#121722] border border-[#1E2635] rounded p-4">
            <div className="text-xs text-[#8A94A6]">Live Total Withdrawn</div>
            <div className="mt-1.5 text-xl font-mono font-bold tabular-nums text-[#EAECEF]">
              {formatUsd(totalLiveWithdrawn)}
            </div>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-2 border-b border-[#1E2635]">
          <button
            type="button"
            onClick={() => {
              setTab('overview');
              setErrorMsg(null);
            }}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              tab === 'overview'
                ? 'border-[#38BDF8] text-[#EAECEF]'
                : 'border-transparent text-[#8A94A6] hover:text-[#EAECEF]'
            }`}
          >
            Transactions ({walletTransactions.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('deposit');
              setErrorMsg(null);
            }}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              tab === 'deposit'
                ? 'border-[#0ECB81] text-[#0ECB81]'
                : 'border-transparent text-[#8A94A6] hover:text-[#EAECEF]'
            }`}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            Deposit
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('withdraw');
              setErrorMsg(null);
            }}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              tab === 'withdraw'
                ? 'border-[#F59E0B] text-[#F59E0B]'
                : 'border-transparent text-[#8A94A6] hover:text-[#EAECEF]'
            }`}
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            Withdraw
          </button>
        </div>

        {/* Deposit / Withdraw Form */}
        {(tab === 'deposit' || tab === 'withdraw') && (
          <form
            onSubmit={handleSubmit}
            className="bg-[#121722] border border-[#1E2635] rounded p-5 max-w-xl space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[#EAECEF]">
                  {tab === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}
                </h2>
                <p className="text-xs text-[#8A94A6] mt-0.5">
                  {tab === 'deposit'
                    ? `Credit your ${targetAccount} wallet instantly.`
                    : `Available in ${targetAccount}: ${formatUsd(targetBalance)}`}
                </p>
              </div>

              <div className="flex items-center bg-[#0B1018] p-0.5 rounded border border-[#1E2635]">
                <button
                  type="button"
                  onClick={() => setTargetAccount('LIVE')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    targetAccount === 'LIVE'
                      ? 'bg-[#0ECB81]/20 text-[#0ECB81]'
                      : 'text-[#8A94A6] hover:text-[#EAECEF]'
                  }`}
                >
                  Live Account
                </button>
                <button
                  type="button"
                  onClick={() => setTargetAccount('DEMO')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    targetAccount === 'DEMO'
                      ? 'bg-[#1B2333] text-[#38BDF8]'
                      : 'text-[#8A94A6] hover:text-[#EAECEF]'
                  }`}
                >
                  Demo Account
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#8A94A6] mb-1.5">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMethod(m);
                      setErrorMsg(null);
                    }}
                    className={`py-2 px-3 rounded text-xs font-medium border text-left transition-colors cursor-pointer flex items-center justify-between ${
                      method === m
                        ? m === 'M-Pesa'
                          ? 'bg-[#0ECB81]/15 border-[#0ECB81] text-[#0ECB81]'
                          : 'bg-[#1B2333] border-[#38BDF8] text-[#EAECEF]'
                        : 'bg-[#0E131B] border-[#1E2635] text-[#8A94A6] hover:text-[#EAECEF]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {m === 'M-Pesa' && <Smartphone className="w-3.5 h-3.5" />}
                      {m}
                    </span>
                    {m === 'M-Pesa' && (
                      <span className="text-[10px] font-mono opacity-80">KES / Instant</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {method === 'M-Pesa' && (
              <div>
                <label htmlFor="mpesa-phone" className="block text-xs text-[#8A94A6] mb-1.5">
                  Safaricom M-Pesa Phone Number
                </label>
                <input
                  id="mpesa-phone"
                  type="tel"
                  value={mpesaPhone}
                  onChange={(e) => {
                    setMpesaPhone(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="0712345678 or 254712345678"
                  className="w-full bg-[#0E131B] border border-[#1E2635] focus:border-[#0ECB81] rounded px-3 py-2.5 text-sm font-mono text-[#EAECEF] outline-none"
                />
                <div className="mt-1 text-[11px] text-[#8A94A6]">
                  {tab === 'deposit'
                    ? 'An M-Pesa STK Push prompt will be sent to this phone number.'
                    : 'Funds will be disbursed directly to this M-Pesa mobile wallet.'}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="wallet-amount" className="text-xs text-[#8A94A6]">
                  Amount (USD)
                </label>
                {method === 'M-Pesa' && (
                  <span className="text-[11px] font-mono text-[#0ECB81] tabular-nums">
                    ≈ {formatKes(kesPreview)} (1 USD = {usdKesRate} KES)
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#8A94A6]">
                  $
                </span>
                <input
                  id="wallet-amount"
                  type="number"
                  min="1"
                  step="any"
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full bg-[#0E131B] border border-[#1E2635] focus:border-[#38BDF8] rounded pl-7 pr-4 py-2.5 text-sm font-mono font-semibold tabular-nums text-[#EAECEF] outline-none"
                />
              </div>

              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setAmountInput(amt);
                      setErrorMsg(null);
                    }}
                    className={`py-1.5 rounded text-[11px] font-mono tabular-nums border transition-colors cursor-pointer ${
                      amountInput === amt
                        ? 'bg-[#1B2333] border-[#38BDF8] text-[#38BDF8]'
                        : 'bg-[#0E131B] border-[#1E2635] text-[#8A94A6] hover:text-[#EAECEF]'
                    }`}
                  >
                    ${Number(amt) >= 1000 ? `${Number(amt) / 1000}k` : amt}
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="text-xs text-[#F6465D] bg-[#F6465D]/10 border border-[#F6465D]/30 rounded px-3 py-2"
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessingMpesa}
              className={`w-full py-2.5 rounded text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 ${
                tab === 'deposit'
                  ? 'bg-[#0ECB81] hover:bg-[#0bb874] text-[#0B0E11]'
                  : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
              }`}
            >
              {isProcessingMpesa
                ? 'Sending M-Pesa STK Push...'
                : method === 'M-Pesa'
                  ? tab === 'deposit'
                    ? `Deposit ${formatUsd(parsedAmount)} (${formatKes(kesPreview)}) via M-Pesa`
                    : `Withdraw ${formatUsd(parsedAmount)} (${formatKes(kesPreview)}) to M-Pesa`
                  : tab === 'deposit'
                    ? `Confirm Deposit to ${targetAccount}`
                    : `Confirm Withdrawal from ${targetAccount}`}
            </button>
          </form>
        )}

        {/* Transactions Table */}
        <div className="bg-[#121722] border border-[#1E2635] rounded overflow-x-auto">
          <div className="px-4 py-3 border-b border-[#1E2635] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#EAECEF]">Recent Wallet Activity</span>
            {tab === 'overview' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetAccount('LIVE');
                    setMethod('M-Pesa');
                    setTab('deposit');
                  }}
                  className="px-3 py-1 rounded text-[11px] font-semibold bg-[#0ECB81] text-[#0B0E11] cursor-pointer"
                >
                  + Deposit M-Pesa
                </button>
                <button
                  type="button"
                  onClick={() => setTab('withdraw')}
                  className="px-3 py-1 rounded text-[11px] font-semibold bg-[#1B2333] text-[#EAECEF] border border-[#263147] cursor-pointer"
                >
                  Withdraw
                </button>
              </div>
            )}
          </div>

          {walletTransactions.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#8A94A6]">
              No deposits or withdrawals yet. Use M-Pesa above to fund your Live Account.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead className="border-b border-[#1E2635] text-[11px] text-[#8A94A6]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Date &amp; Time</th>
                  <th className="py-2.5 px-4 font-medium">Account</th>
                  <th className="py-2.5 px-4 font-medium">Type</th>
                  <th className="py-2.5 px-4 font-medium">Method &amp; Reference</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2635]/70 text-xs">
                {walletTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#1B2333]/40">
                    <td className="py-2.5 px-4 font-mono tabular-nums text-[11px] text-[#8A94A6]">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td
                      className={`py-2.5 px-4 font-mono font-semibold text-[11px] ${
                        tx.accountType === 'LIVE' ? 'text-[#0ECB81]' : 'text-[#38BDF8]'
                      }`}
                    >
                      {tx.accountType}
                    </td>
                    <td
                      className={`py-2.5 px-4 font-semibold ${
                        tx.type === 'DEPOSIT' ? 'text-[#0ECB81]' : 'text-[#F59E0B]'
                      }`}
                    >
                      {tx.type}
                    </td>
                    <td className="py-2.5 px-4 text-[#EAECEF]">
                      <span>{tx.method}</span>
                      {tx.accountRef && (
                        <span className="ml-2 font-mono text-[11px] text-[#8A94A6]">
                          +{tx.accountRef}
                        </span>
                      )}
                      {tx.kesAmount && (
                        <span className="ml-2 font-mono text-[11px] text-[#0ECB81]">
                          ({formatKes(tx.kesAmount)})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[#0ECB81] text-[11px]">{tx.status}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums text-[#EAECEF]">
                      {tx.type === 'DEPOSIT' ? '+' : '-'}
                      {formatUsd(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
