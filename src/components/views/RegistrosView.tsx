import React, { useState } from 'react';
import { Terapia } from '../../types';

interface RegistrosViewProps {
  terapias: Terapia[];
  onViewPatient: (pacienteId: string) => void;
  onEditTerapia: (id: string, cambios: Partial<Terapia>) => void;
  onDeleteTerapia: (id: string) => void;
}

export function RegistrosView({ terapias, onViewPatient, onEditTerapia, onDeleteTerapia }: RegistrosViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ anotaciones: string; tipo: Terapia['tipo'] }>({ anotaciones: '', tipo: 'Lenguaje' });

  const startEdit = (terapia: Terapia) => {
    setEditingId(terapia.id);
    setEditData({ anotaciones: terapia.anotaciones, tipo: terapia.tipo });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ anotaciones: '', tipo: 'Lenguaje' });
  };

  const saveEdit = (id: string) => {
    if (!editData.anotaciones.trim()) return;
    onEditTerapia(id, { anotaciones: editData.anotaciones, tipo: editData.tipo });
    cancelEdit();
  };

  const handleDelete = (terapia: Terapia) => {
    if (confirm(`¿Eliminar la terapia de ${terapia.pacienteNombre} del ${terapia.fecha}?\n\nEsta acción no se puede deshacer.`)) {
      onDeleteTerapia(terapia.id);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in py-2 flex-1">
      <div>
        <h2 className="font-display font-bold text-primary text-lg">Histórico Clínico</h2>
        <p className="text-[11px] text-outline font-medium">Evoluciones grabadas por la Dra. Silvia</p>
      </div>
      <div className="space-y-3">
        {terapias.map((terapia) => (
          <div key={terapia.id} className="bg-white p-3.5 rounded-2xl border border-outline-variant/15 shadow-sm">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-callout text-[8px] font-bold text-secondary uppercase tracking-widest">{terapia.fecha}</span>
                <h3 className="font-display font-bold text-primary text-xs mt-0.5">{terapia.pacienteNombre}</h3>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Edit button */}
                <button
                  onClick={() => editingId === terapia.id ? cancelEdit() : startEdit(terapia)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${editingId === terapia.id ? 'bg-outline/10 text-outline' : 'bg-primary/5 text-primary hover:bg-primary/10'}`}
                  title={editingId === terapia.id ? 'Cancelar edición' : 'Editar terapia'}
                >
                  <span className="material-symbols-outlined text-sm">{editingId === terapia.id ? 'close' : 'edit'}</span>
                </button>
                {/* Delete button */}
                <button
                  onClick={() => handleDelete(terapia)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all"
                  title="Eliminar terapia"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
                {/* Type badge */}
                <span className="px-2 py-0.5 bg-primary-fixed text-primary text-[8px] font-bold rounded-full uppercase">{terapia.tipo}</span>
              </div>
            </div>

            {/* Content — edit mode or read mode */}
            {editingId === terapia.id ? (
              <div className="space-y-2">
                <div>
                  <label className="text-[8px] font-bold text-outline block mb-0.5">TIPO DE TERAPIA</label>
                  <select
                    value={editData.tipo}
                    onChange={(e) => setEditData({ ...editData, tipo: e.target.value as Terapia['tipo'] })}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2 text-xs font-bold text-primary outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Lenguaje">Lenguaje</option>
                    <option value="Deglución">Deglución</option>
                    <option value="Audición">Audición</option>
                    <option value="Voz">Voz</option>
                  </select>
                </div>
                <div>
                  <label className="text-[8px] font-bold text-outline block mb-0.5">ANOTACIONES</label>
                  <textarea
                    value={editData.anotaciones}
                    onChange={(e) => setEditData({ ...editData, anotaciones: e.target.value })}
                    rows={4}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary font-medium resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={cancelEdit} className="flex-1 py-1.5 text-[10px] border border-outline text-outline font-bold rounded-lg hover:bg-surface-container">Cancelar</button>
                  <button onClick={() => saveEdit(terapia.id)} className="flex-1 py-1.5 text-[10px] bg-primary text-white font-bold rounded-lg shadow-sm active:scale-95">Guardar Cambios</button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-on-surface-variant leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-primary/20 italic">{terapia.anotaciones}</p>
            )}

            {/* Footer */}
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
