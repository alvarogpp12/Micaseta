/**
 * Esquema Postgres. Va inline (no .sql en disco) para que el bundle
 * serverless de Vercel no dependa de rutas de ficheros.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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
  socio_id          BIGINT NOT NULL REFERENCES users(id),
  guest_id          BIGINT REFERENCES users(id),
  guest_phone       TEXT NOT NULL,
  parent_id         BIGINT REFERENCES invitations(id),
  status            TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (status IN ('pendiente','aceptada','rechazada','cancelada')),
  access_mode       TEXT NOT NULL DEFAULT 'siempre' CHECK (access_mode IN ('fecha','siempre')),
  valid_date        TEXT,                      -- YYYY-MM-DD; comparación por string
  spend_limit_cents INTEGER,
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
  name        TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general',
  active      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS orders (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id    BIGINT NOT NULL REFERENCES users(id),
  invitation_id  BIGINT REFERENCES invitations(id),
  waiter_id      BIGINT NOT NULL REFERENCES users(id),
  total_cents    INTEGER NOT NULL,
  paid           BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id         BIGINT NOT NULL REFERENCES orders(id),
  product_id       BIGINT NOT NULL REFERENCES products(id),
  qty              INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL
);

-- Estado de conversación del bot (serverless: no puede vivir en memoria)
CREATE TABLE IF NOT EXISTS bot_sessions (
  phone      TEXT PRIMARY KEY,
  state      TEXT NOT NULL,
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_guest ON invitations(guest_phone, status);
CREATE INDEX IF NOT EXISTS idx_orders_invitation ON orders(invitation_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
`;
