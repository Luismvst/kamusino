# Rescate del catálogo de Kamusino — Plan de implementación

> **Para agentes:** SUB-SKILL OBLIGATORIA: usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea a tarea. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** Extraer el catálogo completo de `kamusino.com` —productos, precios, variantes, textos e imágenes— a ficheros locales antes de que el servidor se apague el 10 de septiembre de 2026.

**Arquitectura:** Un script Node de un solo uso recorre las 26 categorías públicas, descarga cada ficha de producto y le extrae el atributo `data-product`, que PrestaShop 1.7 emite con el producto entero serializado en JSON. Los colores se leen de los *swatches* hex del HTML y las imágenes se descargan por su ruta real en disco (`/img/p/…`), no por la URL "bonita" que el nginx roto devuelve como 404. Salida: `src/data/catalogo.json` más las imágenes en `public/img/p/`.

**Stack:** Node 22 (`fetch`, `node:test`, `node:fs/promises`). **Cero dependencias externas.**

## Restricciones globales

- **Node >= 22.** Se usa `fetch` global y el runner `node --test`, ambos nativos.
- **Sin dependencias npm en este plan.** Nada de `cheerio`, `axios` ni `p-limit`. `data-product` es JSON y el resto son dos expresiones regulares sobre un HTML conocido y fijo.
- **Máximo 1 petición por segundo, sin concurrencia.** El servidor viejo es frágil; tumbarlo sería culpa nuestra y dejaría al cliente sin tienda.
- **User-Agent identificable:** `Kamusino-Rescate/1.0 (migracion autorizada; soporte@hazenergia.es)`.
- **Todo idempotente y reanudable.** Un corte a mitad se retoma sin repetir lo ya descargado.
- **Base URL:** `https://kamusino.com`
- Salida: `src/data/catalogo.json`, imágenes en `public/img/p/…`, incidencias en `scrape-report.json`.
- Los ficheros del proyecto van en la raíz del directorio actual (`Migracion-Kamusino/`). Los documentos `00`–`04`, `ESTADO.md` y `docs/` ya existentes no se tocan.

---

### Task 1: Arranque del proyecto y descubrimiento de categorías

**Ficheros:**
- Crear: `package.json`
- Crear: `.gitignore`
- Crear: `src/scrape/categorias.mjs`
- Crear: `tests/fixtures/portada.html`
- Test: `tests/categorias.test.mjs`

**Interfaces:**
- Consume: nada.
- Produce: `extraerCategorias(html: string) => Array<{id: number, slug: string, url: string}>` y la constante `BASE`.

- [ ] **Paso 1: Inicializar repositorio y proyecto**

```bash
cd "C:/Users/luism/Documents/Luis/PROYECTOS/CURSOR/Migracion-Kamusino"
git init
```

Crear `package.json`:

```json
{
  "name": "kamusino-web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "node --test tests/",
    "scrape": "node src/scrape/index.mjs"
  }
}
```

Crear `.gitignore`:

```
node_modules/
dist/
.astro/
*.log
```

- [ ] **Paso 2: Descargar el fixture de la portada**

```bash
mkdir -p tests/fixtures
curl -s -A "Kamusino-Rescate/1.0" https://kamusino.com/ -o tests/fixtures/portada.html
wc -c tests/fixtures/portada.html
```

Esperado: alrededor de `68000`. Si son menos de 20 000, el servidor devolvió una página de error: repetir.

- [ ] **Paso 3: Escribir el test que falla**

`tests/categorias.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extraerCategorias } from '../src/scrape/categorias.mjs';

const portada = await readFile(new URL('./fixtures/portada.html', import.meta.url), 'utf8');

test('extrae todas las categorías del menú', () => {
  const cats = extraerCategorias(portada);
  assert.ok(cats.length >= 20, `esperaba 20+ categorías, obtuve ${cats.length}`);
});

test('cada categoría tiene id numérico, slug y url absoluta', () => {
  for (const c of extraerCategorias(portada)) {
    assert.equal(typeof c.id, 'number');
    assert.ok(Number.isInteger(c.id) && c.id > 0);
    assert.match(c.slug, /^[a-z0-9-]+$/);
    assert.ok(c.url.startsWith('https://kamusino.com/'));
  }
});

test('no repite categorías', () => {
  const ids = extraerCategorias(portada).map((c) => c.id);
  assert.equal(ids.length, new Set(ids).size);
});

test('incluye la categoría 104-camisetas', () => {
  const cats = extraerCategorias(portada);
  const camisetas = cats.find((c) => c.id === 104);
  assert.ok(camisetas, 'falta la categoría 104');
  assert.equal(camisetas.slug, 'camisetas');
});
```

- [ ] **Paso 4: Ejecutar el test y comprobar que falla**

```bash
node --test tests/categorias.test.mjs
```

Esperado: FAIL — `Cannot find module '../src/scrape/categorias.mjs'`.

- [ ] **Paso 5: Implementar**

