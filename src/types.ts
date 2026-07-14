export type EstadoPaciente = 'Activo' | 'Inactivo' | 'Suspendido' | 'Retirado' | 'Fallecido';

export interface Paciente {
  id: string; // Cédula/ID único
  nombre: string;
  empresa: string; // Empresa promotora de salud / Aseguradora
  telefono: string;
  diagnostico: string; // Diagnóstico fonoaudiológico (texto libre)
  diagnosticoCie?: string; // Código CIE-11 (ej: "6A62.0 — Afasia de Broca")
  progresoPlan: number; // Porcentaje de progreso (0-100)
  sesionesCompletadas: number;
  sesionesTotales: number;
  proximaCita?: string; // e.g., "Mañana, 10:00"
  edad?: number; // Edad del paciente
  fechaNacimiento?: string; // Formato YYYY-MM-DD
  direccion?: string;
  latitud?: number;
  longitud?: number;
  estado?: EstadoPaciente; // Estado del paciente (Activo por defecto)
  // Acudiente / Encargado (para adultos mayores o pacientes dependientes)
  acudienteNombre?: string;
  acudienteTelefono?: string;
  acudienteParentesco?: string; // "Hijo", "Esposo", "Hermano", "Otro"
}

export interface Terapia {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  fecha: string; // Formato legible en español
  hora: string;
  anotaciones: string; // Transcripción de la terapia
  tipo: 'Lenguaje' | 'Deglución' | 'Audición' | 'Voz';
}

export interface Bono {
  id: string; // Identificador correlativo o número de bono
  codigoPago: string; // Código escaneado/detectado
  fecha: string;
  estado: 'Válido' | 'Procesado';
  imagenBono?: string; // Imagen en base64 capturada por la cámara
  pacienteId?: string; // Paciente vinculado (opcional)
  pacienteNombre?: string; // Nombre del paciente vinculado (opcional)
}

export interface Cita {
  id: string;
  pacienteId?: string;
  pacienteNombre: string;
  fecha: string; // e.g. "Mañana", "Lunes 28 de Octubre"
  hora: string;  // e.g. "8:00 am"
}

