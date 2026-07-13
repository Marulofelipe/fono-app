import React from 'react';
import { Paciente } from '../../types';

interface PacientesViewProps {
  pacientes: Paciente[];
  filteredPacientes: Paciente[];
  patientSearchQuery: string;
  onSearchChange: (q: string) => void;
  showPatientForm: boolean;
  onToggleForm: () => void;
  newPatient: any;
  onNewPatientChange: (p: any) => void;
  onCreatePatient: (e: React.FormEvent) => void;
  detectedPatientData: Paciente | null;
  onConfirmDetected: () => void;
  onDiscardDetected: () => void;
  onStartVoicePaciente: () => void;
  onSelectPatient: (id: string) => void;
}

export function PacientesView({
  pacientes, filteredPacientes, patientSearchQuery, onSearchChange,
  showPatientForm, onToggleForm, newPatient, onNewPatientChange, onCreatePatient,
  detectedPatientData, onConfirmDetected, onDiscardDetected,
  onStartVoicePaciente, onSelectPatient
}: PacientesViewProps) {
  return (
    <div className="flex flex-col gap-4 animate-fade-in py-2 flex-1">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display font-bold text-primary text-lg">Directorio Fonoaudiológico</h2>
          <p className="text-[11px] text-outline font-medium">Fichas clínicas y evolución médica</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <button onClick={onStartVoicePaciente} className="bg-primary text-white h-9 px-3 rounded-lg flex items-center gap-1 text-[11px] font-bold shadow-md active:scale-95 hover:bg-primary/95 transition-all">
            <span className="material-symbols-outlined text-xs">mic</span>
            Nuevo Paciente
          </button>
          <button onClick={onToggleForm} className="text-primary hover:underline text-[10px] font-semibold">
            {showPatientForm ? "Ocultar formulario" : "Ingresar manualmente"}
          </button>
        </div>
      </div>

      {/* Voice detection confirmation */}
      {detectedPatientData && (
        <div className="bg-white border-2 border-primary/30 p-4 rounded-2xl shadow-xl flex flex-col gap-3 animate-fade-in my-3">
          <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
            <span className="material-symbols-outlined text-primary text-xl">person_search</span>
            <h3 className="font-display font-bold text-primary text-sm">Confirmar Paciente Detectado</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] font-bold text-outline block">CÉDULA / ID</span>
                <span className="font-semibold text-on-surface">{detectedPatientData.id || "Falta"}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-outline block">EDAD</span>
                <span className="font-semibold text-on-surface">{detectedPatientData.edad} años</span>
              </div>
            </div>
            <div>
              <span className="text-[9px] font-bold text-outline block">NOMBRE COMPLETO</span>
              <span className="font-bold text-primary text-sm">{detectedPatientData.nombre || "Falta"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] font-bold text-outline block">ASEGURADORA</span>
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${detectedPatientData.empresa === 'Colsanitas' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                  {detectedPatientData.empresa}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-outline block">TELÉFONO</span>
                <span className="font-semibold text-on-surface">{detectedPatientData.telefono}</span>
              </div>
            </div>
            <div>
              <span className="text-[9px] font-bold text-outline block">DIAGNÓSTICO FONOAUDIOLÓGICO</span>
              <span className="font-semibold text-on-surface">{detectedPatientData.diagnostico || "Falta"}</span>
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-outline-variant/10">
            <button onClick={onDiscardDetected} className="flex-1 py-2 border border-outline text-outline font-bold text-[10px] rounded-lg hover:bg-surface-container">
              Descartar
            </button>
            <button onClick={onConfirmDetected} className="flex-1 py-2 bg-primary text-white font-bold text-[10px] rounded-lg shadow-md hover:bg-primary-container">
              Guardar Paciente
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showPatientForm && (
        <div className="bg-surface-container-lowest p-3.5 rounded-2xl border border-primary/20 shadow-lg animate-fade-in">
          <h3 className="font-display font-bold text-primary text-xs mb-2.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">badge</span>
            Registrar Ficha Clínica
          </h3>
          <form onSubmit={onCreatePatient} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] font-bold text-outline block mb-0.5">CÉDULA / ID*</label>
                <input type="text" required placeholder="e.g. 1029384" value={newPatient.id} onChange={(e) => onNewPatientChange({ ...newPatient, id: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-[8px] font-bold text-outline block mb-0.5">EDAD*</label>
                <input type="number" required placeholder="Años" min="1" max="110" value={newPatient.edad} onChange={(e) => onNewPatientChange({ ...newPatient, edad: parseInt(e.target.value) || 30 })} className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="text-[8px] font-bold text-outline block mb-0.5">NOMBRE COMPLETO*</label>
              <input type="text" required placeholder="e.g. Eduardo Castro" value={newPatient.nombre} onChange={(e) => onNewPatientChange({ ...newPatient, nombre: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] font-bold text-outline block mb-0.5">ASEGURADORA</label>
                <select value={newPatient.empresa} onChange={(e) => onNewPatientChange({ ...newPatient, empresa: e.target.value })} className="w-full bg-white border border-outline-variant/30 rounded-lg p-2 text-xs outline-none font-bold text-primary">
                  <option value="Colsanitas">Colsanitas</option>
                  <option value="Medisanitas">Medisanitas</option>
                </select>
              </div>
              <div>
                <label className="text-[8px] font-bold text-outline block mb-0.5">TELÉFONO</label>
                <input type="text" placeholder="315 789 4512" value={newPatient.telefono} onChange={(e) => onNewPatientChange({ ...newPatient, telefono: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="text-[8px] font-bold text-outline block mb-0.5">DIAGNÓSTICO FONOAUDIOLÓGICO</label>
              <input type="text" placeholder="e.g. Afasia Motora" value={newPatient.diagnostico} onChange={(e) => onNewPatientChange({ ...newPatient, diagnostico: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <button type="submit" className="w-full bg-primary text-white font-bold py-2.5 rounded-xl shadow-md active:scale-95 text-[11px]">
              Registrar Paciente
            </button>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
        <input
          type="text"
          placeholder="Buscar por nombre, diagnóstico o cédula..."
          value={patientSearchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none focus:ring-1 focus:ring-primary font-medium"
        />
      </div>

      {/* Patient list */}
      <div className="space-y-2.5">
        {filteredPacientes.map((paciente) => (
          <div
            key={paciente.id}
            onClick={() => onSelectPatient(paciente.id)}
            className="bg-white p-3.5 rounded-2xl border border-outline-variant/15 shadow-sm flex justify-between items-center hover:bg-surface-container-low transition-colors cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                {paciente.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div>
                <h4 className="font-display font-bold text-primary text-xs">{paciente.nombre}</h4>
                <p className="text-[10px] text-outline font-semibold mt-0.5">ID: {paciente.id} | {paciente.diagnostico}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                (paciente.estado || 'Activo') === 'Activo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                (paciente.estado || 'Activo') === 'Inactivo' ? 'bg-gray-100 text-gray-600 border border-gray-200' :
                'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                {paciente.estado || 'Activo'}
              </span>
              <div className="flex items-center gap-1">
                <div className="w-12 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${paciente.progresoPlan}%` }}></div>
                </div>
                <span className="text-[9px] font-bold text-primary">{paciente.progresoPlan}%</span>
              </div>
            </div>
          </div>
        ))}
        {filteredPacientes.length === 0 && (
          <p className="text-center py-6 text-xs italic text-outline">No se encontraron pacientes con ese criterio.</p>
        )}
      </div>
    </div>
  );
}
