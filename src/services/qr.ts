import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { one, type DB } from '../db/index.js';
import type { User } from '../domain/types.js';
import { config } from '../config.js';

interface QrPayload {
  u: number; // user id
  v: number; // qr_version del usuario (permite revocar)
}

/** El QR nunca lleva el teléfono en claro: es un token firmado y revocable. */
export function signQrToken(user: User): string {
  const payload: QrPayload = { u: user.id, v: user.qr_version };
  return jwt.sign(payload, config.jwtSecret);
}

export async function verifyQrToken(db: DB, token: string): Promise<User | null> {
  let payload: QrPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret) as QrPayload;
  } catch {
    return null;
  }
  const user = await one<User>(db, 'SELECT * FROM users WHERE id = $1', [payload.u]);
  if (!user || user.qr_version !== payload.v) return null;
  return user;
}

export async function qrPng(token: string): Promise<Buffer> {
  return QRCode.toBuffer(token, { width: 512, margin: 2 });
}

/** Invalida todos los QRs emitidos para un usuario (p. ej. si reenvió el suyo). */
export async function rotateQr(db: DB, userId: number): Promise<void> {
  await db.query('UPDATE users SET qr_version = qr_version + 1 WHERE id = $1', [userId]);
}
