import { one, type DB } from '../db/index.js';

/**
 * Aforo de la caseta en tiempo real, en dos niveles:
 *  - EXACTO: si hoy hay eventos de un contador físico de puerta (+1/-1),
 *    el aforo es la suma de deltas del día.
 *  - ESTIMADO: sin sensor, cuenta a las personas con actividad viva —
 *    check-in en puerta o consumo en barra hoy, con la última señal en las
 *    últimas 3 horas (cada pedido "refresca" tu presencia).
 */

export async function registrarEvento(db: DB, casetaId: number, delta: number, source = 'sensor'): Promise<void> {
  await db.query('INSERT INTO aforo_events (caseta_id, delta, source) VALUES ($1, $2, $3)', [
    casetaId,
    delta,
    source,
  ]);
}

export async function aforo(db: DB, casetaId: number): Promise<{ n: number; exacto: boolean }> {
  const sensor = await one<{ n: number; c: number }>(
    db,
    `SELECT COALESCE(SUM(delta), 0)::int AS n, COUNT(id)::int AS c
     FROM aforo_events WHERE caseta_id = $1 AND created_at::date = current_date`,
    [casetaId],
  );
  if (sensor && sensor.c > 0) return { n: Math.max(0, sensor.n), exacto: true };

  const est = await one<{ n: number }>(
    db,
    `SELECT COUNT(*)::int AS n FROM (
       SELECT uid, MAX(t) AS mt FROM (
         SELECT ch.user_id AS uid, ch.created_at AS t
         FROM checkins ch JOIN users u ON u.id = ch.user_id
         WHERE u.caseta_id = $1 AND ch.created_at::date = current_date
         UNION ALL
         SELECT o.customer_id, o.created_at FROM orders o
         WHERE o.caseta_id = $1 AND o.created_at::date = current_date
       ) a GROUP BY uid
     ) x WHERE mt > now() - interval '3 hours'`,
    [casetaId],
  );
  return { n: est!.n, exacto: false };
}
