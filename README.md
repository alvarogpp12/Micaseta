# Micaseta 🎪

Gestión de **casetas privadas** (Feria de Sevilla): socios, invitados con QR,
comandas **a cuenta del socio** y las cuentas claras al final.

## Cómo funciona

1. Entras en la web → **Registrar mi caseta** (nombre, email, contraseña). Ya estás dentro del panel.
2. En el panel das de alta **socios**, el **equipo** (camareros y puerta) y la **carta** con precios.
3. Creas **invitaciones** con restricciones (solo un día, límite de consumo, acompañantes) y se comparten
   por WhatsApp con un link. El invitado abre el link, pone su nombre y una **selfie**, y recibe su **QR** al momento.
4. La **puerta** escanea el QR con su móvil: ve la foto y el semáforo verde/rojo.
5. El **camarero** escanea el QR, ve el límite disponible y **carga la comanda a la cuenta del socio**
   que invitó (los invitados no pagan).
6. En el panel ves el **consumo por socio** (propio + de sus invitados) y **liquidas** su cuenta cuando paga.

Seguridad: el QR es un token firmado y revocable (nunca lleva el teléfono en claro); cancelar una
invitación mata el QR del invitado y de sus acompañantes al instante; la verificación final siempre
es la **foto** que ve el personal al escanear.

## Desarrollo

```bash
npm install
cp .env.example .env
npm run dev        # http://localhost:3000 — Postgres embebido (PGlite), sin nada que instalar
npm test           # 20 tests
npm run typecheck
```

## Producción (Vercel + Supabase)

- El repo se conecta a Vercel (importar desde GitHub); `vercel.json` ya lo configura todo.
- Variables de entorno: `JWT_SECRET` (obligatoria), `BASE_URL` (la URL pública),
  `DATABASE_URL` (Postgres de Supabase, pooler). **El esquema se crea solo** en la primera conexión.
- WhatsApp es opcional: la plataforma funciona con links compartidos por wa.me. Cuando se quiera el
  bot (número del negocio con la Cloud API de Meta): `WA_PROVIDER=cloud`, `WHATSAPP_TOKEN`,
  `WHATSAPP_PHONE_ID`, y webhook en `/webhook` con el verify token `WHATSAPP_VERIFY_TOKEN`.

## Estructura

```
public/           páginas web (sin build): portada, /panel, /invitacion, /staff (escáner PWA)
src/http/         API: panel (papi), invitado público (gapi), staff (api), webhook WhatsApp
src/services/     dominio: casetas/cuentas, usuarios, invitaciones, QRs firmados, comandas
src/bot/          bot de WhatsApp (opcional, cuando se conecte la Cloud API)
src/providers/    canal WhatsApp: mock (dev), cloud (Meta), baileys (número personal, solo local)
src/db/           Postgres (pg en prod, PGlite embebido en dev/tests); esquema auto-aplicado
docs/             diseño: organigrama, flujos, arquitectura
```
