-- ─── THINGYS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS thingys (
  id                  TEXT        PRIMARY KEY,
  user_id             TEXT        NOT NULL DEFAULT 'default_user',
  title               TEXT        NOT NULL,
  energy              TEXT        NOT NULL CHECK (energy IN ('low', 'medium', 'high')),
  completed           BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ,
  is_custom           BOOLEAN     NOT NULL DEFAULT true,
  daily               BOOLEAN     NOT NULL DEFAULT false,
  require_photo       BOOLEAN     NOT NULL DEFAULT false,
  progress            INTEGER     NOT NULL DEFAULT 0 CHECK (progress IN (0, 25, 50, 75, 100)),
  has_proof           BOOLEAN,
  proof_message       TEXT,
  last_completed_date TEXT,
  deadline            TEXT
);

-- ─── XP ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_xp (
  user_id    TEXT        PRIMARY KEY DEFAULT 'default_user',
  xp         INTEGER     NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fila inicial para el usuario por defecto
INSERT INTO user_xp (user_id, xp)
VALUES ('default_user', 0)
ON CONFLICT (user_id) DO NOTHING;

-- ─── SEGURIDAD (sin auth por ahora) ────────────────────────────────────────

ALTER TABLE thingys DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp DISABLE ROW LEVEL SECURITY;
