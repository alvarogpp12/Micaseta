// Service worker mínimo: requisito de instalabilidad de la PWA.
// Sin caché propia: la app siempre va a red (los datos son en vivo).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
