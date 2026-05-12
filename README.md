# tecnomecanica-chatbot 🚗

Chatbot de agendamiento de revisión tecnomecánica.
**Canales:** Web · WhatsApp · Instagram · Facebook

---

## Requisitos

- Node.js 18+
- Cuenta Anthropic (API key)

---

## Instalación local (Fase 1 — Web)

```bash
# 1. Clonar / entrar al repo
cd tecnomecanica-chatbot

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
copy .env.example .env
# Editar .env con tu ANTHROPIC_API_KEY

# 4. Arrancar servidor
npm run dev

# 5. Abrir en navegador
# http://localhost:3000
```

---

## Estructura

```
tecnomecanica-chatbot/
├── server.js              ← Express + API endpoints
├── bot/
│   ├── claude.js          ← Claude API + system prompt
│   └── sessions.js        ← Estado de sesiones en memoria
├── db/
│   ├── schema.sql         ← Esquema SQLite
│   └── database.js        ← Conexión + helpers
├── widget/
│   └── index.html         ← Chat web embebible
├── data/                  ← BD SQLite (se crea automático)
│   └── citas.db
├── .env                   ← Credenciales (no subir a git)
└── package.json
```

---

## API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/chat` | Enviar mensaje al bot |
| `GET` | `/api/citas` | Listar citas (admin) |
| `GET` | `/api/citas/:codigo` | Buscar cita por código |
| `GET` | `/health` | Estado del servidor |

---

## Flujo conversacional

```
1. Usuario: "hola"
   Bot: Saluda y pide placa

2. Usuario: "ABC123"
   Bot: Valida formato y muestra días disponibles

3. Usuario: "Martes"
   Bot: Muestra horarios (8am / 10am / 2pm / 4pm)

4. Usuario: "10am"
   Bot: Muestra resumen, pide confirmación

5. Usuario: "sí"
   Bot: Confirma cita con código TM-2026-XXXX
   → Guarda en SQLite
```

---

## Roadmap

| Fase | Feature | Estado |
|---|---|---|
| 1 | Web widget + Claude API + SQLite | ✅ Listo |
| 2 | Meta Business App + WhatsApp API | 🔲 Pendiente |
| 3 | Instagram Direct + Facebook Messenger | 🔲 Pendiente |
| 4 | QR Code dinámico + panel admin | 🔲 Pendiente |
