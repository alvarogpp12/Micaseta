import { one, type DB } from '../db/index.js';

/**
 * Estado de conversación por teléfono. Vive en la base de datos porque en
 * serverless (Vercel) cada mensaje puede atender una instancia distinta.
 */
export interface Session {
  state: string;
  data: Record<string, any>;
}

export async function getSession(db: DB, phone: string): Promise<Session> {
  const row = await one<{ state: string; data: any }>(
    db,
    'SELECT state, data FROM bot_sessions WHERE phone = $1',
    [phone],
  );
  if (!row) return { state: 'idle', data: {} };
  return { state: row.state, data: typeof row.data === 'string' ? JSON.parse(row.data) : (row.data ?? {}) };
}

export async function saveSession(db: DB, phone: string, session: Session): Promise<void> {
  await db.query(
    `INSERT INTO bot_sessions (phone, state, data, updated_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (phone) DO UPDATE SET state = $2, data = $3, updated_at = now()`,
    [phone, session.state, JSON.stringify(session.data)],
  );
}

export async function clearSession(db: DB, phone: string): Promise<void> {
  await db.query('DELETE FROM bot_sessions WHERE phone = $1', [phone]);
}
