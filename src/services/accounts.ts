import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { one, type DB } from '../db/index.js';
import type { Account, Caseta } from '../domain/types.js';
import { config } from '../config.js';

/** Hash de contraseña con scrypt (sin dependencias externas). */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

export interface RegisterInput {
  casetaName: string;
  ownerName: string;
  email: string;
  password: string;
}

export async function registerCaseta(
  db: DB,
  input: RegisterInput,
): Promise<{ ok: true; account: Account; caseta: Caseta } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Email no válido' };
  if (input.password.length < 8) return { ok: false, error: 'La contraseña necesita al menos 8 caracteres' };
  if (!input.casetaName.trim()) return { ok: false, error: 'Ponle nombre a tu caseta' };

  const existing = await one<Account>(db, 'SELECT * FROM accounts WHERE email = $1', [email]);
  if (existing) return { ok: false, error: 'Ya existe una cuenta con ese email' };

  const caseta = (await one<Caseta>(db, 'INSERT INTO casetas (name) VALUES ($1) RETURNING *', [
    input.casetaName.trim(),
  ]))!;
  const account = (await one<Account>(
    db,
    'INSERT INTO accounts (caseta_id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING *',
    [caseta.id, input.ownerName.trim() || 'Admin', email, hashPassword(input.password)],
  ))!;
  return { ok: true, account, caseta };
}

export async function loginAccount(db: DB, email: string, password: string): Promise<Account | null> {
  const account = await one<Account>(db, 'SELECT * FROM accounts WHERE email = $1', [
    email.trim().toLowerCase(),
  ]);
  if (!account || !verifyPassword(password, account.password_hash)) return null;
  return account;
}

/** Cookie de sesión del panel: {a: accountId, c: casetaId}. */
export function signPanelSession(account: Account): string {
  return jwt.sign({ a: account.id, c: account.caseta_id }, config.jwtSecret, { expiresIn: '30d' });
}

export async function accountFromSession(db: DB, token: string | undefined): Promise<Account | null> {
  try {
    const payload = jwt.verify(token ?? '', config.jwtSecret) as { a: number };
    return one<Account>(db, 'SELECT * FROM accounts WHERE id = $1', [payload.a]);
  } catch {
    return null;
  }
}

export function getCaseta(db: DB, id: number): Promise<Caseta | null> {
  return one<Caseta>(db, 'SELECT * FROM casetas WHERE id = $1', [id]);
}
