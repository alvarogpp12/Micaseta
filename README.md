# Micaseta

Plataforma **híbrida** de gestión de club: los socios e invitados operan 100%
por **WhatsApp** (invitaciones, registro con foto, QR, reportes) y el personal
(Puerta y Mesero) usa una **PWA de escaneo** en su propio móvil. El cobro es
presencial con el datáfono del local: el sistema registra la comanda, no toca
el dinero.

## Cómo funciona

1. El **admin** da de alta socios, meseros y puertas por WhatsApp (`alta socio +34... Nombre`).
2. El **socio** recibe un menú (Invitar / Reporte / Cancelar) e invita amigos con
   restricciones: días, límite de consumo y acompañantes.
3. El **invitado** acepta, envía una selfie y recibe su **QR** (token firmado y
   revocable, nunca el teléfono en claro). Cada acompañante recibe su propia
   invitación y su propio QR.
4. La **puerta** escanea el QR y ve la foto + semáforo de acceso → check-in.
5. El **mesero** escanea el QR, ve el límite disponible, registra la comanda y
   la marca cobrada (tarjeta en el datáfono del local).
6. Los **reportes** de consumo por socio/invitado salen por WhatsApp.

## Arrancar en desarrollo

```bash
npm install
cp .env.example .env    # revisa ADMIN_PHONES (tu número) y JWT_SECRET
npm run dev
```

- Simulador de WhatsApp: **http://localhost:3000/dev/** — chatea con el bot
  desde cualquier número simulado (prueba cada rol sin tocar WhatsApp).
- PWA staff: **http://localhost:3000/staff/** — se entra con el link mágico
  que el bot envía a meseros y puertas al darlos de alta.

## Conectar tu número real de WhatsApp

En `.env` pon `WA_PROVIDER=baileys` y arranca. Aparecerá un QR en la terminal:
escanéalo desde el móvil en **WhatsApp → Dispositivos vinculados**. La sesión
queda guardada en `data/wa-session/`.

> ⚠️ Fase provisional: Baileys vincula un número personal como si fuera
> WhatsApp Web (no es la API oficial de Meta). Úsalo con volumen bajo. La capa
> `WhatsAppProvider` (`src/providers/`) permite migrar a la Cloud API oficial
> escribiendo solo otro adaptador.

## Comandos del admin (por WhatsApp)

```
alta socio +34612345678 Juan Pérez
alta mesero +34622222222 Pepe
alta puerta +34633333333 Paco
baja +34612345678
producto Cerveza 3,50 bebida
carta
reporte
```

## Tests y typecheck

```bash
npm test          # 17 tests: QRs revocables, reglas de acceso, límites, flujo completo del bot
npm run typecheck
```

## Estructura

```
src/
  bot/            flujos de conversación por rol (admin, socio, invitado, staff)
  providers/      capa WhatsApp: mock (simulador) y baileys (número real)
  services/       dominio: usuarios, invitaciones, QRs firmados, comandas, reportes
  http/           API + auth por link mágico para la PWA
  db/             SQLite (better-sqlite3) con esquema en schema.sql
public/
  staff/          PWA de escaneo (puerta y mesero)
  dev/            simulador de WhatsApp para desarrollo
docs/             organigrama, flujos y arquitectura
```

## Documentación de diseño

- [Organigrama y roles](docs/ORGANIGRAMA.md)
- [Flujos de WhatsApp](docs/FLUJOS.md)
- [Arquitectura técnica](docs/ARQUITECTURA.md)
