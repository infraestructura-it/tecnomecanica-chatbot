'use strict';

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const NEGOCIO  = process.env.NEGOCIO_NOMBRE    || 'CITAMOTOR';
const DIR      = process.env.NEGOCIO_DIRECCION || 'Bogotá';
const TEL      = process.env.NEGOCIO_TELEFONO  || '3001234567';

// ── Slots disponibles ────────────────────────────────────────────────
const HORARIOS = ['8:00 AM', '10:00 AM', '2:00 PM', '4:00 PM'];

/**
 * Genera los próximos 5 días hábiles a partir de hoy
 */
function diasDisponibles() {
  const dias = [];
  const nombres = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const hoy = new Date();

  let d = new Date(hoy);
  d.setDate(d.getDate() + 1); // Mínimo mañana

  while (dias.length < 5) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) { // Lun-Vie
      dias.push({
        etiqueta: `${nombres[dow]} ${d.getDate()} de ${meses[d.getMonth()]}`,
        valor: d.toISOString().split('T')[0],
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

// ── System prompt ────────────────────────────────────────────────────
function buildSystemPrompt() {
  const dias = diasDisponibles();
  const listaDias = dias.map((d, i) => `  ${i + 1}. ${d.etiqueta}`).join('\n');
  const listaHoras = HORARIOS.map((h, i) => `  ${i + 1}. ${h}`).join('\n');

  return `Eres el asistente virtual de ${NEGOCIO}, centro de revisión técnico-mecánica ubicado en ${DIR}.
Tu único trabajo es agendar citas de revisión tecnomecánica siguiendo este flujo en orden estricto:

═══════════════════════════════════════════
FLUJO DE AGENDAMIENTO (sigue estos pasos EN ORDEN)
═══════════════════════════════════════════

PASO 1 — BIENVENIDA Y PLACA
  - Saluda brevemente y pide el número de placa del vehículo.
  - Formato válido: 3 letras + 3 números (carros, ej: ABC123) 
                 o  3 letras + 2 números (motos, ej: XYZ45).
  - Si el formato es inválido, pídelo de nuevo con un ejemplo.
  - Convierte la placa a mayúsculas antes de confirmar.

PASO 2 — FECHA
  Una vez tengas la placa válida, muestra los días disponibles:
${listaDias}
  Pide que elija escribiendo el número (1-5) o el nombre del día.

PASO 3 — HORA
  Una vez tengas la fecha, muestra los horarios disponibles:
${listaHoras}
  Pide que elija escribiendo el número (1-4) o la hora.

PASO 4 — CONFIRMACIÓN
  Muestra el resumen completo y pide confirmación con SÍ o NO:
  📋 Placa: [placa]
  📅 Fecha: [fecha]
  ⏰ Hora: [hora]
  📍 Dirección: ${DIR}

PASO 5 — CIERRE
  Cuando el usuario confirme con SÍ (o "si", "sí", "ok", "dale", "confirmo"):
  1. Escribe exactamente esta línea al inicio de tu respuesta:
     BOOKING_COMPLETE:{"placa":"[PLACA]","fecha":"[FECHA_ISO]","hora":"[HORA]"}
  2. Luego el mensaje de confirmación con el código que recibirás en el contexto.

  Si el usuario dice NO, pregunta qué desea cambiar y regresa al paso correspondiente.

═══════════════════════════════════════════
REGLAS IMPORTANTES
═══════════════════════════════════════════
- Responde SIEMPRE en español.
- Sé amable, conciso y usa emojis ocasionalmente (🚗 ✅ 📅).
- NO hagas más de UNA pregunta a la vez.
- NO te desvíes del tema de agendamiento.
- Si preguntan algo diferente, responde brevemente y regresa al flujo.
- Teléfono de contacto: ${TEL}`;
}

// ── Chat principal ───────────────────────────────────────────────────

/**
 * Envía un mensaje a Claude y retorna la respuesta
 * @param {Array}  history  - Historial de mensajes [{role, content}]
 * @param {string} userMsg  - Mensaje del usuario
 * @param {string} codigoCita - Código generado (solo en confirmación)
 * @returns {Promise<string>} - Respuesta del bot
 */
async function chat(history, userMsg, codigoCita = null) {
  // Si hay código de cita pendiente, inyectarlo como contexto
  const mensajeUsuario = codigoCita
    ? `${userMsg}\n\n[SISTEMA: Código de cita generado: ${codigoCita}]`
    : userMsg;

  const messages = [
    ...history,
    { role: 'user', content: mensajeUsuario },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: buildSystemPrompt(),
    messages,
  });

  return response.content[0].text;
}

/**
 * Extrae los datos de reserva si el bot completó el flujo
 * Detecta: BOOKING_COMPLETE:{"placa":"...","fecha":"...","hora":"..."}
 * @param {string} respuesta
 * @returns {Object|null}
 */
function extraerBooking(respuesta) {
  const match = respuesta.match(/BOOKING_COMPLETE:(\{[^}]+\})/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Limpia la señal BOOKING_COMPLETE del texto visible al usuario
 */
function limpiarRespuesta(respuesta) {
  return respuesta.replace(/BOOKING_COMPLETE:\{[^}]+\}\s*/g, '').trim();
}

module.exports = { chat, extraerBooking, limpiarRespuesta, diasDisponibles, HORARIOS };
