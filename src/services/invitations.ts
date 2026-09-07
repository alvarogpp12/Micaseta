import jwt from 'jsonwebtoken';
import { one, type DB } from '../db/index.js';
import type { AccessInfo, Invitation, User } from '../domain/types.js';
import { todayStr, euros } from '../domain/types.js';
import { config } from '../config.js';
import * as users from './users.js';

export interface NewInvitation {
  socioId: number;
  casetaId?: number | null;
  guestPhone?: string | null;
  guestLabel?: string | null;
  accessMode: 'fecha' | 'siempre';
  validDate?: string | null;
  spendLimitCents?: number | null;
  canOrder?: boolean; // false = invitado "solo entrada"
  maxCompanions?: number;
  parentId?: number | null;
}

export async function createInvitation(db: DB, inv: NewInvitation): Promise<Invitation> {
  const row = await one<Invitation>(
    db,
    `INSERT INTO invitations
     (caseta_id, socio_id, guest_phone, guest_label, parent_id, access_mode, valid_date, spend_limit_cents, can_order, max_companions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      inv.casetaId ?? null,
      inv.socioId,
      inv.guestPhone ?? null,
      inv.guestLabel ?? null,
      inv.parentId ?? null,
      inv.accessMode,
      inv.validDate ?? null,
      inv.spendLimitCents ?? null,
      inv.canOrder ?? true,
      inv.maxCompanions ?? 0,
    ],
  );
  return row!;
}

export function getInvitation(db: DB, id: number): Promise<Invitation | null> {
  return one<Invitation>(db, 'SELECT * FROM invitations WHERE id = $1', [id]);
}

// ---- Links de invitación (el socio los comparte por su propio WhatsApp) ----

/** Token firmado que identifica la invitación en el link público. */
export function signInviteToken(invitationId: number): string {
  return jwt.sign({ i: invitationId }, config.jwtSecret);
}

export async function invitationFromToken(db: DB, token: string): Promise<Invitation | null> {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { i: number };
    return getInvitation(db, payload.i);
  } catch {
    return null;
  }
}

export function inviteUrl(invitationId: number, baseUrl: string = config.baseUrl): string {
  return `${baseUrl}/app/?i=${signInviteToken(invitationId)}`;
}

/** Texto listo para compartir por WhatsApp (wa.me) con el link dentro. */
export function inviteShareText(
  inv: Invitation,
  casetaName: string,
  socioName: string,
  baseUrl: string = config.baseUrl,
): string {
  const lines = [
    `🎊 ${socioName} te invita a la caseta *${casetaName}*.`,
    describeInvitation(inv),
    '',
    `Regístrate aquí para recibir tu QR de acceso:`,
    inviteUrl(inv.id, baseUrl),
  ];
  return lines.join('\n');
}

export function describeInvitation(inv: Invitation): string {
  const parts: string[] = [];
  parts.push(inv.access_mode === 'siempre' ? '📅 Acceso: cualquier día' : `📅 Acceso: solo el ${inv.valid_date}`);
  if (!inv.can_order) {
    parts.push('🎟️ Solo entrada (sin consumo en barra)');
  } else {
    parts.push(
      inv.spend_limit_cents === null
        ? '🥂 Consumo: sin límite (a cuenta del socio)'
        : `🥂 Consumo: hasta ${euros(inv.spend_limit_cents)} (a cuenta del socio)`,
    );
  }
  if (inv.max_companions > 0) parts.push(`👥 Acompañantes: hasta ${inv.max_companions}`);
  return parts.join('\n');
}

/**
 * Registro del invitado desde el link web: nombre + selfie → usuario activo con QR.
 * Idempotente: si ya estaba registrado, actualiza foto/nombre y devuelve el usuario.
 */
export async function registerGuestFromLink(
  db: DB,
  inv: Invitation,
  data: { name: string; phone?: string | null; photo: Buffer | null },
): Promise<{ ok: true; guest: User } | { ok: false; error: string }> {
  if (inv.status === 'cancelada') return { ok: false, error: 'Esta invitación fue cancelada' };
  if (inv.status === 'rechazada') return { ok: false, error: 'Esta invitación fue rechazada' };
  if (!data.name.trim()) return { ok: false, error: 'Dinos tu nombre' };

  let guest: User | null = inv.guest_id ? await users.findById(db, inv.guest_id) : null;

  if (!guest) {
    // El teléfono es la identidad; si no lo dio el socio, lo pide el formulario.
    const phone = inv.guest_phone ?? data.phone ?? null;
    if (!phone) return { ok: false, error: 'Falta tu número de WhatsApp' };
    guest = await users.findByPhone(db, phone);
    if (guest && guest.role !== 'invitado') {
      return { ok: false, error: 'Ese teléfono ya pertenece al personal o a un socio' };
    }
    if (!guest) {
      guest = await users.createUser(db, {
        phone,
        name: data.name.trim(),
        role: 'invitado',
        status: 'activo',
        casetaId: inv.caseta_id,
      });
    }
  }

  await db.query('UPDATE users SET name = $1, status = $2, caseta_id = COALESCE(caseta_id, $3) WHERE id = $4', [
    data.name.trim(),
    'activo',
    inv.caseta_id,
    guest.id,
  ]);
  if (data.photo) await users.setPhoto(db, guest.id, data.photo);
  await db.query(`UPDATE invitations SET status = 'aceptada', guest_id = $1 WHERE id = $2`, [
    guest.id,
    inv.id,
  ]);
  return { ok: true, guest: (await users.findById(db, guest.id))! };
}

// ---- Consultas ----

export function pendingForPhone(db: DB, phone: string): Promise<Invitation | null> {
  return one<Invitation>(
    db,
    `SELECT * FROM invitations WHERE guest_phone = $1 AND status = 'pendiente'
     ORDER BY created_at DESC LIMIT 1`,
    [phone],
  );
}

/** Invitación aceptada vigente de un invitado (la más reciente). */
export function activeForGuest(db: DB, guestId: number): Promise<Invitation | null> {
  return one<Invitation>(
    db,
    `SELECT * FROM invitations WHERE guest_id = $1 AND status = 'aceptada'
     ORDER BY created_at DESC LIMIT 1`,
    [guestId],
  );
}

export async function listActiveBySocio(db: DB, socioId: number): Promise<Invitation[]> {
  const { rows } = await db.query<Invitation>(
    `SELECT * FROM invitations WHERE socio_id = $1 AND status IN ('pendiente','aceptada')
     ORDER BY created_at DESC`,
    [socioId],
  );
  return rows;
}

/** Invitaciones vivas de un socio como "personas": nombre, si hay selfie,
 *  lo que llevan gastado y su última entrada por la puerta. */
export async function listBySocio(db: DB, socioId: number): Promise<any[]> {
  const { rows } = await db.query(
    `SELECT i.*, g.name AS guest_name, (g.photo IS NOT NULL) AS has_photo,
       COALESCE((SELECT SUM(o.total_cents) FROM orders o WHERE o.invitation_id = i.id), 0)::int AS spent_cents,
       (SELECT MAX(c.created_at) FROM checkins c WHERE c.user_id = i.guest_id) AS last_checkin_at
     FROM invitations i
     LEFT JOIN users g ON g.id = i.guest_id
     WHERE i.socio_id = $1 AND i.parent_id IS NULL AND i.status IN ('pendiente','aceptada')
     ORDER BY i.created_at DESC LIMIT 50`,
    [socioId],
  );
  return rows;
}

/** ¿Es este invitado de alguna invitación del socio? (para enseñarle su selfie) */
export async function isGuestOf(db: DB, socioId: number, guestId: number): Promise<boolean> {
  const row = await one<{ n: number }>(
    db,
    `SELECT COUNT(*)::int AS n FROM invitations WHERE socio_id = $1 AND guest_id = $2`,
    [socioId, guestId],
  );
  return (row?.n ?? 0) > 0;
}

export async function listByCaseta(db: DB, casetaId: number): Promise<any[]> {
  const { rows } = await db.query(
    `SELECT i.*, s.name AS socio_name, g.name AS guest_name
     FROM invitations i
     JOIN users s ON s.id = i.socio_id
     LEFT JOIN users g ON g.id = i.guest_id
     WHERE i.caseta_id = $1 AND i.parent_id IS NULL
     ORDER BY i.created_at DESC LIMIT 100`,
    [casetaId],
  );
  return rows;
}

export async function accept(db: DB, invitationId: number, guestId: number): Promise<void> {
  await db.query(`UPDATE invitations SET status = 'aceptada', guest_id = $1 WHERE id = $2`, [
    guestId,
    invitationId,
  ]);
}

export async function reject(db: DB, invitationId: number): Promise<void> {
  await db.query(`UPDATE invitations SET status = 'rechazada' WHERE id = $1`, [invitationId]);
}

/** Cancela la invitación y todas sus hijas (acompañantes) en cascada. */
export async function cancel(db: DB, invitationId: number): Promise<void> {
  await db.query(
    `WITH RECURSIVE tree AS (
       SELECT id FROM invitations WHERE id = $1
       UNION ALL
       SELECT i.id FROM invitations i JOIN tree t ON i.parent_id = t.id
     )
     UPDATE invitations SET status = 'cancelada', cancelled_at = now()
     WHERE id IN (SELECT id FROM tree) AND status IN ('pendiente','aceptada')`,
    [invitationId],
  );
}

export async function spentCents(db: DB, invitationId: number): Promise<number> {
  const row = await one<{ total: number }>(
    db,
    'SELECT COALESCE(SUM(total_cents), 0)::int AS total FROM orders WHERE invitation_id = $1',
    [invitationId],
  );
  return row!.total;
}

/**
 * Regla central: ¿esta persona puede entrar/consumir hoy, y con qué límite?
 * Socios activos → sin límite (su cuenta). Invitados → según su invitación,
 * y su consumo va a la cuenta del socio que los invitó.
 */
export async function checkAccess(db: DB, user: User): Promise<AccessInfo> {
  const base = {
    user,
    invitation: null as Invitation | null,
    hostName: null as string | null,
    canOrder: true,
    spendLimitCents: null as number | null,
    spentCents: 0,
    remainingCents: null as number | null,
  };

  if (user.status === 'suspendido') {
    return { ...base, ok: false, reason: 'Usuario suspendido' };
  }
  if (user.role === 'socio' || user.role === 'admin') {
    return { ...base, ok: true, reason: 'Socio: consumo a su cuenta' };
  }
  if (user.role === 'mesero' || user.role === 'puerta') {
    return { ...base, ok: true, reason: 'Personal de la caseta' };
  }

  const inv = await activeForGuest(db, user.id);
  if (!inv) return { ...base, ok: false, reason: 'Sin invitación activa' };

  const socio = await users.findById(db, inv.socio_id);
  const hostName = socio?.name ?? null;

  if (inv.access_mode === 'fecha' && inv.valid_date !== todayStr()) {
    return {
      ...base,
      invitation: inv,
      hostName,
      ok: false,
      reason: `Invitación válida solo el ${inv.valid_date}`,
    };
  }

  const spent = await spentCents(db, inv.id);
  const remaining = inv.spend_limit_cents === null ? null : Math.max(0, inv.spend_limit_cents - spent);

  return {
    ok: true,
    reason: inv.can_order
      ? `Invitado de ${hostName ?? 'socio'} · a su cuenta`
      : `Invitado de ${hostName ?? 'socio'} · solo entrada`,
    user,
    invitation: inv,
    hostName,
    canOrder: inv.can_order,
    spendLimitCents: inv.spend_limit_cents,
    spentCents: spent,
    remainingCents: remaining,
  };
}
