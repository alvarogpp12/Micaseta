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
import * as demo from '../services/demo.js';
import { registerPanelRoutes } from './panel.js';
import type { MockProvider } from '../providers/mock.js';
import type { CloudProvider } from '../providers/cloud.js';

const PUBLIC_DIR = path.resolve('public');

export interface ServerDeps {
  db: DB;
  mock?: MockProvider | null;
  cloud?: CloudProvider | null;
}

export async function createServer({ db, mock, cloud }: ServerDeps) {
  const app = Fastify({ logger: false, bodyLimit: 8 * 1024 * 1024 }); // selfies en base64

  await app.register(fastifyCookie);
  // En Vercel los estáticos los sirve la CDN (outputDirectory: public);
  // localmente los sirve Fastify.
  if (fs.existsSync(PUBLIC_DIR)) {
    await app.register(fastifyStatic, { root: PUBLIC_DIR, prefix: '/' });
  }

  app.get('/health', () => ({ ok: true }));

  // Cada puesto tiene su propia interfaz con el mismo diseño
  const staffHome = (role: string) => (role === 'puerta' ? '/puerta/' : '/camarero/');

  // Panel web de la caseta + registro público de invitados
  registerPanelRoutes(app, db);

  // ---- Modo demo: entrar como camarero o puerta sin dar nada de alta ----

  app.get('/demo/:rol', async (req, reply) => {
    const rol = (req.params as any).rol === 'puerta' ? 'puerta' : 'camarero';
    await demo.ensureDemoCaseta(db);
    const staff = await users.findByPhone(db, demo.demoStaffPhone(rol));
    if (!staff) return reply.code(500).send({ error: 'demo no disponible' });
    const session = jwt.sign({ s: staff.id }, config.jwtSecret, { expiresIn: '2d' });
    reply
      .setCookie('session', session, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 2 * 24 * 3600 })
      .redirect(staffHome(staff.role));
  });

  app.get('/api/demo-qrs', async (req, reply) => {
    const staff = await staffFromRequest(req);
    if (!staff?.caseta_id) return [];
    return demo.demoTokens(db, staff.caseta_id);
  });

  // ---- Webhook de la WhatsApp Cloud API (Meta) ----

  if (cloud) {
    // Verificación del webhook (la hace Meta una sola vez al configurarlo)
    app.get('/webhook', (req, reply) => {
      const q = req.query as Record<string, string>;
      if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === config.whatsappVerifyToken) {
        return reply.send(q['hub.challenge']);
      }
      return reply.code(403).send('forbidden');
    });

    app.post('/webhook', async (req, reply) => {
      // Responder rápido a Meta y procesar; en serverless el await es necesario
      await cloud.handleWebhook(req.body);
      return reply.send({ ok: true });
    });
  }

  // ---- Auth staff (link mágico → cookie de sesión) ----

  app.get('/staff/login', async (req, reply) => {
    const token = (req.query as any).token as string | undefined;
    try {
      const payload = jwt.verify(token ?? '', config.jwtSecret) as { s: number };
      const user = await users.findById(db, payload.s);
      if (!user || user.status !== 'activo') throw new Error('no');
      const session = jwt.sign({ s: user.id }, config.jwtSecret, { expiresIn: '30d' });
      reply
        .setCookie('session', session, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 })
        .redirect(staffHome(user.role));
    } catch {
      reply.code(401).type('text/html').send('<h3>Link inválido o caducado. Pide uno nuevo escribiendo <b>link</b> al WhatsApp del club.</h3>');
    }
  });

  async function staffFromRequest(req: any): Promise<User | null> {
    try {
      const payload = jwt.verify(req.cookies?.session ?? '', config.jwtSecret) as { s: number };
      const user = await users.findById(db, payload.s);
      if (!user || user.status !== 'activo') return null;
      if (!['mesero', 'puerta', 'admin'].includes(user.role)) return null;
      return user;
    } catch {
      return null;
    }
  }

  app.get('/api/me', async (req, reply) => {
    const staff = await staffFromRequest(req);
    if (!staff) return reply.code(401).send({ error: 'no-session' });
    return { id: staff.id, name: staff.name, role: staff.role };
  });

  // ---- Escaneo de QR ----

  app.post('/api/scan', async (req, reply) => {
    const staff = await staffFromRequest(req);
    if (!staff) return reply.code(401).send({ error: 'no-session' });
    const { qr } = req.body as { qr?: string };
    const person = qr ? await verifyQrToken(db, qr) : null;
    if (!person) return reply.code(404).send({ error: 'QR no válido o revocado' });
    const access = await invitations.checkAccess(db, person);
    return {
      userId: person.id,
      name: person.name,
      role: person.role,
      photoUrl: person.photo ? `/api/photo/${person.id}` : null,
      hostName: access.hostName,
      ok: access.ok,
      reason: access.reason,
      spendLimitCents: access.spendLimitCents,
      spentCents: access.spentCents,
      remainingCents: access.remainingCents,
      invitationId: access.invitation?.id ?? null,
    };
  });

  app.post('/api/checkin', async (req, reply) => {
    const staff = await staffFromRequest(req);
    if (!staff || (staff.role !== 'puerta' && staff.role !== 'admin')) {
      return reply.code(403).send({ error: 'Solo puerta' });
    }
    const { qr } = req.body as { qr?: string };
    const person = qr ? await verifyQrToken(db, qr) : null;
    if (!person) return reply.code(404).send({ error: 'QR no válido o revocado' });
    const access = await invitations.checkAccess(db, person);
    if (!access.ok) return reply.code(403).send({ error: access.reason });
    await db.query('INSERT INTO checkins (user_id, invitation_id, door_user_id) VALUES ($1, $2, $3)', [
      person.id,
      access.invitation?.id ?? null,
      staff.id,
    ]);
    return { ok: true, name: person.name };
  });

  // ---- Comandas (mesero) ----

  app.get('/api/products', async (req, reply) => {
    const staff = await staffFromRequest(req);
    if (!staff) return reply.code(401).send({ error: 'no-session' });
    return orders.listProducts(db);
  });

  app.post('/api/orders', async (req, reply) => {
    const staff = await staffFromRequest(req);
    if (!staff || (staff.role !== 'mesero' && staff.role !== 'admin')) {
      return reply.code(403).send({ error: 'Solo meseros' });
    }
    const { qr, items } = req.body as { qr?: string; items?: { productId: number; qty: number }[] };
    const person = qr ? await verifyQrToken(db, qr) : null;
    if (!person) return reply.code(404).send({ error: 'QR no válido o revocado' });
    const result = await orders.createOrder(db, person, staff, items ?? []);
    if (!result.ok) return reply.code(422).send({ error: result.error });
    return result;
  });

  // Pedidos enviados por los propios clientes (quedan pendientes de servir)
  app.get('/api/pedidos', async (req, reply) => {
    const staff = await staffFromRequest(req);
    if (!staff?.caseta_id || (staff.role !== 'mesero' && staff.role !== 'admin')) {
      return reply.code(403).send({ error: 'Solo camareros' });
    }
    return orders.pendingOrders(db, staff.caseta_id);
  });

  // El camarero marca el pedido listo: su número aparece en la pantalla de TV
  app.post('/api/pedidos/:id/listo', async (req, reply) => {
    const staff = await staffFromRequest(req);
    if (!staff?.caseta_id || (staff.role !== 'mesero' && staff.role !== 'admin')) {
      return reply.code(403).send({ error: 'Solo camareros' });
    }
    const ok = await orders.readyOrder(db, staff.caseta_id, Number((req.params as any).id), staff.id);
    if (!ok) return reply.code(404).send({ error: 'Ese pedido ya no está en preparación' });
    return { ok: true };
  });

  app.post('/api/pedidos/:id/servir', async (req, reply) => {
    const staff = await staffFromRequest(req);
    if (!staff?.caseta_id || (staff.role !== 'mesero' && staff.role !== 'admin')) {
      return reply.code(403).send({ error: 'Solo camareros' });
    }
    const ok = await orders.serveOrder(db, staff.caseta_id, Number((req.params as any).id), staff.id);
    if (!ok) return reply.code(404).send({ error: 'Ese pedido ya no está pendiente' });
    return { ok: true };
  });

  app.get('/api/photo/:id', async (req, reply) => {
    const staff = await staffFromRequest(req);
    if (!staff) return reply.code(401).send({ error: 'no-session' });
    const photo = await users.getPhoto(db, Number((req.params as any).id));
    if (!photo) return reply.code(404).send({ error: 'sin foto' });
    reply.type('image/jpeg');
    return photo;
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
