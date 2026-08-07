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
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-no-usar-en-produccion',
  adminPhones: (process.env.ADMIN_PHONES ?? '')
    .split(',')
    .map((p) => p.replace(/\D/g, ''))
    .filter(Boolean),
  defaultCountry: process.env.DEFAULT_COUNTRY ?? '34',
  waProvider: (process.env.WA_PROVIDER ?? 'mock') as 'mock' | 'baileys' | 'cloud',
  databaseUrl: process.env.DATABASE_URL || undefined,
  dataDir: 'data',
  // WhatsApp Business Cloud API (proveedor 'cloud')
  whatsappToken: process.env.WHATSAPP_TOKEN ?? '',
  whatsappPhoneId: process.env.WHATSAPP_PHONE_ID ?? '',
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? 'micaseta-verify',
};

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
