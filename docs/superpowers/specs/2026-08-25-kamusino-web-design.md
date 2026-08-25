# Diseño — Web nueva de Kamusino

**Fecha:** 25 de agosto de 2026
**Estado:** aprobado por Luis, pendiente de plan de implementación
**Relacionado:** `ESTADO.md` (backlog de migración), `03-INFORME-WEB.md` (auditoría de la web actual)

---

## 1. Contexto

La migración de `kamusino.com` está bloqueada al 100 %. El técnico que custodia el servidor no ha entregado acceso, ni backup, ni AuthCode del dominio. El backlog sigue en 0/58 tareas diez días después de escribirse. El servidor viejo se apaga el **10 de septiembre de 2026**.

Decisión tomada: **dejar de esperar al técnico**. Se reconstruye la web desde fuera, con lo único a lo que tenemos acceso — la tienda pública — y se despliega en Cloudflare Pages sobre una URL de desarrollo. El dominio se resuelve por vía separada (reclamación a Acens como titular) y no bloquea este trabajo.

### Verificado el 25 de agosto de 2026

| Comprobación | Resultado |
|---|---|
| Portada `https://kamusino.com/` | 200, 68 KB |
| Categoría `/104-camisetas` | 200, 244 KB, "Mostrando 1-20 de 20 artículo(s)" |
| Imagen por ruta real `/img/p/1/1/3/0/8/11308-home_default.jpg` | **200 `image/jpeg`** |
| `robots.txt` | Existe, no bloquea el catálogo (solo filtros y páginas privadas) |
| `sitemap.xml` | 404 |
| Paginación | Acepta `?resultsPerPage=9999999` — categoría completa en una petición |
| Categorías en el menú | 26 |
| Personalización en la ficha | Existe en el HTML (`uploadable`, `customization_required`, `customization_id`) pero el tema no la renderiza |

**Conclusión: el catálogo entero es rescatable desde fuera.** Es lo que hace viable el proyecto.

---

## 2. Objetivo

Una tienda-escaparate moderna que:

1. Conserve **los datos** de la tienda actual: categorías, productos, precios, variantes de color y talla, fotos y textos.
2. Sustituya **la presentación entera**: fuera el tema Warehouse de IQIT y todo el HTML de PrestaShop.
3. Haga **posible el negocio principal** — personalizar prendas — que hoy es literalmente inalcanzable desde la web.
4. Se despliegue estática en Cloudflare Pages, sin servidor, sin base de datos y sin coste recurrente.

### No-objetivos

- **No hay checkout ni pago online.** El pedido sale por WhatsApp, que es como ya se vende de facto.
- No se reconstruye el histórico de pedidos, clientes ni facturas. Es irrecuperable sin acceso al servidor.
- No se migra el correo.
- No se toca el servidor viejo salvo para leerlo.

---

## 3. Arquitectura

```
scripts/scrape.mjs   ──>  src/data/catalogo.json
                     ──>  public/img/p/…            (fotos descargadas)

src/data/*.json      ──>  Astro (build estático)    ──>  Cloudflare Pages
                              │
                              ├── HTML puro: portada, categorías, fichas, legales
                              └── Islas Preact: configurador, buscador, filtros
```

Una sola dirección de flujo. El scraper se ejecuta **una vez**, antes del 10 de septiembre, y a partir de ahí el proyecto no depende de que el servidor viejo siga vivo.

### Stack

| Pieza | Elección | Razón |
|---|---|---|
| Framework | Astro 5, salida estática | Catálogo de contenido; cero JS por defecto; gratis en Cloudflare Pages |
| Estilos | Tailwind v4 | |
| Islas | Preact (~3 KB) | Solo donde hay estado real |
| Animación | `motion` | Springs interrumpibles en el configurador y las hojas móviles |
| Scraping | Node 22 + `cheerio` | |
| Buscador | Índice JSON en cliente | Unos cientos de productos caben en ~50 KB; no justifica Algolia |
| Datos | JSON en el repositorio | Sin BD: el catálogo cambia poco y no hay backoffice |

