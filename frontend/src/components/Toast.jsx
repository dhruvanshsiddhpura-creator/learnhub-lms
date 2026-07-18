import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onRemove }) => {
  const { id, message, type, duration } = toast;
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsClosing(true);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  useEffect(() => {
    if (isClosing) {
      const timer = setTimeout(() => {
        onRemove(id);
      }, 300); // Wait for exit animation
      return () => clearTimeout(timer);
    }
  }, [isClosing, id, onRemove]);

  const icons = {
    success: <CheckCircle className="text-emerald-400" size={18} />,
    error: <AlertCircle className="text-red-400" size={18} />,
    warning: <AlertTriangle className="text-amber-400" size={18} />,
    info: <Info className="text-blue-400" size={18} />
  };

  const bgColors = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100',
    error: 'bg-red-500/10 border-red-500/20 text-red-100',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-100',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-100'
  };

  return (
    <div 
      className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-lg pointer-events-auto transition-all duration-300 transform 
        ${bgColors[type] || bgColors.info}
        ${isClosing ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}
      `}
      style={{ animation: 'slide-in-right 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
    >
      <div className="mt-0.5 shrink-0">{icons[type] || icons.info}</div>
      <p className="text-sm font-medium flex-1 mr-4">{message}</p>
      <button 
        onClick={() => setIsClosing(true)}
        className="text-white/50 hover:text-white shrink-0 mt-0.5 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};
