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
  data: { phone: string; name?: string | null; role: Role; status?: UserStatus; casetaId?: number | null },
): Promise<User> {
  const row = await one<User>(
    db,
    'INSERT INTO users (phone, name, role, status, caseta_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [data.phone, data.name ?? null, data.role, data.status ?? 'activo', data.casetaId ?? null],
  );
  return row!;
}

/** Alta de socio/mesero/puerta. Si el teléfono ya existe, actualiza rol, nombre y caseta. */
export async function upsertByAdmin(
  db: DB,
  phone: string,
  name: string,
  role: Role,
  casetaId?: number | null,
): Promise<User> {
  const row = await one<User>(
    db,
    `INSERT INTO users (phone, name, role, status, caseta_id) VALUES ($1, $2, $3, 'activo', $4)
     ON CONFLICT (phone) DO UPDATE SET name = $2, role = $3, status = 'activo',
       caseta_id = COALESCE($4, users.caseta_id)
     RETURNING *`,
    [phone, name, role, casetaId ?? null],
  );
  return row!;
}

export async function listByCaseta(db: DB, casetaId: number, roles: Role[]): Promise<User[]> {
  const placeholders = roles.map((_, i) => `$${i + 2}`).join(', ');
  const { rows } = await db.query<User>(
    `SELECT id, caseta_id, phone, name, role, status, qr_version, created_at,
            (photo IS NOT NULL) AS has_photo
     FROM users WHERE caseta_id = $1 AND role IN (${placeholders}) ORDER BY name NULLS LAST`,
    [casetaId, ...roles],
  );
  return rows;
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
