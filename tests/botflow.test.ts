import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, type DB } from '../src/db/index.js';
import { MockProvider } from '../src/providers/mock.js';
import { createRouter } from '../src/bot/router.js';
import { config } from '../src/config.js';
import * as users from '../src/services/users.js';
import * as invitations from '../src/services/invitations.js';

const ADMIN = '34649842031';
const SOCIO = '34612345678';
const GUEST = '34698765432';
const COMPANION = '34611111111';

let db: DB;
let wa: MockProvider;

beforeEach(() => {
  db = openDb(':memory:');
  config.adminPhones = [ADMIN];
  wa = new MockProvider();
  wa.onMessage(createRouter(db, wa));
});

const say = (from: string, text: string, imageBuffer?: Buffer) =>
  wa.simulateIncoming({ from, text, imageBuffer });

const lastOut = (phone: string) => {
  const outs = wa.getLog(phone).filter((e) => e.dir === 'out');
  return outs[outs.length - 1];
};

describe('flujo completo por WhatsApp', () => {
  it('alta de socio → invitación → registro con foto → QR → acompañantes', async () => {
    // 1. Admin da de alta al socio
    await say(ADMIN, `alta socio ${SOCIO} Juan Pérez`);
    expect(lastOut(ADMIN)!.text).toContain('dado de alta');
    expect(lastOut(SOCIO)!.text).toContain('Bienvenido');

    // 2. Socio invita con restricciones personalizadas
    await say(SOCIO, '1'); // invitar
    await say(SOCIO, '698765432'); // número del invitado (sin prefijo → +34)
    await say(SOCIO, '2'); // personalizar
    await say(SOCIO, '3'); // cualquier día
    await say(SOCIO, '50'); // límite 50€
    await say(SOCIO, '2'); // 2 acompañantes
    expect(lastOut(SOCIO)!.text).toContain('Resumen');
    await say(SOCIO, '1'); // confirmar
    expect(lastOut(SOCIO)!.text).toContain('Invitación enviada');
    expect(lastOut(GUEST)!.text).toContain('te invita');
    expect(lastOut(GUEST)!.text).toContain('50,00€');

    // 3. Invitado acepta y se registra
    await say(GUEST, '1');
    await say(GUEST, 'Ana López');
    expect(lastOut(GUEST)!.text).toContain('foto');
    await say(GUEST, '', Buffer.from('fake-jpeg'));
    const qrMsg = wa.getLog(GUEST).filter((e) => e.dir === 'out' && e.imageBase64);
    expect(qrMsg.length).toBe(1); // recibió su QR

    const guest = users.findByPhone(db, GUEST)!;
    expect(guest.status).toBe('activo');
    expect(invitations.checkAccess(db, guest).ok).toBe(true);
    expect(invitations.checkAccess(db, guest).remainingCents).toBe(5000);

    // 4. Acompañantes: reciben su propia invitación
    expect(lastOut(GUEST)!.text).toContain('acompañantes');
    await say(GUEST, '611111111');
    expect(lastOut(COMPANION)!.text).toContain('te invita');

    // 5. El socio cancela → cae también el acompañante
    await say(COMPANION, '1');
    await say(COMPANION, 'Bea');
    await say(COMPANION, '', Buffer.from('fake-jpeg-2'));
    await say(SOCIO, '3'); // cancelar
    await say(SOCIO, '1'); // la primera de la lista
    expect(lastOut(SOCIO)!.text).toContain('cancelada');
    expect(invitations.checkAccess(db, users.findByPhone(db, GUEST)!).ok).toBe(false);
    expect(invitations.checkAccess(db, users.findByPhone(db, COMPANION)!).ok).toBe(false);
  });

  it('desconocido sin invitación recibe mensaje informativo', async () => {
    await say('34600999888', 'hola');
    expect(lastOut('34600999888')!.text).toContain('solo con invitación');
  });

  it('mesero recibe link mágico de la PWA', async () => {
    await say(ADMIN, `alta mesero 622222222 Pepe`);
    expect(lastOut('34622222222')!.text).toContain('/staff/login?token=');
  });

  it('suspendido no puede operar', async () => {
    await say(ADMIN, `alta socio ${SOCIO} Juan`);
    await say(ADMIN, `baja ${SOCIO}`);
    await say(SOCIO, '1');
    expect(lastOut(SOCIO)!.text).toContain('suspendido');
  });
});
