import { config } from './config.js';
import { openDb } from './db/index.js';
import { createRouter } from './bot/router.js';
import { createServer } from './http/server.js';
import { MockProvider } from './providers/mock.js';
import { BaileysProvider } from './providers/baileys.js';
import { CloudProvider } from './providers/cloud.js';
import type { WhatsAppProvider } from './providers/whatsapp.js';

/** Arranque como servidor clásico (desarrollo local o VPS). En Vercel se usa api/index.ts. */
async function main() {
  const db = await openDb(config.databaseUrl, config.databaseUrl ? undefined : 'data/pglite');

  let wa: WhatsAppProvider;
  if (config.waProvider === 'baileys') wa = new BaileysProvider();
  else if (config.waProvider === 'cloud') wa = new CloudProvider();
  else wa = new MockProvider();

  wa.onMessage(createRouter(db, wa));
  await wa.start();

  const app = await createServer({
    db,
    mock: config.waProvider === 'mock' ? (wa as MockProvider) : null,
    cloud: config.waProvider === 'cloud' ? (wa as CloudProvider) : null,
  });
  await app.listen({ port: config.port, host: '0.0.0.0' });

  console.log(`\n🏠 Micaseta arrancada`);
  console.log(`   Proveedor WhatsApp: ${config.waProvider}`);
  console.log(`   Base de datos: ${config.databaseUrl ? 'Postgres (DATABASE_URL)' : 'PGlite local (data/pglite)'}`);
  console.log(`   PWA staff:  ${config.baseUrl}/staff/`);
  if (config.waProvider === 'mock') console.log(`   Simulador:  ${config.baseUrl}/dev/`);
  if (config.adminPhones.length === 0) {
    console.warn('   ⚠️ ADMIN_PHONES vacío: nadie podrá dar altas. Configúralo en .env');
  }
}

main().catch((err) => {
  console.error('Error fatal al arrancar:', err);
  process.exit(1);
});
