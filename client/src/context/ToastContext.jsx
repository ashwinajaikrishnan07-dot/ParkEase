import { createContext, useCallback, useMemo, useState } from 'react';
import { CircleCheck, CircleX, Info } from 'lucide-react';

export const ToastContext = createContext(null);

let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message, variant = 'info') => {
    const id = (nextId += 1);
    setToasts((current) => [...current, { id, message, variant }]);
    setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  const value = useMemo(() => ({
    notify,
    success: (message) => notify(message, 'success'),
    error: (message) => notify(message, 'error'),
  }), [notify]);

  const icons = { success: CircleCheck, error: CircleX, info: Info };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="toast-stack">
        {toasts.map((toast) => {
          const Icon = icons[toast.variant] || Info;
          return (
            <div className={`toast toast-${toast.variant}`} key={toast.id} role="status" onClick={() => dismiss(toast.id)}>
              <Icon size={18} />
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
