import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { BASE, extraerCategorias } from './categorias.mjs';
import { pedirTexto } from './http.mjs';
import { articulosDeclarados, extraerUrlsProducto, idProductoDeUrl, urlCategoriaCompleta } from './listado.mjs';
import { normalizar } from './producto.mjs';
import { descargarImagen } from './imagenes.mjs';

const incidencias = [];

function fallo(etapa, url, err) {
  incidencias.push({ etapa, url, error: String(err.message ?? err) });
  console.error(`  x ${etapa}: ${url} — ${err.message ?? err}`);
}

const RUTA_CATALOGO = 'src/data/catalogo.json';

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

/**
 * Un segundo intento no puede dejarnos peor que el primero. Sin esto, el
 * finally de una ejecución que falle pronto sustituiría un catálogo bueno por
 * uno vacío — y "si se corta, vuelve a lanzarlo" es el procedimiento normal.
 * Devuelve los ids ya rescatados SIN avisos, que son los que no hace falta
 * volver a pedir. Los que traen avisos sí se reintentan.
 */
async function sembrarDesdeDisco() {
  let previo;
  try {
    previo = JSON.parse(await readFile(RUTA_CATALOGO, 'utf8'));
  } catch {
    return new Set(); // No hay catálogo previo, o no parsea: empezamos de cero.
  }
  await copyFile(RUTA_CATALOGO, `${RUTA_CATALOGO}.bak`).catch(() => {});
  // Un fichero que parsea pero no tiene la forma esperada resucitaría el fallo que la
  // siembra vino a cerrar: al acceder a sus campos lanzaría, y el finally de main()
  // guardaría un catálogo vacío. La copia .bak ya está hecha, así que salir es seguro.
  if (!previo || !Array.isArray(previo.categorias) || !Array.isArray(previo.productos)) {
    console.log(`Hay un ${RUTA_CATALOGO} con forma inesperada. Copia en ${RUTA_CATALOGO}.bak; se empieza de cero.`);
    return new Set();
  }
  categorias = previo.categorias;
  productos.push(...previo.productos);
  const buenos = new Set(productos.filter((p) => !p.avisos?.length).map((p) => p.id));
  console.log(`Reanudando: ${productos.length} productos en disco, ${buenos.size} sin avisos que no se volverán a pedir.`);
  return buenos;
}

async function guardar() {
  await mkdir('src/data', { recursive: true });
  await escribirAtomico(
    RUTA_CATALOGO,
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
    const yaBuenos = await sembrarDesdeDisco();

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
    if (categorias.length < 26) {
      fallo('categorias-incompletas', BASE,
        new Error(`esperaba 26 categorías y salieron ${categorias.length}`));
    }

    console.log('2/4 Listados…');
    const urlsProducto = new Map(); // idProducto -> {url, categoriaId}
    for (const cat of categorias) {
      try {
        const html = await pedirTexto(urlCategoriaCompleta(cat.url));
        const urls = extraerUrlsProducto(html);
        const declarados = articulosDeclarados(html);
        if (declarados !== null && declarados !== urls.length) {
          fallo('listado-incompleto', cat.url,
            new Error(`la página declara ${declarados} artículos y extrajimos ${urls.length}`));
        }
        for (const u of urls) {
          const id = idProductoDeUrl(u);
          if (id === null) {
            fallo('url-producto', u, new Error('no se pudo extraer el id de producto'));
            continue;
          }
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
    for (const [id, { url, categoriaId }] of urlsProducto) {
      if (yaBuenos.has(id)) { n++; continue; }
      n++;
      try {
        const p = normalizar(await pedirTexto(url));
        p.categoriaId = categoriaId;
        const iExistente = productos.findIndex((x) => x.id === p.id);
        if (iExistente >= 0) productos[iExistente] = p;
        else productos.push(p);
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
