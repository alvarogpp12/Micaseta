import { one, type DB } from '../db/index.js';
import type { AccessInfo, Invitation, User } from '../domain/types.js';
import { todayStr } from '../domain/types.js';
import * as users from './users.js';

export interface NewInvitation {
  socioId: number;
  guestPhone: string;
  accessMode: 'fecha' | 'siempre';
  validDate?: string | null;
  spendLimitCents?: number | null;
  maxCompanions?: number;
  parentId?: number | null;
}

export async function createInvitation(db: DB, inv: NewInvitation): Promise<Invitation> {
  const row = await one<Invitation>(
    db,
    `INSERT INTO invitations
     (socio_id, guest_phone, parent_id, access_mode, valid_date, spend_limit_cents, max_companions)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      inv.socioId,
      inv.guestPhone,
      inv.parentId ?? null,
      inv.accessMode,
      inv.validDate ?? null,
      inv.spendLimitCents ?? null,
      inv.maxCompanions ?? 0,
    ],
  );
  return row!;
}

export function getInvitation(db: DB, id: number): Promise<Invitation | null> {
  return one<Invitation>(db, 'SELECT * FROM invitations WHERE id = $1', [id]);
}

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
 * Socios y staff activos → acceso abierto. Invitados → según su invitación.
 */
export async function checkAccess(db: DB, user: User): Promise<AccessInfo> {
  const base = {
    user,
    invitation: null as Invitation | null,
    hostName: null as string | null,
    spendLimitCents: null as number | null,
    spentCents: 0,
    remainingCents: null as number | null,
  };

  if (user.status === 'suspendido') {
    return { ...base, ok: false, reason: 'Usuario suspendido' };
  }
  if (user.role === 'socio' || user.role === 'admin') {
    return { ...base, ok: true, reason: 'Socio con acceso abierto' };
  }
  if (user.role === 'mesero' || user.role === 'puerta') {
    return { ...base, ok: true, reason: 'Personal del local' };
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
    reason: 'Invitación vigente',
    user,
    invitation: inv,
    hostName,
    spendLimitCents: inv.spend_limit_cents,
    spentCents: spent,
    remainingCents: remaining,
  };
}
