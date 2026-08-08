import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDb, type DB } from '../src/db/index.js';
import * as accounts from '../src/services/accounts.js';
import * as users from '../src/services/users.js';
import * as invitations from '../src/services/invitations.js';
import * as orders from '../src/services/orders.js';

let db: DB;

beforeEach(async () => {
  db = await openDb();
});

afterEach(async () => {
  await db.close();
});

describe('flujo completo de caseta (web)', () => {
  it('registrar caseta → socio → invitación por link → invitado → comanda a cuenta → liquidar', async () => {
    // 1. Registro de la caseta (onboarding web)
    const reg = await accounts.registerCaseta(db, {
      casetaName: 'Er Compás',
      ownerName: 'Álvaro',
      email: 'alvaro@feria.es',
      password: 'supersegura1',
    });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    const casetaId = reg.caseta.id;

    // Login correcto e incorrecto
    expect(await accounts.loginAccount(db, 'alvaro@feria.es', 'supersegura1')).not.toBeNull();
    expect(await accounts.loginAccount(db, 'alvaro@feria.es', 'mala')).toBeNull();

    // 2. Alta de socio y camarero
    const socio = await users.upsertByAdmin(db, '34612345678', 'Juan Pérez', 'socio', casetaId);
    const waiter = await users.upsertByAdmin(db, '34622222222', 'Pepe', 'mesero', casetaId);

    // 3. Invitación por link (sin teléfono: lo pondrá el invitado)
    const inv = await invitations.createInvitation(db, {
      socioId: socio.id,
      casetaId,
      guestLabel: 'Ana',
      accessMode: 'siempre',
      spendLimitCents: 3000, // 30€
      maxCompanions: 1,
    });
    const token = invitations.signInviteToken(inv.id);
    const fromToken = await invitations.invitationFromToken(db, token);
    expect(fromToken?.id).toBe(inv.id);
    expect(await invitations.invitationFromToken(db, 'token-falso')).toBeNull();

    // 4. La invitada se registra desde el link con su selfie
    const regGuest = await invitations.registerGuestFromLink(db, fromToken!, {
      name: 'Ana López',
      phone: '34698765432',
      photo: Buffer.from('selfie-fake'),
    });
    expect(regGuest.ok).toBe(true);
    if (!regGuest.ok) return;
    const ana = regGuest.guest;
    expect(ana.status).toBe('activo');
    expect(ana.caseta_id).toBe(casetaId);

    // 5. El camarero le carga una comanda → va a la cuenta del SOCIO
    const rebujito = await orders.addProduct(db, 'Rebujito', 1200, 'bebida', casetaId);
    const order = await orders.createOrder(db, ana, waiter, [{ productId: rebujito.id, qty: 2 }]);
    expect(order.ok).toBe(true);
    expect(order.socioName).toBe('Juan Pérez');

    // El socio también pide: a su propia cuenta
    const own = await orders.createOrder(db, (await users.findById(db, socio.id))!, waiter, [
      { productId: rebujito.id, qty: 1 },
    ]);
    expect(own.ok).toBe(true);

    // 6. Cuentas por socio: 3 rebujitos = 36€ pendientes de Juan
    const cuentas = await orders.cuentasPorSocio(db, casetaId);
    expect(cuentas).toHaveLength(1);
    expect(cuentas[0].pending_cents).toBe(3600);

    // 7. Límite de la invitada: 30€ - 24€ = 6€ → un rebujito más (12€) se rechaza
    const tooMuch = await orders.createOrder(db, (await users.findById(db, ana.id))!, waiter, [
      { productId: rebujito.id, qty: 1 },
    ]);
    expect(tooMuch.ok).toBe(false);
    expect(tooMuch.error).toContain('Excede el límite');

    // 8. Liquidación: el socio paga su cuenta
    const settled = await orders.settleSocio(db, casetaId, socio.id);
    expect(settled).toBe(3600);
    const after = await orders.cuentasPorSocio(db, casetaId);
    expect(after[0].pending_cents).toBe(0);
    expect(after[0].total_cents).toBe(3600); // el histórico se conserva
  });

  it('pedido enviado por el cliente: queda pendiente, el camarero lo sirve y computa en la cuenta', async () => {
    const reg = await accounts.registerCaseta(db, {
      casetaName: 'D', ownerName: 'Z', email: 'z@z.es', password: '12345678',
    });
    if (!reg.ok) throw new Error('registro falló');
    const c = reg.caseta.id;
    const socio = await users.upsertByAdmin(db, '34622333444', 'Socio D', 'socio', c);
    const waiter = await users.upsertByAdmin(db, '34622333445', 'Cam D', 'mesero', c);
    const inv = await invitations.createInvitation(db, { socioId: socio.id, casetaId: c, accessMode: 'siempre' });
    const r = await invitations.registerGuestFromLink(db, inv, {
      name: 'Guest D', phone: '34622333446', photo: Buffer.from('x'),
    });
    if (!r.ok) throw new Error('registro invitado falló');
    const beer = await orders.addProduct(db, 'Cerveza', 300, 'cerveza', c);

    // El cliente pide él mismo (waiter=null) → pendiente, con número de recogida del día
    const selfOrder = await orders.createOrder(db, r.guest, null, [{ productId: beer.id, qty: 3 }]);
    expect(selfOrder.ok).toBe(true);
    expect(selfOrder.pickupNumber).toBe(1);

    const pending = await orders.pendingOrders(db, c);
    expect(pending).toHaveLength(1);
    expect(pending[0].items).toContain('3× Cerveza');
    expect(pending[0].pickup_number).toBe(1);
    expect(pending[0].status).toBe('pendiente');

    // En la pantalla de TV aparece en preparación
    expect(await orders.tvBoard(db, c)).toEqual({ preparing: [1], ready: [] });

    // El camarero lo marca listo → pasa a la columna de listos y el cliente lo ve
    expect(await orders.readyOrder(db, c, pending[0].id, waiter.id)).toBe(true);
    expect(await orders.tvBoard(db, c)).toEqual({ preparing: [], ready: [1] });
    expect(await orders.orderTicket(db, pending[0].id, r.guest.id)).toEqual({
      status: 'lista',
      pickupNumber: 1,
    });
    // Marcar listo dos veces no vale
    expect(await orders.readyOrder(db, c, pending[0].id, waiter.id)).toBe(false);

    // El camarero lo entrega (sirve) → desaparece de la pantalla
    expect(await orders.serveOrder(db, c, pending[0].id, waiter.id)).toBe(true);
    expect(await orders.pendingOrders(db, c)).toHaveLength(0);
    expect(await orders.tvBoard(db, c)).toEqual({ preparing: [], ready: [] });
    // Servir dos veces no vale
    expect(await orders.serveOrder(db, c, pending[0].id, waiter.id)).toBe(false);

    // El siguiente pedido del día recibe el número 2
    const second = await orders.createOrder(db, r.guest, null, [{ productId: beer.id, qty: 1 }]);
    expect(second.ok).toBe(true);
    expect(second.pickupNumber).toBe(2);

    // Y computa en la cuenta del socio (3 + 1 cervezas)
    const cuentas = await orders.cuentasPorSocio(db, c);
    expect(cuentas.find((x) => x.socio_id === socio.id)?.pending_cents).toBe(1200);
  });

  it('no se puede registrar dos casetas con el mismo email', async () => {
    const input = { casetaName: 'A', ownerName: 'X', email: 'x@x.es', password: '12345678' };
    expect((await accounts.registerCaseta(db, input)).ok).toBe(true);
    const dup = await accounts.registerCaseta(db, { ...input, casetaName: 'B' });
    expect(dup.ok).toBe(false);
  });

  it('cancelar la invitación revoca el acceso del invitado registrado por link', async () => {
    const reg = await accounts.registerCaseta(db, {
      casetaName: 'C', ownerName: 'Y', email: 'y@y.es', password: '12345678',
    });
    if (!reg.ok) throw new Error('registro falló');
    const socio = await users.upsertByAdmin(db, '34611111111', 'Socio', 'socio', reg.caseta.id);
    const inv = await invitations.createInvitation(db, {
      socioId: socio.id, casetaId: reg.caseta.id, accessMode: 'siempre',
    });
    const r = await invitations.registerGuestFromLink(db, inv, {
      name: 'Bea', phone: '34600000001', photo: Buffer.from('x'),
    });
    if (!r.ok) throw new Error('registro invitada falló');
    expect((await invitations.checkAccess(db, r.guest)).ok).toBe(true);
    await invitations.cancel(db, inv.id);
    expect((await invitations.checkAccess(db, r.guest)).ok).toBe(false);
  });
});