`src/scrape/categorias.mjs`:

```js
export const BASE = 'https://kamusino.com';

// Las URL de categoría de PrestaShop tienen la forma /{id}-{slug}.
// Se descartan las de producto, que llevan un segundo número y acaban en .html.
const RE_CATEGORIA = /https:\/\/kamusino\.com\/(\d+)-([a-z0-9-]+)(?=["'?#\s])/g;

export function extraerCategorias(html) {
  const porId = new Map();
  for (const [, id, slug] of html.matchAll(RE_CATEGORIA)) {
    const idNum = Number(id);
    if (porId.has(idNum)) continue;
    porId.set(idNum, { id: idNum, slug, url: `${BASE}/${id}-${slug}` });
  }
  return [...porId.values()].sort((a, b) => a.id - b.id);
}
```

- [ ] **Paso 6: Ejecutar el test y comprobar que pasa**

```bash
node --test tests/categorias.test.mjs
```

Esperado: `# pass 4`, `# fail 0`.

- [ ] **Paso 7: Commit**

```bash
git add package.json .gitignore src/scrape/categorias.mjs tests/
git commit -m "feat(rescate): extraer categorias del menu de la portada"
```

---

### Task 2: Cliente HTTP con límite de ritmo

**Ficheros:**
- Crear: `src/scrape/http.mjs`
- Test: `tests/http.test.mjs`

**Interfaces:**
- Consume: nada.
- Produce:
  - `UA: string`, `INTERVALO_MS: number`
  - `conRitmo(fn: Function, intervaloMs?: number) => Function`
  - `pedirTexto(url: string) => Promise<string>`
  - `pedirBinario(url: string) => Promise<Buffer>`
  - `esperar(ms: number) => Promise<void>`

Toda petición al servidor viejo pasa por aquí. Es el único sitio donde vive el límite de ritmo, así que no se puede saltar por descuido en otra tarea.

- [ ] **Paso 1: Escribir el test que falla**

`tests/http.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conRitmo, UA } from '../src/scrape/http.mjs';

test('el user-agent identifica el proyecto', () => {
  assert.match(UA, /Kamusino-Rescate/);
});

test('conRitmo separa las llamadas al menos el intervalo pedido', async () => {
  const marcas = [];
  const tic = conRitmo(async (n) => { marcas.push(n); return n; }, 50);
  const t0 = Date.now();
  await Promise.all([tic(1), tic(2), tic(3)]);
  const transcurrido = Date.now() - t0;
  assert.deepEqual(marcas, [1, 2, 3], 'debe respetar el orden de llamada');
  assert.ok(transcurrido >= 100, `esperaba >=100ms para 3 llamadas a 50ms, fueron ${transcurrido}ms`);
});

test('conRitmo propaga los errores sin bloquear la cola', async () => {
  const tic = conRitmo(async (n) => { if (n === 1) throw new Error('boom'); return n; }, 10);
  await assert.rejects(() => tic(1), /boom/);
  assert.equal(await tic(2), 2);
});
```

- [ ] **Paso 2: Ejecutar el test y comprobar que falla**

```bash
node --test tests/http.test.mjs
```

Esperado: FAIL — `Cannot find module '../src/scrape/http.mjs'`.

- [ ] **Paso 3: Implementar**

`src/scrape/http.mjs`:

```js
export const UA = 'Kamusino-Rescate/1.0 (migracion autorizada; soporte@hazenergia.es)';
export const INTERVALO_MS = 1000;

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Serializa las llamadas a `fn` dejando al menos `intervaloMs` entre cada una.
 * Sin concurrencia: el servidor viejo es frágil.
 */
export function conRitmo(fn, intervaloMs = INTERVALO_MS) {
  let cola = Promise.resolve();
  let ultima = 0;
  return (...args) => {
    const turno = cola.then(async () => {
      const espera = ultima + intervaloMs - Date.now();
      if (espera > 0) await esperar(espera);
      ultima = Date.now();
      return fn(...args);
    });
    // La cola avanza aunque este turno falle, para no atascar los siguientes.
    cola = turno.then(() => {}, () => {});
    return turno;
  };
}

async function traer(url, intentos = 3) {
  let ultimoError;
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
      return res;
    } catch (err) {
      ultimoError = err;
      if (i < intentos - 1) await esperar(2000 * (i + 1));
    }
  }
  throw ultimoError;
}

export const pedirTexto = conRitmo(async (url) => (await traer(url)).text());

export const pedirBinario = conRitmo(async (url) =>
  Buffer.from(await (await traer(url)).arrayBuffer()),
);
```

- [ ] **Paso 4: Ejecutar el test y comprobar que pasa**

```bash
node --test tests/http.test.mjs
```

Esperado: `# pass 3`, `# fail 0`.

- [ ] **Paso 5: Commit**

```bash
git add src/scrape/http.mjs tests/http.test.mjs
git commit -m "feat(rescate): cliente http con limite de 1 peticion por segundo"
```

