import React from 'react';
import { Cita } from '../../types';

interface InicioViewProps {
  profesionalNombre: string;
  profesionalProfesion: string;
  isListeningGeneral: boolean;
  voiceText: string;
  agenda: Cita[];
  onToggleMic: () => void;
}

export function InicioView({ profesionalNombre, profesionalProfesion, isListeningGeneral, voiceText, agenda, onToggleMic }: InicioViewProps) {
  const citasHoy = agenda.filter(c => c.fecha === 'Hoy' || c.fecha === 'En 15 minutos').length + 1;

  return (
    <div className="flex flex-col items-center animate-fade-in pt-0 pb-2 flex-1">
      <div className="w-[80%] aspect-[4/3] max-h-64 flex items-center justify-center rounded-3xl bg-gradient-to-tr from-primary/10 via-white/80 to-secondary/15 p-[8px] shadow-sm border border-outline-variant/15 mt-0 mb-4 overflow-hidden relative">
        <img src="./assets/silvia_m_perez_logo.png" alt="Silvia M Perez Logo" className="w-full h-full object-contain" />
      </div>

      <div className="w-full text-center mb-6">
        <h2 className="font-display font-bold text-primary text-lg leading-tight">{profesionalNombre}</h2>
        <p className="text-[11px] font-bold text-secondary uppercase tracking-widest mt-1">{profesionalProfesion}</p>
      </div>

      {/* Central Mic Button */}
      <div className="relative w-full aspect-square max-w-[200px] flex items-center justify-center mb-4">
        <div className={`absolute inset-0 rounded-full border border-primary/10 transition-transform duration-1000 ${isListeningGeneral ? 'scale-110 animate-ping' : 'scale-100'}`}></div>
        <button
          onClick={onToggleMic}
          className={`relative z-10 w-36 h-36 rounded-full flex flex-col items-center justify-center shadow-lg transition-all duration-300 active:scale-95 group ${isListeningGeneral ? 'bg-secondary' : 'bg-primary'}`}
        >
          {isListeningGeneral && (
            <div className="absolute inset-0 rounded-full bg-secondary/20 pulse-animation -z-10 scale-105"></div>
          )}
          <span className="material-symbols-outlined text-white text-4xl mb-1" style={{ fontVariationSettings: '"FILL" 1' }}>
            {isListeningGeneral ? 'mic' : 'mic_none'}
          </span>
          <span className="font-display font-semibold text-white text-xs">
            {isListeningGeneral ? 'Escuchando...' : 'Dictar comando'}
          </span>
        </button>
      </div>

      {/* Live voice feedback */}
      {voiceText && (
        <div className="w-full bg-surface-container-low p-3 rounded-2xl border border-outline-variant/30 text-center mb-4 transition-all animate-pulse">
          <span className="text-[9px] font-callout font-bold text-secondary uppercase tracking-widest block mb-0.5">Transcripción en Tiempo Real</span>
          <p className="text-xs font-semibold text-on-surface italic">"{voiceText}"</p>
          <div className="text-[10px] text-on-surface-variant/70 mt-2 space-y-1">
            <p>✨ Di: <span className="font-bold text-primary">"Mañana voy a atender a Eduardo Castro a las 8 am"</span></p>
            <p>✨ Di: <span className="font-bold text-primary">"Actualizar datos de Eduardo"</span></p>
          </div>
        </div>
      )}

      {/* Micro metrics */}
      <div className="w-full grid grid-cols-2 gap-3 mb-4">
        <div className="bg-surface-container-lowest p-3 rounded-2xl luxury-shadow border border-outline-variant/20 flex flex-col items-center text-center">
          <span className="material-symbols-outlined text-primary mb-1 text-xl">calendar_today</span>
          <p className="font-callout text-[9px] font-bold text-outline uppercase tracking-wider">Citas Hoy</p>
          <p className="font-display font-bold text-primary text-base">{citasHoy} Pacientes</p>
        </div>
        <div className="bg-surface-container-lowest p-3 rounded-2xl luxury-shadow border border-outline-variant/20 flex flex-col items-center text-center">
          <span className="material-symbols-outlined text-secondary mb-1 text-xl">payments</span>
          <p className="font-callout text-[9px] font-bold text-outline uppercase tracking-wider">Bonos Válidos</p>
          <p className="font-display font-bold text-secondary text-base">2 Activos</p>
        </div>
      </div>
    </div>
  );
}
