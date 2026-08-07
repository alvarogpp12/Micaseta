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

  // ¿A cuenta de quién va?
  const socioId = access.invitation ? access.invitation.socio_id : customer.id;
  if (customer.role === 'invitado' && !access.invitation) {
    return { ok: false, error: 'Invitado sin socio anfitrión' };
  }

  let total = 0;
  const lines: { product: Product; qty: number }[] = [];
  for (const item of items) {
    if (!Number.isInteger(item.qty) || item.qty <= 0) return { ok: false, error: 'Cantidad inválida' };
    const product = await one<Product>(db, 'SELECT * FROM products WHERE id = $1 AND active', [
      item.productId,
    ]);
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

  const order = await one<{ id: number }>(
    db,
    `INSERT INTO orders (caseta_id, customer_id, socio_id, invitation_id, waiter_id, status, total_cents)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      customer.caseta_id ?? waiter?.caseta_id ?? null,
      customer.id,
      socioId,
      access.invitation?.id ?? null,
      waiter?.id ?? null,
      waiter ? 'servida' : 'pendiente',
      total,
    ],
  );
  for (const line of lines) {
    await db.query(
      'INSERT INTO order_items (order_id, product_id, qty, unit_price_cents) VALUES ($1, $2, $3, $4)',
      [order!.id, line.product.id, line.qty, line.product.price_cents],
    );
  }

  const socio = await one<{ name: string | null }>(db, 'SELECT name FROM users WHERE id = $1', [socioId]);
  return { ok: true, orderId: order!.id, totalCents: total, socioName: socio?.name ?? null };
}

/** Pedidos enviados por clientes que aún no ha servido nadie. */
export async function pendingOrders(db: DB, casetaId: number): Promise<any[]> {
  const { rows } = await db.query(
    `SELECT o.id, o.total_cents, o.created_at,
            c.name AS customer_name, s.name AS socio_name,
            (SELECT string_agg(oi.qty || '× ' || p.name, ', ' ORDER BY oi.id)
             FROM order_items oi JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = o.id) AS items
     FROM orders o
     JOIN users c ON c.id = o.customer_id
     JOIN users s ON s.id = o.socio_id
     WHERE o.caseta_id = $1 AND o.status = 'pendiente'
     ORDER BY o.created_at ASC`,
    [casetaId],
  );
  return rows;
}

/** Un camarero marca servido un pedido enviado por el cliente. */
export async function serveOrder(db: DB, casetaId: number, orderId: number, waiterId: number): Promise<boolean> {
  const { rows } = await db.query(
    `UPDATE orders SET status = 'servida', waiter_id = $1
     WHERE id = $2 AND caseta_id = $3 AND status = 'pendiente' RETURNING id`,
    [waiterId, orderId, casetaId],
  );
  return rows.length > 0;
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
