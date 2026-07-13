import { Paciente, Terapia, Bono } from './types';

export const INITIAL_PACIENTES: Paciente[] = [
  {
    id: "1029384",
    nombre: "Eduardo Castro",
    empresa: "Colsanitas",
    telefono: "315 789 4512",
    diagnostico: "Afasia Motora",
    progresoPlan: 70,
    sesionesCompletadas: 14,
    sesionesTotales: 20,
    proximaCita: "Mañana, 10:00",
    edad: 52,
    direccion: "Calle 123 #45-67, Bogotá",
    latitud: 4.710988,
    longitud: -74.072090,
    estado: "Activo"
  },
  {
    id: "1045920",
    nombre: "Mateo Sebastián Restrepo",
    empresa: "Medisanitas",
    telefono: "310 456 7890",
    diagnostico: "Terapia de Lenguaje Funcional",
    progresoPlan: 50,
    sesionesCompletadas: 5,
    sesionesTotales: 10,
    proximaCita: "En 15 minutos",
    edad: 6,
    estado: "Activo"
  }
];

export const INITIAL_TERAPIAS: Terapia[] = [
  {
    id: "t1",
    pacienteId: "1029384",
    pacienteNombre: "Eduardo Castro",
    fecha: "24 de Octubre, 2023",
    hora: "10:30:00",
    anotaciones: "Sesión de Control. Evaluación fonológica post-trauma. Paciente responde adecuadamente a estímulos visuales y muestra mejoría en la denominación de objetos cotidianos.",
    tipo: "Lenguaje"
  },
  {
    id: "t2",
    pacienteId: "1029384",
    pacienteNombre: "Eduardo Castro",
    fecha: "17 de Octubre, 2023",
    hora: "10:15:00",
    anotaciones: "Terapia Intensiva. Ejercicios de articulación fonética. Mayor control en la producción de fonemas oclusivos. Se asignan ejercicios para la casa con la familia.",
    tipo: "Lenguaje"
  },
  {
    id: "t3",
    pacienteId: "1029384",
    pacienteNombre: "Eduardo Castro",
    fecha: "10 de Octubre, 2023",
    hora: "09:00:00",
    anotaciones: "Entrevista Inicial y Anamnesis completa del paciente. Se definen objetivos del plan terapéutico para afasia expresiva.",
    tipo: "Lenguaje"
  },
  {
    id: "t4",
    pacienteId: "1045920",
    pacienteNombre: "Mateo Sebastián Restrepo",
    fecha: "23 de Junio, 2026",
    hora: "12:44:10",
    anotaciones: "Mateo, intenta repetir conmigo: 'El sol brilla en el campo'. Fíjate bien en la posición de mi lengua contra el paladar superior.",
    tipo: "Lenguaje"
  },
  {
    id: "t5",
    pacienteId: "1045920",
    pacienteNombre: "Mateo Sebastián Restrepo",
    fecha: "23 de Junio, 2026",
    hora: "12:44:35",
    anotaciones: "Observación de movimiento hioideo durante la ingesta de sólidos. El paciente muestra una leve demora en el inicio del reflejo deglutorio.",
    tipo: "Deglución"
  }
];

export const INITIAL_BONOS: Bono[] = [
  {
    id: "Bono N° 99283-A",
    codigoPago: "77402-B839-2024",
    fecha: "24 de Mayo, 2024",
    estado: "Válido"
  },
  {
    id: "Bono N° 88122-C",
    codigoPago: "55431-C721-2024",
    fecha: "23 de Mayo, 2024",
    estado: "Procesado"
  }
];
