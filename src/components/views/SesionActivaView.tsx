import React from 'react';
import { Paciente } from '../../types';

interface TranscriptBlock {
  id: string;
  tipo: 'Lenguaje' | 'Deglución' | 'Audición' | 'Voz';
  hora: string;
  texto: string;
}

interface TherapyTimer {
  remainingSeconds: number;
}

interface SesionActivaViewProps {
  sessionPatient: Paciente;
  isSessionRecording: boolean;
  sessionDuration: number;
  activeTranscriptBlocks: TranscriptBlock[];
  newBlockText: string;
  newBlockType: 'Lenguaje' | 'Deglución' | 'Audición' | 'Voz';
  therapyTimer: TherapyTimer;
  therapySessionState: any;
  therapyRadius: number;
  patientDistance: number | null;
  hasArrivedAtHome: boolean;
  onNewBlockTextChange: (v: string) => void;
  onNewBlockTypeChange: (v: 'Lenguaje' | 'Deglución' | 'Audición' | 'Voz') => void;
  onAddManualBlock: (e: React.FormEvent) => void;
  onPauseResume: () => void;
  onFinishAndSave: () => void;
  onOpenWaze: (p: Paciente) => void;
  onFinalizeTherapy: () => void;
  onConfirmArrival: () => void;
}

