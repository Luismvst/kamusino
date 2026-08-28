# Plan — Kamusino: de web escaparate a tienda con editor de diseño

**Fecha:** 28 de agosto de 2026
**Estado de partida:** sitio estático de 55 páginas generado por `src/site/build.mjs`, en Cloudflare Pages, sin JavaScript de cliente, sin pagos, sin formularios. Pedidos por WhatsApp.
**Estado objetivo:** tienda indexable en dominio propio, con editor de camisetas en el navegador, pago con tarjeta y documentación legal publicable.

---

## Decisiones tomadas (y por qué)

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **Silueta SVG teñida** como lienzo del editor, no la foto del producto | Foto real + área de estampación por producto | 42 fotos con encuadres distintos = 42 áreas que calibrar a mano y que no coinciden con el color elegido. La silueta da el color exacto del swatch y un área de estampación conocida con precisión. La foto real sigue visible al lado como referencia. |
| **Sin dependencias nuevas** en el editor (canvas + DOM nativos) | Fabric.js / Konva | El repo hoy tiene 0 dependencias. Arrastrar, escalar y rotar un rectángulo son ~200 líneas de matemática de sobra conocida. Una librería de 300 KB para eso no se paga. |
| **Stripe Checkout** (página alojada) | Redsys / Stripe Elements | Ningún dato de tarjeta toca nuestro servidor → sin alcance PCI. Redsys exige contrato bancario y firma HMAC propia. |
| **Dos emails, sin base de datos** | Base de datos de pedidos + webhook | El pedido se envía por email al enviarse el diseño ("pendiente de pago") y un segundo email corto lo confirma al cobrar. Evita montar almacenamiento y persistencia para un negocio de pocos pedidos al día. |
| **Resend** para el envío | SMTP del hosting / Cloudflare Email | Adjuntos de 40 MB, funciona desde Cloudflare Functions, y sus registros DNS arreglan de paso el SPF/DKIM/DMARC que hoy faltan. |
| **PDF/AI/EPS se adjuntan, no se previsualizan** en la primera versión | pdf.js desde el principio | El 95% de lo que manda un cliente es PNG/JPG/SVG y eso el navegador lo pinta solo. La previsualización de PDF se añade después, cargada solo cuando hace falta. |

---

## Fases

### Fase 0 — Cimientos (bloquea a todas las demás)
- `src/site/negocio.mjs`: fichero único con dominio, datos fiscales, contacto, claves públicas. Todo lo configurable en un sitio.
- Quitar `SITIO_INDEXABLE` disperso y el dominio codificado en `build.mjs`.

### Fase 1 — SEO e indexación
1. Canonical absoluta en **todas** las páginas (hoy la de categoría pasa una cadena vacía).
2. OpenGraph + Twitter Card con imagen por producto.
3. JSON-LD: `Organization` + `WebSite` en portada, `BreadcrumbList` en categoría y ficha, `Product` con `offers` en ficha.
4. `sitemap.xml` con `lastmod`, `changefreq` y dominio real.
5. `robots.txt` real (hoy bloquea todo).
6. Página `404.html` (Cloudflare Pages la sirve sola).
7. `_redirects`: 301 de las URLs viejas de PrestaShop (`/2158-camiseta-....html`, `/97-...`) a las nuevas. **Se generan desde el catálogo**, que conserva los slugs de origen.
8. `_headers`: cabeceras de seguridad (HSTS, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) y caché inmutable para `/img/` y `/css/`.
9. Fuentes autoalojadas para quitar el bloqueo de render de terceros.
10. Alta en Google Search Console + envío del sitemap (manual, requiere la cuenta).

