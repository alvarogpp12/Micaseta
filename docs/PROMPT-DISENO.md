# Prompt de diseño · Micaseta (con Liquid Glass)

> Documento de encargo: lo que se le pide a quien diseñe la app. No es
> documentación de lo que hay; es el listón. Donde contradiga al código,
> gana este documento, salvo en lo que el propio documento marca como
> "así está y así se queda".

---

Eres un diseñador de producto senior con la sensibilidad de Apple: Human
Interface Guidelines, iOS 26, Liquid Glass usado con criterio. Diseñas
herramientas que se usan de pie, de noche, con una mano, en un albero con polvo
y con la otra mano sujetando un rebujito. No escaparates.

Tu referencia de calidad no es una app de gestión: es **Apple Wallet** para el
pase (cómo entra, cómo se pliega, cómo se ve que hoy vale), **Partiful** para
invitar (dos toques y la lista se lee como personas, no como filas) y el
**escáner de entradas de Apple Store** para la operación: cámara a pantalla
completa, veredicto en medio segundo, cero ornamento. Nunca por debajo de eso.

## Qué es el producto

Micaseta es la plataforma de las **casetas privadas de la Feria de Sevilla**.
Una caseta es un club de socios con una puerta, una barra y una cuenta abierta
toda la semana. Micaseta sustituye la lista en papel de la puerta y la libreta
de la barra.

Cinco personas, cinco mundos, una sola app que resuelve quién eres por el
enlace con el que entras:

- **El dueño** da de alta socios, equipo y carta desde el panel, y ve la caja.
- **El socio** tiene su pase, pide a su cuenta e invita a quien quiera.
- **El invitado** abre un enlace de WhatsApp, pone su nombre y una selfie, y
  recibe su pase al momento.
- **La puerta** escanea el pase, ve la foto y el semáforo, y deja pasar o no.
- **El camarero** escanea el pase, ve el límite y carga la comanda.

Dos cosas lo diferencian y tienen que verse en el diseño:

