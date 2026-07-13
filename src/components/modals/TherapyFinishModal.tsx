import React from 'react';
import { Paciente } from '../../types';

interface TherapyFinishModalProps {
  patient: Paciente | null;
  onFinalize: () => void;
  onAddTenMinutes: () => void;
  onDictation: () => void;
}

export function TherapyFinishModal({ patient, onFinalize, onAddTenMinutes, onDictation }: TherapyFinishModalProps) {
  if (!patient) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-outline-variant/15">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
          <div>
            <h3 className="font-display font-bold text-primary text-lg">Terapia Completa</h3>
            <p className="text-[11px] text-on-surface-variant mt-1">El temporizador ha llegado a cero. ¿Qué deseas hacer ahora?</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <div className="rounded-2xl bg-surface-container-low p-3 border border-outline-variant/20 text-[11px] text-on-surface-variant">
            <p className="font-bold text-primary">{patient.nombre}</p>
            <p className="mt-1">Terapia domiciliaria registrada automáticamente tras llegada a destino.</p>
          </div>
          <button onClick={onFinalize} className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-[11px] hover:bg-primary/90 transition-colors">Finalizar y Guardar</button>
          <button onClick={onAddTenMinutes} className="w-full py-3 rounded-2xl border border-secondary text-secondary font-bold text-[11px] hover:bg-secondary/10 transition-colors">Agregar 10 minutos</button>
          <button onClick={onDictation} className="w-full py-3 rounded-2xl bg-surface-container text-primary font-bold text-[11px] hover:bg-surface-container-high transition-colors">Pasar a Dictado de Evolución</button>
        </div>
      </div>
    </div>
  );
}
