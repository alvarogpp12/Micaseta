import { one, type DB } from '../db/index.js';
import type { Role, User, UserStatus } from '../domain/types.js';

export function findByPhone(db: DB, phone: string): Promise<User | null> {
  return one<User>(db, 'SELECT * FROM users WHERE phone = $1', [phone]);
}

export function findById(db: DB, id: number): Promise<User | null> {
  return one<User>(db, 'SELECT * FROM users WHERE id = $1', [id]);
}

export async function createUser(
  db: DB,
  data: { phone: string; name?: string | null; role: Role; status?: UserStatus },
): Promise<User> {
  const row = await one<User>(
    db,
    'INSERT INTO users (phone, name, role, status) VALUES ($1, $2, $3, $4) RETURNING *',
    [data.phone, data.name ?? null, data.role, data.status ?? 'activo'],
  );
  return row!;
}

/** Alta de socio/mesero/puerta por el admin. Si el teléfono ya existe, actualiza rol y nombre. */
export async function upsertByAdmin(db: DB, phone: string, name: string, role: Role): Promise<User> {
  const row = await one<User>(
    db,
    `INSERT INTO users (phone, name, role, status) VALUES ($1, $2, $3, 'activo')
     ON CONFLICT (phone) DO UPDATE SET name = $2, role = $3, status = 'activo'
     RETURNING *`,
    [phone, name, role],
  );
  return row!;
}

export async function setName(db: DB, userId: number, name: string): Promise<void> {
  await db.query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
}

export async function setPhoto(db: DB, userId: number, photo: Buffer): Promise<void> {
  await db.query('UPDATE users SET photo = $1 WHERE id = $2', [photo, userId]);
}

export async function getPhoto(db: DB, userId: number): Promise<Buffer | null> {
  const row = await one<{ photo: Uint8Array | null }>(db, 'SELECT photo FROM users WHERE id = $1', [userId]);
  return row?.photo ? Buffer.from(row.photo) : null;
}

export async function setStatus(db: DB, userId: number, status: UserStatus): Promise<void> {
  await db.query('UPDATE users SET status = $1 WHERE id = $2', [status, userId]);
}
