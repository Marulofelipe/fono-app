import React from 'react';
import { Paciente, Terapia, Bono } from '../../types';

interface PacienteDetalleProps {
  paciente: Paciente;
  terapias: Terapia[];
  bonos: Bono[];
  onBack: () => void;
  onEdit: (p: Paciente) => void;
  onDelete: (id: string, nombre: string) => void;
  onChangeEstado: (id: string) => void;
  onStartSession: (p: Paciente) => void;
  onExportFicha: (p: Paciente) => void;
}

export function PacienteDetalle({ paciente, terapias, bonos, onBack, onEdit, onDelete, onChangeEstado, onStartSession, onExportFicha }: PacienteDetalleProps) {
  const patientHistory = terapias.filter(t => t.pacienteId === paciente.id);
  const linkedBonos = bonos.filter(b => b.pacienteId === paciente.id);

  return (
    <div className="flex flex-col gap-3.5 animate-fade-in py-2">
      <button onClick={onBack} className="self-start text-primary font-bold text-xs flex items-center gap-1 hover:underline">
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Volver al Directorio
      </button>

      {/* Hero Card */}
      <div className="bg-white rounded-2xl luxury-shadow border border-outline-variant/30 p-4 relative overflow-hidden">
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col">
            <span className="font-callout text-[9px] font-bold text-outline uppercase tracking-widest">Expediente Clínico</span>
            <h2 className="font-display font-bold text-primary text-base leading-snug mt-0.5">{paciente.nombre}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="px-1.5 py-0.5 bg-primary/5 text-primary text-[9px] font-bold rounded">ID: {paciente.id}</span>
              <span className="text-outline text-xs">•</span>
              <span className="text-outline text-[11px] font-semibold">{paciente.telefono}</span>
              {paciente.edad && (
                <>
                  <span className="text-outline text-xs">•</span>
                  <span className="text-outline text-[11px] font-bold">{paciente.edad} años</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`px-2 py-1 text-[10px] font-bold rounded-lg border shadow-sm ${paciente.empresa === 'Colsanitas' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
              {paciente.empresa}
            </span>
            <span className={`px-2 py-1 text-[10px] font-bold rounded-lg border shadow-sm ${
              (paciente.estado || 'Activo') === 'Activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
              (paciente.estado || 'Activo') === 'Inactivo' ? 'bg-gray-100 text-gray-600 border-gray-200' :
              (paciente.estado || 'Activo') === 'Suspendido' ? 'bg-amber-50 text-amber-700 border-amber-100' :
              (paciente.estado || 'Activo') === 'Retirado' ? 'bg-orange-50 text-orange-700 border-orange-100' :
              'bg-red-50 text-red-700 border-red-100'
            }`}>
              {paciente.estado || 'Activo'}
            </span>
            <button onClick={() => onEdit(paciente)} className="text-primary hover:text-secondary text-[10px] font-bold flex items-center gap-0.5 bg-surface-container/30 px-2 py-1 rounded border border-outline-variant/20 mt-1">
              <span className="material-symbols-outlined text-xs">edit</span>
              Editar
            </button>
            <button onClick={() => onChangeEstado(paciente.id)} className="text-amber-600 hover:text-amber-700 text-[10px] font-bold flex items-center gap-0.5 bg-amber-50 px-2 py-1 rounded border border-amber-200 mt-1">
              <span className="material-symbols-outlined text-xs">swap_horiz</span>
              Estado
            </button>
            <button onClick={() => onDelete(paciente.id, paciente.nombre)} className="text-red-500 hover:text-red-700 text-[10px] font-bold flex items-center gap-0.5 bg-red-50 px-2 py-1 rounded border border-red-200 mt-1">
              <span className="material-symbols-outlined text-xs">delete</span>
              Borrar
            </button>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-outline-variant/10">
          <div className="flex justify-between items-end mb-1">
            <span className="font-callout text-[11px] text-on-surface font-semibold">Progreso Terapéutico</span>
            <span className="font-callout text-[11px] font-bold text-primary">{paciente.progresoPlan}% Plan</span>
          </div>
          <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${paciente.progresoPlan}%` }}></div>
          </div>
          <p className="mt-1.5 text-on-surface-variant text-[10px] font-medium italic">
            {paciente.sesionesCompletadas} de {paciente.sesionesTotales} sesiones del plan clínico completadas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3 rounded-2xl border border-outline-variant/20 shadow-sm">
          <span className="material-symbols-outlined text-primary mb-0.5 text-lg">medical_services</span>
          <span className="font-callout text-[8px] text-outline font-bold block">DIAGNÓSTICO</span>
          <span className="font-display font-bold text-on-surface text-[11px] block truncate">{paciente.diagnostico}</span>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-outline-variant/20 shadow-sm">
          <span className="material-symbols-outlined text-secondary mb-0.5 text-lg">calendar_today</span>
          <span className="font-callout text-[8px] text-outline font-bold block">CITAS DE CONTROL</span>
          <span className="font-display font-bold text-on-surface text-[11px] block">{paciente.proximaCita || 'No programada'}</span>
        </div>
      </div>

      {/* Linked Bonos */}
      <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm p-3.5">
        <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-outline-variant/10">
          <h3 className="font-display font-bold text-xs text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">confirmation_number</span>
            Bonos Médicos Vinculados
          </h3>
          <span className="text-[10px] bg-secondary-fixed text-secondary font-extrabold px-1.5 rounded-full">{linkedBonos.length} bonos</span>
        </div>
        {linkedBonos.map((bono) => (
          <div key={bono.id} className="flex justify-between items-center bg-surface-container-lowest p-2 rounded-xl border border-outline-variant/20 mb-1.5 last:mb-0">
            <div>
              <p className="font-display font-bold text-primary text-[11px]">{bono.id}</p>
              <p className="text-[9px] text-outline font-semibold">Código: {bono.codigoPago} | {bono.fecha}</p>
            </div>
            <span className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 text-[8px] font-extrabold rounded-full">Válido</span>
          </div>
        ))}
        {linkedBonos.length === 0 && (
          <p className="text-center text-[10px] text-outline italic py-2">No hay bonos médicos vinculados a esta ficha.</p>
        )}
      </div>

      {/* Therapy history */}
      <div className="flex justify-between items-center px-1">
        <h3 className="font-display font-bold text-xs text-primary">Historial Reciente de Sesiones</h3>
      </div>
      <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden divide-y divide-outline-variant/10">
        {patientHistory.map((terapia) => (
          <div key={terapia.id} className="p-3.5">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-surface-container flex flex-col items-center justify-center text-[10px]">
                  <span className="font-bold text-primary leading-none">{terapia.fecha.split(' ')[0]}</span>
                  <span className="text-[7px] text-outline uppercase font-extrabold leading-none mt-0.5">{terapia.fecha.split(' ')[2]?.substring(0, 3)}</span>
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs text-on-surface">Evolución Clínica</h4>
                  <p className="text-[9px] text-outline font-medium">Registrado a las {terapia.hora}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-secondary-fixed text-secondary text-[8px] font-bold rounded-full uppercase">{terapia.tipo}</span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed whitespace-pre-wrap pl-10">{terapia.anotaciones}</p>
          </div>
        ))}
        {patientHistory.length === 0 && (
          <div className="p-6 text-center text-outline italic text-[11px]">No hay registros previos para este paciente.</div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={() => onStartSession(paciente)} className="flex-1 bg-primary text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1 text-[11px]">
          <span className="material-symbols-outlined text-xs">add_notes</span>
          Nueva Evolución
        </button>
        <button onClick={() => onExportFicha(paciente)} className="flex-1 border border-primary text-primary font-bold py-3 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1 text-[11px]">
          <span className="material-symbols-outlined text-xs font-semibold">share</span>
          Exportar Ficha
        </button>
      </div>
    </div>
  );
}
