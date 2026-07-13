import React from 'react';

interface ToastProps {
  message: string;
  icon?: string;
  type?: 'therapy' | 'intent';
  onDismiss?: () => void;
  actionText?: string;
  onAction?: () => void;
}

export function Toast({ message, icon = 'info', type = 'therapy', onDismiss, actionText, onAction }: ToastProps) {
  if (type === 'intent') {
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm bg-primary text-white px-4 py-3 rounded-2xl shadow-xl flex flex-col gap-2 border border-primary-container">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary animate-pulse text-2xl">spatial_audio</span>
          <div className="flex-1">
            <p className="text-[10px] font-bold font-callout text-tertiary uppercase tracking-widest leading-none">Asistente de Voz</p>
            <p className="text-xs font-semibold text-white/95 leading-snug mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-1">
          <button onClick={onDismiss} className="px-3 py-1 text-[11px] text-white/70 hover:text-white font-medium">
            Ignorar
          </button>
          {actionText && onAction && (
            <button onClick={onAction} className="bg-tertiary text-primary hover:bg-white px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-200">
              {actionText}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-32 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm bg-surface-container-low border border-primary/20 text-primary px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3">
      <span className="material-symbols-outlined text-primary text-2xl">{icon}</span>
      <div className="flex-1 text-[11px] leading-snug">{message}</div>
    </div>
  );
}
