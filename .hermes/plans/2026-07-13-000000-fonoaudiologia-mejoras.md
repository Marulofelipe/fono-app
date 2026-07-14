# MP Fonoaudiología Premium — Plan de Mejoras (6 puntos)

> **Para Hermes:** Ejecutar este plan punto por punto. Un punto a la vez, commit, verificar, siguiente.

**Objetivo:** 6 mejoras a la app de fonoaudiología de Dra. Silvia Pérez.
**Stack:** React 19 + TypeScript + Vite + Tailwind CSS 4 + Firebase + Gemini AI
**Directorio:** `D:\Proyectos\fonoaudiologia-premium`

---

## PUNTO 1: Registros — Editar/Eliminar terapias

**Objetivo:** Desde la pestaña "Registros", poder editar y eliminar cada terapia de la lista.

**Archivos a modificar:**
- `src/components/views/RegistrosView.tsx` — Agregar botones de editar/eliminar + form inline
- `src/App.tsx` — Agregar handlers `onEditTerapia`, `onDeleteTerapia`

**Cambios:**
1. Agregar props `onEditTerapia` y `onDeleteTerapia` a `RegistrosViewProps`
2. En cada tarjeta de terapia, agregar iconos de editar (pencil) y eliminar (trash)
3. Al clickear editar: mostrar form inline con campos editables (anotaciones, tipo, fecha)
4. Al confirmar edición: llamar `onEditTerapia(id, cambios)`
5. Al eliminar: `confirm()` y llamar `onDeleteTerapia(id)`
6. En App.tsx: implementar `handleEditTerapia` y `handleDeleteTerapia` que usan `setTerapias`

**Verificar:** `tsc --noEmit && vite build`

---

## PUNTO 2: Dictador Inteligente en Inicio

**Objetivo:** El botón de micrófono en Inicio debe ser un asistente completo. Ejemplos de comandos:
- "Crear paciente Eduardo Castro cédula 1029384 Colsanitas afasia motora"
- "Ver agenda de mañana" / "Ver agenda de hoy"
- "Cuántos bonos tiene Eduardo"
- "Quién es el siguiente paciente"
- "Cuánto tiempo me demoré en el paciente anterior"
- "Ir a registros" / "Ir a bonos" / "Ir a pacientes"
- "Agregar bono para Eduardo"
- "Nueva cita para Eduardo mañana 8 am"

**Archivos a modificar:**
- `src/App.tsx` — Expandir `handleVoiceIntents` con más intents
- `src/components/views/InicioView.tsx` — Mostrar feedback contextual del intent

**Intents a implementar:**

| Comando ejemplo | Acción |
|---|---|
| "Crear paciente [nombre] cédula [id] [empresa] [dx]" | Crear paciente auto, mostrar toast confirmación |
| "Ver agenda" / "Ver agenda de mañana/hoy" | Navegar a Agenda, filtrar por día |
| "Cuántos bonos tiene [nombre]" | Toast con respuesta: "Eduardo tiene 2 bonos válidos" |
| "Siguiente paciente" | Toast con info del próximo de agenda |
| "Tiempo paciente anterior" | Calcular duración de la última terapia del paciente más reciente |
| "Ir a [sección]" | Navegar a la sección indicada |
| "Agregar bono" | Navegar a Bonos con cámara activa |
| "Nueva cita [paciente] [día] [hora]" | Crear cita directamente |
| "Editar paciente [nombre]" | Navegar a pacientes con form de edición |

**Feedback visual:** Cuando el dictador detecta un intent, mostrar un toast animado con la acción识别ada y opción de confirmar.

**Verificar:** Probar cada comando en navegador con Chrome.

---

## PUNTO 3: Voz Nuevo Paciente — Desbloquear y Auto-llenar

**Objetivo:** El botón "Nuevo Paciente" en pestaña Pacientes debe:
1. No bloquearse (bug actual)
2. Auto-llenar todos los campos dictados
3. Si falta un campo obligatorio, pedir que dicte solo ese campo

**Archivos a modificar:**
- `src/App.tsx` — Fix `startVoicePaciente`, mejorar `parseAndProposePaciente`
- `src/components/views/PacientesView.tsx` — Feedback de campos faltantes

**Cambios:**
1. Bug fix: el `recognitionRef` se reutiliza mal. Crear instancia separada para voz paciente
2. Parsear TODOS los campos: nombre, cédula, empresa, diagnóstico, teléfono, edad, dirección
3. After dictation: validar campos obligatorios (nombre, cédula)
4. Si falta algo: mostrar toast "Falta el diagnóstico, por favor dígalo ahora" y re-escuchar
5. Auto-completar datos faltantes con valores por defecto razonables

