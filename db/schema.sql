CREATE TABLE IF NOT EXISTS citas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo      TEXT UNIQUE NOT NULL,
  placa       TEXT NOT NULL,
  fecha       TEXT NOT NULL,
  hora        TEXT NOT NULL,
  canal       TEXT DEFAULT 'web',
  telefono    TEXT,
  estado      TEXT DEFAULT 'confirmada',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_citas_placa ON citas(placa);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha);
