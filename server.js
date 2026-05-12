'use strict';

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const QRCode   = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const { procesar }                        = require('./bot/flow');
const { obtenerSesion, actualizarSesion } = require('./bot/sessions');
const { guardarCita, citasRecientes,
        buscarPorCodigo, cancelarCita,
        slotDisponible }                  = require('./db/database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'widget')));

// POST /api/chat
app.post('/api/chat', async (req, res) => {
  try {
    const { mensaje, sessionId: sidCliente } = req.body;
    if (!mensaje) return res.status(400).json({ error: 'Mensaje requerido' });

    const sessionId = sidCliente || uuidv4();
    const sesion    = obtenerSesion(sessionId);
    const resultado = procesar(sesion, mensaje.trim());

    // Consultar cita
    if (resultado.accion === 'CONSULTAR') {
      const cita = buscarPorCodigo(resultado.codigo);
      resultado.texto   = cita
        ? `🔍 *Cita encontrada:*\n\n🚗 Placa: *${cita.placa}*\n📅 Fecha: *${cita.fecha}*\n⏰ Hora: *${cita.hora}*\n📌 Código: *${cita.codigo}*\n🟢 Estado: *${cita.estado}*`
        : `⚠️ No encontré la cita *${resultado.codigo}*. Verifica el código.`;
      resultado.botones = [{ label: '🏠 Menú principal', valor: '__MENU__' }];
    }

    // Cancelar cita
    if (resultado.accion === 'CANCELAR') {
      const cita = buscarPorCodigo(resultado.codigo);
      if (cita && cita.estado === 'confirmada') {
        cancelarCita(resultado.codigo);
        resultado.texto = `✅ Cita *${resultado.codigo}* cancelada.`;
      } else if (cita) {
        resultado.texto = `ℹ️ Esa cita ya estaba cancelada.`;
      } else {
        resultado.texto = `⚠️ No encontré la cita *${resultado.codigo}*.`;
      }
      resultado.botones = [{ label: '🏠 Menú principal', valor: '__MENU__' }];
    }

    // Guardar cita + generar QR
    let qrBase64 = null;
    if (resultado.cita) {
      const { placa, fecha, hora, codigo } = resultado.cita;
      if (!slotDisponible(fecha, hora)) {
        resultado.texto   = '⚠️ Ese horario se llenó. Elige otro.';
        resultado.botones = [{ label: '🔄 Reagendar', valor: '__MENU__' }];
        resultado.cita    = null;
      } else {
        guardarCita({ codigo, placa, fecha, hora, canal: 'web', telefono: null });
        const qrData = `CITAMOTOR|${codigo}|${placa}|${fecha}|${hora}`;
        qrBase64 = await QRCode.toDataURL(qrData, {
          width: 200, margin: 1,
          color: { dark: '#080b10', light: '#ffffff' },
        });
      }
    }

    actualizarSesion(sessionId, { estado: resultado.estado });

    res.json({
      sessionId,
      texto:      resultado.texto,
      botones:    resultado.botones || [],
      qr:         qrBase64,
      citaCreada: !!resultado.cita,
    });

  } catch (err) {
    console.error('[/api/chat] Error:', err.message);
    res.status(500).json({ error: 'Error interno.' });
  }
});

app.get('/api/citas',        (req, res) => res.json({ citas: citasRecientes(100) }));
app.get('/api/citas/:codigo', (req, res) => {
  const c = buscarPorCodigo(req.params.codigo.toUpperCase());
  c ? res.json(c) : res.status(404).json({ error: 'No encontrada' });
});
app.get('/',       (req, res) => res.sendFile(path.join(__dirname, 'widget', 'index.html')));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`\n🚗 CITAMOTOR → http://localhost:${PORT}`);
  console.log(`📋 Admin     → http://localhost:${PORT}/api/citas`);
  console.log(`💡 Flujo 100% local — sin consumo de API\n`);
});