Dependencias nuevas totales: `astro`, `@astrojs/preact`, `tailwindcss`, `motion`, `cheerio`. Nada más.

---

## 4. Rescate del catálogo

**Es la tarea con fecha de caducidad y va primero.**

`scripts/scrape.mjs`:

1. Parte de las 26 URL de categoría extraídas del menú de la portada.
2. Por cada categoría, pide `?resultsPerPage=9999999` y extrae las URL de producto.
3. Por cada producto, extrae: id, slug, nombre, descripción corta y larga, categoría, precio, referencia, grupos de atributos (color, talla) con sus valores, y las URL de imagen.
4. Descarga cada imagen por su **ruta real** `/img/p/…`, no por la URL bonita, que devuelve 404 por la configuración rota de nginx.
5. Escribe `src/data/catalogo.json` y guarda las imágenes en `public/img/p/…`.

**Restricciones de ejecución:**

- **Máximo 1 petición por segundo.** El servidor viejo es frágil y no se puede permitir que se caiga por nuestra culpa.
- User-Agent identificable.
- **Idempotente y reanudable:** si la imagen ya está en disco, no se vuelve a pedir. Un corte a mitad se retoma sin empezar de cero.
- Registra en `scrape-report.json` cada URL fallida, para revisarlas a mano antes del 10 de septiembre.

**Autorización:** el sitio es del cliente para el que se trabaja, y `robots.txt` no prohíbe el catálogo.

### Modelo de datos

```jsonc
{
  "categorias": [
    { "id": 104, "slug": "camisetas", "nombre": "Camisetas", "padre": 97, "descripcion": "…" }
  ],
  "productos": [
    {
      "id": 2158,
      "slug": "camiseta-gildan-sofstyle",
      "nombre": "Camiseta Gildan Sofstyle Unisex",
      "categoria": 104,
      "precio": 12.0,
      "referencia": "…",
      "descripcionCorta": "…",
      "descripcion": "…",
      "imagenes": ["/img/p/1/1/3/0/8/11308.jpg"],
      "colores": [{ "nombre": "Blanco", "hex": "#ffffff" }],
      "tallas": ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
      "personalizable": true,
      "camposTexto": 1,
      "camposArchivo": 0
    }
  ]
}
```

**Corregido el 25 de agosto tras inspeccionar la ficha real** (`data-product` del producto 2158):

- **No existe una foto por color.** Cada producto tiene **una sola imagen** y los ~17 colores son muestras hex (`#ffffff`, `#003870`, …). El configurador tendrá que **teñir** la imagen base, no cambiarla.
- **La personalización actual es solo texto:** `text_fields: 1`, `uploadable_files: 0`. La tienda de hoy no acepta ni un archivo del cliente. Permitir subir imágenes es capacidad **nueva**, no restaurada — conviene confirmar con el cliente que acepta archivos por este canal.
- PrestaShop 1.7 serializa el producto entero en el atributo `data-product` de la ficha, así que el scraper no necesita ninguna librería de parseo.

---

## 5. Dirección visual

**Concepto rector: el producto es el lienzo.** La interfaz calla para que hablen la prenda y el diseño del cliente. Es la inversión exacta de la web actual, que grita con banners de neón de San Valentín en agosto.

### Color

- Fondo hueso `#FAF9F7`, tinta `#141414`.
- **Un único acento**, extraído del logo real durante la implementación. Sin degradados de plantilla.
- El color lo aportan las fotos de producto y los diseños del cliente, no el cromo de la interfaz.

### Tipografía

- Titulares: **Bricolage Grotesque** variable, aprovechando su eje óptico; tracking negativo en tamaños grandes.
- Texto: **Instrument Sans**.
- Ambas autohospedadas. Ninguna petición a Google Fonts — de paso desaparece la fuente hebrea rota que la web actual carga y falla por CORS.

### Retícula y composición

- Retícula editorial con aire generoso.
- Foto de producto grande sobre fondo neutro.
- El hover de una tarjeta **cambia al color alternativo de la prenda**, no hace zoom. El hover enseña producto, no efectos.

