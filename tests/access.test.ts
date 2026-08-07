import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, type DB } from '../src/db/index.js';
import * as users from '../src/services/users.js';
import * as invitations from '../src/services/invitations.js';
import * as orders from '../src/services/orders.js';
import { signQrToken, verifyQrToken, rotateQr } from '../src/services/qr.js';
import { todayStr } from '../src/domain/types.js';

let db: DB;

beforeEach(() => {
  db = openDb(':memory:');
});

function setupSocioAndGuest(opts: { limit?: number | null; mode?: 'fecha' | 'siempre'; date?: string } = {}) {
  const socio = users.createUser(db, { phone: '34600000001', name: 'Socio Uno', role: 'socio' });
  const inv = invitations.createInvitation(db, {
    socioId: socio.id,
    guestPhone: '34600000002',
    accessMode: opts.mode ?? 'siempre',
    validDate: opts.date ?? null,
    spendLimitCents: opts.limit === undefined ? null : opts.limit,
    maxCompanions: 2,
  });
  const guest = users.createUser(db, { phone: '34600000002', name: 'Invitada', role: 'invitado' });
  invitations.accept(db, inv.id, guest.id);
  return { socio, guest, inv };
}

describe('QR firmado', () => {
  it('firma y verifica el QR de un usuario', () => {
    const { guest } = setupSocioAndGuest();
    const token = signQrToken(guest);
    expect(verifyQrToken(db, token)?.id).toBe(guest.id);
  });

  it('un QR rotado deja de valer (revocación)', () => {
    const { guest } = setupSocioAndGuest();
    const token = signQrToken(guest);
    rotateQr(db, guest.id);
    expect(verifyQrToken(db, token)).toBeNull();
  });

  it('rechaza tokens manipulados', () => {
    expect(verifyQrToken(db, 'no-es-un-jwt')).toBeNull();
  });
});

describe('checkAccess', () => {
  it('socio activo tiene acceso abierto', () => {
    const socio = users.createUser(db, { phone: '34600000009', name: 'S', role: 'socio' });
    const access = invitations.checkAccess(db, socio);
    expect(access.ok).toBe(true);
    expect(access.remainingCents).toBeNull();
  });

  it('invitado con invitación vigente entra; muestra su socio anfitrión', () => {
    const { guest } = setupSocioAndGuest();
    const access = invitations.checkAccess(db, guest);
    expect(access.ok).toBe(true);
    expect(access.hostName).toBe('Socio Uno');
  });

  it('invitación de fecha concreta no vale otro día', () => {
    const { guest } = setupSocioAndGuest({ mode: 'fecha', date: '2001-01-01' });
    const access = invitations.checkAccess(db, guest);
    expect(access.ok).toBe(false);
    expect(access.reason).toContain('2001-01-01');
  });

  it('invitación de hoy sí vale hoy', () => {
    const { guest } = setupSocioAndGuest({ mode: 'fecha', date: todayStr() });
    expect(invitations.checkAccess(db, guest).ok).toBe(true);
  });

  it('cancelar la invitación corta el acceso al instante', () => {
    const { guest, inv } = setupSocioAndGuest();
    invitations.cancel(db, inv.id);
    expect(invitations.checkAccess(db, guest).ok).toBe(false);
  });

  it('cancelar en cascada afecta a los acompañantes', () => {
    const { inv } = setupSocioAndGuest();
    const child = invitations.createInvitation(db, {
      socioId: inv.socio_id,
      guestPhone: '34600000003',
      accessMode: 'siempre',
      parentId: inv.id,
    });
    const companion = users.createUser(db, { phone: '34600000003', role: 'invitado' });
    invitations.accept(db, child.id, companion.id);
    invitations.cancel(db, inv.id);
    expect(invitations.checkAccess(db, companion).ok).toBe(false);
  });

  it('usuario suspendido no entra aunque sea socio', () => {
    const socio = users.createUser(db, { phone: '34600000008', role: 'socio' });
    users.setStatus(db, socio.id, 'suspendido');
    const reloaded = users.findById(db, socio.id)!;
    expect(invitations.checkAccess(db, reloaded).ok).toBe(false);
  });
});

describe('comandas y límites', () => {
  it('descuenta consumo del límite y rechaza cuando se agota', () => {
    const { guest } = setupSocioAndGuest({ limit: 1000 }); // 10€
    const waiter = users.createUser(db, { phone: '34600000007', name: 'M', role: 'mesero' });
    const beer = orders.addProduct(db, 'Cerveza', 350, 'bebida');

    const first = orders.createOrder(db, guest, waiter, [{ productId: beer.id, qty: 2 }]); // 7€
    expect(first.ok).toBe(true);

    const access = invitations.checkAccess(db, guest);
    expect(access.remainingCents).toBe(300);

    const second = orders.createOrder(db, guest, waiter, [{ productId: beer.id, qty: 1 }]); // 3,50€ > 3€
    expect(second.ok).toBe(false);
    expect(second.error).toContain('Excede el límite');
  });

  it('consumo abierto no tiene tope', () => {
    const { guest } = setupSocioAndGuest({ limit: null });
    const waiter = users.createUser(db, { phone: '34600000007', role: 'mesero' });
    const gin = orders.addProduct(db, 'Copa', 900, 'bebida');
    const r = orders.createOrder(db, guest, waiter, [{ productId: gin.id, qty: 50 }]);
    expect(r.ok).toBe(true);
  });

  it('no se puede vender a un invitado sin acceso', () => {
    const { guest, inv } = setupSocioAndGuest();
    invitations.cancel(db, inv.id);
    const waiter = users.createUser(db, { phone: '34600000007', role: 'mesero' });
    const beer = orders.addProduct(db, 'Cerveza', 350, 'bebida');
    const r = orders.createOrder(db, guest, waiter, [{ productId: beer.id, qty: 1 }]);
    expect(r.ok).toBe(false);
  });
});
