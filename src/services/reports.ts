import type { DB } from '../db/index.js';
import { one } from '../db/index.js';
import { euros } from '../domain/types.js';

/** Consumo generado por los invitados de un socio (y por él mismo). */
export async function socioReport(db: DB, socioId: number): Promise<string> {
  const { rows } = await db.query<{ guest: string | null; total: number; n: number }>(
    `SELECT u.name AS guest, COALESCE(SUM(o.total_cents), 0)::int AS total, COUNT(o.id)::int AS n
     FROM invitations i
     JOIN users u ON u.id = i.guest_id
     LEFT JOIN orders o ON o.invitation_id = i.id
     WHERE i.socio_id = $1 AND i.status = 'aceptada'
     GROUP BY i.id, u.name ORDER BY total DESC`,
    [socioId],
  );

  const own = await one<{ total: number }>(
    db,
    `SELECT COALESCE(SUM(total_cents), 0)::int AS total FROM orders
     WHERE customer_id = $1 AND invitation_id IS NULL`,
    [socioId],
  );

  const lines = ['📊 *Tu reporte*'];
  let guestsTotal = 0;
  for (const r of rows) {
    guestsTotal += r.total;
    lines.push(`• ${r.guest ?? '(sin registrar)'}: ${euros(r.total)} (${r.n} comandas)`);
  }
  if (rows.length === 0) lines.push('• Aún no tienes invitados con consumo.');
  lines.push(`\nInvitados: ${euros(guestsTotal)}`);
  lines.push(`Tu consumo: ${euros(own!.total)}`);
  lines.push(`*Total: ${euros(guestsTotal + own!.total)}*`);
  return lines.join('\n');
}

/** Reporte global para el admin: hoy y acumulado, por socio. */
export async function adminReport(db: DB): Promise<string> {
  const today = await one<{ total: number; n: number }>(
    db,
    `SELECT COALESCE(SUM(total_cents), 0)::int AS total, COUNT(id)::int AS n
     FROM orders WHERE created_at::date = current_date`,
  );

  const checkins = await one<{ n: number }>(
    db,
    `SELECT COUNT(id)::int AS n FROM checkins WHERE created_at::date = current_date`,
  );

  const { rows: bySocio } = await db.query<{ socio: string | null; total: number }>(
    `SELECT s.name AS socio, COALESCE(SUM(o.total_cents), 0)::int AS total
     FROM orders o
     LEFT JOIN invitations i ON i.id = o.invitation_id
     LEFT JOIN users s ON s.id = COALESCE(i.socio_id, o.customer_id)
     GROUP BY s.id, s.name ORDER BY total DESC LIMIT 10`,
  );

  const lines = [
    '📊 *Reporte global*',
    `Hoy: ${euros(today!.total)} en ${today!.n} comandas, ${checkins!.n} entradas.`,
    '',
    '*Top socios (acumulado):*',
  ];
  for (const r of bySocio) lines.push(`• ${r.socio ?? '(desconocido)'}: ${euros(r.total)}`);
  if (bySocio.length === 0) lines.push('• Sin consumo registrado todavía.');
  return lines.join('\n');
}
