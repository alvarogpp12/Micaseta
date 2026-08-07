import type { FastifyInstance } from 'fastify';
import type { DB } from '../db/index.js';
import { one } from '../db/index.js';
import { config, normalizePhone, formatPhone } from '../config.js';
import * as accounts from '../services/accounts.js';
import * as users from '../services/users.js';
import * as invitations from '../services/invitations.js';
import * as orders from '../services/orders.js';
import { signQrToken, verifyQrToken, qrPng } from '../services/qr.js';
import { staffLoginUrl } from '../bot/flows/staff.js';
import { SEVILLA_MENU } from '../services/demo.js';
import { parseEuros, todayStr } from '../domain/types.js';

const COOKIE = 'panel';

/**
 * API del panel web de la caseta (dueño/gestor) + endpoints públicos del
 * invitado. Todo lo del panel va scoped a la caseta de la cuenta logueada.
 */
export function registerPanelRoutes(app: FastifyInstance, db: DB): void {
  const setSession = (reply: any, token: string) =>
    reply.setCookie(COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 });

  async function auth(req: any, reply: any) {
    const account = await accounts.accountFromSession(db, req.cookies?.[COOKIE]);
    if (!account) {
      reply.code(401).send({ error: 'no-session' });
      return null;
    }
    return account;
  }

  // ---- Registro y login del panel ----

  app.post('/papi/register', async (req, reply) => {
    const body = req.body as any;
    const result = await accounts.registerCaseta(db, {
      casetaName: body?.casetaName ?? '',
      ownerName: body?.ownerName ?? '',
      email: body?.email ?? '',
      password: body?.password ?? '',
    });
    if (!result.ok) return reply.code(422).send({ error: result.error });
    setSession(reply, accounts.signPanelSession(result.account));
    return { ok: true, caseta: result.caseta.name };
  });

  app.post('/papi/login', async (req, reply) => {
    const body = req.body as any;
    const account = await accounts.loginAccount(db, body?.email ?? '', body?.password ?? '');
    if (!account) return reply.code(401).send({ error: 'Email o contraseña incorrectos' });
    setSession(reply, accounts.signPanelSession(account));
    return { ok: true };
  });

  app.post('/papi/logout', async (_req, reply) => {
    reply.clearCookie(COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/papi/me', async (req, reply) => {
    const account = await auth(req, reply);
    if (!account) return;
    const caseta = await accounts.getCaseta(db, account.caseta_id);
    return { name: account.name, email: account.email, caseta: caseta?.name, casetaId: account.caseta_id };
  });

  // ---- Resumen ----

  app.get('/papi/overview', async (req, reply) => {
    const account = await auth(req, reply);
    if (!account) return;
    const c = account.caseta_id;

    const hoy = await one<{ total: number; n: number }>(
      db,
      `SELECT COALESCE(SUM(total_cents), 0)::int AS total, COUNT(id)::int AS n
       FROM orders WHERE caseta_id = $1 AND created_at::date = current_date`,
      [c],
    );
    const entradas = await one<{ n: number }>(
      db,
      `SELECT COUNT(ch.id)::int AS n FROM checkins ch
       JOIN users u ON u.id = ch.user_id
       WHERE u.caseta_id = $1 AND ch.created_at::date = current_date`,
      [c],
    );
    const counts = await one<{ socios: number; invitados: number; staff: number }>(
      db,
      `SELECT
         COUNT(*) FILTER (WHERE role = 'socio')::int AS socios,
         COUNT(*) FILTER (WHERE role = 'invitado' AND status = 'activo')::int AS invitados,
         COUNT(*) FILTER (WHERE role IN ('mesero','puerta'))::int AS staff
       FROM users WHERE caseta_id = $1`,
      [c],
    );
    const pendiente = await one<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(total_cents), 0)::int AS total FROM orders
       WHERE caseta_id = $1 AND NOT settled`,
      [c],
    );
    const cuentas = await orders.cuentasPorSocio(db, c);
    return { hoy, entradas: entradas!.n, counts, pendienteCents: pendiente!.total, cuentas };
  });

  // ---- Socios ----

  app.get('/papi/socios', async (req, reply) => {
    const account = await auth(req, reply);
    if (!account) return;
    const list = await users.listByCaseta(db, account.caseta_id, ['socio']);
    return list.map((s) => ({ ...s, qrToken: s.status === 'activo' ? signQrToken(s as any) : null }));
  });

  app.post('/papi/socios', async (req, reply) => {
    const account = await auth(req, reply);
    if (!account) return;
    const body = req.body as any;
    const phone = normalizePhone(body?.phone ?? '');
    const name = (body?.name ?? '').trim();
    if (!phone) return reply.code(422).send({ error: 'Teléfono no válido (ej: 612345678)' });
    if (!name) return reply.code(422).send({ error: 'Falta el nombre del socio' });
    const existing = await users.findByPhone(db, phone);
    if (existing && existing.caseta_id && existing.caseta_id !== account.caseta_id) {
      return reply.code(422).send({ error: 'Ese teléfono ya está en otra caseta' });
    }
    const socio = await users.upsertByAdmin(db, phone, name, 'socio', account.caseta_id);
    return { ok: true, socio: { id: socio.id, name: socio.name, phone: formatPhone(socio.phone) } };
  });

  app.post('/papi/socios/:id/suspender', async (req, reply) => {
    const account = await auth(req, reply);
    if (!account) return;
    const id = Number((req.params as any).id);
    const user = await users.findById(db, id);
    if (!user || user.caseta_id !== account.caseta_id) return reply.code(404).send({ error: 'No existe' });
    await users.setStatus(db, id, user.status === 'suspendido' ? 'activo' : 'suspendido');
    return { ok: true };
  });

  // ---- Staff (puerta y meseros) ----

  app.get('/papi/staff', async (req, reply) => {
    const account = await auth(req, reply);
    if (!account) return;
    const list = await users.listByCaseta(db, account.caseta_id, ['mesero', 'puerta']);
    return list.map((s) => ({ ...s, loginUrl: s.status === 'activo' ? staffLoginUrl(s as any) : null }));
  });

  app.post('/papi/staff', async (req, reply) => {
    const account = await auth(req, reply);
    if (!account) return;
    const body = req.body as any;
    const role = body?.role === 'puerta' ? 'puerta' : 'mesero';
    const phone = normalizePhone(body?.phone ?? '');
    const name = (body?.name ?? '').trim();
    if (!phone) return reply.code(422).send({ error: 'Teléfono no válido' });
    if (!name) return reply.code(422).send({ error: 'Falta el nombre' });
    const existing = await users.findByPhone(db, phone);
    if (existing && existing.caseta_id && existing.caseta_id !== account.caseta_id) {
      return reply.code(422).send({ error: 'Ese teléfono ya está en otra caseta' });
    }
    const member = await users.upsertByAdmin(db, phone, name, role, account.caseta_id);
    return { ok: true, loginUrl: staffLoginUrl(member) };
  });

  // ---- Carta ----

  app.get('/papi/products', async (req, reply) => {
    const account = await auth(req, reply);
    if (!account) return;
    return orders.listProducts(db, account.caseta_id);
  });

  app.post('/papi/products', async (req, reply) => {
    const account = await auth(req, reply);
    if (!account) return;
    const body = req.body as any;
    const price = parseEuros(String(body?.price ?? ''));
    const name = (body?.name ?? '').trim();
    if (!name) return reply.code(422).send({ error: 'Falta el nombre del producto' });
    if (price === null) return reply.code(422).send({ error: 'Precio no válido (ej: 3,50)' });
    const category = (body?.category ?? 'general').trim().toLowerCase() || 'general';
    const product = await orders.addProduct(db, name, price, category, account.caseta_id);
    return { ok: true, product };
  });

  app.post('/papi/products/seed', async (req, reply) => {
    const account = await auth(req, reply);
    if (!account) return;
    const existing = await orders.listProducts(db, account.caseta_id);
    if (existing.length > 0) return reply.code(422).send({ error: 'La carta ya tiene productos' });
    for (const p of SEVILLA_MENU) {
      await orders.addProduct(db, p.name, p.price_cents, p.category, account.caseta_id);
    }
    return { ok: true, count: SEVILLA_MENU.length };
  });

  app.post('/papi/products/:id/desactivar', async (req, reply) => {
    const account = await auth(req, reply);
    if (!account) return;
    await orders.deactivateProduct(db, Number((req.params as any).id), account.caseta_id);
    return { ok: true };
  });

  // ---- Invitaciones ----

  app.get('/papi/invitations', async (req, reply) => {
    const account = await auth(req, reply);
    if (!account) return;
    const caseta = await accounts.getCaseta(db, account.caseta_id);
    const list = await invitations.listByCaseta(db, account.caseta_id);
    return list.map((inv) => ({
      ...inv,
      shareUrl: invitations.inviteUrl(inv.id),
      shareText: invitations.inviteShareText(inv, caseta?.name ?? 'la caseta', inv.socio_name ?? 'Un socio'),
    }));
  });

  app.post('/papi/invitations', async (req, reply) => {
    const account = await auth(req, reply);
    if (!account) return;
    const body = req.body as any;
    const socioId = Number(body?.socioId);
    const socio = await users.findById(db, socioId);
    if (!socio || socio.caseta_id !== account.caseta_id || socio.role !== 'socio') {
      return reply.code(422).send({ error: 'Elige un socio válido' });
    }
    const guestPhone = body?.guestPhone ? normalizePhone(body.guestPhone) : null;
    let spendLimitCents: number | null = null;
    if (body?.limit && !/^abierto$/i.test(String(body.limit))) {
      spendLimitCents = parseEuros(String(body.limit));
      if (spendLimitCents === null) return reply.code(422).send({ error: 'Límite no válido (ej: 50)' });
    }
    let accessMode: 'fecha' | 'siempre' = 'siempre';
    let validDate: string | null = null;
    if (body?.date) {
      const m = String(body.date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return reply.code(422).send({ error: 'Fecha no válida' });
      accessMode = 'fecha';
      validDate = body.date;
      if (validDate && validDate < todayStr()) return reply.code(422).send({ error: 'Esa fecha ya pasó' });
    }
    const inv = await invitations.createInvitation(db, {
      socioId,
      casetaId: account.caseta_id,
      guestPhone,
      guestLabel: (body?.guestName ?? '').trim() || null,
      accessMode,
      validDate,
      spendLimitCents,
      maxCompanions: Math.max(0, Math.min(10, Number(body?.companions ?? 0) || 0)),
    });
    const caseta = await accounts.getCaseta(db, account.caseta_id);
    return {
      ok: true,
      id: inv.id,
      shareUrl: invitations.inviteUrl(inv.id),
      shareText: invitations.inviteShareText(inv, caseta?.name ?? 'la caseta', socio.name ?? 'Un socio'),
      guestPhone: guestPhone ? formatPhone(guestPhone) : null,
    };
  });

  app.post('/papi/invitations/:id/cancelar', async (req, reply) => {
    const account = await auth(req, reply);
    if (!account) return;
    const inv = await invitations.getInvitation(db, Number((req.params as any).id));
    if (!inv || inv.caseta_id !== account.caseta_id) return reply.code(404).send({ error: 'No existe' });
    await invitations.cancel(db, inv.id);
    return { ok: true };
  });

  // ---- Cuentas de socios ----

  app.get('/papi/cuentas/:socioId', async (req, reply) => {
    const account = await auth(req, reply);
    if (!account) return;
    return orders.cuentaDetalle(db, account.caseta_id, Number((req.params as any).socioId));
  });

  app.post('/papi/cuentas/:socioId/liquidar', async (req, reply) => {
    const account = await auth(req, reply);
    if (!account) return;
    const settled = await orders.settleSocio(db, account.caseta_id, Number((req.params as any).socioId));
    return { ok: true, settledCents: settled };
  });

  // ---- Endpoints públicos del invitado (link compartido por el socio) ----

  app.get('/gapi/invitacion', async (req, reply) => {
    const t = String((req.query as any).t ?? '');
    const inv = await invitations.invitationFromToken(db, t);
    if (!inv) return reply.code(404).send({ error: 'Invitación no encontrada' });
    const socio = await users.findById(db, inv.socio_id);
    const caseta = inv.caseta_id ? await accounts.getCaseta(db, inv.caseta_id) : null;
    const guest = inv.guest_id ? await users.findById(db, inv.guest_id) : null;
    return {
      caseta: caseta?.name ?? 'Micaseta',
      socio: socio?.name ?? 'Un socio',
      status: inv.status,
      conditions: invitations.describeInvitation(inv),
      needsPhone: !inv.guest_phone && !guest,
      registered: !!(guest && guest.name && guest.status === 'activo'),
      guestName: guest?.name ?? inv.guest_label ?? null,
      qrToken: guest && guest.status === 'activo' ? signQrToken(guest) : null,
      maxCompanions: inv.max_companions,
    };
  });

  app.post('/gapi/invitacion/registro', async (req, reply) => {
    const body = req.body as any;
    const inv = await invitations.invitationFromToken(db, String(body?.t ?? ''));
    if (!inv) return reply.code(404).send({ error: 'Invitación no encontrada' });
    const photo = body?.photoBase64 ? Buffer.from(String(body.photoBase64), 'base64') : null;
    if (!photo) return reply.code(422).send({ error: 'Necesitamos una foto de tu rostro' });
    if (photo.length > 4 * 1024 * 1024) return reply.code(422).send({ error: 'Foto demasiado grande (máx. 4MB)' });
    const phone = body?.phone ? normalizePhone(String(body.phone)) : null;
    const result = await invitations.registerGuestFromLink(db, inv, {
      name: String(body?.name ?? ''),
      phone,
      photo,
    });
    if (!result.ok) return reply.code(422).send({ error: result.error });
    return { ok: true, qrToken: signQrToken(result.guest), name: result.guest.name };
  });

  /** Imagen PNG del QR (el token firmado ES el secreto, se puede servir sin cookie). */
  app.get('/qr.png', async (req, reply) => {
    const t = String((req.query as any).t ?? '');
    const user = await verifyQrToken(db, t);
    if (!user) return reply.code(404).send({ error: 'QR no válido' });
    reply.type('image/png');
    return qrPng(t);
  });
}