---

### Task 3: Listar los productos de una categoría

**Ficheros:**
- Crear: `src/scrape/listado.mjs`
- Crear: `tests/fixtures/categoria-104.html`
- Test: `tests/listado.test.mjs`

**Interfaces:**
- Consume: nada.
- Produce:
  - `extraerUrlsProducto(html: string) => string[]` — URL absolutas, **deduplicadas por id de producto**.
  - `urlCategoriaCompleta(urlCategoria: string) => string`

La página de categoría enlaza cada producto una vez por cada combinación de color y talla: 246 enlaces para 20 productos. Hay que quedarse con uno por producto.

- [ ] **Paso 1: Descargar el fixture**

```bash
curl -s -A "Kamusino-Rescate/1.0" "https://kamusino.com/104-camisetas?resultsPerPage=9999999" -o tests/fixtures/categoria-104.html
wc -c tests/fixtures/categoria-104.html
```

Esperado: alrededor de `244000`.

- [ ] **Paso 2: Escribir el test que falla**

`tests/listado.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extraerUrlsProducto } from '../src/scrape/listado.mjs';

const html = await readFile(new URL('./fixtures/categoria-104.html', import.meta.url), 'utf8');

test('encuentra los 20 productos de la categoría', () => {
  const urls = extraerUrlsProducto(html);
  assert.equal(urls.length, 20, `la categoría dice "20 artículo(s)", obtuve ${urls.length}`);
});

test('deduplica las variantes del mismo producto', () => {
  const urls = extraerUrlsProducto(html);
  assert.equal(urls.length, new Set(urls).size);
  // 246 enlaces .html en bruto contra 20 productos: la deduplicación es obligatoria.
  const enBruto = html.match(/https:\/\/kamusino\.com\/[^"']*\.html/g) ?? [];
  assert.ok(enBruto.length > urls.length * 5, 'el fixture debería traer muchas más variantes que productos');
});

test('devuelve urls absolutas de ficha', () => {
  for (const u of extraerUrlsProducto(html)) {
    assert.match(u, /^https:\/\/kamusino\.com\/[a-z0-9-]+\/\d+-\d+-[a-z0-9-]+\.html$/);
  }
});
```

- [ ] **Paso 3: Ejecutar el test y comprobar que falla**

```bash
node --test tests/listado.test.mjs
```

Esperado: FAIL — `Cannot find module '../src/scrape/listado.mjs'`.

- [ ] **Paso 4: Implementar**

`src/scrape/listado.mjs`:

```js
// Ficha de producto: /{categoria}/{idProducto}-{idCombinacion}-{slug}.html
const RE_PRODUCTO = /https:\/\/kamusino\.com\/([a-z0-9-]+)\/(\d+)-(\d+)-([a-z0-9-]+)\.html/g;

export function extraerUrlsProducto(html) {
  const porProducto = new Map();
  for (const [url, , idProducto] of html.matchAll(RE_PRODUCTO)) {
    const id = Number(idProducto);
    // Nos quedamos con la primera variante encontrada: la ficha trae el producto entero.
    if (!porProducto.has(id)) porProducto.set(id, url);
  }
  return [...porProducto.values()];
}

export function urlCategoriaCompleta(urlCategoria) {
  return `${urlCategoria}?resultsPerPage=9999999`;
}
```

- [ ] **Paso 5: Ejecutar el test y comprobar que pasa**

```bash
node --test tests/listado.test.mjs
```

Esperado: `# pass 3`, `# fail 0`.

- [ ] **Paso 6: Commit**

```bash
git add src/scrape/listado.mjs tests/
git commit -m "feat(rescate): listar productos de categoria deduplicando variantes"
```

---

### Task 4: Parsear la ficha de producto

**Ficheros:**
- Crear: `src/scrape/producto.mjs`
- Crear: `tests/fixtures/producto-2158.html`
- Test: `tests/producto.test.mjs`

**Interfaces:**
- Consume: nada.
- Produce:
  - `extraerDataProduct(html: string) => object` — el JSON crudo de PrestaShop.
  - `extraerColores(html: string) => Array<{nombre: string, hex: string}>`
  - `extraerTallas(html: string) => string[]`
  - `rutaImagen(idImagen: number, tamano?: string) => string`
  - `normalizar(html: string) => Producto`

Forma de `Producto`, que consumen las Tasks 6 y 7:

```js
{
  id: 2158,
  slug: 'camiseta-gildan-sofstyle',
  nombre: 'Camiseta Gildan Sofstyle® Unisex',
  categoriaSlug: 'personaliza',
  precio: 12,
  referencia: '',
  descripcionCorta: '<p>…</p>',
  descripcion: '<p>…</p>',
  metaTitulo: '…',
  metaDescripcion: '…',
  imagenes: [{ id: 11384, ruta: '/img/p/1/1/3/8/4/11384-thickbox_default.jpg', ancho: 1100, alto: 1422, leyenda: '' }],
  colores: [{ nombre: 'Blanco', hex: '#ffffff' }],
  tallas: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  personalizable: true,
  camposTexto: 1,
  camposArchivo: 0,
}
```

