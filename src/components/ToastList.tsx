import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastItem } from '../types/converter';

interface ToastListProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastList({ toasts, onDismiss }: ToastListProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed top-20 right-4 left-4 z-50 flex flex-col items-end gap-2 sm:top-auto sm:right-5 sm:bottom-5 sm:left-auto"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-medium text-foreground shadow-lg"
        >
          {toast.variant === 'success' && (
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
          )}
          {toast.variant === 'error' && (
            <AlertCircle
              className="h-4 w-4 shrink-0 text-danger"
              aria-hidden="true"
            />
          )}
          {toast.variant === 'info' && (
            <Info
              className="h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="text-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
