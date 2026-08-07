import type { DB } from '../db/index.js';
import type { Role, User, UserStatus } from '../domain/types.js';

export function findByPhone(db: DB, phone: string): User | null {
  return (db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as User | undefined) ?? null;
}

export function findById(db: DB, id: number): User | null {
  return (db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined) ?? null;
}

export function createUser(
  db: DB,
  data: { phone: string; name?: string | null; role: Role; status?: UserStatus },
): User {
  const info = db
    .prepare('INSERT INTO users (phone, name, role, status) VALUES (?, ?, ?, ?)')
    .run(data.phone, data.name ?? null, data.role, data.status ?? 'activo');
  return findById(db, Number(info.lastInsertRowid))!;
}

/** Alta de socio/mesero/puerta por el admin. Si el teléfono ya existe, actualiza rol y nombre. */
export function upsertByAdmin(db: DB, phone: string, name: string, role: Role): User {
  const existing = findByPhone(db, phone);
  if (existing) {
    db.prepare('UPDATE users SET role = ?, name = ?, status = ? WHERE id = ?').run(
      role,
      name,
      'activo',
      existing.id,
    );
    return findById(db, existing.id)!;
  }
  return createUser(db, { phone, name, role });
}

export function setName(db: DB, userId: number, name: string): void {
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId);
}

export function setPhoto(db: DB, userId: number, photoPath: string): void {
  db.prepare('UPDATE users SET photo_path = ? WHERE id = ?').run(photoPath, userId);
}

export function setStatus(db: DB, userId: number, status: UserStatus): void {
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
}