La Task 6 le añade `categoriaId: number` antes de guardarlo.

**Nota de diseño:** `colores` son valores hex, no fotos. El producto tiene **una sola imagen** y los 17 colores se pintan como muestras de color. El configurador tendrá que teñir la imagen base; no existe una foto por color que descargar.

- [ ] **Paso 1: Descargar el fixture**

```bash
curl -s -A "Kamusino-Rescate/1.0" "https://kamusino.com/personaliza/2158-11723-camiseta-gildan-sofstyle.html" -o tests/fixtures/producto-2158.html
wc -c tests/fixtures/producto-2158.html
```

Esperado: alrededor de `178000`.

- [ ] **Paso 2: Escribir el test que falla**

`tests/producto.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extraerDataProduct, extraerColores, extraerTallas, rutaImagen, normalizar }
  from '../src/scrape/producto.mjs';

const html = await readFile(new URL('./fixtures/producto-2158.html', import.meta.url), 'utf8');

test('extraerDataProduct devuelve el objeto de PrestaShop', () => {
  const d = extraerDataProduct(html);
  assert.equal(Number(d.id_product), 2158);
  assert.equal(d.link_rewrite, 'camiseta-gildan-sofstyle');
  assert.equal(d.price_amount, 12);
  assert.equal(d.category, 'personaliza');
});

test('rutaImagen reparte los dígitos del id en carpetas', () => {
  assert.equal(rutaImagen(11384), '/img/p/1/1/3/8/4/11384-thickbox_default.jpg');
  assert.equal(rutaImagen(7, 'home_default'), '/img/p/7/7-home_default.jpg');
});

test('extraerColores devuelve nombres y hex', () => {
  const colores = extraerColores(html);
  assert.ok(colores.length >= 15, `esperaba 15+ colores, obtuve ${colores.length}`);
  for (const c of colores) {
    assert.match(c.hex, /^#[0-9a-f]{6}$/);
    assert.ok(c.nombre.length > 0);
  }
  assert.ok(colores.some((c) => c.hex === '#ffffff'), 'debe existir el blanco');
});

test('extraerTallas devuelve las tallas del grupo', () => {
  const tallas = extraerTallas(html);
  assert.equal(tallas.length, 7);
  assert.ok(tallas.includes('XS'));
});

test('normalizar produce un producto completo', () => {
  const p = normalizar(html);
  assert.equal(p.id, 2158);
  assert.equal(p.precio, 12);
  assert.equal(p.slug, 'camiseta-gildan-sofstyle');
  assert.ok(p.imagenes.length >= 1);
  assert.match(p.imagenes[0].ruta, /^\/img\/p\//);
  assert.equal(p.personalizable, true);
  assert.equal(p.camposTexto, 1);
  assert.equal(p.camposArchivo, 0);
});

test('normalizar no deja precios a cero ni nombres vacíos', () => {
  const p = normalizar(html);
  assert.ok(p.precio > 0);
  assert.ok(p.nombre.trim().length > 0);
});
```

- [ ] **Paso 3: Ejecutar el test y comprobar que falla**

```bash
node --test tests/producto.test.mjs
```

Esperado: FAIL — `Cannot find module '../src/scrape/producto.mjs'`.

- [ ] **Paso 4: Implementar**

`src/scrape/producto.mjs`:

```js
const ENTIDADES = { '&quot;': '"', '&amp;': '&', '&#039;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' };

function decodificar(s) {
  return s.replace(/&quot;|&amp;|&#039;|&lt;|&gt;|&nbsp;/g, (m) => ENTIDADES[m]);
}

/**
 * PrestaShop 1.7 serializa el producto entero en el atributo data-product
 * del contenedor de la ficha. Es JSON con las entidades HTML escapadas.
 */
export function extraerDataProduct(html) {
  const m = html.match(/data-product="([^"]+)"/);
  if (!m) throw new Error('no se encontró data-product en la ficha');
  return JSON.parse(decodificar(m[1]));
}

/**
 * Las imágenes viven en /img/p/ con los dígitos del id como carpetas:
 * 11384 -> /img/p/1/1/3/8/4/11384-thickbox_default.jpg
 * La URL "bonita" que genera PrestaShop devuelve 404 porque al nginx
 * del servidor viejo le faltan las reglas de reescritura.
 */
export function rutaImagen(idImagen, tamano = 'thickbox_default') {
  const digitos = String(idImagen).split('').join('/');
  return `/img/p/${digitos}/${idImagen}-${tamano}.jpg`;
}

// Cada muestra de color es un <li> con el nombre en un atributo de texto
// y el hex en un style inline.
export function extraerColores(html) {
  const colores = [];
  const vistos = new Set();
  const bloques = html.match(/<li[^>]*class="[^"]*input-container[^"]*"[\s\S]*?<\/li>/g) ?? [];
  for (const b of bloques) {
    const hex = b.match(/background(?:-color)?:\s*(#[0-9A-Fa-f]{6})/)?.[1]?.toLowerCase();
    if (!hex) continue;
    const nombre = decodificar(
      b.match(/aria-label="([^"]+)"/)?.[1] ??
      b.match(/title="([^"]+)"/)?.[1] ??
      b.match(/<span[^>]*class="[^"]*sr-only[^"]*"[^>]*>([^<]+)</)?.[1] ??
      '',
    ).trim();
    const clave = `${nombre}|${hex}`;
    if (!nombre || vistos.has(clave)) continue;
    vistos.add(clave);
    colores.push({ nombre, hex });
  }
  return colores;
}

export function extraerTallas(html) {
  const select = html.match(/<select[^>]*name="group\[\d+\]"([\s\S]*?)<\/select>/)?.[1];
  if (!select) return [];
  return [...select.matchAll(/<option[^>]*>([^<]+)<\/option>/g)]
    .map(([, t]) => decodificar(t).trim())
    .filter(Boolean);
}

export function normalizar(html) {
  const d = extraerDataProduct(html);
  const imagenes = (d.images ?? []).map((img) => ({
    id: Number(img.id_image),
    ruta: rutaImagen(img.id_image),
    ancho: img.bySize?.thickbox_default?.width ?? img.large?.width ?? null,
    alto: img.bySize?.thickbox_default?.height ?? img.large?.height ?? null,
    leyenda: img.legend ?? '',
  }));

  return {
    id: Number(d.id_product),
    slug: d.link_rewrite,
    nombre: decodificar(String(d.name ?? '')).trim(),
    categoriaSlug: d.category ?? '',
    precio: Number(d.price_amount),
    referencia: d.reference ?? '',
    descripcionCorta: d.description_short ?? '',
    descripcion: d.description ?? '',
    metaTitulo: d.meta_title ?? '',
    metaDescripcion: d.meta_description ?? '',
    imagenes,
    colores: extraerColores(html),
    tallas: extraerTallas(html),
    personalizable: Number(d.customizable) > 0,
    camposTexto: Number(d.text_fields ?? 0),
    camposArchivo: Number(d.uploadable_files ?? 0),
  };
}
```

- [ ] **Paso 5: Ejecutar el test y comprobar que pasa**

```bash
node --test tests/producto.test.mjs
```

Esperado: `# pass 6`, `# fail 0`.

Si `extraerColores` devuelve menos de 15, imprimir un bloque de muestra para ajustar la expresión regular al marcado real del tema:

```bash
node -e "const h=require('fs').readFileSync('tests/fixtures/producto-2158.html','utf8'); const i=h.indexOf('#003870'); console.log(h.slice(i-700, i+200));"
```

Ajustar `extraerColores` a lo que muestre esa salida y volver al paso 5.

- [ ] **Paso 6: Commit**

```bash
git add src/scrape/producto.mjs tests/
git commit -m "feat(rescate): parsear ficha de producto desde data-product"
```

---

### Task 5: Descargar imágenes de forma idempotente

**Ficheros:**
- Crear: `src/scrape/imagenes.mjs`
- Test: `tests/imagenes.test.mjs`

**Interfaces:**
- Consume: `pedirBinario` de `src/scrape/http.mjs`, `BASE` de `src/scrape/categorias.mjs`.
- Produce: `descargarImagen(ruta: string, opciones?: {destinoBase?: string, traer?: Function}) => Promise<'descargada'|'ya-existia'>`

- [ ] **Paso 1: Escribir el test que falla**

`tests/imagenes.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { descargarImagen } from '../src/scrape/imagenes.mjs';

test('descarga y guarda respetando la ruta', async () => {
  const base = await mkdtemp(join(tmpdir(), 'km-'));
  let llamadas = 0;
  const traer = async () => { llamadas++; return Buffer.from('JPEGFALSO'); };

  const r = await descargarImagen('/img/p/1/2/12-thickbox_default.jpg', { destinoBase: base, traer });

  assert.equal(r, 'descargada');
  assert.equal(llamadas, 1);
  const guardado = await readFile(join(base, 'img/p/1/2/12-thickbox_default.jpg'), 'utf8');
  assert.equal(guardado, 'JPEGFALSO');
});

test('no vuelve a pedir lo que ya está en disco', async () => {
  const base = await mkdtemp(join(tmpdir(), 'km-'));
  const destino = join(base, 'img/p/1/2/12-thickbox_default.jpg');
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, 'YA');

  let llamadas = 0;
  const traer = async () => { llamadas++; return Buffer.from('NUEVO'); };

  const r = await descargarImagen('/img/p/1/2/12-thickbox_default.jpg', { destinoBase: base, traer });

  assert.equal(r, 'ya-existia');
  assert.equal(llamadas, 0, 'no debe tocar la red si el fichero existe');
  assert.equal(await readFile(destino, 'utf8'), 'YA');
});

test('rechaza una respuesta vacía en vez de guardar un fichero de 0 bytes', async () => {
  const base = await mkdtemp(join(tmpdir(), 'km-'));
  const traer = async () => Buffer.alloc(0);
  await assert.rejects(
    () => descargarImagen('/img/p/9/9-thickbox_default.jpg', { destinoBase: base, traer }),
    /vacía/,
  );
});
```

