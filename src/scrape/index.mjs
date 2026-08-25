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
