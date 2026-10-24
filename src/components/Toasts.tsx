import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { uid } from '../lib/story';

interface ToastItem {
  id: string;
  title: string;
  detail?: string;
  tone: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  toast: (title: string, options?: { detail?: string; tone?: ToastItem['tone'] }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const toast = useCallback((title: string, options?: { detail?: string; tone?: ToastItem['tone'] }) => {
    const id = uid();
    const item = { id, title, detail: options?.detail, tone: options?.tone ?? 'success' } as ToastItem;
    setItems((current) => [...current.slice(-2), item]);
    window.setTimeout(() => dismiss(id), options?.tone === 'error' ? 6500 : 4200);
  }, [dismiss]);
  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {items.map((item) => {
          const Icon = item.tone === 'success' ? CheckCircle2 : item.tone === 'error' ? AlertCircle : Info;
          return (
            <div className={`toast toast-${item.tone}`} key={item.id} role="status">
              <Icon size={19} strokeWidth={1.8} />
              <div className="toast-copy">
                <strong>{item.title}</strong>
                {item.detail && <span>{item.detail}</span>}
              </div>
              <button className="icon-button quiet" onClick={() => dismiss(item.id)} aria-label="Dismiss notification"><X size={16} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider.');
  return context;
}
