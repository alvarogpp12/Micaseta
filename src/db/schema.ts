/**
 * Esquema Postgres (multi-caseta). Va inline para que el bundle serverless
 * no dependa de rutas de ficheros. Se auto-aplica en la primera conexión.
 */
export const SCHEMA_SQL = `
-- Cada caseta es un tenant: sus socios, carta, invitaciones y cuentas.
CREATE TABLE IF NOT EXISTS casetas (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Login web del panel (dueños/gestores de la caseta).
CREATE TABLE IF NOT EXISTS accounts (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  caseta_id     BIGINT NOT NULL REFERENCES casetas(id),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Personas con teléfono: socios, staff e invitados.
CREATE TABLE IF NOT EXISTS users (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  caseta_id    BIGINT REFERENCES casetas(id),
  phone        TEXT NOT NULL UNIQUE,
  name         TEXT,
  role         TEXT NOT NULL CHECK (role IN ('admin','socio','mesero','puerta','invitado')),
  status       TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo','pendiente','suspendido')),
  photo        BYTEA,
  qr_version   INTEGER NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invitations (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  caseta_id         BIGINT REFERENCES casetas(id),
  socio_id          BIGINT NOT NULL REFERENCES users(id),
  guest_id          BIGINT REFERENCES users(id),
  guest_phone       TEXT,
  guest_label       TEXT,                      -- nombre provisional que puso el socio
  parent_id         BIGINT REFERENCES invitations(id),
  status            TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (status IN ('pendiente','aceptada','rechazada','cancelada')),
  access_mode       TEXT NOT NULL DEFAULT 'siempre' CHECK (access_mode IN ('fecha','siempre')),
  valid_date        TEXT,                      -- YYYY-MM-DD; comparación por string
  spend_limit_cents INTEGER,                   -- NULL = sin límite (paga el socio igualmente)
  max_companions    INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS checkins (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id),
  invitation_id BIGINT REFERENCES invitations(id),
  door_user_id  BIGINT NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  caseta_id   BIGINT REFERENCES casetas(id),
  name        TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general',
  active      BOOLEAN NOT NULL DEFAULT true
);

-- Comandas: SIEMPRE a cuenta de un socio (los invitados no pagan).
-- La liquidación marca settled=true cuando el socio paga su cuenta.
CREATE TABLE IF NOT EXISTS orders (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  caseta_id      BIGINT REFERENCES casetas(id),
  customer_id    BIGINT NOT NULL REFERENCES users(id),
  socio_id       BIGINT NOT NULL REFERENCES users(id),
  invitation_id  BIGINT REFERENCES invitations(id),
  waiter_id      BIGINT NOT NULL REFERENCES users(id),
  total_cents    INTEGER NOT NULL,
  settled        BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id         BIGINT NOT NULL REFERENCES orders(id),
  product_id       BIGINT NOT NULL REFERENCES products(id),
  qty              INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL
);

-- Estado de conversación del bot de WhatsApp (cuando esté conectado).
CREATE TABLE IF NOT EXISTS bot_sessions (
  phone      TEXT PRIMARY KEY,
  state      TEXT NOT NULL,
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_caseta ON users(caseta_id, role);
CREATE INDEX IF NOT EXISTS idx_invitations_guest ON invitations(guest_phone, status);
CREATE INDEX IF NOT EXISTS idx_invitations_caseta ON invitations(caseta_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_socio ON orders(socio_id, settled);
CREATE INDEX IF NOT EXISTS idx_orders_invitation ON orders(invitation_id);
`;
