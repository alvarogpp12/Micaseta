import type { DB } from '../db/index.js';
import { one } from '../db/index.js';
import * as users from './users.js';
import * as invitations from './invitations.js';
import { signQrToken } from './qr.js';

/**
 * Caseta de demostración: permite probar el escáner como camarero o puerta
 * sin dar nada de alta. Se crea una sola vez (idempotente por teléfono).
 */
const DEMO_PHONES = {
  camarero: '34600000101',
  puerta: '34600000102',
  socio: '34600000103',
  invitada: '34600000104',
  invitado2: '34600000105',
} as const;

/** Carta típica de caseta/restaurante sevillano. Precios en céntimos. */
export const SEVILLA_MENU: { name: string; price_cents: number; category: string }[] = [
  // Cervezas y vinos
  { name: 'Caña Cruzcampo', price_cents: 250, category: 'cerveza' },
  { name: 'Botellín Cruzcampo', price_cents: 250, category: 'cerveza' },
  { name: 'Cerveza sin alcohol', price_cents: 250, category: 'cerveza' },
  { name: 'Radler limón', price_cents: 300, category: 'cerveza' },
  { name: 'Tinto de verano', price_cents: 350, category: 'cerveza' },
  { name: 'Rebujito (copa)', price_cents: 400, category: 'vino' },
  { name: 'Rebujito (jarra)', price_cents: 1200, category: 'vino' },
  { name: 'Manzanilla (copa)', price_cents: 350, category: 'vino' },
  { name: 'Fino (copa)', price_cents: 350, category: 'vino' },
  { name: 'Vino tinto Rioja (copa)', price_cents: 350, category: 'vino' },
  { name: 'Vino blanco Barbadillo (copa)', price_cents: 350, category: 'vino' },
  // Refrescos
  { name: 'Agua mineral', price_cents: 200, category: 'refresco' },
  { name: 'Agua con gas', price_cents: 250, category: 'refresco' },
  { name: 'Coca-Cola', price_cents: 300, category: 'refresco' },
  { name: 'Coca-Cola Zero', price_cents: 300, category: 'refresco' },
  { name: 'Fanta naranja', price_cents: 300, category: 'refresco' },
  { name: 'Fanta limón', price_cents: 300, category: 'refresco' },
  { name: 'Sprite', price_cents: 300, category: 'refresco' },
  { name: 'Aquarius', price_cents: 300, category: 'refresco' },
  { name: 'Nestea', price_cents: 300, category: 'refresco' },
  { name: 'Tónica Schweppes', price_cents: 300, category: 'refresco' },
  { name: 'Zumo de naranja', price_cents: 300, category: 'refresco' },
  { name: 'Red Bull', price_cents: 400, category: 'refresco' },
  // Copas
  { name: 'Whisky Ballantine’s', price_cents: 900, category: 'copa' },
  { name: 'Whisky Johnnie Walker', price_cents: 900, category: 'copa' },
  { name: 'Whisky Jack Daniel’s', price_cents: 1000, category: 'copa' },
  { name: 'Whisky Chivas Regal 12', price_cents: 1200, category: 'copa' },
  { name: 'Ron Barceló', price_cents: 900, category: 'copa' },
  { name: 'Ron Brugal', price_cents: 900, category: 'copa' },
  { name: 'Ron Havana Club 7', price_cents: 1000, category: 'copa' },
  { name: 'Ginebra Beefeater', price_cents: 900, category: 'copa' },
  { name: 'Ginebra Tanqueray', price_cents: 1000, category: 'copa' },
  { name: 'Ginebra Bombay Sapphire', price_cents: 1000, category: 'copa' },
  { name: 'Ginebra Puerto de Indias fresa', price_cents: 1000, category: 'copa' },
  { name: 'Ginebra Hendrick’s', price_cents: 1200, category: 'copa' },
  { name: 'Vodka Absolut', price_cents: 900, category: 'copa' },
  { name: 'Vodka Smirnoff', price_cents: 900, category: 'copa' },
  { name: 'Vodka Grey Goose', price_cents: 1200, category: 'copa' },
  { name: 'Licor 43', price_cents: 800, category: 'copa' },
  { name: 'Baileys', price_cents: 800, category: 'copa' },
  { name: 'Chupito de tequila', price_cents: 300, category: 'copa' },
  { name: 'Chupito de hierbas', price_cents: 300, category: 'copa' },
  // Botellas
  { name: 'Botella Ballantine’s', price_cents: 7000, category: 'botella' },
  { name: 'Botella Beefeater', price_cents: 7500, category: 'botella' },
  { name: 'Botella Absolut', price_cents: 7500, category: 'botella' },
  { name: 'Botella Ron Barceló', price_cents: 7500, category: 'botella' },
  { name: 'Botella Puerto de Indias', price_cents: 8000, category: 'botella' },
  { name: 'Botella Moët & Chandon', price_cents: 9000, category: 'botella' },
  // Comida
  { name: 'Jamón ibérico de bellota (ración)', price_cents: 2400, category: 'comida' },
  { name: 'Queso viejo en aceite', price_cents: 1200, category: 'comida' },
  { name: 'Gambas blancas de Huelva', price_cents: 1800, category: 'comida' },
  { name: 'Tortilla de patatas', price_cents: 800, category: 'comida' },
  { name: 'Croquetas caseras (6 uds)', price_cents: 900, category: 'comida' },
  { name: 'Salmorejo cordobés', price_cents: 600, category: 'comida' },
  { name: 'Ensaladilla rusa', price_cents: 700, category: 'comida' },
  { name: 'Pescaíto frito (surtido)', price_cents: 1500, category: 'comida' },
  { name: 'Cazón en adobo', price_cents: 1000, category: 'comida' },
  { name: 'Tortillitas de camarones', price_cents: 1000, category: 'comida' },
  { name: 'Puntillitas fritas', price_cents: 1000, category: 'comida' },
  { name: 'Chocos fritos', price_cents: 1200, category: 'comida' },
  { name: 'Solomillo al whisky', price_cents: 1400, category: 'comida' },
  { name: 'Carrillada ibérica', price_cents: 1300, category: 'comida' },
  { name: 'Montadito de pringá', price_cents: 350, category: 'comida' },
  { name: 'Serranito de lomo', price_cents: 600, category: 'comida' },
  { name: 'Flamenquín cordobés', price_cents: 900, category: 'comida' },
  { name: 'Pimientos fritos', price_cents: 600, category: 'comida' },
  { name: 'Patatas bravas', price_cents: 600, category: 'comida' },
  { name: 'Picos y regañás', price_cents: 150, category: 'comida' },
];

