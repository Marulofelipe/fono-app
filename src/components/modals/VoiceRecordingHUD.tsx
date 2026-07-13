import React from 'react';

interface VoiceRecordingHUDProps {
  isListeningForCita: boolean;
  isListeningForPaciente: boolean;
  voiceInputMessage: string;
  onCancel: () => void;
}

export function VoiceRecordingHUD({ isListeningForCita, isListeningForPaciente, voiceInputMessage, onCancel }: VoiceRecordingHUDProps) {
  if (!isListeningForCita && !isListeningForPaciente) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-white animate-fade-in">
      <div className="bg-white text-on-surface w-[85%] max-w-sm rounded-3xl p-6 flex flex-col items-center text-center gap-4 shadow-2xl border border-outline-variant/30">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
          <div className="absolute inset-2 rounded-full bg-primary/35 animate-pulse"></div>
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-md relative z-10">
            <span className="material-symbols-outlined text-2xl">mic</span>
          </div>
        </div>

        <div>
          <h3 className="font-display font-bold text-primary text-base">
            {isListeningForCita ? "Agendamiento Inteligente" : "Registrar Paciente por Voz"}
          </h3>
          <p className="text-[11px] text-outline font-semibold uppercase tracking-wider mt-0.5">ESCUCHANDO EN VIVO</p>
        </div>

        <div className="bg-surface-container p-4 rounded-2xl w-full border border-outline-variant/35 min-h-[80px] flex items-center justify-center">
          <p className="text-xs font-semibold text-primary italic leading-relaxed">"{voiceInputMessage}"</p>
        </div>

        <p className="text-[10px] text-on-surface-variant leading-relaxed">
          {isListeningForCita
            ? 'Di por ejemplo: "Mañana voy a atender a Eduardo Castro a las 8 am"'
            : 'Di por ejemplo: "Nuevo paciente Eduardo Castro, cédula 10295384, Colsanitas, diagnóstico Afasia Motora"'}
        </p>

        <button onClick={onCancel} className="mt-2 w-full py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs rounded-xl transition-all">
          Cancelar Dictado
        </button>
      </div>
    </div>
  );
}
