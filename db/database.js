const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'citas.db');

// Crear carpeta data si no existe
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// WAL mode para mejor concurrencia
db.pragma('journal_mode = WAL');

// Ejecutar schema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Guardar una cita nueva
 * @param {Object} cita - { codigo, placa, fecha, hora, canal, telefono }
 */
function guardarCita(cita) {
  const stmt = db.prepare(`
    INSERT INTO citas (codigo, placa, fecha, hora, canal, telefono)
    VALUES (@codigo, @placa, @fecha, @hora, @canal, @telefono)
  `);
  return stmt.run(cita);
}

/**
 * Verificar si un slot está disponible (máx 3 citas por hora)
 */
function slotDisponible(fecha, hora) {
  const row = db.prepare(`
    SELECT COUNT(*) as total FROM citas
    WHERE fecha = ? AND hora = ? AND estado != 'cancelada'
  `).get(fecha, hora);
  return row.total < 3;
}

/**
 * Obtener todas las citas de una fecha
 */
function citasPorFecha(fecha) {
  return db.prepare(`
    SELECT * FROM citas WHERE fecha = ? ORDER BY hora
  `).all(fecha);
}

/**
 * Obtener citas recientes para el panel admin
 */
function citasRecientes(limite = 50) {
  return db.prepare(`
    SELECT * FROM citas ORDER BY created_at DESC LIMIT ?
  `).all(limite);
}

/**
 * Buscar cita por código
 */
function buscarPorCodigo(codigo) {
  return db.prepare('SELECT * FROM citas WHERE codigo = ?').get(codigo);
}

/**
 * Cancelar cita
 */
function cancelarCita(codigo) {
  return db.prepare(`
    UPDATE citas SET estado = 'cancelada' WHERE codigo = ?
  `).run(codigo);
}

module.exports = {
  db,
  guardarCita,
  slotDisponible,
  citasPorFecha,
  citasRecientes,
  buscarPorCodigo,
  cancelarCita,
};
