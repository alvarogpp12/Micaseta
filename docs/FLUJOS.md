# Flujos de WhatsApp

Todos los flujos usan la **WhatsApp Business Cloud API** (Meta) con mensajes
interactivos (botones y listas), plantillas aprobadas para iniciar conversación,
y recepción de imágenes (foto de rostro) y ubicación si hiciera falta.

## 1. Alta de socio (Admin → Socio)

```
Admin:  "Alta socio +52 1 55 1234 5678 Juan Pérez"
Bot →   valida y confirma al admin
Bot →   al socio (plantilla):
        "¡Bienvenido a Micaseta, Juan! 🎉 ¿Qué quieres hacer?"
        [ Invitar ]  [ Reporte ]  [ Cancelar ]
```

## 2. Socio invita (Socio → Invitado)

```
Socio:  toca [Invitar]
Bot:    "Comparte el contacto o escribe el número del invitado"
Socio:  +52 1 55 8765 4321
Bot:    "¿Restricciones para este invitado?"
        [ Acceso abierto ]  [ Personalizar ]
   └── Personalizar:
        1. ¿Qué días puede entrar? (lista: hoy / este viernes / fecha / siempre)
        2. ¿Monto máximo de consumo? (abierto / $500 / $1000 / otro)
        3. ¿Quién paga? (el invitado / a mi cuenta hasta el límite)
        4. ¿Cuántos acompañantes? (0-10)
Bot:    resumen → [ Confirmar ] [ Editar ]
Bot →   al invitado (plantilla):
        "Juan Pérez te invita a Micaseta 🎊 Condiciones: ...
         ¿Aceptas la invitación?"  [ Aceptar ] [ Rechazar ]
```

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
Sistema: muestra → foto del rostro, nombre, socio anfitrión,
         🟢/🔴 acceso hoy, acompañantes permitidos (ej. 3)
Puerta:  confirma ingreso y captura acompañantes reales (ej. entraron 2)
Sistema: registra check-in con hora; descuenta cupo si la invitación era de un solo uso
```

Casos borde: QR ya usado hoy (re-entrada sí/no según política), invitación
cancelada en tiempo real por el socio, invitado vetado por el admin.

## 5. Mesero (consumo y cobro)

```
Mesero:  escanea el QR del invitado en la mesa
Sistema: muestra → foto, nombre, "abierto" o saldo disponible ($350 de $500),
         categorías permitidas
Mesero:  arma la orden desde el catálogo (productos y precios del admin)
Sistema: valida contra restricciones (monto/categoría) antes de confirmar
Cobro:   [ Apple Pay / link de pago ]  [ Datáfono ]  [ A cuenta del socio ]
Sistema: registra consumo → actualiza saldo → alimenta reportes
```

Si el consumo excede el límite: el sistema lo rechaza y ofrece que el invitado
pague la diferencia por su cuenta, o pide autorización al socio por WhatsApp
en tiempo real ("Ana quiere gastar $200 extra, ¿autorizas?" [Sí] [No]).

## 6. Reportes

```
Socio:  toca [Reporte]
Bot:    "Hoy tus invitados llevan $1,840. ¿Qué quieres ver?"
        [ Hoy ] [ Esta semana ] [ Por invitado ] [ PDF ]

Admin:  "reporte" → totales del día/evento, por socio, por mesero,
        cortes de caja, top consumos, no-shows. Envío como mensaje + PDF/Excel.
```

## 7. Cancelar

- **Socio → Cancelar**: lista sus invitaciones activas y desactiva la elegida;
  el QR del invitado queda inválido al instante (la puerta/mesero lo ve 🔴).
- **Admin**: puede cancelar cualquier invitación, suspender socios, meseros o
  puertas con efecto inmediato.
