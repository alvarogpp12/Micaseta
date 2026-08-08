import { one, type DB } from '../db/index.js';
import type { Product, User } from '../domain/types.js';
import { euros } from '../domain/types.js';
import { checkAccess } from './invitations.js';

export async function listProducts(db: DB, casetaId?: number | null): Promise<Product[]> {
  if (casetaId) {
    const { rows } = await db.query<Product>(
      'SELECT * FROM products WHERE active AND caseta_id = $1 ORDER BY category, name',
      [casetaId],
    );
    return rows;
  }
  const { rows } = await db.query<Product>('SELECT * FROM products WHERE active ORDER BY category, name');
  return rows;
}

export async function addProduct(
  db: DB,
  name: string,
  priceCents: number,
  category: string,
  casetaId?: number | null,
): Promise<Product> {
  const row = await one<Product>(
    db,
    'INSERT INTO products (name, price_cents, category, caseta_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, priceCents, category, casetaId ?? null],
  );
  return row!;
}

export async function deactivateProduct(db: DB, id: number, casetaId: number): Promise<void> {
  await db.query('UPDATE products SET active = false WHERE id = $1 AND caseta_id = $2', [id, casetaId]);
}

export interface OrderItemInput {
  productId: number;
  qty: number;
}

export interface OrderResult {
  ok: boolean;
  error?: string;
  orderId?: number;
  totalCents?: number;
  socioName?: string | null;
  pickupNumber?: number | null;
}

/**
 * Crea una comanda. Los invitados NO pagan: todo va a la cuenta del socio
 * (la suya propia si pide un socio, o la del socio que invitó al invitado).
 * waiter=null → pedido enviado por el propio cliente (queda 'pendiente'
 * hasta que un camarero lo sirva). La cuenta se liquida desde el panel.
 */
export async function createOrder(
  db: DB,
  customer: User,
  waiter: User | null,
  items: OrderItemInput[],
): Promise<OrderResult> {
  if (items.length === 0) return { ok: false, error: 'La comanda está vacía' };

  const access = await checkAccess(db, customer);
  if (!access.ok) return { ok: false, error: `Sin acceso: ${access.reason}` };
  if (!access.canOrder) {
    return { ok: false, error: 'Tu invitación es solo de entrada: no incluye consumo en barra' };
  }

  // ¿A cuenta de quién va?
  const socioId = access.invitation ? access.invitation.socio_id : customer.id;
  if (customer.role === 'invitado' && !access.invitation) {
    return { ok: false, error: 'Invitado sin socio anfitrión' };
  }

  const productCasetaId = customer.caseta_id ?? waiter?.caseta_id ?? null;
  let total = 0;
  const lines: { product: Product; qty: number }[] = [];
  for (const item of items) {
    if (!Number.isInteger(item.qty) || item.qty <= 0) return { ok: false, error: 'Cantidad inválida' };
    // Solo productos de la carta de ESTA caseta
    const product = await one<Product>(
      db,
      'SELECT * FROM products WHERE id = $1 AND active AND caseta_id IS NOT DISTINCT FROM $2',
      [item.productId, productCasetaId],
    );
    if (!product) return { ok: false, error: `Producto ${item.productId} no existe` };
    total += product.price_cents * item.qty;
    lines.push({ product, qty: item.qty });
  }

  if (access.remainingCents !== null && total > access.remainingCents) {
    return {
      ok: false,
      error: `Excede el límite del invitado: quedan ${euros(access.remainingCents)} y la comanda son ${euros(total)}`,
    };
  }

  const casetaId = customer.caseta_id ?? waiter?.caseta_id ?? null;

  // Pedidos enviados desde el móvil: número de recogida del día (estilo
  // pantalla de hamburguesería), correlativo por caseta y reiniciado a diario.
  // El MAX+1 va dentro del propio INSERT para no duplicar números si dos
  // pedidos llegan a la vez.
  const order = await one<{ id: number; pickup_number: number | null }>(
    db,
    `INSERT INTO orders (caseta_id, customer_id, socio_id, invitation_id, waiter_id, status, pickup_number, total_cents)
     VALUES ($1, $2, $3, $4, $5, $6,
       CASE WHEN $5::bigint IS NULL THEN
         (SELECT COALESCE(MAX(pickup_number), 0) + 1 FROM orders
          WHERE caseta_id IS NOT DISTINCT FROM $1 AND created_at::date = current_date)
       END,
       $7)
     RETURNING id, pickup_number`,
    [
      casetaId,
      customer.id,
      socioId,
      access.invitation?.id ?? null,
      waiter?.id ?? null,
      waiter ? 'servida' : 'pendiente',
      total,
    ],
  );
  const pickupNumber = order!.pickup_number;
  for (const line of lines) {
    await db.query(
      'INSERT INTO order_items (order_id, product_id, qty, unit_price_cents) VALUES ($1, $2, $3, $4)',
      [order!.id, line.product.id, line.qty, line.product.price_cents],
    );
  }

  const socio = await one<{ name: string | null }>(db, 'SELECT name FROM users WHERE id = $1', [socioId]);
  return { ok: true, orderId: order!.id, totalCents: total, socioName: socio?.name ?? null, pickupNumber };
}

