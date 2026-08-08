import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { one, type DB } from '../db/index.js';
import type { Account, Caseta } from '../domain/types.js';
import { config } from '../config.js';
import { SEVILLA_MENU } from './demo.js';

/** Hash de contraseña con scrypt (sin dependencias externas). */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false; // cuenta de Google: no tiene contraseña
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// ---- Login con Google (Google Identity Services, id_token del botón) ----

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
}

/** Verifica el credential JWT de Google contra su endpoint oficial. */
export async function verifyGoogleCredential(credential: string): Promise<GoogleProfile | null> {
  if (!config.googleClientId || !credential) return null;
  try {
    const r = await fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential),
    );
    if (!r.ok) return null;
    const t = (await r.json()) as Record<string, unknown>;
    if (t.aud !== config.googleClientId) return null;
    if (t.email_verified !== 'true' && t.email_verified !== true) return null;
    if (!t.sub || !t.email) return null;
    return {
      sub: String(t.sub),
      email: String(t.email).toLowerCase(),
      name: String(t.name ?? t.email),
    };
  } catch {
    return null;
  }
}

/**
 * Cuenta para un perfil de Google: por google_sub, o por email (vincula el sub
 * a una cuenta de contraseña ya existente). NULL si aún no tiene caseta.
 */
export async function loginWithGoogle(db: DB, profile: GoogleProfile): Promise<Account | null> {
  const bySub = await one<Account>(db, 'SELECT * FROM accounts WHERE google_sub = $1', [profile.sub]);
  if (bySub) return bySub;
  const byEmail = await one<Account>(db, 'SELECT * FROM accounts WHERE email = $1', [profile.email]);
  if (byEmail) {
    await db.query('UPDATE accounts SET google_sub = $1 WHERE id = $2', [profile.sub, byEmail.id]);
    return { ...byEmail, google_sub: profile.sub };
  }
  return null;
}

export interface RegisterInput {
  casetaName: string;
  ownerName: string;
  email: string;
  password?: string;
  google?: GoogleProfile | null; // registro vía Google: sin contraseña
}

export async function registerCaseta(
  db: DB,
  input: RegisterInput,
): Promise<{ ok: true; account: Account; caseta: Caseta } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Email no válido' };
  if (!input.google && (input.password ?? '').length < 8) {
    return { ok: false, error: 'La contraseña necesita al menos 8 caracteres' };
  }
  if (!input.casetaName.trim()) return { ok: false, error: 'Ponle nombre a tu caseta' };

  const existing = await one<Account>(db, 'SELECT * FROM accounts WHERE email = $1', [email]);
  if (existing) return { ok: false, error: 'Ya existe una cuenta con ese email' };

  const caseta = (await one<Caseta>(db, 'INSERT INTO casetas (name) VALUES ($1) RETURNING *', [
    input.casetaName.trim(),
  ]))!;
  const account = (await one<Account>(
    db,
    'INSERT INTO accounts (caseta_id, name, email, password_hash, google_sub) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [
      caseta.id,
      input.ownerName.trim() || 'Admin',
      email,
      input.google ? null : hashPassword(input.password!),
      input.google?.sub ?? null,
    ],
  ))!;
  // Carta sevillana de serie: la caseta puede pedir desde el primer minuto.
  for (const p of SEVILLA_MENU) {
    await db.query('INSERT INTO products (name, price_cents, category, caseta_id) VALUES ($1, $2, $3, $4)', [
      p.name,
      p.price_cents,
      p.category,
      caseta.id,
    ]);
  }
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
