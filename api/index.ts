/**
 * Punto de entrada serverless para Vercel: todas las rutas (webhook de
 * WhatsApp, API del staff, PWA y estáticos) pasan por esta función.
 * La app Fastify y la conexión a Postgres se reutilizan entre invocaciones
 * calientes de la misma instancia.
 */
import { config } from '../src/config.js';
import { openDb } from '../src/db/index.js';
import { createRouter } from '../src/bot/router.js';
import { createServer } from '../src/http/server.js';
import { CloudProvider } from '../src/providers/cloud.js';

let ready: Promise<any> | null = null;

async function build() {
  const db = await openDb(config.databaseUrl);
  const cloud = new CloudProvider();
  cloud.onMessage(createRouter(db, cloud));
  await cloud.start();
  const app = await createServer({ db, cloud });
  await app.ready();
  return app;
}

export default async function handler(req: any, res: any) {
  ready ??= build();
  const app = await ready;
  app.server.emit('request', req, res);
}