### Fase 2 — Documentos legales
1. **Política de cookies** (no existe) + banner con **botón de rechazo del mismo peso visual que el de aceptar** (exigencia AEPD; hoy es el incumplimiento señalado en `ESTADO.md` J1).
2. Aviso legal ampliado con datos fiscales reales y registro mercantil.
3. Privacidad reescrita a estructura RGPD completa: categorías de datos, base jurídica por finalidad, plazos concretos, encargados del tratamiento (Stripe, Resend, Cloudflare), transferencias internacionales, derecho a reclamar ante la AEPD.
4. Condiciones de contratación con el proceso de compra paso a paso, IVA, plazos de entrega, garantía legal de 3 años (RDL 7/2021).
5. Devoluciones + **formulario de desistimiento** como anexo (obligatorio).
6. Enlace a la plataforma **ODR** de la Comisión Europea (obligatorio en comercio electrónico UE).
7. Casilla de aceptación de condiciones **desmarcada por defecto** en el pedido, con enlaces a los documentos.

### Fase 3 — Editor de diseño (el grueso)
Unidades independientes, cada una con su test:

| Módulo | Responsabilidad | Depende de |
|---|---|---|
| `prenda.mjs` | Silueta SVG por tipo de prenda + área de estampación en coordenadas de la silueta | — |
| `estado.mjs` | Documento del diseño (producto, color, talla, cantidad, capas por cara) + deshacer/rehacer | — |
| `importar.mjs` | Fichero → capa. Valida tipo y tamaño, sanea SVG, calcula encaje inicial | — |
| `geometria.mjs` | Transformaciones: mover, escalar desde tirador, rotar, encajar, centrar, límites | — |
| `lienzo.mjs` | Pintar prenda + capas + guías del área imprimible | prenda, estado, geometria |
| `manipular.mjs` | Punteros y teclado → llamadas a geometria. Ratón y táctil | geometria, lienzo |
| `exportar.mjs` | Mockup PNG + PNG de estampación a 300 ppp + ficheros originales | estado, lienzo |
| `enviar.mjs` | Formulario, validación, envío multiparte, estados de error | exportar |

Funcionalidad exigida:
- Importar PNG, JPG, WEBP, GIF, SVG (previsualización real) y PDF/AI/EPS (adjuntos).
- Colocar: arrastrar, escalar por las esquinas, rotar, con recorte al área imprimible.
- Varios diseños por cara, con orden de capas (subir/bajar/eliminar/duplicar).
- Cara delantera y trasera.
- Texto además de imágenes (es lo que más piden en camisetas y sale casi gratis con canvas).
- Deshacer/rehacer, y persistencia en `localStorage` para no perder el trabajo al recargar.
- Táctil: pellizcar para escalar, dos dedos para rotar.

### Fase 4 — Envío por email
- `functions/api/pedido.js`: valida (tamaño, tipo, número de capas, honeypot antispam), compone y envía por Resend dos correos: uno a la tienda con todos los adjuntos, otro de confirmación al cliente.
- Referencia de pedido corta y legible (`KAM-XXXXXX`) presente en ambos.
- Límites: máx. 8 capas, 10 MB por fichero, 20 MB en total.

### Fase 5 — Pago
- `functions/api/checkout.js`: crea la sesión de Stripe Checkout con el pedido como línea, referencia en `metadata`.
- `functions/api/stripe-webhook.js`: verifica la firma y envía el email de "pedido pagado".
- Páginas `/pedido/gracias/` y `/pedido/cancelado/`.
- Gastos de envío y umbral de envío gratis configurables en `negocio.mjs`.

### Fase 6 — Verificación
- Tests unitarios de geometría, importación, estado y plantillas con `node --test`.
- Comprobador de SEO propio: recorre `public/` y verifica que cada página tiene título único, descripción, canonical, OG y JSON-LD válido.
- Pruebas manuales del editor en navegador real (Chrome DevTools MCP): importar cada formato, mover, escalar, rotar, varias capas, deshacer, recargar, enviar.
- Lighthouse en portada, categoría, ficha y editor.

---

## Lo que queda fuera a propósito

- Carrito de varias líneas. Un pedido = un producto personalizado. Se añade cuando haya pedidos reales que lo pidan.
- Cuentas de usuario e historial. Innecesario sin volumen.
- Traducción a otros idiomas.
- Panel de administración. Los pedidos llegan por email, que es donde el cliente ya trabaja.
