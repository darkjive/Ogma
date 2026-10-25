import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { TOAST_EVENT, type ToastItem, type ToastKind } from '../lib/toast';

const KIND_CLASSES: Record<ToastKind, string> = {
  error: 'error',
  success: '',
  info: 'info',
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const item = (e as CustomEvent).detail as ToastItem;
      setToasts(prev => [...prev, item]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== item.id));
      }, 6000);
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, []);

  return (
    <div className="ds-toasts" aria-live="polite">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`ds-toast ${KIND_CLASSES[t.kind]}`}
          role={t.kind === 'error' ? 'alert' : 'status'}
        >
          <span className="ds-toast-text whitespace-pre-wrap">{t.message}</span>
          <button
            type="button"
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            className="ds-btn ghost sm icon"
            aria-label="Schließen"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
