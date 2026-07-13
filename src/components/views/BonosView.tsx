import React, { useRef } from 'react';
import { Bono, Paciente } from '../../types';

interface BonosViewProps {
  bonos: Bono[];
  pacientes: Paciente[];
  cameraActive: boolean;
  isScanning: boolean;
  scannerStatus: string;
  scannerPhoto: string | null;
  detectedBonoCode: string;
  detectedBonoPaciente: string;
  detectedBonoFecha: string;
  isEditingBonoManually: boolean;
  manualBonoCode: string;
  manualBonoFecha: string;
  manualBonoPacienteId: string;
  onManualBonoCodeChange: (v: string) => void;
  onManualBonoFechaChange: (v: string) => void;
  onManualBonoPacienteIdChange: (v: string) => void;
  onStartScanning: () => void;
  onCapturePhoto: () => void;
  onSaveBono: () => void;
  onEditManual: () => void;
  onCancelManual: () => void;
  onSubmitManual: (e: React.FormEvent) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export function BonosView({
  bonos, pacientes, cameraActive, isScanning, scannerStatus, scannerPhoto,
  detectedBonoCode, detectedBonoPaciente, detectedBonoFecha,
  isEditingBonoManually, manualBonoCode, manualBonoFecha, manualBonoPacienteId,
  onManualBonoCodeChange, onManualBonoFechaChange, onManualBonoPacienteIdChange,
  onStartScanning, onCapturePhoto, onSaveBono, onEditManual, onCancelManual, onSubmitManual,
  videoRef
}: BonosViewProps) {
  return (
    <div className="flex flex-col gap-4 animate-fade-in py-2 flex-1">
      <div>
        <h2 className="font-display font-bold text-primary text-lg">Cámara de Bonos Inteligente</h2>
        <p className="text-[11px] text-outline font-medium">Escaner OCR con anclaje automático</p>
      </div>

      {/* Camera frame */}
      <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-black shadow-md border border-outline-variant/20">
        {cameraActive ? (
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
        ) : scannerPhoto ? (
          <img src={scannerPhoto} alt="Voucher Scanned" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0">
            <img alt="Medical voucher" className="w-full h-full object-cover opacity-60 brightness-95" src="./assets/silvia_m_perez_logo.png" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
        )}

        {isScanning && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <div className="w-4/5 h-2/3 border border-white/50 rounded-xl relative shadow-md">
              <div className="scanner-line absolute w-full left-0"></div>
            </div>
          </div>
        )}

        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isScanning ? 'bg-secondary animate-ping' : 'bg-green-500'}`}></span>
          {scannerStatus}
        </div>

        <div className="absolute bottom-3.5 inset-x-0 z-20 flex justify-center gap-4 items-center">
          <button onClick={() => alert("Simulando Flash Activado.")} className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90">
            <span className="material-symbols-outlined text-sm">flash_on</span>
          </button>
          <button onClick={cameraActive ? onCapturePhoto : onStartScanning} className="w-14 h-14 rounded-full border-2 border-white flex items-center justify-center active:scale-90 transition-transform shadow-lg">
            <div className="w-full h-full rounded-full bg-primary flex items-center justify-center hover:bg-primary-container">
              <span className="material-symbols-outlined text-white text-lg">{cameraActive ? 'photo_camera' : 'sync'}</span>
            </div>
          </button>
          <button onClick={() => { alert("Abriendo galería..."); onStartScanning(); }} className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90">
            <span className="material-symbols-outlined text-sm">gallery_thumbnail</span>
          </button>
        </div>
      </div>

      {/* OCR Form */}
      <div className="bg-white p-3.5 rounded-2xl border border-outline-variant/20 shadow-sm">
        <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-outline-variant/10">
          <span className="material-symbols-outlined text-primary text-lg">qr_code_scanner</span>
          <h3 className="font-display font-bold text-xs text-on-surface">Datos Digitalizados</h3>
        </div>

        {isEditingBonoManually ? (
          <form onSubmit={onSubmitManual} className="space-y-2.5">
            <div>
              <label className="text-[8px] font-bold text-outline block mb-0.5">CÓDIGO DEL BONO</label>
              <input type="text" required value={manualBonoCode} onChange={(e) => onManualBonoCodeChange(e.target.value)} className="w-full bg-surface-container border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-[8px] font-bold text-outline block mb-0.5">FECHA DEL BONO</label>
              <input type="text" required value={manualBonoFecha} onChange={(e) => onManualBonoFechaChange(e.target.value)} className="w-full bg-surface-container border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-[8px] font-bold text-outline block mb-0.5">VINCULAR CON PACIENTE</label>
              <select value={manualBonoPacienteId} onChange={(e) => onManualBonoPacienteIdChange(e.target.value)} className="w-full bg-white border border-outline-variant/30 rounded-lg p-2 text-xs font-bold text-primary">
                <option value="">-- No vincular --</option>
                {pacientes.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onCancelManual} className="flex-1 py-1.5 text-xs border border-outline text-outline font-bold rounded-md">Cancelar</button>
              <button type="submit" className="flex-1 py-1.5 text-xs bg-primary text-white font-bold rounded-md">Guardar</button>
            </div>
          </form>
        ) : (
          <div className="space-y-2.5">
            <div>
              <span className="text-[8px] font-bold text-outline block">CÓDIGO DE PAGO DETECTADO</span>
              <div className="flex items-center justify-between bg-surface-container-low p-2 rounded-xl text-xs font-bold text-primary mt-0.5">
                <span>{detectedBonoCode}</span>
                <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
              </div>
            </div>
            <div>
              <span className="text-[8px] font-bold text-outline block">PACIENTE RECONOCIDO</span>
              <div className="flex items-center justify-between bg-surface-container-low p-2 rounded-xl text-xs font-bold text-primary mt-0.5">
                <span>{detectedBonoPaciente}</span>
                <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-1.5 rounded">Autovínculo Activo</span>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={onSaveBono} className="flex-1 bg-primary text-white font-bold h-9 rounded-lg text-[10px] shadow-sm flex items-center justify-center gap-0.5 active:scale-95">
                Confirmar y Anclar
                <span className="material-symbols-outlined text-xs">done</span>
              </button>
              <button onClick={onEditManual} className="flex-1 border border-primary text-primary font-bold h-9 rounded-lg text-[10px] flex items-center justify-center active:scale-95">
                Editar Manualmente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent bonos */}
      <div className="flex flex-col gap-2">
        <h3 className="font-display font-bold text-xs text-on-surface">Últimos Bonos Confirmados</h3>
        <div className="space-y-2">
          {bonos.map((bono) => (
            <div key={bono.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-outline-variant/10 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-secondary/5 rounded-lg flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-lg">receipt_long</span>
                </div>
                <div>
                  <p className="font-display font-bold text-on-surface text-[11px]">{bono.id}</p>
                  <p className="text-[9px] text-outline font-semibold">
                    Código: {bono.codigoPago} | {bono.fecha}
                    {bono.pacienteNombre && ` | Vinc: ${bono.pacienteNombre}`}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase bg-green-100 text-green-800">{bono.estado}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
