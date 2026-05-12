'use strict';

/**
 * FLUJO TECNOMECÁNICA — Lógica pura JS, cero tokens API
 * Estados: INIT → PLACA → FECHA → HORA → CONFIRMAR → DONE
 */

// ── Configuración del negocio ────────────────────────────────────────
const NEGOCIO = {
  nombre:    process.env.NEGOCIO_NOMBRE    || 'CITAMOTOR',
  direccion: process.env.NEGOCIO_DIRECCION || 'Cra 10 # 25-30, Bogotá',
  telefono:  process.env.NEGOCIO_TELEFONO  || '3001234567',
};

const HORARIOS = ['8:00 AM', '10:00 AM', '2:00 PM', '4:00 PM'];

// ── Días hábiles disponibles ─────────────────────────────────────────
function diasDisponibles() {
  const nombres = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const meses   = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const dias = [];
  const d = new Date();
  d.setDate(d.getDate() + 1);

  while (dias.length < 5) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      dias.push({
        label: `${nombres[dow]} ${d.getDate()} ${meses[d.getMonth()]}`,
        valor: d.toISOString().split('T')[0],
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

// ── Validar placa colombiana ─────────────────────────────────────────
function validarPlaca(texto) {
  const limpio = texto.trim().toUpperCase().replace(/[\s-]/g, '');
  // Carro: 3 letras + 3 números  |  Moto: 3 letras + 2 números
  if (/^[A-Z]{3}\d{3}$/.test(limpio)) return { valida: true, placa: limpio, tipo: 'Carro' };
  if (/^[A-Z]{3}\d{2}$/.test(limpio)) return { valida: true, placa: limpio, tipo: 'Moto'  };
  return { valida: false };
}

// ── Generador de código de cita ──────────────────────────────────────
function generarCodigo() {
  const año  = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `TM-${año}-${rand}`;
}

// ══════════════════════════════════════════════════════════════════════
//  PROCESADOR DE MENSAJES
//  Retorna: { texto, botones?, estado }
//  texto   = mensaje del bot
//  botones = array de { label, valor } para mostrar como chips
//  estado  = nuevo estado de la sesión
// ══════════════════════════════════════════════════════════════════════
function procesar(sesion, entrada) {
  const est = sesion.estado;

  // ── INIT ────────────────────────────────────────────────────────────
  if (est === 'INIT') {
    sesion.estado = 'MENU';
    return {
      texto: `👋 Bienvenido a *${NEGOCIO.nombre}*\n📍 ${NEGOCIO.direccion}\n\n¿En qué te podemos ayudar?`,
      botones: [
        { label: '📅 Agendar cita',       valor: 'AGENDAR'   },
        { label: '🔍 Consultar mi cita',  valor: 'CONSULTAR' },
        { label: '❌ Cancelar mi cita',   valor: 'CANCELAR'  },
        { label: '📞 Contacto',           valor: 'CONTACTO'  },
      ],
      estado: 'MENU',
    };
  }

  // ── MENU ────────────────────────────────────────────────────────────
  if (est === 'MENU') {
    if (entrada === 'AGENDAR') {
      sesion.estado = 'PLACA';
      return {
        texto: '🚗 Perfecto. Escribe el número de placa de tu vehículo.\n\n_Ejemplo: ABC123 (carro) o XYZ45 (moto)_',
        estado: 'PLACA',
      };
    }
    if (entrada === 'CONSULTAR') {
      sesion.estado = 'CONSULTAR_CODIGO';
      return {
        texto: '🔍 Escribe tu código de cita (ej: *TM-2026-1234*):',
        estado: 'CONSULTAR_CODIGO',
      };
    }
    if (entrada === 'CANCELAR') {
      sesion.estado = 'CANCELAR_CODIGO';
      return {
        texto: '❌ Escribe el código de cita que deseas cancelar (ej: *TM-2026-1234*):',
        estado: 'CANCELAR_CODIGO',
      };
    }
    if (entrada === 'CONTACTO') {
      sesion.estado = 'MENU';
      return {
        texto: `📞 *${NEGOCIO.nombre}*\n📍 ${NEGOCIO.direccion}\n📱 ${NEGOCIO.telefono}\n⏰ Lun–Vie 7:00 AM – 5:00 PM`,
        botones: [{ label: '🏠 Menú principal', valor: '__MENU__' }],
        estado: 'MENU',
      };
    }
    // Texto libre en menú
    return menuPrincipal(sesion);
  }

  // ── PLACA ───────────────────────────────────────────────────────────
  if (est === 'PLACA') {
    const result = validarPlaca(entrada);
    if (!result.valida) {
      return {
        texto: '⚠️ Formato de placa inválido.\n\n• Carro: 3 letras + 3 números → *ABC123*\n• Moto: 3 letras + 2 números → *XYZ45*\n\nIntenta de nuevo:',
        estado: 'PLACA',
      };
    }
    sesion.datos.placa = result.placa;
    sesion.datos.tipo  = result.tipo;
    sesion.estado = 'FECHA';

    const dias = diasDisponibles();
    return {
      texto: `✅ Placa *${result.placa}* (${result.tipo}) registrada.\n\n📅 Selecciona el día para tu cita:`,
      botones: dias.map(d => ({ label: d.label, valor: d.valor })),
      estado: 'FECHA',
    };
  }

  // ── FECHA ───────────────────────────────────────────────────────────
  if (est === 'FECHA') {
    // Validar que sea una fecha ISO válida
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entrada)) {
      const dias = diasDisponibles();
      return {
        texto: '📅 Por favor selecciona un día de la lista:',
        botones: dias.map(d => ({ label: d.label, valor: d.valor })),
        estado: 'FECHA',
      };
    }
    sesion.datos.fecha = entrada;
    // Buscar label del día seleccionado
    const dias = diasDisponibles();
    const diaElegido = dias.find(d => d.valor === entrada);
    sesion.datos.fechaLabel = diaElegido ? diaElegido.label : entrada;
    sesion.estado = 'HORA';

    return {
      texto: `📅 Día: *${sesion.datos.fechaLabel}*\n\n⏰ Selecciona el horario:`,
      botones: HORARIOS.map(h => ({ label: h, valor: h })),
      estado: 'HORA',
    };
  }

  // ── HORA ────────────────────────────────────────────────────────────
  if (est === 'HORA') {
    if (!HORARIOS.includes(entrada)) {
      return {
        texto: '⏰ Por favor selecciona un horario de la lista:',
        botones: HORARIOS.map(h => ({ label: h, valor: h })),
        estado: 'HORA',
      };
    }
    sesion.datos.hora = entrada;
    sesion.estado = 'CONFIRMAR';

    return {
      texto: `📋 *Resumen de tu cita:*\n\n🚗 Placa: *${sesion.datos.placa}* (${sesion.datos.tipo})\n📅 Fecha: *${sesion.datos.fechaLabel}*\n⏰ Hora: *${sesion.datos.hora}*\n📍 ${NEGOCIO.direccion}\n\n¿Confirmas la cita?`,
      botones: [
        { label: '✅ Sí, confirmar', valor: 'SI'  },
        { label: '✏️ Cambiar datos', valor: 'NO'  },
      ],
      estado: 'CONFIRMAR',
    };
  }

  // ── CONFIRMAR ───────────────────────────────────────────────────────
  if (est === 'CONFIRMAR') {
    if (entrada === 'SI') {
      const codigo = generarCodigo();
      sesion.datos.codigo = codigo;
      sesion.estado = 'DONE';
      return {
        texto: `✅ *¡Cita confirmada!*\n\n🚗 Placa: *${sesion.datos.placa}*\n📅 ${sesion.datos.fechaLabel}\n⏰ ${sesion.datos.hora}\n📍 ${NEGOCIO.direccion}\n\n📌 Tu código: *${codigo}*\n_Guárdalo para consultar o cancelar._`,
        botones: [{ label: '🏠 Menú principal', valor: '__MENU__' }],
        estado: 'DONE',
        cita: { ...sesion.datos, codigo },
      };
    }
    if (entrada === 'NO') {
      // Reiniciar flujo desde placa
      sesion.datos = {};
      sesion.estado = 'PLACA';
      return {
        texto: '✏️ Vamos de nuevo. ¿Cuál es la placa del vehículo?',
        estado: 'PLACA',
      };
    }
  }

  // ── CONSULTAR CÓDIGO ────────────────────────────────────────────────
  if (est === 'CONSULTAR_CODIGO') {
    sesion._consultaCodigo = entrada.trim().toUpperCase();
    sesion.estado = 'MENU';
    return {
      texto: null, // El server resuelve esto con la BD
      accion: 'CONSULTAR',
      codigo: sesion._consultaCodigo,
      estado: 'MENU',
    };
  }

  // ── CANCELAR CÓDIGO ─────────────────────────────────────────────────
  if (est === 'CANCELAR_CODIGO') {
    sesion._cancelarCodigo = entrada.trim().toUpperCase();
    sesion.estado = 'MENU';
    return {
      texto: null,
      accion: 'CANCELAR',
      codigo: sesion._cancelarCodigo,
      estado: 'MENU',
    };
  }

  // ── DONE / Menú desde cualquier estado ─────────────────────────────
  if (entrada === '__MENU__' || est === 'DONE') {
    return menuPrincipal(sesion);
  }

  return menuPrincipal(sesion);
}

function menuPrincipal(sesion) {
  sesion.estado = 'MENU';
  sesion.datos  = {};
  return {
    texto: '🏠 ¿En qué te podemos ayudar?',
    botones: [
      { label: '📅 Agendar cita',       valor: 'AGENDAR'   },
      { label: '🔍 Consultar mi cita',  valor: 'CONSULTAR' },
      { label: '❌ Cancelar mi cita',   valor: 'CANCELAR'  },
      { label: '📞 Contacto',           valor: 'CONTACTO'  },
    ],
    estado: 'MENU',
  };
}

module.exports = { procesar, generarCodigo, NEGOCIO };