### Movimiento (criterio `apple-design`)

Springs **solo donde hay gesto**. Todo lo demás, transiciones CSS de 120 ms.

- Respuesta en `pointerdown`, nunca en el `click`.
- Arrastre pegado al puntero **1:1**, respetando el punto exacto donde se agarró; `setPointerCapture` para no perder el seguimiento al salirse del elemento.
- Toda animación **interrumpible**: se anima desde el valor actual en pantalla, no desde el objetivo, y se puede agarrar a media animación e invertir.
- Al soltar, la animación **hereda la velocidad** del gesto. Sin costura entre arrastrar y animar.
- Ejes X e Y como springs independientes.
- Damping `1.0` por defecto. Rebote (`0.8`) **solo** después de un lanzamiento con impulso.
- `prefers-reduced-motion: reduce` desactiva el movimiento no esencial y deja el arrastre, que es funcional.

---

## 6. Páginas

| Ruta | Contenido |
|---|---|
| `/` | Portada editorial: qué hace el negocio, acceso directo al configurador, categorías destacadas, productos. Sin banners caducados. |
| `/[categoria]` | Rejilla con filtros por color, talla y precio. Filtros como isla. |
| `/[categoria]/[producto]` | Ficha: galería, selector de color y talla, precio, descripción, y **botón que lleva al configurador con el producto ya cargado** si es personalizable. |
| `/personaliza` | El configurador a pantalla completa. |
| `/contacto` | WhatsApp, email y formulario. |
| `/aviso-legal`, `/privacidad`, `/condiciones`, `/devoluciones`, `/cookies` | Maquetadas, con el texto pendiente de aprobación del cliente. |

Se genera `sitemap.xml` en el build. `title` y `meta description` reales por página, derivados del catálogo.

---

## 7. El configurador

Isla Preact sobre `<canvas>`.

### Flujo

1. Elegir producto (o llegar con él precargado desde la ficha).
2. Elegir **color** y **talla**. No hay una foto por color: se **tiñe** la única foto de la prenda dibujándola en canvas y aplicando el color con `globalCompositeOperation = 'multiply'`, que conserva pliegues y sombras. Sobre prendas oscuras el tinte multiplicativo se degrada, así que los colores oscuros usan además una capa `screen` de baja opacidad para recuperar los altos.
3. Subir una imagen **o** escribir un texto (tipografía, color, tamaño).
4. Colocar el diseño: arrastrar, escalar y rotar sobre la prenda.
5. Elegir cara: delante o detrás.
6. Enviar el pedido.

### Área imprimible

Rectángulo marcado sobre la prenda. Funciona como **tope elástico**: durante el arrastre el diseño puede salirse con resistencia, y al soltar vuelve dentro con un spring. El diseño nunca puede quedar reposando fuera del área.

Cada plantilla de prenda define su área imprimible en coordenadas relativas, para que sirva igual en cualquier tamaño de pantalla.

### Salida del pedido

Al enviar se produce:

- El **mockup PNG** (prenda + diseño colocado).
- El **archivo original** del cliente, sin recomprimir — es lo que hace falta para imprimir.
- Un **texto de pedido**: producto, referencia, color, talla, cantidad, cara y código de referencia.

**Entrega:**

- **Móvil:** `navigator.share({ files })`, que comparte el PNG y el original directamente al chat de WhatsApp. Es donde vive WhatsApp y donde estará la mayoría del tráfico.
- **Escritorio:** descarga los dos archivos y abre WhatsApp Web con el texto ya escrito, indicando que adjunte lo descargado.

> **Simplificación deliberada:** sin backend, el escritorio queda en dos pasos. Se resuelve con una Cloudflare Pages Function + Resend que reciba el formulario y lo envíe por email con adjuntos (~30 min de trabajo, requiere una clave de API). **Se añade solo si se comprueba que se pierden pedidos de escritorio.**

---

## 8. Lo que se arregla sin trabajo extra

Rehacer la presentación elimina, por construcción, diez de los once problemas del informe del 11 de agosto:

