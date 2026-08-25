import { mkdir, rename, writeFile } from 'node:fs/promises';
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

// Estado acumulado, visible para guardar() desde cualquier punto de la ejecución.
let categorias = [];
const productos = [];

/**
 * Escritura atómica: a un temporal y luego rename, que dentro del mismo volumen
 * es atómico. writeFile a secas trunca el destino antes de escribir, así que un
 * corte a media escritura dejaría el fichero corrupto Y habría destruido ya la
 * copia buena del guardado anterior. Con 26 guardados por ejecución, esa ventana
 * se abre 26 veces.
 */
async function escribirAtomico(ruta, contenido) {
  const temporal = `${ruta}.tmp`;
  await writeFile(temporal, contenido);
  await rename(temporal, ruta);
}

async function guardar() {
  await mkdir('src/data', { recursive: true });
  await escribirAtomico(
    'src/data/catalogo.json',
    JSON.stringify({ generado: new Date().toISOString(), origen: BASE, categorias, productos }, null, 2),
  );
  await escribirAtomico('scrape-report.json', JSON.stringify({ incidencias }, null, 2));
}

// Un Ctrl+C a los 35 minutos no puede tirar 35 minutos de trabajo.
async function guardarYSalir(senal) {
  console.log(`\nInterrumpido (${senal}): guardando lo rescatado hasta ahora…`);
  await guardar();
  process.exit(130);
}

process.on('SIGINT', () => guardarYSalir('SIGINT'));
process.on('SIGTERM', () => guardarYSalir('SIGTERM'));

async function main() {
  try {
    console.log('1/4 Categorías…');
    let html;
    try {
      html = await pedirTexto(`${BASE}/`);
    } catch (err) {
      fallo('categorias', BASE, err);
      throw err;
    }
    categorias = extraerCategorias(html);
    console.log(`    ${categorias.length} categorías`);

    console.log('2/4 Listados…');
    const urlsProducto = new Map(); // idProducto -> {url, categoriaId}
    for (const cat of categorias) {
      try {
        const html = await pedirTexto(urlCategoriaCompleta(cat.url));
        const urls = extraerUrlsProducto(html);
        for (const u of urls) {
          const m = u.match(/\/(\d+)-\d+-/);
          if (!m) {
            fallo('url-producto', u, new Error('no se pudo extraer el id de producto'));
            continue;
          }
          const id = Number(m[1]);
          if (!urlsProducto.has(id)) urlsProducto.set(id, { url: u, categoriaId: cat.id });
        }
        console.log(`    ${cat.slug}: ${urls.length}`);
      } catch (err) {
        fallo('listado', cat.url, err);
      }
    }
    console.log(`    ${urlsProducto.size} productos únicos`);

    console.log('3/4 Fichas…');
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
      if (n % 20 === 0) await guardar();
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

    console.log(`\n${productos.length} productos, ${rutas.length} imágenes, ${incidencias.length} incidencias`);
    if (incidencias.length) console.log('Revisa scrape-report.json ANTES del 10 de septiembre.');
  } finally {
    await guardar();
  }
}

await main();
