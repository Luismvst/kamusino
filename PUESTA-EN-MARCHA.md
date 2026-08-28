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
| **Web** | 66 páginas: portada, 3 categorías, 47 fichas, editor, 7 guías, contacto, 5 legales, 404 y las dos de vuelta del pago |
| **Editor de diseño** | `/personalizar/` — importar PNG, JPG, WEBP, GIF, SVG, PDF, AI, EPS y PSD; colocar, escalar y girar con ratón, dedo o teclado; hasta 8 diseños repartidos entre delantera y trasera; texto; deshacer y rehacer; la sesión se guarda sola |
| **Envío del pedido** | Email al taller con el mockup, el archivo de estampación a 300 ppp y los originales; email de confirmación al cliente con su referencia |
| **Pago** | Stripe Checkout, con el importe calculado en el servidor y webhook con firma verificada |
| **SEO** | Canónicas, OpenGraph, JSON-LD (`Product`, `BreadcrumbList`, `LocalBusiness`, `FAQPage`), sitemap, robots y 106 redirecciones 301 desde las URLs de la tienda anterior |
| **Legal** | Aviso legal, privacidad, cookies, condiciones y devoluciones, con el formulario oficial de desistimiento |
| **Contenido** | 7 guías para las búsquedas que traen a quien ya quiere comprar: despedidas, ropa laboral, eventos, colegios, preparar el diseño, técnicas de estampación y precios |
| **Rendimiento** | Fotos en WebP a dos tamaños: una página de categoría pasa de ~1,9 MB de imágenes a 39 KB |
| **Privacidad** | Cero peticiones a dominios de terceros. El aviso de cookies está escrito y probado, y se enciende solo el día que se active la analítica |
| **Pruebas** | 336, de las cuales 63 conducen un Chrome real contra el editor |

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

### A2 · Dominio y redirección · 1 hora más la propagación

La web está preparada para `kamusino.es`. Ese dominio **hoy no tiene ni DNS**,
así que hay que registrarlo o recuperarlo — y, sobre todo, **redirigir el `.com`
hacia él**.

#### Por qué la redirección lo cambia todo

Un 301 no es «mandar a la gente al sitio nuevo». Es la instrucción que le dice a
Google que la página se ha mudado **de forma permanente**, y que traslade al
destino todo lo que tenía la de origen: posiciones, antigüedad y los enlaces que
apuntan a ella desde otras webs.

Es decir: con el 301 puesto, `kamusino.es` **no empieza de cero**. Hereda los
casi dos años de historial de `kamusino.com`. Google tarda unas semanas en
consolidarlo, pero no se pierde por el camino.

Lo que sí destruye el historial es dejar el `.com` muerto, apuntando a un 404 o
sin renovar. Ahí sí se tira todo.

> **Por eso el `.com` no se puede dejar caducar.** Aunque la web viva en el
> `.es`, el `.com` hay que renovarlo cada año: es lo que sostiene el 301. El día
> que caduque, se pierde el historial que traslada. Es una renovación de unos
> 12 € al año que protege todo el posicionamiento.

#### Qué hacer

1. Comprueba en quién está `kamusino.es`, con el whois de `.es` en
   <https://www.dominios.es>.
2. Regístralo o recupéralo **a nombre del titular del negocio**, no del técnico.
3. En Cloudflare Pages → proyecto `kamusino` → *Custom domains*, añade
   `kamusino.es` y `www.kamusino.es`.
4. Trae también `kamusino.com` a Cloudflare como zona (no hace falta que apunte
   a la web: solo que Cloudflare gestione su DNS).
5. Crea la regla de redirección. En Cloudflare, con la zona `kamusino.com`
   seleccionada: **Rules → Redirect Rules → Create rule**.

   | Campo | Valor |
   |---|---|
   | Nombre | `kamusino.com a kamusino.es` |
   | Cuando… | `hostname` contiene `kamusino.com` |
   | Tipo de URL | Expresión dinámica |
   | Expresión | `concat("https://kamusino.es", http.request.uri.path)` |
   | Código de estado | **301** (permanente) |
   | Conservar cadena de consulta | Sí |

   La expresión es la parte que importa: conserva la **ruta**. Sin ella,
   `kamusino.com/2158-camiseta-gildan-sofstyle.html` acabaría en la portada del
   `.es`, y Google trata eso casi como un 404. Con ella, cae en la ficha nueva,
   que es donde tiene que caer.

6. Renueva `kamusino.com` cada año, indefinidamente.

#### Comprobarlo

```bash
curl -sI https://kamusino.com/2158-camiseta-gildan-sofstyle.html | head -3
```

Tiene que responder `301` y una cabecera `location:` apuntando a
`https://kamusino.es/producto/2158-camiseta-gildan-sofstyle-unisex/`. Si
responde `302`, la regla está mal: un 302 es temporal y **no traslada
posiciones**.

#### Si prefieres quedarte en el `.com`

Cambia una línea en `src/site/negocio.mjs`:

```js
export const DOMINIO = 'https://kamusino.com';
```

y monta la regla al revés. Canónicas, sitemap, redirecciones y datos
estructurados se recalculan solos con `npm run build:site`. Es una decisión
reversible en cinco minutos mientras no se haya enviado el sitemap a Google.

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
npm test           # las 336 tienen que pasar
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

Hoy la web no hace **ni una sola petición a un dominio ajeno**, y por eso no
lleva cartel de cookies: no habría nada que consentir.

El aviso está escrito, probado y montado, pero dormido. Se enciende solo:

```js
// src/site/negocio.mjs
export const ANALITICA = {
  activa: true,
  proveedor: 'cloudflare',   // o 'plausible'
  token: '…',                // el del panel de Cloudflare Web Analytics
};
```

Con eso aparece el aviso, el script de medición **no se carga hasta que alguien
acepta**, y el enlace «Preferencias de cookies» del pie permite cambiar de
opinión en cualquier momento. No hay que tocar ninguna plantilla.

Las dos opciones que trae son cookieless, así que técnicamente estarían exentas
del consentimiento. Se pide igual: pedirlo cuando no hace falta no cuesta nada,
y no pedirlo cuando sí hace falta cuesta una sanción.

> Si acabas poniendo **Google Analytics**, revisa el texto de
> `textoCookies()` en `src/site/legal.mjs`: la política actual dice que no se
> comparte nada con terceros, y con GA dejaría de ser verdad.

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
npm test                # 336 pruebas (63 en un Chrome de verdad)
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