/** Crea (una vez) la caseta demo con carta completa, socio e invitados. */
export async function ensureDemoCaseta(db: DB): Promise<number> {
  const existing = await users.findByPhone(db, DEMO_PHONES.camarero);
  if (existing?.caseta_id) return existing.caseta_id;

  const caseta = (await one<{ id: number }>(db, 'INSERT INTO casetas (name) VALUES ($1) RETURNING id', [
    'Caseta Demo · Er Compás',
  ]))!;
  const c = caseta.id;

  await users.upsertByAdmin(db, DEMO_PHONES.camarero, 'Camarero de prueba', 'mesero', c);
  await users.upsertByAdmin(db, DEMO_PHONES.puerta, 'Puerta de prueba', 'puerta', c);
  const socio = await users.upsertByAdmin(db, DEMO_PHONES.socio, 'Juan Pérez', 'socio', c);

  for (const p of SEVILLA_MENU) {
    await db.query('INSERT INTO products (caseta_id, name, price_cents, category) VALUES ($1, $2, $3, $4)', [
      c,
      p.name,
      p.price_cents,
      p.category,
    ]);
  }

  // Invitada con límite de 50€
  const inv1 = await invitations.createInvitation(db, {
    socioId: socio.id,
    casetaId: c,
    guestPhone: DEMO_PHONES.invitada,
    guestLabel: 'Ana López',
    accessMode: 'siempre',
    spendLimitCents: 5000,
  });
  const ana = await users.createUser(db, {
    phone: DEMO_PHONES.invitada,
    name: 'Ana López',
    role: 'invitado',
    status: 'activo',
    casetaId: c,
  });
  await invitations.accept(db, inv1.id, ana.id);

  // Invitado sin límite
  const inv2 = await invitations.createInvitation(db, {
    socioId: socio.id,
    casetaId: c,
    guestPhone: DEMO_PHONES.invitado2,
    guestLabel: 'Curro Romero',
    accessMode: 'siempre',
    spendLimitCents: null,
  });
  const curro = await users.createUser(db, {
    phone: DEMO_PHONES.invitado2,
    name: 'Curro Romero',
    role: 'invitado',
    status: 'activo',
    casetaId: c,
  });
  await invitations.accept(db, inv2.id, curro.id);

  return c;
}

export function demoStaffPhone(rol: 'camarero' | 'puerta'): string {
  return rol === 'puerta' ? DEMO_PHONES.puerta : DEMO_PHONES.camarero;
}

/** Personas de prueba para escanear en la demo (botones en el escáner). */
export async function demoTokens(db: DB, casetaId: number): Promise<{ label: string; token: string }[]> {
  const demoCasetaId = (await users.findByPhone(db, DEMO_PHONES.camarero))?.caseta_id;
  if (!demoCasetaId || demoCasetaId !== casetaId) return [];
  const out: { label: string; token: string }[] = [];
  const people: { phone: string; label: string }[] = [
    { phone: DEMO_PHONES.invitada, label: 'Ana López · invitada (límite 50 €)' },
    { phone: DEMO_PHONES.invitado2, label: 'Curro Romero · invitado (sin límite)' },
    { phone: DEMO_PHONES.socio, label: 'Juan Pérez · socio' },
  ];
  for (const p of people) {
    const user = await users.findByPhone(db, p.phone);
    if (user) out.push({ label: p.label, token: signQrToken(user) });
  }
  return out;
}
