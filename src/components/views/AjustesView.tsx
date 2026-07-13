import React, { useState } from 'react';
import { isApiKeyConfigured, saveApiKey } from '../../services/geminiService';

interface AjustesViewProps {
  profilePic: string;
  profesionalNombre: string;
  profesionalProfesion: string;
  profesionalTelefono: string;
  profesionalCorreo: string;
  contactoEmergenciaNombre: string;
  contactoEmergenciaTelefono: string;
  contactoEmergenciaParentesco: string;
  therapyRadius: number;
  onProfilePicClick: () => void;
  onNombreChange: (v: string) => void;
  onProfesionChange: (v: string) => void;
  onTelefonoChange: (v: string) => void;
  onCorreoChange: (v: string) => void;
  onEmergenciaNombreChange: (v: string) => void;
  onEmergenciaTelefonoChange: (v: string) => void;
  onEmergenciaParentescoChange: (v: string) => void;
  onRadiusChange: (v: number) => void;
}

export function AjustesView({
  profilePic, profesionalNombre, profesionalProfesion, profesionalTelefono, profesionalCorreo,
  contactoEmergenciaNombre, contactoEmergenciaTelefono, contactoEmergenciaParentesco,
  therapyRadius, onProfilePicClick,
  onNombreChange, onProfesionChange, onTelefonoChange, onCorreoChange,
  onEmergenciaNombreChange, onEmergenciaTelefonoChange, onEmergenciaParentescoChange,
  onRadiusChange
}: AjustesViewProps) {
  const [geminiKey, setGeminiKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  const handleSaveKey = () => {
    if (geminiKey.trim()) {
      saveApiKey(geminiKey.trim());
      setKeySaved(true);
      setGeminiKey('');
      setTimeout(() => setKeySaved(false), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in py-2 flex-1">
      <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
        <span className="material-symbols-outlined text-primary text-xl">settings</span>
        <h2 className="font-display font-bold text-primary text-lg">Ajustes del Consultorio</h2>
      </div>

      {/* Profile photo */}
      <div className="bg-white p-4 rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col items-center text-center gap-3">
        <div className="relative group">
          <div onClick={onProfilePicClick} className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 shadow-md cursor-pointer hover:opacity-90 transition-opacity">
            <img src={profilePic} alt="Silvia Margarita Pérez F." className="w-full h-full object-cover" />
          </div>
          <button onClick={onProfilePicClick} className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow hover:bg-primary-container active:scale-90" title="Cambiar foto de perfil">
            <span className="material-symbols-outlined text-sm">photo_camera</span>
          </button>
        </div>
        <div>
          <h3 className="font-display font-bold text-primary text-sm">{profesionalNombre}</h3>
          <p className="text-[10px] font-callout font-bold text-secondary uppercase tracking-wider mt-0.5">{profesionalProfesion}</p>
          <p className="text-[11px] text-outline mt-1 italic">Consultorio Boutique Fonoaudiológico</p>
        </div>
      </div>

      {/* Professional data */}
      <div className="bg-white p-3.5 rounded-2xl border border-outline-variant/20 shadow-sm space-y-2.5">
        <h4 className="font-display font-bold text-primary text-xs flex items-center gap-1 pb-1.5 border-b border-outline-variant/10">
          <span className="material-symbols-outlined text-sm">badge</span>
          Datos Profesionales
        </h4>
        <div className="space-y-2 text-xs">
          <div>
            <label className="text-[8px] font-bold text-outline block mb-0.5">NOMBRE COMPLETO</label>
            <input type="text" value={profesionalNombre} onChange={(e) => onNombreChange(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-[8px] font-bold text-outline block mb-0.5">PROFESIÓN / ESPECIALIDAD</label>
            <input type="text" value={profesionalProfesion} onChange={(e) => onProfesionChange(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[8px] font-bold text-outline block mb-0.5">TELÉFONO</label>
              <input type="text" value={profesionalTelefono} onChange={(e) => onTelefonoChange(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-[8px] font-bold text-outline block mb-0.5">CORREO ELECTRÓNICO</label>
              <input type="email" value={profesionalCorreo} onChange={(e) => onCorreoChange(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Emergency contact */}
      <div className="bg-white p-3.5 rounded-2xl border border-outline-variant/20 shadow-sm space-y-2.5">
        <h4 className="font-display font-bold text-primary text-xs flex items-center gap-1 pb-1.5 border-b border-outline-variant/10">
          <span className="material-symbols-outlined text-sm">contact_emergency</span>
          Contacto de Emergencia
        </h4>
        <div className="space-y-2 text-xs">
          <div>
            <label className="text-[8px] font-bold text-outline block mb-0.5">NOMBRE DE CONTACTO</label>
            <input type="text" value={contactoEmergenciaNombre} onChange={(e) => onEmergenciaNombreChange(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[8px] font-bold text-outline block mb-0.5">TELÉFONO</label>
              <input type="text" value={contactoEmergenciaTelefono} onChange={(e) => onEmergenciaTelefonoChange(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-[8px] font-bold text-outline block mb-0.5">PARENTESCO</label>
              <input type="text" value={contactoEmergenciaParentesco} onChange={(e) => onEmergenciaParentescoChange(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Geolocation radius */}
      <div className="bg-white p-3.5 rounded-2xl border border-outline-variant/20 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/10">
          <div>
            <h4 className="font-display font-bold text-primary text-xs">Radio de Geolocalización</h4>
            <p className="text-[10px] text-on-surface-variant">Ajusta el perímetro para activar la llegada automática.</p>
          </div>
          <span className="text-[11px] font-bold text-primary">{therapyRadius} m</span>
        </div>
        <input type="range" min="20" max="200" step="5" value={therapyRadius} onChange={(e) => onRadiusChange(parseInt(e.target.value, 10))} className="w-full" />
        <div className="flex justify-between text-[9px] text-on-surface-variant">
          <span>Más estricta</span>
          <span>Más amplia</span>
        </div>
      </div>

      {/* Gemini API Key */}
      <div className="bg-white p-3.5 rounded-2xl border border-outline-variant/20 shadow-sm space-y-2.5">
        <h4 className="font-display font-bold text-primary text-xs flex items-center gap-1 pb-2 border-b border-outline-variant/10">
          <span className="material-symbols-outlined text-sm">key</span>
          Configuración de Gemini IA
        </h4>
        <p className="text-[10px] text-on-surface-variant leading-relaxed">
          Pega aquí tu API key de Google AI Studio. Se guarda en tu iPhone y solo se usa para OCR de bonos y resúmenes de IA.
        </p>
        {isApiKeyConfigured() && !keySaved && (
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            API Key configurada correctamente
          </div>
        )}
        {keySaved && (
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold animate-pulse">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            ¡API Key guardada exitosamente!
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Pega tu API Key de Gemini aquí..."
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            className="flex-1 bg-surface-container-low border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
          />
          <button onClick={handleSaveKey} className="px-3 bg-primary text-white text-[10px] font-bold rounded-lg shadow-sm active:scale-95">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
