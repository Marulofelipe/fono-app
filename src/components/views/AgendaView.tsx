import React from 'react';
import { Cita, Paciente } from '../../types';

interface AgendaViewProps {
  agenda: Cita[];
  pacientes: Paciente[];
  onStartVoiceCita: () => void;
}

export function AgendaView({ agenda, pacientes, onStartVoiceCita }: AgendaViewProps) {
  return (
    <div className="flex flex-col gap-4 animate-fade-in py-2 flex-1">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display font-bold text-primary text-lg">Agenda Inteligente</h2>
          <p className="text-[11px] text-outline font-medium">Citas y planificación de Silvia</p>
        </div>
        <button
          onClick={onStartVoiceCita}
          className="bg-primary text-white h-9 px-3 rounded-lg flex items-center gap-1.5 text-[11px] font-bold shadow-md active:scale-95 transition-all hover:bg-primary/95"
        >
          <span className="material-symbols-outlined text-xs">mic</span>
          Nueva Cita
        </button>
      </div>

      {/* Voice booking banner */}
      <div className="bg-secondary/10 border border-secondary/20 p-3 rounded-xl flex items-start gap-2.5">
        <span className="material-symbols-outlined text-secondary text-lg">record_voice_over</span>
        <div>
          <h4 className="font-display font-bold text-secondary text-xs">Agendamiento por Voz Activado</h4>
          <p className="text-[10px] text-on-surface-variant mt-0.5 leading-relaxed">
            Pulsa el micrófono en el Inicio y di: <span className="font-semibold italic text-secondary">"Mañana voy a atender a Eduardo Castro a las 8 am"</span>. El sistema programará el espacio automáticamente.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {agenda.map((cita) => {
          const isLinked = pacientes.some(p => p.nombre.toLowerCase().includes(cita.pacienteNombre.toLowerCase()));
          return (
            <div key={cita.id} className="bg-white p-3.5 rounded-2xl border border-outline-variant/15 shadow-sm flex justify-between items-center hover:bg-surface-container-low transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-xl">calendar_month</span>
                </div>
                <div>
                  <h4 className="font-display font-bold text-primary text-xs flex items-center gap-1.5">
                    {cita.pacienteNombre}
                    {isLinked && (
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-1.5 rounded" title="Paciente registrado">
                        Vinculado
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] text-outline font-semibold mt-0.5">Fonoaudiología Clínica | Control</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="px-2 py-0.5 bg-secondary text-white font-callout text-[9px] font-bold rounded-md uppercase tracking-wider">
                  {cita.fecha}
                </span>
                <span className="text-[10px] text-on-surface font-bold font-callout">{cita.hora}</span>
              </div>
            </div>
          );
        })}
        {agenda.length === 0 && (
          <p className="text-center py-8 text-xs italic text-outline">No hay citas programadas para Silvia.</p>
        )}
      </div>
    </div>
  );
}
