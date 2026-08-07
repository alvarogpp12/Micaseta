import { config } from './config.js';
import { openDb } from './db/index.js';
import { createRouter } from './bot/router.js';
import { createServer } from './http/server.js';
import { MockProvider } from './providers/mock.js';
import { BaileysProvider } from './providers/baileys.js';
import type { WhatsAppProvider } from './providers/whatsapp.js';

async function main() {
  const db = openDb(config.dbPath);

  const isMock = config.waProvider === 'mock';
  const wa: WhatsAppProvider = isMock ? new MockProvider() : new BaileysProvider();

  wa.onMessage(createRouter(db, wa));
  await wa.start();

  const app = await createServer(db, isMock ? (wa as MockProvider) : null);
  await app.listen({ port: config.port, host: '0.0.0.0' });

  console.log(`\n🏠 Micaseta arrancada`);
  console.log(`   Proveedor WhatsApp: ${config.waProvider}`);
  console.log(`   PWA staff:  ${config.baseUrl}/staff/`);
  if (isMock) console.log(`   Simulador:  ${config.baseUrl}/dev/`);
  if (config.adminPhones.length === 0) {
    console.warn('   ⚠️ ADMIN_PHONES vacío: nadie podrá dar altas. Configúralo en .env');
  }
}

main().catch((err) => {
  console.error('Error fatal al arrancar:', err);
  process.exit(1);
});
