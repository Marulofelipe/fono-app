import React from 'react';

interface LeftRadiusModalProps {
  therapyRadius: number;
  onContinue: () => void;
  onFinish: () => void;
}

export function LeftRadiusModal({ therapyRadius, onContinue, onFinish }: LeftRadiusModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-outline-variant/15 text-center">
        <span className="material-symbols-outlined text-secondary text-4xl">warning</span>
        <h3 className="font-display font-bold text-primary text-lg mt-3">Zona de Terapia Abandonada</h3>
        <p className="text-[11px] text-on-surface-variant mt-2 leading-relaxed">
          Has salido de la zona de domicilio definida ({therapyRadius} m). Si continúas fuera del perímetro, la terapia se finalizará.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onContinue} className="py-3 rounded-2xl border border-outline-variant text-primary font-bold text-[11px] bg-surface-container hover:bg-surface-container-high transition-colors">Continuar</button>
          <button onClick={onFinish} className="py-3 rounded-2xl bg-primary text-white font-bold text-[11px] hover:bg-primary/90 transition-colors">Finalizar Terapia</button>
        </div>
      </div>
    </div>
  );
}
