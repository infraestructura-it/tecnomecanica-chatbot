'use strict';

/**
 * Sesiones en memoria — mapa sessionId → { history, datos }
 * En producción reemplazar con Redis o tabla SQLite
 */
const sesiones = new Map();

const TIMEOUT_MS = 30 * 60 * 1000; // 30 min inactividad

/**
 * Obtener o crear sesión
 */
function obtenerSesion(sessionId) {
  limpiarExpiradas();

  if (!sesiones.has(sessionId)) {
    sesiones.set(sessionId, {
      id: sessionId,
      history: [],           // historial para Claude API
      datos: {               // datos recolectados
        placa: null,
        fecha: null,
        hora: null,
      },
      estado: 'INIT',
      ultimaActividad: Date.now(),
    });
  }

  const sesion = sesiones.get(sessionId);
  sesion.ultimaActividad = Date.now();
  return sesion;
}

/**
 * Actualizar sesión
 */
function actualizarSesion(sessionId, cambios) {
  const sesion = obtenerSesion(sessionId);
  Object.assign(sesion, cambios);
  sesion.ultimaActividad = Date.now();
}

/**
 * Eliminar sesión (al confirmar cita o cancelar)
 */
function eliminarSesion(sessionId) {
  sesiones.delete(sessionId);
}

/**
 * Limpiar sesiones expiradas
 */
function limpiarExpiradas() {
  const ahora = Date.now();
  for (const [id, sesion] of sesiones) {
    if (ahora - sesion.ultimaActividad > TIMEOUT_MS) {
      sesiones.delete(id);
    }
  }
}

module.exports = { obtenerSesion, actualizarSesion, eliminarSesion };
