# Puesta en marcha de kamusino.es

**Actualizado:** 28 de agosto de 2026

Lo que sigue es todo lo que queda para que la web esté publicada y vendiendo.
Está en orden: cada paso solo depende de los anteriores.

> **Regla que no conviene saltarse:** los pasos del bloque A son los únicos que
> bloquean la publicación. Todo lo demás se puede hacer con la web ya en el aire.

---

## Qué está ya hecho

| | |
|---|---|
| **Web** | 61 páginas: portada, 3 categorías, 47 fichas, editor, contacto, 5 legales, 404 y las dos de vuelta del pago |
| **Editor de diseño** | `/personalizar/` — importar PNG, JPG, WEBP, GIF, SVG, PDF, AI, EPS y PSD; colocar, escalar y girar con ratón, dedo o teclado; hasta 8 diseños repartidos entre delantera y trasera; texto; deshacer y rehacer; la sesión se guarda sola |
| **Envío del pedido** | Email al taller con el mockup, el archivo de estampación a 300 ppp y los originales; email de confirmación al cliente con su referencia |
| **Pago** | Stripe Checkout, con el importe calculado en el servidor y webhook con firma verificada |
| **SEO** | Canónicas, OpenGraph, JSON-LD (`Product`, `BreadcrumbList`, `LocalBusiness`, `FAQPage`), sitemap, robots y 106 redirecciones 301 desde las URLs de la tienda anterior |
| **Legal** | Aviso legal, privacidad, cookies, condiciones y devoluciones, con el formulario oficial de desistimiento |
| **Privacidad** | Cero peticiones a dominios de terceros. Por eso no hace falta banner de cookies |
| **Pruebas** | 317, de las cuales 63 conducen un Chrome real contra el editor |

---

## Bloque A — Sin esto no se puede publicar

### A1 · Datos fiscales · 5 minutos

La LSSI obliga a mostrarlos. Publicar sin ellos es una infracción sancionable,
y ahora mismo las páginas legales lo avisan en amarillo.

Abre `src/site/negocio.mjs` y rellena:

```js
export const EMPRESA = {
  razonSocial: '…',   // nombre completo del titular o de la sociedad
  nif: '…',           // NIF si es autónomo, CIF si es sociedad
  domicilio: '…',     // calle, número, código postal y municipio
  provincia: '…',
  registroMercantil: '',  // solo si es S.L. o S.A.; los autónomos lo dejan vacío
};
```

Después, `npm run build:site`. El aviso amarillo desaparece solo.

**Repasa también** el email y el teléfono de `CONTACTO`: ahora mismo el email es
`tucamisetaonline@outlook.es`, que era el único que aparecía en la web vieja. Si
va a haber uno de `@kamusino.es`, este es el momento de decidirlo.

### A2 · Dominio · 1 hora más la propagación

La web está preparada para `kamusino.es`. Ese dominio **hoy no tiene ni DNS**,
así que hay que registrarlo o recuperarlo.

