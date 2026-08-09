import fs from 'node:fs';
import path from 'node:path';

// Carga .env sin dependencia externa
const envFile = path.resolve('.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
  baseUrlConfigured: !!process.env.BASE_URL,
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-no-usar-en-produccion',
  adminPhones: (process.env.ADMIN_PHONES ?? '')
    .split(',')
    .map((p) => p.replace(/\D/g, ''))
    .filter(Boolean),
  defaultCountry: process.env.DEFAULT_COUNTRY ?? '34',
  waProvider: (process.env.WA_PROVIDER ?? 'mock') as 'mock' | 'baileys' | 'cloud',
  databaseUrl: process.env.DATABASE_URL || undefined,
  dataDir: 'data',
  // Login con Google (One Tap / botón). Sin client id, el botón no se muestra.
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  // Correo transaccional (Resend). Sin API key, no se envían correos.
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  emailFrom: process.env.EMAIL_FROM ?? 'Micaseta <onboarding@resend.dev>',
  // Modo demo (/demo/camarero, /demo/puerta): crea una caseta de prueba en la
  // base de datos. Activado por defecto solo sin Postgres real, para no
  // ensuciar producción; forzable con DEMO_MODE=1/0.
  demoEnabled: process.env.DEMO_MODE ? process.env.DEMO_MODE === '1' : !process.env.DATABASE_URL,
  // Pases de Apple Wallet (.pkpass). Requiere certificado "Pass Type ID" de
  // una cuenta de Apple Developer; sin configurar, el botón no se muestra.
  wallet: {
    passTypeId: process.env.WALLET_PASS_TYPE_ID ?? '',
    teamId: process.env.WALLET_TEAM_ID ?? '',
    certPem: process.env.WALLET_CERT_PEM ?? '',
    keyPem: process.env.WALLET_KEY_PEM ?? '',
    keyPassword: process.env.WALLET_KEY_PASSWORD ?? '',
    wwdrPem: process.env.WALLET_WWDR_PEM ?? '',
  },
  // WhatsApp Business Cloud API (proveedor 'cloud')
  whatsappToken: process.env.WHATSAPP_TOKEN ?? '',
  whatsappPhoneId: process.env.WHATSAPP_PHONE_ID ?? '',
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? 'micaseta-verify',
};

if (process.env.VERCEL && !process.env.JWT_SECRET) {
  console.error('⚠️ JWT_SECRET sin configurar en producción: los QR y sesiones usan el secreto de desarrollo.');
}
if (process.env.VERCEL && !process.env.DATABASE_URL) {
  console.error('⚠️ DATABASE_URL sin configurar: la base de datos es efímera y se pierde en cada arranque.');
}

/**
 * Normaliza un teléfono a dígitos con prefijo de país (formato JID de WhatsApp).
 * "649 84 20 31" → "34649842031"; "+34 649842031" → "34649842031".
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9) return config.defaultCountry + digits;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

export function formatPhone(phone: string): string {
  return '+' + phone;
}

/**
 * URL pública real. Si BASE_URL no está configurada, se deduce de la petición
 * (Vercel y cualquier proxy ponen x-forwarded-proto/host) — así los links de
 * staff e invitaciones nunca salen con localhost.
 */
export function requestBaseUrl(req: { headers: Record<string, any> }): string {
  if (config.baseUrlConfigured) return config.baseUrl;
  const h = req.headers;
  const first = (v: any) => (Array.isArray(v) ? v[0] : v)?.split(',')[0]?.trim();
  const host = first(h['x-forwarded-host']) ?? first(h['host']);
  if (!host) return config.baseUrl;
  const proto = first(h['x-forwarded-proto']) ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
