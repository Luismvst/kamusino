# Informe de revisión — kamusino.com

**Fecha:** 11 de agosto de 2026
**Método:** navegación real con Chrome sobre la web en producción (portada, categoría, ficha de producto), inspección de peticiones de red, consola de errores y registros DNS públicos.
**Alcance:** revisión desde fuera. **No he tenido acceso al backoffice ni al servidor**, así que todo lo de aquí es lo observable desde el navegador. Con acceso al panel saldrían más cosas.

---

## Resumen

| Gravedad | Cantidad |
|---|---|
| 🔴 Crítico (impide vender) | 4 |
| 🟠 Importante | 5 |
| 🟡 Legal | 2 |

**Conclusión: hoy la tienda es prácticamente incomprable.** No por un fallo, sino por dos que se suman: no se ve ninguna foto de producto, y desde la portada no se puede llegar a ningún producto.

---

## 🔴 CRÍTICO 1 — Ninguna imagen de producto se ve

**Síntoma:** en las páginas de categoría salen recuadros grises con un icono de imagen rota. En la ficha de producto, la foto principal no carga.

**Comprobación:**

| URL | Resultado |
|---|---|
| `kamusino.com/11308-home_default/camiseta-gildan-sofstyle.jpg` (la que usa la web) | ❌ **404** |
| `kamusino.com/img/p/1/1/3/0/8/11308-home_default.jpg` (la ruta real del archivo) | ✅ **200 OK, image/jpeg** |

**Diagnóstico:** **los archivos SÍ están en el servidor. Lo que falla es la configuración de nginx.**

PrestaShop genera URLs "bonitas" para las imágenes (`/11308-home_default/nombre.jpg`) y el servidor web tiene que traducirlas a la ruta real (`/img/p/1/1/3/0/8/...`) mediante unas reglas de reescritura. **Al nginx de este servidor le faltan esas reglas.** Por eso las imágenes de los banners (que usan la ruta real, `/img/cms/...`) sí se ven, y las de producto no.

**Impacto:** una tienda de camisetas sin fotos de camisetas. La conversión es prácticamente cero.

**Solución:** ✅ **Se arregla solo al migrar** a un servidor con la configuración correcta de PrestaShop. **Coste: 0 €.** Si el hosting nuevo también usa nginx, hay que verificar expresamente que incluye las reglas de PrestaShop 1.7.

**Verificación después de migrar:** abrir una categoría y comprobar que se ven las fotos. Es la primera prueba que hay que hacer.

---

## 🔴 CRÍTICO 2 — Toda la portada enlaza a un dominio muerto

`kamusino.es` **no tiene registros DNS**. No resuelve. Está caducado, cancelado o vendido.

Y estos son los enlaces de la portada:

| Elemento | Destino | Estado |
|---|---|---|
| Banner "renueva tu colección" | `kamusino.es/4-camisetas` | ❌ Muerto |
| Botón "COMPRAR AHORA" | `kamusino.es/90-san-valentin` | ❌ Muerto |
| Banner San Valentín | `kamusino.es/137-san-valentin` | ❌ Muerto |
| Banner camisetas infantiles | `kamusino.es/14-camisetas-infantiles-para-colorear` | ❌ Muerto |
| Banner lienzos | `kamusino.es/37-lienzos` | ❌ Muerto |
| Enlace "Contacto" (interno) | `kamusino.es/contactenos` | ❌ Muerto |
| Botón "Compra ahora!" (puzzles) | `kamusino.com/#` | ❌ No lleva a ninguna parte |

**Impacto:** desde la portada **no se puede llegar a ningún producto**. Cualquier visitante que pinche en algo se estrella.

Lo llamativo: el catálogo **sí funciona**. `kamusino.com/4-camisetas` carga perfectamente, con 20 productos a 12,00 €. Los productos existen, los precios existen, las variantes de color y talla existen. Simplemente **no hay forma de llegar a ellos desde la portada**.

**Solución:** reescribir esos enlaces cambiando `kamusino.es` por `kamusino.com`. Se editan en el backoffice de PrestaShop (los banners están hechos con el módulo Creative Elements). **~30 minutos de trabajo.**

**Ojo:** puede haber más enlaces a `kamusino.es` en descripciones de producto, páginas CMS o emails automáticos. Hay que hacer una búsqueda completa en la base de datos.

---

## 🔴 CRÍTICO 3 — El botón de WhatsApp está roto

El botón flotante de WhatsApp carga su icono desde `https://kamusino.es/img/whatsappbtn.png` → `ERR_NAME_NOT_RESOLVED`.

El enlace en sí sí funciona (`api.whatsapp.com/send?phone=+34747413526`), pero **el botón es invisible** porque su imagen no carga. Un canal de venta directo, muerto.

