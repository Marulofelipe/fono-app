import { GoogleGenAI } from "@google/genai";

/**
 * Obtiene la API key de Gemini desde:
 * 1. Variables de entorno (build time — VITE_GEMINI_API_KEY o GEMINI_API_KEY)
 * 2. LocalStorage del navegador (runtime — ingresada por el usuario en la primera ejecución)
 *
 * Esto permite subir el bundle a un repo público sin exponer secretos en el código.
 */
function getApiKey(): string {
  // Primero intenta con variables de entorno (modo desarrollo / AI Studio)
  const env = (import.meta as any).env || {};
  const envKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;
  if (envKey) return envKey;

  // Luego intenta desde LocalStorage (modo producción / GitHub Pages)
  if (typeof window !== "undefined" && window.localStorage) {
    const stored = window.localStorage.getItem("silvia_gemini_api_key");
    if (stored) return stored;
  }

  return "";
}

let _ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  const key = getApiKey();
  if (!key) {
    throw new Error(
      "Gemini API Key no configurada. Configúrala en Ajustes de la app."
    );
  }
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: key });
  }
  return _ai;
}

export interface BonoOCRResult {
  codigoPago: string;
  fecha: string;
  pacienteNombre: string;
  confianza: number;
}

/**
 * Analiza una imagen de un bono médico usando Gemini Vision.
 * Extrae: código de pago, fecha, nombre del paciente.
 */
export async function analyzeBonoWithGemini(imageBase64: string): Promise<BonoOCRResult> {
  try {
    const prompt = `Eres un asistente especializado en lectura de bonos médicos colombianos de fonoaudiología.
Analiza esta imagen de un bono y extrae la siguiente información:

1. CÓDIGO DE PAGO: El código alfanumérico del bono (ej: 77402-B839-2024)
2. FECHA: La fecha que aparece en el bono (formato: "DD de Mes, YYYY")
3. PACIENTE: El nombre del paciente si aparece visible

Responde ÚNICAMENTE en formato JSON:
{
  "codigoPago": "código encontrado o 'NO_ENCONTRADO'",
  "fecha": "fecha encontrada o 'NO_ENCONTRADO'",
  "pacienteNombre": "nombre encontrado o 'NO_ENCONTRADO'",
  "confianza": 0.0 a 1.0
}`;

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ""),
              },
            },
          ],
        },
      ],
    });

    const text = response.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        codigoPago: "NO_ENCONTRADO",
        fecha: "NO_ENCONTRADO",
        pacienteNombre: "NO_ENCONTRADO",
        confianza: 0,
      };
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      codigoPago: result.codigoPago || "NO_ENCONTRADO",
      fecha: result.fecha || "NO_ENCONTRADO",
      pacienteNombre: result.pacienteNombre || "NO_ENCONTRADO",
      confianza: result.confianza || 0.5,
    };
  } catch (error) {
    console.error("Error analyzing bono with Gemini:", error);
    return {
      codigoPago: "ERROR",
      fecha: "ERROR",
      pacienteNombre: "ERROR",
      confianza: 0,
    };
  }
}

/**
 * Genera un resumen de evolución clínica usando Gemini.
 */
export async function generateEvolucionClinica(
  pacienteNombre: string,
  pacienteDiagnostico: string,
  transcripcion: string,
  tipoTerapia: string
): Promise<string> {
  try {
    const prompt = `Eres un asistente especializado en fonoaudiología que ayuda a la Dra. Silvia Margarita Pérez F.
Genera un informe de evolución clínica profesional basado en los siguientes datos:

Paciente: ${pacienteNombre}
Diagnóstico: ${pacienteDiagnostico}
Tipo de terapia: ${tipoTerapia}
Notas de la sesión: ${transcripcion}

Genera un informe con:
1. OBSERVACIONES CLÍNICAS (2-3 líneas)
2. ACTIVIDADES REALIZADAS (2-3 líneas)
3. PROGRESO OBSERVADO (1-2 líneas)
4. RECOMENDACIONES PARA CASA (1-2 líneas)

Mantén un tono profesional, clínico y conciso. No inventes datos que no estén en las notas.`;

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    return response.text || "No se pudo generar el informe.";
  } catch (error) {
    console.error("Error generating evolución:", error);
    return "Error al generar evolución clínica.";
  }
}

/**
 * Verifica si la API key está configurada.
 */
export function isApiKeyConfigured(): boolean {
  return getApiKey().length > 0;
}

/**
 * Guarda la API key en LocalStorage.
 */
export function saveApiKey(key: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem("silvia_gemini_api_key", key);
    _ai = null; // Reset para que use la nueva key
  }
}