- [ ] **Paso 2: Ejecutar el test y comprobar que falla**

```bash
node --test tests/imagenes.test.mjs
```

Esperado: FAIL — `Cannot find module '../src/scrape/imagenes.mjs'`.

- [ ] **Paso 3: Implementar**

`src/scrape/imagenes.mjs`:

```js
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pedirBinario } from './http.mjs';
import { BASE } from './categorias.mjs';

async function existe(p) {
  try {
    const s = await stat(p);
    return s.size > 0;
  } catch {
    return false;
  }
}

/**
 * `traer` se inyecta para poder probar sin red.
 * Un fichero de 0 bytes es peor que ninguno: pasaría el test de integridad
 * y dejaría un hueco invisible en la web. Por eso se rechaza.
 */
export async function descargarImagen(ruta, { destinoBase = 'public', traer = pedirBinario } = {}) {
  const destino = join(destinoBase, ruta.replace(/^\//, ''));
  if (await existe(destino)) return 'ya-existia';

  const datos = await traer(`${BASE}${ruta}`);
  if (!datos || datos.length === 0) throw new Error(`respuesta vacía para ${ruta}`);

  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, datos);
  return 'descargada';
}
```

- [ ] **Paso 4: Ejecutar el test y comprobar que pasa**

```bash
node --test tests/imagenes.test.mjs
```

Esperado: `# pass 3`, `# fail 0`.

- [ ] **Paso 5: Commit**

```bash
git add src/scrape/imagenes.mjs tests/imagenes.test.mjs
git commit -m "feat(rescate): descarga idempotente de imagenes"
```

---

### Task 6: Orquestador

**Ficheros:**
- Crear: `src/scrape/index.mjs`
- Modificar: `.gitignore` (añadir `scrape-report.json`)

**Interfaces:**
- Consume: `BASE` y `extraerCategorias` (Task 1), `pedirTexto` (Task 2), `extraerUrlsProducto` y `urlCategoriaCompleta` (Task 3), `normalizar` (Task 4), `descargarImagen` (Task 5).
- Produce: `src/data/catalogo.json` con la forma `{generado, origen, categorias, productos}`, y `scrape-report.json` con `{incidencias: [{etapa, url, error}]}`.

Esta tarea no lleva test unitario propio: es cableado entre piezas ya probadas. Su verificación es la Task 7, que valida la salida real.

- [ ] **Paso 1: Implementar**

`src/scrape/index.mjs`:

```js
import { mkdir, writeFile } from 'node:fs/promises';
import { BASE, extraerCategorias } from './categorias.mjs';
import { pedirTexto } from './http.mjs';
import { extraerUrlsProducto, urlCategoriaCompleta } from './listado.mjs';
import { normalizar } from './producto.mjs';
import { descargarImagen } from './imagenes.mjs';

const incidencias = [];

function fallo(etapa, url, err) {
  incidencias.push({ etapa, url, error: String(err.message ?? err) });
  console.error(`  x ${etapa}: ${url} — ${err.message ?? err}`);
}

async function main() {
  console.log('1/4 Categorías…');
  const categorias = extraerCategorias(await pedirTexto(`${BASE}/`));
  console.log(`    ${categorias.length} categorías`);

  console.log('2/4 Listados…');
  const urlsProducto = new Map(); // idProducto -> {url, categoriaId}
  for (const cat of categorias) {
    try {
      const html = await pedirTexto(urlCategoriaCompleta(cat.url));
      const urls = extraerUrlsProducto(html);
      for (const u of urls) {
        const id = Number(u.match(/\/(\d+)-\d+-/)[1]);
        if (!urlsProducto.has(id)) urlsProducto.set(id, { url: u, categoriaId: cat.id });
      }
      console.log(`    ${cat.slug}: ${urls.length}`);
    } catch (err) {
      fallo('listado', cat.url, err);
    }
  }
  console.log(`    ${urlsProducto.size} productos únicos`);

  console.log('3/4 Fichas…');
  const productos = [];
  let n = 0;
  for (const [, { url, categoriaId }] of urlsProducto) {
    n++;
    try {
      const p = normalizar(await pedirTexto(url));
      p.categoriaId = categoriaId;
      productos.push(p);
      console.log(`    [${n}/${urlsProducto.size}] ${p.slug} — ${p.precio} € — ${p.imagenes.length} img`);
    } catch (err) {
      fallo('ficha', url, err);
    }
  }

  console.log('4/4 Imágenes…');
  const rutas = [...new Set(productos.flatMap((p) => p.imagenes.map((i) => i.ruta)))];
  let nuevas = 0;
  let cacheadas = 0;
  for (const ruta of rutas) {
    try {
      if ((await descargarImagen(ruta)) === 'descargada') nuevas++;
      else cacheadas++;
    } catch (err) {
      fallo('imagen', ruta, err);
    }
  }
  console.log(`    ${nuevas} descargadas, ${cacheadas} ya estaban`);

  await mkdir('src/data', { recursive: true });
  await writeFile(
    'src/data/catalogo.json',
    JSON.stringify({ generado: new Date().toISOString(), origen: BASE, categorias, productos }, null, 2),
  );
  await writeFile('scrape-report.json', JSON.stringify({ incidencias }, null, 2));

  console.log(`\n${productos.length} productos, ${rutas.length} imágenes, ${incidencias.length} incidencias`);
  if (incidencias.length) console.log('Revisa scrape-report.json ANTES del 10 de septiembre.');
}

await main();
```