**Solución:** subir la imagen a `kamusino.com` y corregir la ruta. **10 minutos.**

---

## 🔴 CRÍTICO 4 — Contenido cargado desde la demo del fabricante del tema

La imagen de los métodos de pago del pie de página se carga desde:

```
https://iqit-commerce.com/ps17/demo1/img/cms/lgpng.png
```

Eso es **la web de demostración del fabricante del tema**. La tienda está mostrando un archivo alojado en un servidor de terceros sobre el que no se tiene ningún control. El día que IQIT Commerce reorganice su demo, desaparecen los logos de Visa y Mastercard del pie.

Es además síntoma de algo más de fondo: **el tema se instaló y no se terminó de personalizar**. Quedó contenido de demo sin sustituir.

**Solución:** descargar la imagen y subirla al propio servidor. **5 minutos.**

---

## 🟠 IMPORTANTE 5 — SEO inexistente

| Elemento | Valor actual | Debería ser |
|---|---|---|
| `<title>` de la portada | `Kamusino` | `Kamusino \| Camisetas personalizadas, tazas y regalos originales` |
| `meta description` | **"Tienda creada con PrestaShop"** | Una descripción real con las palabras clave del negocio |
| `meta keywords` | *(vacío)* | *(irrelevante hoy, se puede ignorar)* |

**"Tienda creada con PrestaShop" es literalmente el texto por defecto que trae PrestaShop recién instalado.** Es el texto que Google enseña debajo del título en los resultados de búsqueda. Nunca se cambió.

**Impacto:** posicionamiento nulo y, cuando alguien busque la tienda por su nombre, el resultado de Google dirá "Tienda creada con PrestaShop".

**Solución:** backoffice → **Diseño → Preferencias de SEO y URLs**. **20 minutos** y es de lo más rentable que se puede tocar.

---

## 🟠 IMPORTANTE 6 — El sitemap no existe

`kamusino.com/sitemap.xml` → **404**.

Además, en el código de la web el enlace al mapa del sitio está generado como `/mapa del sitio` — **con espacios**, lo que produce una URL inválida.

**Impacto:** Google no tiene un índice de las páginas de la tienda. Indexa peor y más lento.

**Solución:** instalar y ejecutar el módulo *Google Sitemap* de PrestaShop (es gratuito y oficial) y corregir la URL de la página. **20 minutos.**

---

## 🟠 IMPORTANTE 7 — Contenido caducado

En agosto, la portada muestra:

- Un texto sobre **promociones de Halloween**
- Un banner grande de **San Valentín** con luces de neón
- Dos banners más enlazando a categorías de San Valentín

**Impacto:** transmite abandono. Un visitante que ve San Valentín en agosto asume que la tienda está muerta y no compra.

**Solución:** decisión del cliente sobre qué poner. Como mínimo, **quitar lo caducado**. Es gratis y mejora la percepción al instante.

---

## 🟠 IMPORTANTE 8 — Carga de una fuente hebrea que además falla

La web carga `fonts.googleapis.com/earlyaccess/alefhebrew.css` y a continuación intenta descargar tres archivos de la fuente **Alef Hebrew**, y los tres fallan por error de CORS.

Es otro resto de la configuración de demo del tema. La tienda está en español, no necesita una fuente hebrea.

**Impacto:** menor. Tres peticiones fallidas que ralentizan la carga y ensucian la consola.

**Solución:** quitarlo de la configuración del tema. **10 minutos.**

---

## 🟠 IMPORTANTE 9 — El flujo de personalización no parece existir

En la ficha de producto de "Camiseta Gildan Sofstyle® Unisex" (12,00 €):

- Hay selector de **color** (18 colores) ✅
- Hay selector de **talla** ✅
- Hay un botón que pone **"Personalizar"**... que en realidad es un **enlace a la categoría `/76-personaliza`**, no un formulario de personalización.
- **No hay ningún campo de subida de imagen ni de texto personalizado.** Cero campos de personalización en la página.
- El botón de "Añadir al carrito" sí existe en el HTML, pero no está visible en la página.

El negocio se llama "Kamusino by Tu Camiseta Online" y vende camisetas y puzzles **personalizados**. **Si no hay forma de personalizar nada, el producto principal del negocio no se puede comprar.**

**No he podido confirmar la causa desde fuera.** Puede que el módulo de personalización esté desactivado, mal configurado, o que se personalice por otra vía (por WhatsApp, por ejemplo — que también está roto). **Hay que preguntárselo al cliente y revisarlo desde el backoffice.**

---

## 🟡 LEGAL 10 — El banner de cookies no cumple el RGPD

El banner dice *"Nuestra tienda usa cookies para una mejor experiencia"* y tiene **un único botón: "Accept"**.

