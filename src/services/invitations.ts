import type { DB } from '../db/index.js';
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

export function createInvitation(db: DB, inv: NewInvitation): Invitation {
  const info = db
    .prepare(
      `INSERT INTO invitations
       (socio_id, guest_phone, parent_id, access_mode, valid_date, spend_limit_cents, max_companions)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      inv.socioId,
      inv.guestPhone,
      inv.parentId ?? null,
      inv.accessMode,
      inv.validDate ?? null,
      inv.spendLimitCents ?? null,
      inv.maxCompanions ?? 0,
    );
  return getInvitation(db, Number(info.lastInsertRowid))!;
}

export function getInvitation(db: DB, id: number): Invitation | null {
  return (db.prepare('SELECT * FROM invitations WHERE id = ?').get(id) as Invitation | undefined) ?? null;
}

export function pendingForPhone(db: DB, phone: string): Invitation | null {
  return (
    (db
      .prepare(
        `SELECT * FROM invitations WHERE guest_phone = ? AND status = 'pendiente'
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(phone) as Invitation | undefined) ?? null
  );
}

/** Invitación aceptada vigente de un invitado (la más reciente). */
export function activeForGuest(db: DB, guestId: number): Invitation | null {
  return (
    (db
      .prepare(
        `SELECT * FROM invitations WHERE guest_id = ? AND status = 'aceptada'
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(guestId) as Invitation | undefined) ?? null
  );
}

export function listActiveBySocio(db: DB, socioId: number): Invitation[] {
  return db
    .prepare(
      `SELECT * FROM invitations WHERE socio_id = ? AND status IN ('pendiente','aceptada')
       ORDER BY created_at DESC`,
    )
    .all(socioId) as Invitation[];
}

export function accept(db: DB, invitationId: number, guestId: number): void {
  db.prepare(`UPDATE invitations SET status = 'aceptada', guest_id = ? WHERE id = ?`).run(
    guestId,
    invitationId,
  );
}

export function reject(db: DB, invitationId: number): void {
  db.prepare(`UPDATE invitations SET status = 'rechazada' WHERE id = ?`).run(invitationId);
}

/** Cancela la invitación y todas sus hijas (acompañantes) en cascada. */
export function cancel(db: DB, invitationId: number): void {
  const stmt = db.prepare(
    `UPDATE invitations SET status = 'cancelada', cancelled_at = datetime('now') WHERE id = ?`,
  );
  stmt.run(invitationId);
  const children = db
    .prepare(`SELECT id FROM invitations WHERE parent_id = ? AND status IN ('pendiente','aceptada')`)
    .all(invitationId) as { id: number }[];
  for (const c of children) cancel(db, c.id);
}

export function spentCents(db: DB, invitationId: number): number {
  const row = db
    .prepare('SELECT COALESCE(SUM(total_cents), 0) AS total FROM orders WHERE invitation_id = ?')
    .get(invitationId) as { total: number };
  return row.total;
}

/**
 * Regla central: ¿esta persona puede entrar/consumir hoy, y con qué límite?
 * Socios y staff activos → acceso abierto. Invitados → según su invitación.
 */
export function checkAccess(db: DB, user: User): AccessInfo {
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

  const inv = activeForGuest(db, user.id);
  if (!inv) return { ...base, ok: false, reason: 'Sin invitación activa' };

  const socio = users.findById(db, inv.socio_id);
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

  const spent = spentCents(db, inv.id);
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
