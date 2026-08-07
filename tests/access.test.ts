import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDb, type DB } from '../src/db/index.js';
import * as users from '../src/services/users.js';
import * as invitations from '../src/services/invitations.js';
import * as orders from '../src/services/orders.js';
import { signQrToken, verifyQrToken, rotateQr } from '../src/services/qr.js';
import { todayStr } from '../src/domain/types.js';

let db: DB;

beforeEach(async () => {
  db = await openDb(); // PGlite en memoria: mismo dialecto que producción
});

afterEach(async () => {
  await db.close();
});

async function setupSocioAndGuest(
  opts: { limit?: number | null; mode?: 'fecha' | 'siempre'; date?: string } = {},
) {
  const socio = await users.createUser(db, { phone: '34600000001', name: 'Socio Uno', role: 'socio' });
  const inv = await invitations.createInvitation(db, {
    socioId: socio.id,
    guestPhone: '34600000002',
    accessMode: opts.mode ?? 'siempre',
    validDate: opts.date ?? null,
    spendLimitCents: opts.limit === undefined ? null : opts.limit,
    maxCompanions: 2,
  });
  const guest = await users.createUser(db, { phone: '34600000002', name: 'Invitada', role: 'invitado' });
  await invitations.accept(db, inv.id, guest.id);
  return { socio, guest, inv };
}

describe('QR firmado', () => {
  it('firma y verifica el QR de un usuario', async () => {
    const { guest } = await setupSocioAndGuest();
    const token = signQrToken(guest);
    expect((await verifyQrToken(db, token))?.id).toBe(guest.id);
  });

  it('un QR rotado deja de valer (revocación)', async () => {
    const { guest } = await setupSocioAndGuest();
    const token = signQrToken(guest);
    await rotateQr(db, guest.id);
    expect(await verifyQrToken(db, token)).toBeNull();
  });

  it('rechaza tokens manipulados', async () => {
    expect(await verifyQrToken(db, 'no-es-un-jwt')).toBeNull();
  });
});

describe('checkAccess', () => {
  it('socio activo tiene acceso abierto', async () => {
    const socio = await users.createUser(db, { phone: '34600000009', name: 'S', role: 'socio' });
    const access = await invitations.checkAccess(db, socio);
    expect(access.ok).toBe(true);
    expect(access.remainingCents).toBeNull();
  });

  it('invitado con invitación vigente entra; muestra su socio anfitrión', async () => {
    const { guest } = await setupSocioAndGuest();
    const access = await invitations.checkAccess(db, guest);
    expect(access.ok).toBe(true);
    expect(access.hostName).toBe('Socio Uno');
  });

  it('invitación de fecha concreta no vale otro día', async () => {
    const { guest } = await setupSocioAndGuest({ mode: 'fecha', date: '2001-01-01' });
    const access = await invitations.checkAccess(db, guest);
    expect(access.ok).toBe(false);
    expect(access.reason).toContain('2001-01-01');
  });

  it('invitación de hoy sí vale hoy', async () => {
    const { guest } = await setupSocioAndGuest({ mode: 'fecha', date: todayStr() });
    expect((await invitations.checkAccess(db, guest)).ok).toBe(true);
  });

  it('cancelar la invitación corta el acceso al instante', async () => {
    const { guest, inv } = await setupSocioAndGuest();
    await invitations.cancel(db, inv.id);
    expect((await invitations.checkAccess(db, guest)).ok).toBe(false);
  });

  it('cancelar en cascada afecta a los acompañantes', async () => {
    const { inv } = await setupSocioAndGuest();
    const child = await invitations.createInvitation(db, {
      socioId: inv.socio_id,
      guestPhone: '34600000003',
      accessMode: 'siempre',
      parentId: inv.id,
    });
    const companion = await users.createUser(db, { phone: '34600000003', role: 'invitado' });
    await invitations.accept(db, child.id, companion.id);
    await invitations.cancel(db, inv.id);
    expect((await invitations.checkAccess(db, companion)).ok).toBe(false);
  });

  it('usuario suspendido no entra aunque sea socio', async () => {
    const socio = await users.createUser(db, { phone: '34600000008', role: 'socio' });
    await users.setStatus(db, socio.id, 'suspendido');
    const reloaded = (await users.findById(db, socio.id))!;
    expect((await invitations.checkAccess(db, reloaded)).ok).toBe(false);
  });
});

describe('comandas y límites', () => {
  it('descuenta consumo del límite y rechaza cuando se agota', async () => {
    const { guest } = await setupSocioAndGuest({ limit: 1000 }); // 10€
    const waiter = await users.createUser(db, { phone: '34600000007', name: 'M', role: 'mesero' });
    const beer = await orders.addProduct(db, 'Cerveza', 350, 'bebida');

    const first = await orders.createOrder(db, guest, waiter, [{ productId: beer.id, qty: 2 }]); // 7€
    expect(first.ok).toBe(true);

    const access = await invitations.checkAccess(db, guest);
    expect(access.remainingCents).toBe(300);

    const second = await orders.createOrder(db, guest, waiter, [{ productId: beer.id, qty: 1 }]); // 3,50€ > 3€
    expect(second.ok).toBe(false);
    expect(second.error).toContain('Excede el límite');
  });

  it('consumo abierto no tiene tope', async () => {
    const { guest } = await setupSocioAndGuest({ limit: null });
    const waiter = await users.createUser(db, { phone: '34600000007', role: 'mesero' });
    const gin = await orders.addProduct(db, 'Copa', 900, 'bebida');
    const r = await orders.createOrder(db, guest, waiter, [{ productId: gin.id, qty: 50 }]);
    expect(r.ok).toBe(true);
  });

  it('no se puede vender a un invitado sin acceso', async () => {
    const { guest, inv } = await setupSocioAndGuest();
    await invitations.cancel(db, inv.id);
    const waiter = await users.createUser(db, { phone: '34600000007', role: 'mesero' });
    const beer = await orders.addProduct(db, 'Cerveza', 350, 'bebida');
    const r = await orders.createOrder(db, guest, waiter, [{ productId: beer.id, qty: 1 }]);
    expect(r.ok).toBe(false);
  });
});