/** Pedidos enviados por clientes aún sin entregar: en preparación o listos. */
export async function pendingOrders(db: DB, casetaId: number): Promise<any[]> {
  const { rows } = await db.query(
    `SELECT o.id, o.total_cents, o.created_at, o.status, o.pickup_number,
            c.name AS customer_name, s.name AS socio_name,
            (SELECT string_agg(oi.qty || '× ' || p.name, ', ' ORDER BY oi.id)
             FROM order_items oi JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = o.id) AS items
     FROM orders o
     JOIN users c ON c.id = o.customer_id
     JOIN users s ON s.id = o.socio_id
     WHERE o.caseta_id = $1 AND o.status IN ('pendiente','lista')
     ORDER BY o.created_at ASC`,
    [casetaId],
  );
  return rows;
}

/** El camarero marca un pedido como listo: su número sale en la pantalla de TV. */
export async function readyOrder(db: DB, casetaId: number, orderId: number, waiterId: number): Promise<boolean> {
  const { rows } = await db.query(
    `UPDATE orders SET status = 'lista', waiter_id = $1
     WHERE id = $2 AND caseta_id = $3 AND status = 'pendiente' RETURNING id`,
    [waiterId, orderId, casetaId],
  );
  return rows.length > 0;
}

/** Un camarero marca servido (entregado) un pedido enviado por el cliente. */
export async function serveOrder(db: DB, casetaId: number, orderId: number, waiterId: number): Promise<boolean> {
  const { rows } = await db.query(
    `UPDATE orders SET status = 'servida', waiter_id = $1
     WHERE id = $2 AND caseta_id = $3 AND status IN ('pendiente','lista') RETURNING id`,
    [waiterId, orderId, casetaId],
  );
  return rows.length > 0;
}

/**
 * Números para la pantalla de TV de la caseta (estilo hamburguesería):
 * en preparación y listos para recoger. Solo pedidos de hoy con número.
 */
export async function tvBoard(db: DB, casetaId: number): Promise<{ preparing: number[]; ready: number[] }> {
  const { rows } = await db.query<{ pickup_number: number; status: string }>(
    `SELECT pickup_number, status FROM orders
     WHERE caseta_id = $1 AND pickup_number IS NOT NULL
       AND status IN ('pendiente','lista') AND created_at::date = current_date
     ORDER BY pickup_number ASC`,
    [casetaId],
  );
  return {
    preparing: rows.filter((r) => r.status === 'pendiente').map((r) => r.pickup_number),
    ready: rows.filter((r) => r.status === 'lista').map((r) => r.pickup_number),
  };
}