- [ ] **Paso 2: Añadir el informe al .gitignore**

Añadir al final de `.gitignore`:

```
scrape-report.json
```

- [ ] **Paso 3: Prueba en seco sobre una sola categoría**

Antes de lanzar las 26, comprobar el circuito completo con una:

```bash
node -e "
(async () => {
  const { pedirTexto } = await import('./src/scrape/http.mjs');
  const { extraerUrlsProducto, urlCategoriaCompleta } = await import('./src/scrape/listado.mjs');
  const { normalizar } = await import('./src/scrape/producto.mjs');
  const html = await pedirTexto(urlCategoriaCompleta('https://kamusino.com/104-camisetas'));
  const urls = extraerUrlsProducto(html);
  console.log('productos:', urls.length);
  const p = normalizar(await pedirTexto(urls[0]));
  console.log(p.slug, p.precio, p.colores.length + ' colores', p.tallas.length + ' tallas', p.imagenes.length + ' img');
})();
"
```

Esperado: `productos: 20`, y una línea con slug, precio mayor que 0, 15+ colores, 7 tallas y al menos 1 imagen. Si algo sale a cero, corregir la tarea correspondiente antes de seguir.

- [ ] **Paso 4: Commit**

```bash
git add src/scrape/index.mjs .gitignore
git commit -m "feat(rescate): orquestador del rescate de catalogo"
```

---

### Task 7: Test de integridad del catálogo

**Ficheros:**
- Crear: `tests/catalogo.test.mjs`

**Interfaces:**
- Consume: `src/data/catalogo.json` (Task 6) y las imágenes en `public/img/p/` (Task 5).
- Produce: nada. Es la red de seguridad del plan entero.

Este test es la razón de ser del plan: detecta el mismo día que el catálogo salió incompleto, en vez de descubrirlo en octubre con el servidor ya apagado.

- [ ] **Paso 1: Escribir el test**

`tests/catalogo.test.mjs`:

```js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const RUTA = new URL('../src/data/catalogo.json', import.meta.url);

let catalogo;
try {
  catalogo = JSON.parse(await readFile(RUTA, 'utf8'));
} catch {
  catalogo = null;
}

describe('integridad del catálogo rescatado', { skip: catalogo ? false : 'aún no se ha ejecutado npm run scrape' }, () => {
  test('hay categorías y productos', () => {
    // Umbral deliberadamente bajo: varias de las 26 categorías son padres
    // (97-textil) o subcategorías de género (242-247), así que el total real
    // se desconoce hasta la primera ejecución. Este test solo detecta un
    // rescate catastróficamente vacío; el número real se fija en la Task 8.
    assert.ok(catalogo.categorias.length >= 20, `solo ${catalogo.categorias.length} categorías`);
    assert.ok(catalogo.productos.length >= 50, `solo ${catalogo.productos.length} productos`);
  });

  test('todo producto tiene precio positivo', () => {
    const malos = catalogo.productos.filter((p) => !(typeof p.precio === 'number' && p.precio > 0));
    assert.equal(malos.length, 0, `sin precio válido: ${malos.map((p) => p.slug).join(', ')}`);
  });

  test('todo producto tiene nombre', () => {
    const malos = catalogo.productos.filter((p) => !p.nombre?.trim());
    assert.equal(malos.length, 0, `sin nombre: ${malos.map((p) => p.id).join(', ')}`);
  });

  test('los slugs no se repiten', () => {
    const slugs = catalogo.productos.map((p) => p.slug);
    const repetidos = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    assert.deepEqual([...new Set(repetidos)], []);
  });

  test('toda categoría referenciada existe', () => {
    const ids = new Set(catalogo.categorias.map((c) => c.id));
    const huerfanos = catalogo.productos.filter((p) => !ids.has(p.categoriaId));
    assert.equal(huerfanos.length, 0, `categoría inexistente: ${huerfanos.map((p) => p.slug).join(', ')}`);
  });

  test('todo producto tiene al menos una imagen', () => {
    const sinFoto = catalogo.productos.filter((p) => !p.imagenes?.length);
    assert.equal(sinFoto.length, 0, `sin imágenes: ${sinFoto.map((p) => p.slug).join(', ')}`);
  });

  test('toda imagen existe en disco y no está vacía', async () => {
    const faltan = [];
    for (const p of catalogo.productos) {
      for (const img of p.imagenes) {
        const destino = join('public', img.ruta.replace(/^\//, ''));
        try {
          const s = await stat(destino);
          if (s.size === 0) faltan.push(`${destino} (0 bytes)`);
        } catch {
          faltan.push(destino);
        }
      }
    }
    assert.equal(faltan.length, 0, `imágenes que faltan:\n${faltan.slice(0, 20).join('\n')}`);
  });

  test('los productos personalizables declaran sus campos', () => {
    for (const p of catalogo.productos.filter((x) => x.personalizable)) {
      assert.ok(
        p.camposTexto + p.camposArchivo > 0,
        `${p.slug} dice ser personalizable pero no declara campos`,
      );
    }
  });
});
```