export function SesionActivaView({
  sessionPatient, isSessionRecording, sessionDuration, activeTranscriptBlocks,
  newBlockText, newBlockType, therapyTimer, therapySessionState, therapyRadius,
  patientDistance, hasArrivedAtHome,
  onNewBlockTextChange, onNewBlockTypeChange, onAddManualBlock,
  onPauseResume, onFinishAndSave, onOpenWaze, onFinalizeTherapy, onConfirmArrival
}: SesionActivaViewProps) {
  return (
    <div className="flex flex-col gap-4 animate-fade-in py-2">
      {/* Therapy domiciliary status */}
      {therapySessionState.active && therapySessionState.pacienteId === sessionPatient.id && (
        <div className="bg-surface-container-lowest rounded-3xl border border-primary/10 p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] font-bold text-primary/80">Terapia domiciliaria</p>
              <h2 className="font-display font-bold text-primary text-sm mt-1">{sessionPatient.nombre}</h2>
              <p className="text-[10px] text-on-surface-variant mt-1">Radio activo: {therapyRadius} m · {hasArrivedAtHome ? 'En domicilio' : 'En ruta'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
              <div className="bg-white rounded-2xl p-3 border border-outline-variant/20 text-center">
                <p className="text-[9px] uppercase tracking-[0.24em] text-outline">Distancia</p>
                <p className="font-bold text-primary text-sm mt-1">{patientDistance != null ? `${patientDistance} m` : 'Calculando...'}</p>
              </div>
              <div className="bg-white rounded-2xl p-3 border border-outline-variant/20 text-center">
                <p className="text-[9px] uppercase tracking-[0.24em] text-outline">Temporizador</p>
                <p className="font-bold text-primary text-sm mt-1">
                  {Math.floor(therapyTimer.remainingSeconds / 60).toString().padStart(2, '0')}:{(therapyTimer.remainingSeconds % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {!hasArrivedAtHome ? (
              <>
                <p className="text-[10px] text-on-surface-variant leading-relaxed text-center">
                  📍 El GPS te está siguiendo. Cuando llegues, presiona el botón o espera la detección automática a {therapyRadius} metros.
                </p>
                <button
                  onClick={onConfirmArrival}
                  className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all hover:bg-emerald-700 animate-pulse"
                >
                  <span className="material-symbols-outlined text-xl">where_to_vote</span>
                  ¡Ya llegué! — Confirmar Llegada
                </button>
              </>
            ) : (
              <p className="text-[10px] text-on-surface-variant leading-relaxed">
                ✅ Terapia iniciada tras llegada al domicilio.
              </p>
            )}
            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={() => onOpenWaze(sessionPatient)} className="py-2 px-3 rounded-2xl bg-secondary text-primary text-[10px] font-bold hover:bg-secondary/90 transition-colors">Navegar</button>
              <button onClick={onFinalizeTherapy} className="py-2 px-3 rounded-2xl bg-primary text-white text-[10px] font-bold hover:bg-primary/90 transition-colors">Finalizar Terapia</button>
            </div>
          </div>
        </div>
      )}

      {/* Session header */}
      <div className="flex flex-col gap-1 border-b border-outline-variant/20 pb-2">
        <div className="flex items-center justify-between">
          <span className="font-callout text-[9px] text-white bg-secondary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Sesión de Voz</span>
          <span className="text-xs font-semibold text-on-surface-variant">Duración en tiempo real</span>
        </div>
        <h2 className="font-display font-bold text-primary text-base">Paciente: {sessionPatient.nombre}</h2>
      </div>

      {/* Recording controls */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 flex flex-col items-center gap-3 border border-outline-variant/30 shadow-md">
        <div className="flex justify-between w-full items-center">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full bg-error ${isSessionRecording ? 'active-pulse' : ''}`}></div>
            <span className="font-callout text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              {isSessionRecording ? 'Dictado continuo activo' : 'Micrófono pausado'}
            </span>
          </div>
          <span className="font-display font-bold text-primary text-sm tabular-nums">
            {Math.floor(sessionDuration / 60).toString().padStart(2, '0')}:{(sessionDuration % 60).toString().padStart(2, '0')}
          </span>
        </div>

        {/* Waveform */}
        <div className="w-full h-12 flex items-end justify-center gap-[2px] py-1">
          {Array.from({ length: 24 }).map((_, i) => {
            const h = isSessionRecording ? Math.floor(Math.random() * 80) + 20 : 15;
            return (
              <div key={i} className="w-1 flex-1 rounded-full transition-all duration-300" style={{ height: `${h}%`, backgroundColor: h > 50 ? '#005265' : '#b5ebff' }} />
            );
          })}
        </div>

        <div className="flex gap-2 w-full">
          <button onClick={onPauseResume} className="flex-1 py-2 px-3 rounded-xl border border-primary text-primary font-bold text-[11px] flex items-center justify-center gap-1 hover:bg-primary-container/5">
            <span className="material-symbols-outlined text-xs">{isSessionRecording ? 'pause' : 'play_arrow'}</span>
            {isSessionRecording ? 'Pausar' : 'Reanudar'}
          </button>
          <button onClick={onFinishAndSave} className="flex-1 py-2 px-3 rounded-xl bg-primary text-white font-bold text-[11px] flex items-center justify-center gap-1 hover:bg-primary-container">
            <span className="material-symbols-outlined text-xs">done_all</span>
            Guardar Evolución
          </button>
        </div>
      </div>

      {/* Transcription blocks */}
      <div className="flex flex-col gap-2">
        <h3 className="font-display font-bold text-xs text-primary">Transcripciones del Plan</h3>
        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
          {activeTranscriptBlocks.map((block) => (
            <div key={block.id} className="bg-white p-2.5 rounded-xl border border-outline-variant/20 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-callout text-[8px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">{block.tipo}</span>
                <span className="text-[9px] text-outline">{block.hora}</span>
              </div>
              <p className="text-[11px] text-on-surface leading-relaxed italic">"{block.texto}"</p>
            </div>
          ))}
        </div>

        <form onSubmit={onAddManualBlock} className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/20 flex flex-col gap-2">
          <div className="flex gap-1.5">
            <select value={newBlockType} onChange={(e) => onNewBlockTypeChange(e.target.value as any)} className="bg-white border border-outline-variant/45 rounded-lg text-[10px] p-1 focus:ring-1 focus:ring-primary outline-none font-bold text-primary">
              <option value="Lenguaje">Lenguaje</option>
              <option value="Deglución">Deglución</option>
              <option value="Voz">Voz</option>
              <option value="Audición">Audición</option>
            </select>
            <input type="text" value={newBlockText} onChange={(e) => onNewBlockTextChange(e.target.value)} placeholder="Escribir anotación rápida..." className="flex-1 bg-white border border-outline-variant/45 rounded-lg text-[10px] p-1.5 outline-none" />
            <button type="submit" className="bg-primary text-white p-1 rounded-lg">
              <span className="material-symbols-outlined text-xs">add</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