/** Estado de un pedido concreto para que el cliente lo siga desde su móvil. */
export async function orderTicket(
  db: DB,
  orderId: number,
  customerId: number,
): Promise<{ status: string; pickupNumber: number | null } | null> {
  const row = await one<{ status: string; pickup_number: number | null }>(
    db,
    'SELECT status, pickup_number FROM orders WHERE id = $1 AND customer_id = $2',
    [orderId, customerId],
  );
  return row ? { status: row.status, pickupNumber: row.pickup_number } : null;
}

/** Cuentas pendientes por socio (lo que llevan gastado ellos + sus invitados). */
export async function cuentasPorSocio(db: DB, casetaId: number): Promise<any[]> {
  const { rows } = await db.query(
    `SELECT s.id AS socio_id, s.name AS socio_name,
            COALESCE(SUM(o.total_cents) FILTER (WHERE NOT o.settled), 0)::int AS pending_cents,
            COALESCE(SUM(o.total_cents), 0)::int AS total_cents,
            COUNT(o.id)::int AS n_orders
     FROM users s
     LEFT JOIN orders o ON o.socio_id = s.id
     WHERE s.caseta_id = $1 AND s.role = 'socio'
     GROUP BY s.id, s.name
     ORDER BY pending_cents DESC, s.name`,
    [casetaId],
  );
  return rows;
}

/**
 * Desglose de gasto de un socio para SU app: cuánto lleva él y cada uno de
 * sus invitados (pendiente e histórico), más el detalle comanda a comanda.
 */
export async function gastosSocio(
  db: DB,
  socioId: number,
): Promise<{ people: any[]; detail: any[] }> {
  const { rows: people } = await db.query(
    `SELECT c.id AS customer_id, c.name AS customer_name, (c.id = $1) AS es_socio,
            COALESCE(SUM(o.total_cents) FILTER (WHERE NOT o.settled), 0)::int AS pending_cents,
            COALESCE(SUM(o.total_cents), 0)::int AS total_cents,
            COUNT(o.id)::int AS n_orders
     FROM orders o
     JOIN users c ON c.id = o.customer_id
     WHERE o.socio_id = $1
     GROUP BY c.id, c.name
     ORDER BY es_socio DESC, pending_cents DESC`,
    [socioId],
  );
  const { rows: detail } = await db.query(
    `SELECT o.id, o.customer_id, o.total_cents, o.settled, o.created_at, o.pickup_number,
            (SELECT string_agg(oi.qty || '× ' || p.name, ', ' ORDER BY oi.id)
             FROM order_items oi JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = o.id) AS items
     FROM orders o
     WHERE o.socio_id = $1
     ORDER BY o.created_at DESC LIMIT 100`,
    [socioId],
  );
  return { people, detail };
}

/** Detalle de la cuenta de un socio: cada comanda con quién la consumió. */
export async function cuentaDetalle(db: DB, casetaId: number, socioId: number): Promise<any[]> {
  const { rows } = await db.query(
    `SELECT o.id, o.total_cents, o.settled, o.created_at,
            c.name AS customer_name, (o.customer_id = o.socio_id) AS es_socio
     FROM orders o
     JOIN users c ON c.id = o.customer_id
     WHERE o.socio_id = $1 AND o.caseta_id = $2
     ORDER BY o.created_at DESC LIMIT 200`,
    [socioId, casetaId],
  );
  return rows;
}

/** Liquida la cuenta pendiente de un socio (el socio ha pagado en el local). */
export async function settleSocio(db: DB, casetaId: number, socioId: number): Promise<number> {
  const pending = await one<{ total: number }>(
    db,
    `SELECT COALESCE(SUM(total_cents), 0)::int AS total FROM orders
     WHERE socio_id = $1 AND caseta_id = $2 AND NOT settled`,
    [socioId, casetaId],
  );
  await db.query('UPDATE orders SET settled = true WHERE socio_id = $1 AND caseta_id = $2 AND NOT settled', [
    socioId,
    casetaId,
  ]);
  return pending!.total;
}
