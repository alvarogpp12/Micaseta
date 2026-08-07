# Flujos de WhatsApp

**Fase provisional:** el bot corre sobre el número personal +34 649 84 20 31
vía Baileys/whatsapp-web.js. Como no es la API oficial, no hay botones nativos:
los menús son **texto numerado** y el usuario responde con el número de la
opción ("1", "2", "3"). Cuando se migre a la Cloud API, los mismos flujos pasan
a botones y listas sin cambiar la lógica.

## 1. Alta de socio (Admin → Socio)

```
Admin:  "Alta socio +34 612 345 678 Juan Pérez"
Bot →   valida y confirma al admin
Bot →   al socio:
        "¡Bienvenido a Micaseta, Juan! 🎉 ¿Qué quieres hacer?
         1️⃣ Invitar
         2️⃣ Reporte
         3️⃣ Cancelar"
```

## 2. Socio invita (Socio → Invitado)

```
Socio:  responde "1" (Invitar)
Bot:    "Comparte el contacto o escribe el número del invitado"
Socio:  +34 698 765 432
Bot:    "¿Restricciones para este invitado?
         1️⃣ Acceso abierto
         2️⃣ Personalizar"
   └── Personalizar:
        1. ¿Qué días puede entrar? (hoy / este viernes / una fecha / siempre)
        2. ¿Límite de consumo? (abierto / 50€ / 100€ / otro)
        3. ¿Cuántos acompañantes puede traer? (0-10)
Bot:    resumen → "1️⃣ Confirmar  2️⃣ Editar"
Bot →   al invitado:
        "Juan Pérez te invita a Micaseta 🎊 Condiciones: ...
         ¿Aceptas la invitación?  1️⃣ Sí  2️⃣ No"
```

### Acompañantes

Los acompañantes **no entran colgados del QR del invitado principal**: cada uno
recibe su propia invitación por WhatsApp desde el sistema, se registra con su
foto y obtiene su propio QR. Al aceptar, el invitado principal (o el socio)
comparte los números de sus acompañantes y el bot les envía la invitación con
las mismas condiciones. Así la puerta identifica a cada persona por su foto.

## 3. Registro del invitado

```
Invitado: toca [Aceptar]
Bot:      "¿Cómo te llamas?"
Invitado: "Ana López"
Bot:      "Envíame una foto de tu rostro 🤳 (selfie, buena luz, sin lentes)"
Invitado: [foto]
Bot:      valida que haya un rostro (detección automática; si falla, la vuelve a pedir)
Bot:      "¡Listo, Ana! Este es tu acceso. Preséntalo en la puerta y al ordenar."
          [imagen QR personalizada]
```

- El QR codifica un **token firmado** que apunta al invitado (que a su vez está
  ligado a su número de teléfono). Nunca el teléfono en claro.
- El invitado puede escribir "QR" en cualquier momento para que se lo reenvíen.

## 4. Puerta (check-in)

```
Puerta:  escanea el QR (webapp de escaneo en su teléfono)
Sistema: muestra → foto del rostro, nombre, socio anfitrión, 🟢/🔴 acceso hoy
Puerta:  confirma el ingreso (cada acompañante trae su propio QR y
         se escanea igual, uno a uno)
Sistema: registra check-in con hora; descuenta cupo si la invitación era de un solo uso
```

Casos borde: QR ya usado hoy (re-entrada sí/no según política), invitación
cancelada en tiempo real por el socio, invitado vetado por el admin.

## 5. Mesero (comanda y cobro en el local)

```
Mesero:  escanea el QR del socio o invitado en la mesa
Sistema: muestra → foto, nombre, "abierto" o límite disponible (35€ de 50€),
         categorías permitidas
Mesero:  arma la comanda desde el catálogo (productos y precios del admin)
Sistema: valida contra restricciones (límite/categoría) antes de confirmar
Cobro:   con tarjeta en el datáfono del local, al momento
Mesero:  marca "Cobrado ✅" en la comanda
Sistema: registra consumo → actualiza límite → alimenta reportes
```

**El sistema no procesa pagos**: solo registra la comanda, el importe y que se
cobró. El dinero pasa por el datáfono del bar, como siempre.

Si la comanda excede el límite del invitado: el sistema lo avisa antes de
confirmar y el mesero decide (reduce la comanda, o el socio autoriza por
WhatsApp en tiempo real: "Ana quiere gastar 20€ extra, ¿autorizas? 1️⃣ Sí 2️⃣ No").

## 6. Reportes

```
Socio:  responde "2" (Reporte)
Bot:    "Hoy tus invitados llevan 184€. ¿Qué quieres ver?
         1️⃣ Hoy  2️⃣ Esta semana  3️⃣ Por invitado  4️⃣ PDF"

Admin:  "reporte" → totales del día/evento, por socio, por mesero,
        cierres de día, top consumos, no-shows. Envío como mensaje + PDF/Excel.
```

## 7. Cancelar

- **Socio → Cancelar**: lista sus invitaciones activas y desactiva la elegida;
  el QR del invitado queda inválido al instante (la puerta/mesero lo ve 🔴).
- **Admin**: puede cancelar cualquier invitación, suspender socios, meseros o
  puertas con efecto inmediato.
