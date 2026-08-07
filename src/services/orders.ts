import type { DB } from '../db/index.js';
import type { Product, User } from '../domain/types.js';
import { euros } from '../domain/types.js';
import { checkAccess } from './invitations.js';

export function listProducts(db: DB): Product[] {
  return db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY category, name').all() as Product[];
}

export function addProduct(db: DB, name: string, priceCents: number, category: string): Product {
  const info = db
    .prepare('INSERT INTO products (name, price_cents, category) VALUES (?, ?, ?)')
    .run(name, priceCents, category);
  return db.prepare('SELECT * FROM products WHERE id = ?').get(Number(info.lastInsertRowid)) as Product;
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
 * datáfono del local: aquí solo se registra que quedó cobrada (paid=1).
 */
export function createOrder(db: DB, customer: User, waiter: User, items: OrderItemInput[]): OrderResult {
  if (items.length === 0) return { ok: false, error: 'La comanda está vacía' };

  const access = checkAccess(db, customer);
  if (!access.ok) return { ok: false, error: `Sin acceso: ${access.reason}` };

  let total = 0;
  const lines: { product: Product; qty: number }[] = [];
  for (const item of items) {
    if (!Number.isInteger(item.qty) || item.qty <= 0) return { ok: false, error: 'Cantidad inválida' };
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(item.productId) as
      | Product
      | undefined;
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

  const insert = db.transaction(() => {
    const info = db
      .prepare(
        'INSERT INTO orders (customer_id, invitation_id, waiter_id, total_cents) VALUES (?, ?, ?, ?)',
      )
      .run(customer.id, access.invitation?.id ?? null, waiter.id, total);
    const orderId = Number(info.lastInsertRowid);
    const itemStmt = db.prepare(
      'INSERT INTO order_items (order_id, product_id, qty, unit_price_cents) VALUES (?, ?, ?, ?)',
    );
    for (const line of lines) itemStmt.run(orderId, line.product.id, line.qty, line.product.price_cents);
    return orderId;
  });

  return { ok: true, orderId: insert(), totalCents: total };
}