- [ ] **Paso 2: Ejecutar y comprobar que se salta**

```bash
node --test tests/catalogo.test.mjs
```

Esperado: los tests aparecen como `skipped` con el motivo `aún no se ha ejecutado npm run scrape`. Ese salto es correcto ahora y desaparece en la Task 8.

- [ ] **Paso 3: Commit**

```bash
git add tests/catalogo.test.mjs
git commit -m "test(rescate): integridad del catalogo rescatado"
```

---

### Task 8: Ejecutar el rescate y ponerlo a salvo

**Ficheros:**
- Genera: `src/data/catalogo.json`, `public/img/p/**`, `scrape-report.json`

Con 26 categorías, unos cientos de productos y sus imágenes, a una petición por segundo, la ejecución **tarda entre 20 y 40 minutos**. Es lo previsto: el límite protege el servidor del cliente.

- [ ] **Paso 1: Ejecutar la batería completa antes de tocar la red**

```bash
npm test
```

Esperado: todo pasa salvo `catalogo.test.mjs`, que sale como `skipped`.

- [ ] **Paso 2: Lanzar el rescate**

```bash
npm run scrape 2>&1 | tee scrape.log
```

Esperado: avanza por las cuatro fases imprimiendo cada producto. Si se corta, **volver a lanzarlo**: las imágenes ya descargadas no se vuelven a pedir.

- [ ] **Paso 3: Verificar la integridad**

```bash
npm test
```

Esperado: `catalogo.test.mjs` ya no se salta y **pasa entero**. Si falla, leer el mensaje: dice exactamente qué producto o qué imagen falta. Corregir y volver al paso 2.

- [ ] **Paso 4: Revisar las incidencias**

```bash
node -e "const r=require('./scrape-report.json'); console.log(r.incidencias.length+' incidencias'); console.table(r.incidencias.slice(0,30));"
```

Cada incidencia es una URL que el servidor no sirvió. **Reintentar a mano todas antes del 10 de septiembre.** Después de esa fecha ya no hay segunda oportunidad.

- [ ] **Paso 5: Comprobar el tamaño de lo rescatado**

```bash
du -sh public/img
node -e "const c=require('./src/data/catalogo.json'); console.log(c.productos.length+' productos, '+c.categorias.length+' categorías');"
```

Anotar ambos números. Son la referencia contra la que se compara cualquier ejecución futura.

- [ ] **Paso 6: Commit del catálogo**

```bash
git add src/data/catalogo.json public/img
git commit -m "data: catalogo de kamusino rescatado el 25 de agosto de 2026"
```

- [ ] **Paso 7: Copia fuera de este disco**

El repositorio local no es una copia de seguridad: si se estropea el disco, se pierde el rescate y el original ya no existe.

```bash
tar -czf kamusino-catalogo-2026-08-25.tar.gz src/data/catalogo.json public/img
```

Subir ese `.tar.gz` a la nube. **Hasta que esté en un segundo sitio, el rescate no está hecho.**

---

## Al terminar

Con el catálogo en disco y el test en verde, el servidor viejo deja de ser crítico y se escribe el plan de la web (fases 2 a 5 del spec): esqueleto Astro, fichas, configurador y despliegue en Cloudflare Pages. Ese plan se escribe **después**, y a propósito: su contenido depende de los datos reales. Este rescate ya ha corregido dos supuestos del spec —los colores son valores hex sobre una única foto, y la personalización actual es solo texto sin subida de archivos—, y planificar la web contra un catálogo imaginario habría producido tareas equivocadas.

Aviso pendiente y sin dependencias técnicas: comunicar por escrito al cliente que **los pedidos, clientes y facturas históricas se pierden el 10 de septiembre** salvo que el técnico entregue acceso al servidor.
