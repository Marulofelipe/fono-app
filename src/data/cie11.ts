/**
 * CIE-11 (Clasificación Internacional de Enfermedades, 11ª revisión)
 * Códigos relevantes para Fonoaudiología — Ministerio de Salud Colombia
 * Fuente: https://icd.who.int/
 */

export interface CieCode {
  codigo: string;
  descripcion: string;
  categoria: string;
}

export const CIE11_FONOAUDIOLOGIA: CieCode[] = [
  // === TRASTORNOS DEL DESARROLLO DEL HABLA Y LENGUAJE ===
  { codigo: "6A01", descripcion: "Trastornos del desarrollo del habla y del lenguaje", categoria: "Lenguaje" },
  { codigo: "6A01.0", descripcion: "Trastorno del desarrollo del lenguaje expresivo con defecto de comprensión", categoria: "Lenguaje" },
  { codigo: "6A01.1", descripcion: "Trastorno del desarrollo del lenguaje expresivo con defecto fonológico", categoria: "Lenguaje" },
  { codigo: "6A01.2", descripcion: "Trastorno del desarrollo del lenguaje expresivo de tipo disociado", categoria: "Lenguaje" },
  { codigo: "6A01.3", descripcion: "Afasia adquirida del desarrollo (trastorno del lenguaje adquirido)", categoria: "Lenguaje" },

  // === AFASIA ===
  { codigo: "6A62", descripcion: "Afasia", categoria: "Lenguaje" },
  { codigo: "6A62.0", descripcion: "Afasia de Broca (expresiva, motora)", categoria: "Lenguaje" },
  { codigo: "6A62.1", descripcion: "Afasia de Wernicke (receptiva, sensorial)", categoria: "Lenguaje" },
  { codigo: "6A62.2", descripcion: "Afasia global", categoria: "Lenguaje" },
  { codigo: "6A62.3", descripcion: "Afasia de conducción", categoria: "Lenguaje" },
  { codigo: "6A62.4", descripcion: "Afasia anómica (amnésica)", categoria: "Lenguaje" },
  { codigo: "6A62.5", descripcion: "Afasia transcortical motora", categoria: "Lenguaje" },
  { codigo: "6A62.6", descripcion: "Afasia transcortical sensorial", categoria: "Lenguaje" },
  { codigo: "6A62.7", descripcion: "Afasia mixta transcortical", categoria: "Lenguaje" },
  { codigo: "6A62.8", descripcion: "Afasia completa (global) no especificada", categoria: "Lenguaje" },

  // === TRASTORNOS DE LA ARTICULACIÓN ===
  { codigo: "DA01.0", descripcion: "Trastorno de la articulación de origen en temprana infancia", categoria: "Articulación" },
  { codigo: "DA01.1", descripcion: "Disartria (trastorno de la articulación de origen neurológico)", categoria: "Articulación" },
  { codigo: "DA01.2", descripcion: "Apraxia del habla (trastorno de la articulación de origen neurológico)", categoria: "Articulación" },
  { codigo: "DA01.Y", descripcion: "Otros trastornos de la articulación", categoria: "Articulación" },

  // === TRASTORNOS DE LA VOZ ===
  { codigo: "DA02.0", descripcion: "Disfonía por nódulos de cuerdas vocales", categoria: "Voz" },
  { codigo: "DA02.1", descripcion: "Disfonía por parálisis laríngea", categoria: "Voz" },
  { codigo: "DA02.2", descripcion: "Disfonía por polipos/quistes de cuerdas vocales", categoria: "Voz" },
  { codigo: "DA02.3", descripcion: "Disfonía espasmódica", categoria: "Voz" },
  { codigo: "DA02.4", descripcion: "Disfonía por reflujo laringofaríngeo", categoria: "Voz" },
  { codigo: "DA02.5", descripcion: "Disfonía por trauma laríngeo", categoria: "Voz" },
  { codigo: "DA02.6", descripcion: "Afonía", categoria: "Voz" },
  { codigo: "DA02.7", descripcion: "Disfonía por tensión muscular", categoria: "Voz" },
  { codigo: "DA02.Y", descripcion: "Otras disfonías", categoria: "Voz" },

  // === TRASTORNOS DE LA DEGLUCIÓN ===
  { codigo: "DA04.0", descripcion: "Disfagia orofaríngea (trastorno de la deglución)", categoria: "Deglución" },
  { codigo: "DA04.1", descripcion: "Disfagia por alteración del mecanismo de transferencia", categoria: "Deglución" },
  { codigo: "DA04.2", descripcion: "Disfagia por alteración del mecanismo propulsivo faríngeo", categoria: "Deglución" },
  { codigo: "DA04.3", descripcion: "Disfagia por alteración del mecanismo cricofaríngeo", categoria: "Deglución" },
  { codigo: "DA04.4", descripcion: "Disfagia orofaríngea de origen neurológico", categoria: "Deglución" },
  { codigo: "DA04.Y", descripcion: "Otras disfagias", categoria: "Deglución" },

  // === TARTAMUDEZ ===
  { codigo: "6C20", descripcion: "Tartamudez (trastorno de la fluidez del habla de inicio en la infancia)", categoria: "Fluidez" },
  { codigo: "6C20.0", descripcion: "Tartamudez con inicio en la infancia", categoria: "Fluidez" },
  { codigo: "6C20.1", descripcion: "Tartamudez de inicio en la adolescencia o adultez", categoria: "Fluidez" },
  { codigo: "6C20.2", descripcion: "Tartamudez persistente crónica", categoria: "Fluidez" },

  // === RETRASO DEL DESARROLLO ===
  { codigo: "6A70", descripcion: "Retraso del desarrollo del habla y del lenguaje", categoria: "Desarrollo" },
  { codigo: "6A70.0", descripcion: "Retraso del desarrollo del lenguaje", categoria: "Desarrollo" },
  { codigo: "6A70.1", descripcion: "Retraso del desarrollo motor del habla", categoria: "Desarrollo" },
  { codigo: "6A70.2", descripcion: "Retraso del desarrollo del lenguaje receptivo", categoria: "Desarrollo" },

  // === TRASTORNOS DEL ESPECTRO AUTISTA ===
  { codigo: "6A05", descripcion: "Trastorno del espectro autista", categoria: "Neurodevelopmental" },
  { codigo: "6A05.0", descripcion: "Trastorno del espectro autista sin deterioro intelectual y con deterioro leve de la conducta adaptativa", categoria: "Neurodevelopmental" },
  { codigo: "6A05.1", descripcion: "Trastorno del espectro autista con deterioro intelectual y con deterioro de la conducta adaptativa", categoria: "Neurodevelopmental" },

  // === TRASTORNOS DEL OÍDO / AUDICIÓN ===
  { codigo: "AB11", descripcion: "Hipoacusia (pérdida auditiva)", categoria: "Audición" },
  { codigo: "AB11.0", descripcion: "Hipoacusia conductiva unilateral", categoria: "Audición" },
  { codigo: "AB11.1", descripcion: "Hipoacusia conductiva bilateral", categoria: "Audición" },
  { codigo: "AB11.2", descripcion: "Hipoacusia neurosensorial unilateral", categoria: "Audición" },
  { codigo: "AB11.3", descripcion: "Hipoacusia neurosensorial bilateral", categoria: "Audición" },
  { codigo: "AB11.4", descripcion: "Hipoacusia mixta", categoria: "Audición" },
  { codigo: "AB11.5", descripcion: "Hipoacusia súbita", categoria: "Audición" },
  { codigo: "AB11.6", descripcion: "Presbiacusia (pérdida auditiva relacionada con la edad)", categoria: "Audición" },
  { codigo: "AB11.7", descripcion: "Tinnitus", categoria: "Audición" },

  // === PARÁLISIS CEREBRAL ===
  { codigo: "8A00", descripcion: "Parálisis cerebral", categoria: "Neurológico" },
  { codigo: "8A00.0", descripcion: "Parálisis cerebral espástica", categoria: "Neurológico" },
  { codigo: "8A00.1", descripcion: "Parálisis cerebral discinética", categoria: "Neurológico" },
  { codigo: "8A00.2", descripcion: "Parálisis cerebral atáxica", categoria: "Neurológico" },

  // === OTROS ===
  { codigo: "8A01", descripcion: "Síndrome de Down (Trisomía 21)", categoria: "Genético" },
  { codigo: "8A02", descripcion: "Enfermedad de Parkinson", categoria: "Neurológico" },
  { codigo: "8A03", descripcion: "Esclerosis múltiple", categoria: "Neurológico" },
  { codigo: "8A04", descripcion: "ACV / Accidente cerebrovascular", categoria: "Neurológico" },
  { codigo: "QA02", descripcion: "Fisura labial y/o palatina", categoria: "Anatómico" },
  { codigo: "DA0E", descripcion: "Síndrome de Pick", categoria: "Neurológico" },
  { codigo: "6D70", descripcion: "Demencia en enfermedad de Alzheimer", categoria: "Neurológico" },
];

/**
 * Busca diagnósticos CIE-11 por texto libre.
 * @param query - Texto de búsqueda (nombre o código)
 * @param maxResults - Máximo de resultados (default 8)
 */
export function searchCie11(query: string, maxResults: number = 8): CieCode[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return CIE11_FONOAUDIOLOGIA.filter(c =>
    c.codigo.toLowerCase().includes(q) ||
    c.descripcion.toLowerCase().includes(q) ||
    c.categoria.toLowerCase().includes(q)
  ).slice(0, maxResults);
}

/**
 * Formatea un código CIE-11 para mostrar.
 * Ejemplo: { codigo: "6A62.0", descripcion: "Afasia de Broca" }
 * → "6A62.0 — Afasia de Broca"
 */
export function formatCieCode(cie: CieCode): string {
  return `${cie.codigo} — ${cie.descripcion}`;
}
