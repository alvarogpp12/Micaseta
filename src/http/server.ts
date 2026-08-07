import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import type { DB } from '../db/index.js';
import type { User } from '../domain/types.js';
import { config, normalizePhone } from '../config.js';
import * as users from '../services/users.js';
import * as invitations from '../services/invitations.js';
import * as orders from '../services/orders.js';
import { verifyQrToken } from '../services/qr.js';
import type { MockProvider } from '../providers/mock.js';

const PUBLIC_DIR = path.resolve('public');

export async function createServer(db: DB, mock: MockProvider | null) {
  const app = Fastify({ logger: false });

  await app.register(fastifyCookie);
  await app.register(fastifyStatic, { root: PUBLIC_DIR, prefix: '/' });

  app.get('/vendor/jsQR.js', (_req, reply) => {
    reply.type('application/javascript');
    return fs.readFileSync(path.resolve('node_modules/jsqr/dist/jsQR.js'), 'utf8');
  });

  // ---- Auth staff (link mágico → cookie de sesión) ----

  app.get('/staff/login', (req, reply) => {
    const token = (req.query as any).token as string | undefined;
    try {
      const payload = jwt.verify(token ?? '', config.jwtSecret) as { s: number };
      const user = users.findById(db, payload.s);
      if (!user || user.status !== 'activo') throw new Error('no');
      const session = jwt.sign({ s: user.id }, config.jwtSecret, { expiresIn: '30d' });
      reply
        .setCookie('session', session, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 })
        .redirect('/staff/');
    } catch {
      reply.code(401).type('text/html').send('<h3>Link inválido o caducado. Pide uno nuevo escribiendo <b>link</b> al WhatsApp del club.</h3>');
    }
  });

  function staffFromRequest(req: any): User | null {
    try {
      const payload = jwt.verify(req.cookies?.session ?? '', config.jwtSecret) as { s: number };
      const user = users.findById(db, payload.s);
      if (!user || user.status !== 'activo') return null;
      if (!['mesero', 'puerta', 'admin'].includes(user.role)) return null;
      return user;
    } catch {
      return null;
    }
  }

  app.get('/api/me', (req, reply) => {
    const staff = staffFromRequest(req);
    if (!staff) return reply.code(401).send({ error: 'no-session' });
    return { id: staff.id, name: staff.name, role: staff.role };
  });

  // ---- Escaneo de QR ----

  function scanPayload(qr: string) {
    const person = verifyQrToken(db, qr);
    if (!person) return null;
    const access = invitations.checkAccess(db, person);
    return {
      userId: person.id,
      name: person.name,
      role: person.role,
      photoUrl: person.photo_path ? `/api/photo/${person.id}` : null,
      hostName: access.hostName,
      ok: access.ok,
      reason: access.reason,
      spendLimitCents: access.spendLimitCents,
      spentCents: access.spentCents,
      remainingCents: access.remainingCents,
      invitationId: access.invitation?.id ?? null,
    };
  }

  app.post('/api/scan', (req, reply) => {
    const staff = staffFromRequest(req);
    if (!staff) return reply.code(401).send({ error: 'no-session' });
    const { qr } = req.body as { qr?: string };
    const info = qr ? scanPayload(qr) : null;
    if (!info) return reply.code(404).send({ error: 'QR no válido o revocado' });
    return info;
  });

  app.post('/api/checkin', (req, reply) => {
    const staff = staffFromRequest(req);
    if (!staff || (staff.role !== 'puerta' && staff.role !== 'admin')) {
      return reply.code(403).send({ error: 'Solo puerta' });
    }
    const { qr } = req.body as { qr?: string };
    const person = qr ? verifyQrToken(db, qr) : null;
    if (!person) return reply.code(404).send({ error: 'QR no válido o revocado' });
    const access = invitations.checkAccess(db, person);
    if (!access.ok) return reply.code(403).send({ error: access.reason });
    db.prepare('INSERT INTO checkins (user_id, invitation_id, door_user_id) VALUES (?, ?, ?)').run(
      person.id,
      access.invitation?.id ?? null,
      staff.id,
    );
    return { ok: true, name: person.name };
  });

  // ---- Comandas (mesero) ----

  app.get('/api/products', (req, reply) => {
    const staff = staffFromRequest(req);
    if (!staff) return reply.code(401).send({ error: 'no-session' });
    return orders.listProducts(db);
  });

  app.post('/api/orders', (req, reply) => {
    const staff = staffFromRequest(req);
    if (!staff || (staff.role !== 'mesero' && staff.role !== 'admin')) {
      return reply.code(403).send({ error: 'Solo meseros' });
    }
    const { qr, items } = req.body as { qr?: string; items?: { productId: number; qty: number }[] };
    const person = qr ? verifyQrToken(db, qr) : null;
    if (!person) return reply.code(404).send({ error: 'QR no válido o revocado' });
    const result = orders.createOrder(db, person, staff, items ?? []);
    if (!result.ok) return reply.code(422).send({ error: result.error });
    return result;
  });

  app.get('/api/photo/:id', (req, reply) => {
    const staff = staffFromRequest(req);
    if (!staff) return reply.code(401).send({ error: 'no-session' });
    const user = users.findById(db, Number((req.params as any).id));
    if (!user?.photo_path || !fs.existsSync(user.photo_path)) return reply.code(404).send({ error: 'sin foto' });
    reply.type('image/jpeg');
    return fs.readFileSync(user.photo_path);
  });

  // ---- Simulador de WhatsApp (solo en modo mock) ----

  if (mock) {
    app.post('/dev/api/send', async (req) => {
      const { from, text, imageBase64 } = req.body as { from: string; text?: string; imageBase64?: string };
      const phone = normalizePhone(from ?? '');
      if (!phone) return { error: 'teléfono inválido' };
      await mock.simulateIncoming({
        from: phone,
        text: (text ?? '').trim(),
        imageBuffer: imageBase64 ? Buffer.from(imageBase64, 'base64') : undefined,
      });
      return { ok: true, phone };
    });

    app.get('/dev/api/log', (req) => {
      const phone = normalizePhone(String((req.query as any).phone ?? ''));
      return { phone, log: phone ? mock.getLog(phone) : [] };
    });
  }

  return app;
}