1. Comprueba en quién está `kamusino.es` (whois de `.es` en <https://www.dominios.es>).
2. Regístralo o recupéralo **a nombre del titular del negocio**, no del técnico.
3. En Cloudflare Pages → proyecto `kamusino` → *Custom domains*, añade
   `kamusino.es` y `www.kamusino.es`.
4. Activa la renovación automática. *(El `.com` caduca el 26 de noviembre de
   2026: revísalo también.)*

> **Una decisión que conviene pensar dos veces.** `kamusino.com` es el que hoy
> está vivo, indexado y con historial en Google; `kamusino.es` no existe para
> Google. Empezar en el `.es` significa empezar de cero en posiciones.
>
> Si prefieres conservar el historial, cambia una línea:
> `DOMINIO = 'https://kamusino.com'` en `negocio.mjs`, y apunta el `.es` al
> `.com` con un 301. Todo lo demás se recalcula solo.

### A3 · Envío de correo · 30 minutos

Sin esto el editor no puede mandar pedidos.

1. Crea una cuenta en <https://resend.com> (3.000 correos al mes, gratis).
2. *Domains* → añade `kamusino.es`. Te dará tres registros DNS.
3. Créalos en Cloudflare tal cual:

   | Tipo | Nombre | Valor |
   |---|---|---|
   | TXT | `send` | el SPF que te dé Resend |
   | TXT | `resend._domainkey` | la clave DKIM que te dé Resend |
   | MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` (prioridad 10) |

4. Añade además un DMARC, que hoy no existe y sin él muchos correos van a spam:

   | Tipo | Nombre | Valor |
   |---|---|---|
   | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:TU-EMAIL` |

5. *API Keys* → crea una con permiso solo de envío.
6. En Cloudflare Pages → *Settings* → *Environment variables*, añade como
   **secretas**:

   ```
   RESEND_API_KEY    la clave del paso 5
   EMAIL_PEDIDOS     el buzón donde quieres recibir los pedidos
   EMAIL_REMITENTE   pedidos@kamusino.es
   NOMBRE_COMERCIAL  Kamusino
   ```

7. Vuelve a desplegar y haz un pedido de prueba desde `/personalizar/`.
   Deben llegarte **dos** correos: el del taller con los archivos y el del
   cliente con la referencia.

---

## Bloque B — Publicar

### B1 · Encender la indexación · 1 minuto

Ahora mismo `robots.txt` bloquea a Google a propósito, para que no indexe el
dominio de previsualización y lo confunda con el bueno.

**El mismo día** que el dominio real apunte a la web, y **no antes**:

```js
// src/site/negocio.mjs
export const SITIO_INDEXABLE = true;
```

Luego `npm run build:site` y despliega.

### B2 · Repasar antes de dar el paso

```bash
npm test           # las 317 tienen que pasar
npm run build:site
```

Y a ojo, desde el móvil: portada → categoría → ficha → **Diseñar esta prenda** →
subir un archivo → enviar.

### B3 · Desplegar

```bash
npx wrangler pages deploy public --project-name=kamusino
```

Cloudflare aplica solo `_headers` (seguridad) y `_redirects` (las 301).

### B4 · Comprobar lo que se rompe siempre

- [ ] `https://kamusino.es` carga con candado
- [ ] `https://www.kamusino.es` redirige al dominio sin `www`
- [ ] Una URL vieja redirige: `kamusino.es/2158-camiseta-gildan-sofstyle.html`
- [ ] Una URL inventada da la 404 bonita, no la de Cloudflare
- [ ] `kamusino.es/sitemap.xml` y `kamusino.es/robots.txt` responden
- [ ] Compartir un enlace por WhatsApp enseña la imagen de la marca

---

## Bloque C — Que Google la encuentre

### C1 · Search Console · 20 minutos

1. <https://search.google.com/search-console> → añadir propiedad → **Dominio**.
2. Verifica con el registro TXT que te dé (en Cloudflare).
3. *Sitemaps* → envía `sitemap.xml`.
4. *Inspección de URLs* → pega la portada y `/personalizar/` → **Solicitar indexación**.

### C2 · Si mantienes el `.com` · 10 minutos

Da de alta **también** `kamusino.com` en Search Console y usa *Cambio de
dirección*. Es lo que le dice a Google que traslade las posiciones en vez de
tratar la web nueva como una desconocida.

### C3 · Ficha de Google Business · 30 minutos

Para un negocio local es lo que más tráfico da por lo poco que cuesta.
<https://business.google.com> → mismo nombre, teléfono y web que en `negocio.mjs`.

### C4 · Analítica · opcional

Si la quieres, **usa una que no ponga cookies** (Plausible o Cloudflare Web
Analytics). Con cualquiera de esas, la política de cookies actual sigue siendo
cierta y no hace falta banner.

Si acabas poniendo Google Analytics, entonces **sí** hacen falta un banner con
botón de rechazar igual de visible que el de aceptar, y reescribir
`textoCookies()` en `src/site/legal.mjs`.

---

## Bloque D — Cobrar por la web

Todo el código está escrito y probado; solo faltan las claves.

### D1 · Alta en Stripe · 1 día

1. <https://dashboard.stripe.com/register>, cuenta de empresa en España.
2. Activa la cuenta: NIF, cuenta bancaria y documento de identidad.
3. *Developers* → *API keys* → copia la **clave secreta**.

### D2 · Webhook · 15 minutos

1. *Developers* → *Webhooks* → *Add endpoint*.
2. URL: `https://kamusino.es/api/stripe-webhook`
3. Evento: `checkout.session.completed` (solo ese).
4. Copia el **signing secret** (empieza por `whsec_`).

### D3 · Configurar y encender

En Cloudflare Pages → *Environment variables*, como **secretas**:

```
STRIPE_SECRET_KEY       sk_live_…
STRIPE_WEBHOOK_SECRET   whsec_…
```

Y en `src/site/negocio.mjs`:

```js
export const PAGO_ACTIVO = true;
```

### D4 · Probar en modo de prueba antes de cobrar de verdad

Con las claves `sk_test_…`, haz un pedido y paga con la tarjeta
`4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC. Comprueba que:

- [ ] Llega el correo **PAGADO** al taller con la dirección de entrega
- [ ] La página de gracias se ve bien
- [ ] Cancelar el pago lleva a `/pedido/cancelado/` y **no** cobra

### D5 · Revisar los precios antes de vender

Los precios vienen del catálogo rescatado de la tienda vieja: **12 € una
camiseta**. Comprueba uno por uno que siguen siendo los correctos, y ajusta en
`negocio.mjs` los gastos de envío (4,95 €) y el umbral de envío gratis (60 €).

---

## Bloque E — Detalles que marcan la diferencia

| | Tarea | Por qué |
|---|---|---|
| ☐ E1 | Foto real de cada producto en el color más vendido | Las fichas usan la foto de la tienda vieja; algunas son de un color que ya no se vende |
| ☐ E2 | Escribir una descripción propia en las fichas que no la tienen | Google necesita texto que no esté copiado del fabricante |
| ☐ E3 | Añadir el resto de tallas y colores que se vendan hoy | El catálogo es del 25 de agosto de 2026 |
| ☐ E4 | Hojas oficiales de reclamación | Las condiciones dicen que hay; tiene que ser verdad |
| ☐ E5 | Revisar los textos legales con un asesor | Están hechos con las prácticas habituales, pero nadie conoce el negocio como quien lo lleva |
| ☐ E6 | Decidir qué pasa con `kamusino.com` | Redirigir al `.es`, o al revés (ver A2) |

---

## Lo que se ha dejado fuera a propósito

No es olvido: es que hoy no compensan.

- **Carrito de varias líneas.** Un pedido es un producto personalizado. Se añade
  cuando haya clientes pidiendo dos prendas distintas a la vez.
- **Cuentas de usuario.** Sin volumen, solo añaden un paso antes de comprar.
- **Panel de administración.** Los pedidos llegan por email, que es donde ya se
  trabaja: se busca, se reenvía y se archiva solo.
- **Previsualización de PDF en el editor.** Se aceptan y llegan enteros al
  taller; simplemente no se ven en pantalla. Cargar un visor de PDF entero para
  el 5% de los archivos no sale a cuenta todavía.
- **Otros idiomas.**

---

## Referencia rápida

```bash
npm test                # 317 pruebas (63 en un Chrome de verdad)
npm run build:site      # regenera public/ desde el catálogo
npm run ver:prendas     # hoja de contactos de las siluetas del editor
npm run fuentes         # vuelve a bajar las tipografías (solo si cambian)
```

**Dónde se toca cada cosa**

| Quiero cambiar… | Fichero |
|---|---|
| Dominio, datos fiscales, gastos de envío, límites, activar el pago | `src/site/negocio.mjs` |
| Textos legales | `src/site/legal.mjs` |
| Textos de las páginas | `src/site/plantillas.mjs` |
| Cómo se dibuja una prenda o dónde se puede estampar | `public/js/editor/prenda.mjs` |
| Qué formatos se aceptan | `public/js/editor/importar.mjs` |
| Qué dice el correo del pedido | `functions/api/pedido.js` |

**Variables de entorno** (todas en Cloudflare Pages, ninguna en el repositorio)

```
RESEND_API_KEY          envío de correo
EMAIL_PEDIDOS           buzón que recibe los pedidos
EMAIL_REMITENTE         remitente, en un dominio verificado en Resend
NOMBRE_COMERCIAL        Kamusino
STRIPE_SECRET_KEY       cobro con tarjeta
STRIPE_WEBHOOK_SECRET   verificación de los avisos de pago
```