**Verificar:** Probar creación completa por voz en Chrome.

---

## PUNTO 4: Agenda — Calendario con Vistas

**Objetivo:** Transformar la agenda de lista a calendario con 3 vistas (día, semana, mes).

**Archivos a modificar:**
- `src/components/views/AgendaView.tsx` — Reescritura completa
- `src/types.ts` — Agregar campos a `Cita` si es necesario
- `src/App.tsx` — Handlers para edición de citas

**Diseño del calendario:**
- **Vista Día:** Timeline vertical con horas (6am-8pm), citas como bloques de color
- **Vista Semana:** Grid 7 columnas (Lun-Dom), citas como pills
- **Vista Mes:** Calendario tradicional con dots en días con citas
- **Toggle:** 3 botones en la parte superior (Día | Semana | Mes)
- **Edición:** Al tocar una cita → modal con opciones editar/eliminar
- **Voz:** "Nueva cita para Eduardo mañana a las 8am" sigue funcionando
- **Auto-completar:** Si falta hora o paciente, preguntar "¿A qué hora?" o "¿Para qué paciente?"

**Verificar:** Navegar entre vistas, crear/editar/eliminar citas.

---

## PUNTO 5: Datos Paciente — Acudiente + Fecha Nacimiento

**Objetivo:** Agregar campos de acudiente/encargado y cambiar fecha a formato YYYY-MM-DD.

**Archivos a modificar:**
- `src/types.ts` — Agregar campos a `Paciente`
- `src/components/views/PacientesView.tsx` — Formulario actualizado
- `src/components/views/PacienteDetalle.tsx` — Mostrar nuevos campos
- `src/App.tsx` — Actualizar create/edit patient

**Campos nuevos en `Paciente`:**
```typescript
fechaNacimiento?: string; // YYYY-MM-DD
acudienteNombre?: string;
acudienteTelefono?: string;
acudienteParentesco?: string; // "Hijo", "Esposo", "Otro"
```

**Cambios en formularios:**
- Campo fecha nacimiento: input type="date" con formato YYYY-MM-DD
- Sección "Acudiente / Encargado" (visible si edad >= 60 o si se activa)
- En PacienteDetalle: mostrar acudiente si existe

**Verificar:** Crear paciente con todos los campos nuevos, verificar que se guardan.

---

## PUNTO 6: Diagnósticos CIE-11 para RIPS

**Objetivo:** Los diagnósticos deben usar la tabla CIE-11 del Ministerio de Salud de Colombia.

**Archivos a crear/Modificar:**
- `src/data/cie11.ts` — Base de datos de códigos CIE-11 relevantes para fonoaudiología
- `src/components/views/PacientesView.tsx` — Autocomplete con CIE-11
- `src/components/views/PacienteDetalle.tsx` — Mostrar código CIE
- `src/types.ts` — Agregar `diagnosticoCie?: string` a `Paciente`

**Códigos CIE-11 relevantes para fonoaudiología:**
- 6A01: Afasia
- 6A00: Trastornos del desarrollo del habla y del lenguaje
- DA01: Trastornos de la articulación
- DA02: Trastornos de la voz
- DA04: Trastornos de la deglución
- 6A70: Retraso del desarrollo del lenguaje
- 6C20: Tartamudez
- AB11: Hipoacusia
- etc.

**UX:** Al escribir en el campo diagnóstico, mostrar autocomplete con códigos CIE-11. Seleccionar uno llena automáticamente: código + descripción.

**Para RIPS:** Al exportar, incluir el código CIE-11 en el campo de diagnóstico.

**Verificar:** Buscar "afasia" → debe mostrar 6A01. Seleccionar → llenar campo.

---

## ORDEN DE EJECUCIÓN

1. **P1** (Registros) — Más simple, quick win
2. **P3** (Voz paciente) — Fix bug crítico
3. **P2** (Dictador) — Feature principal
4. **P5** (Acudiente) — Cambio de modelo de datos
5. **P6** (CIE-11) — Depende de P5
6. **P4** (Calendario) — El más complejo, va al final

## VERIFICACIÓN FINAL

Después de cada punto:
```bash
cd /d/Proyectos/fonoaudiologia-premium
npx tsc --noEmit
node node_modules/vite/bin/vite.js build
git add -A && git commit -m "feat(fono): [descripción del cambio]"
```
