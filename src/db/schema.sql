CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  phone        TEXT NOT NULL UNIQUE,
  name         TEXT,
  role         TEXT NOT NULL CHECK (role IN ('admin','socio','mesero','puerta','invitado')),
  status       TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo','pendiente','suspendido')),
  photo_path   TEXT,
  qr_version   INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invitations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id          INTEGER NOT NULL REFERENCES users(id),
  guest_id          INTEGER REFERENCES users(id),
  guest_phone       TEXT NOT NULL,
  parent_id         INTEGER REFERENCES invitations(id),
  status            TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (status IN ('pendiente','aceptada','rechazada','cancelada')),
  access_mode       TEXT NOT NULL DEFAULT 'siempre' CHECK (access_mode IN ('fecha','siempre')),
  valid_date        TEXT,                      -- YYYY-MM-DD cuando access_mode='fecha'
  spend_limit_cents INTEGER,                   -- NULL = consumo abierto
  max_companions    INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  cancelled_at      TEXT
);

CREATE TABLE IF NOT EXISTS checkins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  invitation_id INTEGER REFERENCES invitations(id),
  door_user_id  INTEGER NOT NULL REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general',
  active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id    INTEGER NOT NULL REFERENCES users(id),
  invitation_id  INTEGER REFERENCES invitations(id),
  waiter_id      INTEGER NOT NULL REFERENCES users(id),
  total_cents    INTEGER NOT NULL,
  paid           INTEGER NOT NULL DEFAULT 1,   -- cobrado con tarjeta en el datáfono del local
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         INTEGER NOT NULL REFERENCES orders(id),
  product_id       INTEGER NOT NULL REFERENCES products(id),
  qty              INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invitations_guest ON invitations(guest_phone, status);
CREATE INDEX IF NOT EXISTS idx_orders_invitation ON orders(invitation_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