| # del informe | Problema | Cómo desaparece |
|---|---|---|
| 1 | Ninguna foto de producto se ve | Las imágenes se sirven estáticas desde Cloudflare |
| 2 | La portada entera enlaza a `kamusino.es`, dominio muerto | No queda una sola URL del sitio viejo |
| 3 | Botón de WhatsApp invisible | Reconstruido |
| 4 | Imagen alojada en la demo del fabricante del tema | No hay tema de terceros |
| 5 | `meta description` = "Tienda creada con PrestaShop" | Metadatos reales por página |
| 6 | No hay `sitemap.xml` | Generado en el build |
| 7 | Banners de Halloween y San Valentín en agosto | No se replican |
| 8 | Fuente hebrea que falla por CORS | Fuentes autohospedadas |
| 9 | No existe flujo de personalización | Es la pieza central del proyecto |
| 10 | Banner de cookies que incumple el RGPD | **Sin analytics ni terceros, el sitio no pone cookies: no necesita banner** |

Queda pendiente del cliente el punto 11: redactar las páginas legales. Los huecos se dejan maquetados.

---

## 9. Verificación

Dos comprobaciones ejecutables, sin framework, con `node:test` y `assert`:

1. **`catalogo.json`**: todo producto tiene precio numérico mayor que 0, slug único, categoría existente y al menos una imagen **que existe en disco**. Falla si el scraper se rompe o si el servidor viejo devolvió páginas a medias — se detecta el mismo día, no tres semanas después.
2. **Área imprimible**: dado un diseño soltado fuera del rectángulo, la posición de reposo calculada queda dentro. Cubre el clamp elástico del configurador.

Manual, antes de enseñar nada al cliente: recorrido completo en móvil real y en escritorio, y un pedido de prueba que llegue de verdad al WhatsApp.

---

## 10. Fases

| Fase | Contenido | Bloquea a |
|---|---|---|
| **1. Rescate** | `scrape.mjs`, `catalogo.json`, imágenes en local, test de integridad | Todo lo demás. **Fecha límite dura: 10 de septiembre** |
| **2. Esqueleto** | Astro + Tailwind + fuentes + sistema de diseño; portada y categorías | 3 |
| **3. Fichas** | Ficha de producto, galería, selectores, buscador, filtros | 4 |
| **4. Configurador** | Canvas, gestos, springs, área imprimible, salida del pedido | 5 |
| **5. Cierre** | Legales, contacto, SEO, sitemap, despliegue en Cloudflare Pages | — |

La fase 1 es independiente del diseño y puede ejecutarse en paralelo a cualquier otra decisión.

---

## 11. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El servidor viejo se apaga antes de lo previsto | Se pierde el catálogo para siempre | Ejecutar la fase 1 **ya**; guardar `catalogo.json` e imágenes en dos sitios |
| El scraping tumba el servidor viejo | La tienda actual cae y la culpa es nuestra | 1 petición/segundo, reanudable, sin concurrencia |
| Páginas devueltas a medias por el servidor | Catálogo silenciosamente incompleto | El test de integridad y `scrape-report.json` lo detectan |
| El dominio no se recupera | La web nueva se queda en la URL de dev | Vía Acens como titular, en paralelo. No bloquea el desarrollo |
| Las fotos son de proveedor (Gildan y demás) | Ninguno nuevo | Son las mismas que la tienda ya usa hoy |

---

## 12. Fuera de alcance, con aviso por escrito al cliente

Debe constar por escrito, hoy:

- **Los pedidos, clientes y facturas históricas se pierden el 10 de septiembre.** La conservación fiscal obligatoria es de 4 años. Solo se rescatan con acceso al servidor, que el técnico no ha dado.
- El correo histórico `@kamusino.com` se pierde igualmente.
- El dominio sigue sin control: caduca el **26 de noviembre de 2026** y tiene el bloqueo de transferencia activo.
- PrestaShop 1.7.7.8 y PHP 7.4 están sin parches de seguridad. La web nueva no arrastra esa deuda; el servidor viejo sí, mientras siga encendido.