1. **A cuenta del socio.** El invitado no paga, no saca tarjeta, no firma nada:
   cada consumición cae automáticamente en la cuenta del socio que lo invitó y
   se liquida al final de la feria. No es un paso que hace nadie ni un aviso que
   haya que cerrar: es una línea pequeña bajo cada pedido ("a cuenta de Marta
   Ruiz") y un recuento vivo en su pase ("te quedan 18 €" · "12 consumiciones").
   El invitado tiene que entender que no debe dinero **sin que nadie se lo
   explique**.
2. **La barrera humana.** La app nunca deja pasar sola, nunca cobra sola y
   nunca cierra una cuenta sola. Prepara el veredicto y lo pone delante de una
   persona: la puerta pulsa "Dejar pasar", el camarero pulsa "Cargar a su
   cuenta", el dueño pulsa "Liquidar". Esas tres decisiones tienen que leerse
   como decisiones en la interfaz: peso, tamaño, aire alrededor y confirmación
   de lo que acaba de pasar. Todo lo demás puede ser un toque; esas tres, no.

Usuarios: gente que no ha leído un manual en su vida, de 20 a 80 años, en
sesiones de cinco horas y con mala cobertura. Casi todo ocurre en **móvil**; el
panel del dueño es lo único que se mira también en escritorio. Toda la interfaz
en español de España.

Cinco roles. No se distinguen por color de marca ni por temas distintos: se
distinguen por **qué pestañas existen** y por el kicker del pase ("Socio
titular", "Invitación con consumo", "Invitación · solo entrada"). El color en
esta app significa otra cosa y no está disponible para etiquetar personas.

## Material adjunto y qué manda

- `app/tailwind.config.js` es el sistema de tokens ("El pase", v3) y **manda
  sobre todo lo demás**: color, radios, sombras, tipografía.
- `app/src/ui.tsx` y `app/src/components.tsx` son los primitivos reales ya
  construidos (botón, módulo, fila, dock, pase, escáner, veredicto, carta,
  cápsula del turno). Ábrelos y parte de ahí: son la maqueta viva, no los
  reinterpretes desde cero.
- `app/src/views/client.tsx`, `owner.tsx`, `staff.tsx` son las pantallas de hoy
  con sus estados reales. Ahí está el inventario de verdad.
- `app/src/index.css` tiene las tres firmas de casa: la veladura ambiental
  (`.amb`), la banda del cordón (`.banda`) y el kicker ensanchado (`.kick`).
- `public/index.html` es la landing pública actual (fondo carbón).
- `docs/ORGANIGRAMA.md` dice quién ve qué y con qué permisos. Es la ley de
  navegación: si tu diseño enseña a alguien algo que no es suyo, está mal.
- `docs/FLUJOS.md` y `docs/ARQUITECTURA.md` cuentan cómo está montado el
  reparto por WhatsApp y el backend. Donde contradigan a los tokens, ganan los
  tokens.

## Liquid Glass: dónde sí y dónde no

El cristal no es la piel de la app: es **la capa de controles que flota sobre el
contenido**. Tres recetas, ninguna más.

**Receta 1 · Control flotante sobre contenido claro** (dock de pestañas, barra
superior al hacer scroll, CTA del carrito, cabecera de la landing).
`background: rgba(255,255,255,.62)`, `backdrop-filter: blur(24px) saturate(180%)`,
filete interior `inset 0 0 0 .5px rgba(20,22,29,.07)`, sombra
`0 8px 24px rgba(20,22,29,.05)`. Debajo tiene que pasar contenido de verdad: si
no pasa nada, es blanco sobre blanco y no es cristal, es niebla.

**Receta 2 · Control sobre cámara o foto** (overlay del escáner, cápsula del
turno, controles sobre la selfie). `background: rgba(12,14,19,.55)`,
`backdrop-filter: blur(30px) saturate(140%)`, filete
`inset 0 0 0 .5px rgba(255,255,255,.14)`, texto hielo. Aquí el cristal se gana
el sueldo: el vídeo vive detrás y el control se lee sin taparlo.

**Receta 3 · Hoja que sube** (sheets de invitar, compartir, detalle de
invitado). Fondo opaco `#FFFFFF` con **cabecera** de cristal receta 1 al hacer
scroll interno, y velo `rgba(12,14,19,.4)` con `blur(2px)` detrás. La hoja es
contenido: no se lee a través de ella.

Prohibiciones, sin excepción:

- **El pase nunca es cristal.** Es papel: `#F7F7F4`, opaco, con su banda, su
  troquel y su sombra. Es el objeto que la gente enseña a un desconocido en una
  puerta a oscuras. Un QR translúcido es un QR que no escanea.
- **El veredicto de puerta nunca es cristal.** Verde o rojo, plano, a pantalla
  completa, legible a un metro y a pleno sol.
- **La carta y las listas nunca son cristal.** Son contenido: blanco con
  hairline.
- Nunca cristal dentro de cristal. Nunca cristal sobre fondo liso sin nada
  detrás. Nada de `refract`, `lens`, orbes, halos de color, rejillas de fondo ni
  bordes que brillan.
- El cristal no lleva color de marca. Es neutro y deja que el cobalto lo pongan
  los botones.

## Lo que tienes que diseñar

Móvil **390 × 844** salvo donde se indique. Cada estado en su artboard, con
nombre propio.

### 1. El cliente (socio e invitado)

- `Pase socio 390` · `Pase invitado con barra 390` · `Pase invitado solo
  entrada 390`: el billete a tamaño completo, QR grande, "Válido hoy" en verde
  o "Sin acceso" en rojo.
- `Inicio fuera 390`: aún no ha entrado en la caseta. El pase manda.
- `Inicio dentro 390`: el pase se pliega a chip (QR pequeño, "Dentro · 22:14") y
  sube; debajo, pedir y lo de esta noche.
- `Pedir carta 390`: categorías, filas con precio, stepper de cantidad.
- `Pedir carrito 390`: la barra de envío con "3 · 14,50 €".
- `Turno en preparación 390` y `Turno listo 390`: la cápsula flotante con el
  número, y el aviso de recoger en barra.
- `Mi cuenta socio 390`: pendiente de pagar, desglose por persona.
- `Mi cuenta invitado 390`: lo consumido y, enorme, "tú no pagas nada".
- `Invitar vacío 390` · `Invitar lista 390` · `Invitar crear 390` (días de
  feria, límite de consumo, acompañantes) · `Invitar ficha 390` (un invitado,
  su estado, cancelar) · `Invitar compartir 390` (la hoja de WhatsApp).
- `Registro invitado · condiciones 390` y `Registro invitado · selfie 390`: lo
  primero que ve alguien que no conoce la app. Cámara frontal, encuadre, repetir.
- `Sin cobertura 390`: el pase sigue funcionando; todo lo demás espera.

### 2. La operación

- `Puerta escáner 390`: cámara a pantalla completa, controles en cristal
  receta 2, y el modo teclear código para cuando la cámara falle.
- `Puerta veredicto verde 390` y `Puerta veredicto rojo 390`: foto grande,
  nombre, quién invita, y el motivo del rechazo cuando lo hay.
- `Puerta últimas entradas 390`.
- `Camarero escáner 390` · `Camarero ficha 390` (quién es, límite disponible,
  a cuenta de quién) · `Camarero comanda 390` · `Camarero cola 390` (pendientes
  → listo → entregado).
- `Camarero sin límite 390`: el invitado ha agotado su consumo. Es un no, y se
  dice sin culpa y con salida ("puede pagarlo aparte").

### 3. El panel del dueño

Móvil **390 × 844** y escritorio **1440 × 900**.

- `Panel resumen 1440` y `Panel resumen 390`: dentro ahora, caja de hoy,
  cuentas por socio.
- `Panel socios 1440` · `Panel equipo 1440` · `Panel días de feria 1440`.
- `Panel liquidar 390`: la barrera humana del dueño, con el importe grande y la
  confirmación de que esa cuenta queda a cero.

### 4. Público

- `Landing 1440` y `Landing 390`: hero centrado, claim a dos líneas, y debajo,
  visible sin hacer scroll, **el pase animado**: se monta solo (banda, nombre,
  troquel, QR) y se pliega a chip, en bucle. Navegación en cristal receta 1.
- `Entrar 390`: card centrada al estilo de ChatGPT, con nuestro lenguaje.
- `Registrar caseta 390`: nombre, email, contraseña. Tres campos y dentro.

### 5. Tokens y movimiento

- `Tokens`: color, tipografía, radios, sombras y las tres recetas de cristal con
  sus valores.
- `Movimiento`: la tabla de la sección siguiente, dibujada.

## Las animaciones son parte del diseño, no un adorno

Entrégalas como especificación (duración, curva, retardo, propiedad), además de
mostrarlas.

| Qué | Propiedad | Duración | Curva | Retardo |
|---|---|---|---|---|
| Entrada de módulo o tarjeta | opacidad + 8 px arriba | 250 ms | `cubic-bezier(.22,1,.36,1)` | — |
| Filas de lista y de carta | opacidad + 10 px arriba | 220 ms | `ease-out` | 35 ms escalonado, tope 350 ms |
| Cambio de pestaña | opacidad + 14 px | 180 ms | `ease-out` | — |
| El pase al entrar en pantalla | opacidad + 16 px + `scale .98→1` | 320 ms | `cubic-bezier(.22,1,.36,1)` | — |
| El pase plegándose a chip | altura + opacidad cruzada | 380 ms | `cubic-bezier(.32,.72,0,1)` | — |
| Tilt del pase con el dedo | `rotateX/Y` máx. 10°/14° | muelle 220/22 | — | — |
| Cápsula del turno al aparecer | opacidad + 12 px abajo | 300 ms | `cubic-bezier(.22,1,.36,1)` | — |
| Punto del turno "en preparación" | opacidad .45→1 | 1,1 s alterna | `ease` | bucle |
| Turno listo | color de fondo + vibración 200/100/200 | 240 ms | `ease-out` | — |
| Veredicto de puerta | `scale .94→1` + opacidad | 260 ms | `cubic-bezier(.22,1,.36,1)` | — |
| Importes que cambian | conteo por muelle | 80/20 | — | — |
| Hoja que sube | `translateY` | 380 ms | `cubic-bezier(.32,.72,0,1)` | — |
| Velo de la hoja | opacidad 0→.4 | 280 ms | `ease-out` | — |
| Skeleton de lista | shimmer recorriendo | 1,9 s | `linear` | bucle |
| Botón primario al pulsar | `scale 1→.97` | 120 ms | `ease-out` | — |
| Cristal que aparece al hacer scroll | `backdrop-filter` + opacidad | 200 ms | `ease-out` | — |

Con `prefers-reduced-motion`: todo aparece de golpe, el shimmer se queda quieto,
el punto del turno deja de latir (pero sigue ahí, porque el estado nunca puede
depender del movimiento) y el tilt del pase se desactiva.

La landing: el pase se escribe solo —banda, nombre, caseta, troquel, QR—, se
pliega a chip, aparece "Dentro · 22:14" y vuelve a empezar. Sin barra de estado
ni teclado falsos.

## Reglas que no se negocian

- **Cristal solo en la capa de controles**, con las tres recetas de arriba. El
  contenido es opaco con filete de un píxel.
- **Sentence case en toda la interfaz.** Primera en mayúscula y ya está: "Mi
  cuenta", "Dejar pasar", "Pendiente de pagar". Nada de VERSALITAS ni de Títulos
  Con Todo En Mayúscula. Excepciones: nombres propios y el wordmark
  `micaseta.`, que va siempre en minúscula.
- **El color significa una cosa cada uno y solo una.** Cobalto `#3D5AF5`: la
  acción. Verde `#0FA36B`: el veredicto y el acceso. Rojo `#FF5D68`: el rechazo.
  Papel `#F7F7F4`: solo el pase y su chip. Nada más lleva color: ni las
  categorías, ni los roles, ni los iconos decorativos, porque no los hay.
- **El estado nunca solo por color**: verde siempre con su palabra ("Puede
  pasar") y su icono.
- **Píldora solo si es un botón.** Estados y metadatos en texto plano, por peso
  y color.
- **Archivo variable para todo**, con el kicker ensanchado (`font-stretch:125%`)
  como sello de casa. Cifras siempre en `tabular-nums`: importes, turnos, horas,
  límites.
- **Densidad de mano, no de consola**: cuerpo de 15 a 17 px, títulos de 21 a 34,
  botones de 52 px y acciones de barra de 56. El objetivo táctil mínimo es 44 px
  y en la puerta y la barra, 56.
- **Legible a pleno sol y a oscuras**: contraste AA en todo, AAA en el pase y en
  el veredicto. Nada importante en gris claro.
- **Un icono solo si nombra algo.** Cada icono lleva su palabra debajo o al
  lado. Sin emoji en la interfaz.
- **Nada de filler**: ni datos inventados de relleno, ni secciones vacías con
  ilustración, ni "¡Bienvenido!" sin información. Nombres, casetas, productos y
  precios de ejemplo verosímiles de la Feria de Sevilla, en español: rebujito,
  manzanilla, montadito, "Caseta Los Arcos", "Viernes de feria".
- **Salida siempre visible.** Nadie se queda atrapado en una pantalla: botón
  "Salir" o "‹ Inicio" explícito, con su icono.

## Cómo entregarlo

Artboards con nombre propio (`Pase socio 390`, `Puerta veredicto rojo 390`,
`Panel resumen 1440`…), el artboard de tokens y el de movimiento. Explica en
una línea cada decisión que se aparte del código actual y por qué. Si algo del
sistema te parece un error, dilo antes de cambiarlo, no lo cambies por tu
cuenta.

---

## Lo que me parece un error del sistema actual (dicho antes de tocar nada)

1. **La landing es carbón y la app es blanca.** Son dos marcas. Quien viene de
   la landing y entra, cambia de producto. Propongo llevar la landing al blanco
   de la app y dejar el carbón solo para el pase animado del hero, que es donde
   el contraste trabaja. No lo cambio hasta que se diga.
2. **Liquid Glass sobre una app blanca casi no tiene nada que refractar.** Por
   eso el cristal aquí se limita a donde de verdad pasa contenido por debajo:
   dock, barra superior con scroll, CTA del carrito, overlays de cámara y
   cabecera de la landing. Ponerlo en los módulos sería niebla decorativa.
3. **La sombra `glow` del botón primario** (`0 10px 30px rgba(61,90,245,.35)`)
   es de landing oscura, no de app clara: sobre blanco ensucia el borde. En la
   app la rebajaría a `0 6px 18px rgba(61,90,245,.22)` y la dejaría entera solo
   en el CTA del carrito.
4. **El escáner vive dentro de una tarjeta.** En la puerta, con prisa y de
   noche, la cámara tiene que ser la pantalla entera y los controles flotar
   encima en cristal. Es el cambio con más efecto de toda la lista.
