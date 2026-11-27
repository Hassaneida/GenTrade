import { CheckCircle2, Info, X, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useTradingStore } from '../store/useTradingStore';

export function ToastContainer() {
  const toasts = useTradingStore((s) => s.toasts);
  const dismissToast = useTradingStore((s) => s.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      setTimeout(() => {
        dismissToast(toast.id);
      }, 4500)
    );
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const icon =
          toast.variant === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#0ECB81] shrink-0 mt-0.5" />
          ) : toast.variant === 'error' ? (
            <AlertCircle className="w-4 h-4 text-[#F6465D] shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-[#F0B90B] shrink-0 mt-0.5" />
          );

        const borderClass =
          toast.variant === 'success'
            ? 'border-[#0ECB81]/40'
            : toast.variant === 'error'
              ? 'border-[#F6465D]/40'
              : 'border-[#2B3139]';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-[#161A1E] border ${borderClass} rounded-md p-3 shadow-xl flex items-start gap-2.5`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#EAECEF]">{toast.title}</div>
              <div className="text-xs text-[#848E9C] mt-0.5 font-mono tabular-nums break-words">
                {toast.description}
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-[#848E9C] hover:text-[#EAECEF] cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
