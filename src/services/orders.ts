import { one, type DB } from '../db/index.js';
import type { Product, User } from '../domain/types.js';
import { euros } from '../domain/types.js';
import { checkAccess } from './invitations.js';

export async function listProducts(db: DB): Promise<Product[]> {
  const { rows } = await db.query<Product>('SELECT * FROM products WHERE active ORDER BY category, name');
  return rows;
}

export async function addProduct(db: DB, name: string, priceCents: number, category: string): Promise<Product> {
  const row = await one<Product>(
    db,
    'INSERT INTO products (name, price_cents, category) VALUES ($1, $2, $3) RETURNING *',
    [name, priceCents, category],
  );
  return row!;
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
}

/**
 * Crea una comanda validando restricciones. El cobro es con tarjeta en el
 * datáfono del local: aquí solo se registra que quedó cobrada (paid=true).
 */
export async function createOrder(
  db: DB,
  customer: User,
  waiter: User,
  items: OrderItemInput[],
): Promise<OrderResult> {
  if (items.length === 0) return { ok: false, error: 'La comanda está vacía' };

  const access = await checkAccess(db, customer);
  if (!access.ok) return { ok: false, error: `Sin acceso: ${access.reason}` };

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
      error: `Excede el límite: quedan ${euros(access.remainingCents)} y la comanda son ${euros(total)}`,
    };
  }

  const order = await one<{ id: number }>(
    db,
    'INSERT INTO orders (customer_id, invitation_id, waiter_id, total_cents) VALUES ($1, $2, $3, $4) RETURNING id',
    [customer.id, access.invitation?.id ?? null, waiter.id, total],
  );
  for (const line of lines) {
    await db.query('INSERT INTO order_items (order_id, product_id, qty, unit_price_cents) VALUES ($1, $2, $3, $4)', [
      order!.id,
      line.product.id,
      line.qty,
      line.product.price_cents,
    ]);
  }

  return { ok: true, orderId: order!.id, totalCents: total };
}