No hay opción de rechazar. No hay opción de configurar. No hay enlace a una política de cookies.

**La Guía sobre el uso de cookies de la AEPD (vigente desde 2021) exige que rechazar sea tan sencillo como aceptar.** Un banner solo-aceptar es incumplimiento directo, y es de lo más fácil de detectar y denunciar: se ve entrando en la web.

**Solución:** instalar un módulo de consentimiento de cookies en condiciones. Los hay gratuitos para PrestaShop 1.7 y de pago (30–80 €).

---

## 🟡 LEGAL 11 — Faltan páginas legales obligatorias

En el pie de página solo hay **"Aviso legal"** y **"Contacto"**. He confirmado que solo existen dos páginas CMS enlazadas (`/content/2-aviso-legal` y `/content/6-contacto`).

Para una tienda online en España faltan, como mínimo:

- **Política de privacidad** (RGPD / LOPDGDD)
- **Condiciones generales de contratación** (Ley General para la Defensa de los Consumidores y Usuarios)
- **Política de cookies**
- **Política de devoluciones y derecho de desistimiento** — 14 días naturales, obligatorio informar

**Recomendación:** avísale a tu amigo **por escrito** (un WhatsApp vale) de que esto falta. No es tu responsabilidad redactarlas, pero sí conviene que conste que lo avisaste.

---

## ℹ️ Ficha técnica

| | |
|---|---|
| PrestaShop | 1.7.7.8 |
| Servidor web | nginx |
| Versión de PHP | Oculta en las cabeceras (✅ correcto). **Debe ser 7.1–7.4** |
| IP web | `82.194.68.32` → `plw118.dns-servicio.com` |
| IP correo | `217.116.0.227` (**máquina distinta**) |
| Servidores DNS | `ns10/11/12.servicio-online.net` |
| SPF | `v=spf1 redirect=spf.dominioabsoluto.net` |
| Proveedor probable | **Arsys** (por los dominios de infraestructura) — a confirmar |
| Tema | **Warehouse** de IQIT Commerce (comercial, ~80 €) |
| Módulos detectados | Creative Elements (`iqitelementor` v1.168.0), IQIT MegaMenu, Wishlist, Compare, Reviews, Countdown, Free Shipping |
| Idioma | Solo español |
| Moneda | Solo euro |
| `robots.txt` | ✅ Existe |
| `sitemap.xml` | ❌ 404 |
| HTTPS | ✅ Funciona |
| Cookies de sesión | ✅ Con `HttpOnly` y `secure` |

**Nota sobre los módulos:** todos los módulos IQIT son de pago y algunos se vinculan a un dominio concreto. **Hay que conseguir los datos de la cuenta donde se compraron** o pueden dejar de funcionar tras la migración. Está en la lista de preguntas al técnico (punto 7.3).

---

## Plan de reparación

### Se arregla gratis, al migrar

| # | Problema | Coste |
|---|---|---|
| 1 | Imágenes de producto (404) | **0 €** — configuración correcta del servidor nuevo |

### Trabajo manual — unas 2 horas en total

| # | Problema | Tiempo |
|---|---|---|
| 2 | Enlaces a `kamusino.es` | 30 min |
| 3 | Botón de WhatsApp | 10 min |
| 4 | Imagen de pagos de la demo | 5 min |
| 5 | Title y meta description | 20 min |
| 6 | Sitemap | 20 min |
| 7 | Contenido caducado | 15 min |
| 8 | Fuente hebrea | 10 min |

### Requiere decisión del cliente

| # | Tema |
|---|---|
| 9 | Flujo de personalización — ¿debería funcionar? |
| 10 | Banner de cookies conforme al RGPD |
| 11 | Páginas legales |

---

## Checklist de verificación post-migración

Repetir estas pruebas en el servidor nuevo, **antes de dar por buena la migración**:

- [ ] La portada carga con HTTPS y candado
- [ ] **Se ven las fotos en una página de categoría** ← la prueba clave
- [ ] Se ve la foto principal en una ficha de producto
- [ ] Los enlaces de la portada llevan a categorías reales de `.com`
- [ ] Se puede añadir un producto al carrito
- [ ] Se puede llegar hasta la pantalla de pago
- [ ] **Hacer un pedido de prueba real de principio a fin**
- [ ] Llega el email de confirmación del pedido
- [ ] El backoffice es accesible y se ve el pedido de prueba
- [ ] Enviar y recibir un correo desde cada cuenta `@kamusino.com`
- [ ] El buscador de la tienda devuelve resultados
- [ ] `robots.txt` y `sitemap.xml` responden
- [ ] Consola del navegador sin errores 404
- [ ] Comprobar en móvil, no solo en escritorio
