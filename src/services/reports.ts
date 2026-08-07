import type { DB } from '../db/index.js';
import { euros } from '../domain/types.js';

/** Consumo generado por los invitados de un socio (y por él mismo). */
export function socioReport(db: DB, socioId: number): string {
  const rows = db
    .prepare(
      `SELECT u.name AS guest, COALESCE(SUM(o.total_cents), 0) AS total, COUNT(o.id) AS n
       FROM invitations i
       JOIN users u ON u.id = i.guest_id
       LEFT JOIN orders o ON o.invitation_id = i.id
       WHERE i.socio_id = ? AND i.status = 'aceptada'
       GROUP BY i.id ORDER BY total DESC`,
    )
    .all(socioId) as { guest: string | null; total: number; n: number }[];

  const own = db
    .prepare(
      `SELECT COALESCE(SUM(total_cents), 0) AS total FROM orders
       WHERE customer_id = ? AND invitation_id IS NULL`,
    )
    .get(socioId) as { total: number };

  const lines = ['📊 *Tu reporte*'];
  let guestsTotal = 0;
  for (const r of rows) {
    guestsTotal += r.total;
    lines.push(`• ${r.guest ?? '(sin registrar)'}: ${euros(r.total)} (${r.n} comandas)`);
  }
  if (rows.length === 0) lines.push('• Aún no tienes invitados con consumo.');
  lines.push(`\nInvitados: ${euros(guestsTotal)}`);
  lines.push(`Tu consumo: ${euros(own.total)}`);
  lines.push(`*Total: ${euros(guestsTotal + own.total)}*`);
  return lines.join('\n');
}

/** Reporte global para el admin: hoy y acumulado, por socio. */
export function adminReport(db: DB): string {
  const today = db
    .prepare(
      `SELECT COALESCE(SUM(total_cents), 0) AS total, COUNT(id) AS n
       FROM orders WHERE date(created_at) = date('now')`,
    )
    .get() as { total: number; n: number };

  const checkins = db
    .prepare(`SELECT COUNT(id) AS n FROM checkins WHERE date(created_at) = date('now')`)
    .get() as { n: number };

  const bySocio = db
    .prepare(
      `SELECT s.name AS socio, COALESCE(SUM(o.total_cents), 0) AS total
       FROM orders o
       LEFT JOIN invitations i ON i.id = o.invitation_id
       LEFT JOIN users s ON s.id = COALESCE(i.socio_id, o.customer_id)
       GROUP BY s.id ORDER BY total DESC LIMIT 10`,
    )
    .all() as { socio: string | null; total: number }[];

  const lines = [
    '📊 *Reporte global*',
    `Hoy: ${euros(today.total)} en ${today.n} comandas, ${checkins.n} entradas.`,
    '',
    '*Top socios (acumulado):*',
  ];
  for (const r of bySocio) lines.push(`• ${r.socio ?? '(desconocido)'}: ${euros(r.total)}`);
  if (bySocio.length === 0) lines.push('• Sin consumo registrado todavía.');
  return lines.join('\n');
}
