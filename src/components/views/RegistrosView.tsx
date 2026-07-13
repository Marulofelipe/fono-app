import React from 'react';
import { Terapia } from '../../types';

interface RegistrosViewProps {
  terapias: Terapia[];
  onViewPatient: (pacienteId: string) => void;
}

export function RegistrosView({ terapias, onViewPatient }: RegistrosViewProps) {
  return (
    <div className="flex flex-col gap-4 animate-fade-in py-2 flex-1">
      <div>
        <h2 className="font-display font-bold text-primary text-lg">Histórico Clínico</h2>
        <p className="text-[11px] text-outline font-medium">Evoluciones grabadas por la Dra. Silvia</p>
      </div>
      <div className="space-y-3">
        {terapias.map((terapia) => (
          <div key={terapia.id} className="bg-white p-3.5 rounded-2xl border border-outline-variant/15 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-callout text-[8px] font-bold text-secondary uppercase tracking-widest">{terapia.fecha}</span>
                <h3 className="font-display font-bold text-primary text-xs mt-0.5">{terapia.pacienteNombre}</h3>
              </div>
              <span className="px-2 py-0.5 bg-primary-fixed text-primary text-[8px] font-bold rounded-full uppercase">{terapia.tipo}</span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-primary/20 italic">{terapia.anotaciones}</p>
            <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-outline-variant/10 text-[9px] text-outline font-medium">
              <span>Cédula: {terapia.pacienteId}</span>
              <button onClick={() => onViewPatient(terapia.pacienteId)} className="text-primary font-bold hover:underline">Ver Expediente</button>
            </div>
          </div>
        ))}
        {terapias.length === 0 && (
          <p className="text-center py-8 text-xs italic text-outline">No hay terapias registradas.</p>
        )}
      </div>
    </div>
  );
}
