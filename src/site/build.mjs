import { mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  cargarCatalogo, GRUPOS, productosDeGrupo, urlProducto, urlCategoria,
} from './datos.mjs';
import {
  paginaHome, paginaCategoria, paginaProducto, paginaContacto,
  paginaAvisoLegal, paginaPrivacidad, paginaCondiciones, paginaDevoluciones,
  paginaEditor,
  SITIO_INDEXABLE,
} from './plantillas.mjs';

const SALIDA = 'public';

async function escribir(rutaRelativa, html) {
  const destino = `${SALIDA}${rutaRelativa}`;
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, html);
}

// Todo lo que este script genera, para poder borrarlo limpio en cada build.
// Sin esto, una página cuya URL cambia entre ejecuciones (por ejemplo al
// arreglar un slug) deja huérfana la versión vieja en vez de sustituirla.
const DIRECTORIOS_GENERADOS = ['producto', 'categoria', 'contacto', 'aviso-legal', 'privacidad', 'condiciones-de-contratacion', 'devoluciones', 'personalizar'];
const FICHEROS_GENERADOS = ['index.html', 'sitemap.xml', 'robots.txt', 'catalogo.json'];

async function limpiarSalidaAnterior() {
  for (const dir of DIRECTORIOS_GENERADOS) await rm(`${SALIDA}/${dir}`, { recursive: true, force: true });
  for (const f of FICHEROS_GENERADOS) await rm(`${SALIDA}/${f}`, { force: true });
}

function sitemapXml(rutas) {
  const base = 'https://kamusino.pages.dev'; // se actualiza al mover al dominio real
  const urls = rutas.map((r) => `  <url><loc>${base}${r}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function robotsTxt() {
  return SITIO_INDEXABLE
    ? 'User-agent: *\nAllow: /\nSitemap: https://kamusino.pages.dev/sitemap.xml\n'
    : 'User-agent: *\nDisallow: /\n'; // dominio de previsualización: fuera de los buscadores
}

async function main() {
  await limpiarSalidaAnterior();

  const catalogo = await cargarCatalogo();
  const rutas = ['/'];

  console.log(`Generando sitio: ${catalogo.productos.length} productos en ${GRUPOS.length} categorías…`);

  await escribir('/index.html', paginaHome({ productos: catalogo.productos }));

  for (const grupo of GRUPOS) {
    const productos = productosDeGrupo(catalogo.productos, grupo.slug);
    await escribir(`${urlCategoria(grupo)}index.html`, paginaCategoria({ grupo, productos }));
    rutas.push(urlCategoria(grupo));
    console.log(`  ${grupo.nombre}: ${productos.length} productos`);
  }

  for (const producto of catalogo.productos) {
    await escribir(`${urlProducto(producto)}index.html`, paginaProducto({ producto }));
    rutas.push(urlProducto(producto));
  }

  const ropa = productosDeGrupo(catalogo.productos, 'ropa-personalizada');
  await escribir('/personalizar/index.html', paginaEditor({ productos: ropa }));
  rutas.push('/personalizar/');

  await escribir('/contacto/index.html', paginaContacto());
  rutas.push('/contacto/');

  await escribir('/aviso-legal/index.html', paginaAvisoLegal());
  await escribir('/privacidad/index.html', paginaPrivacidad());
  await escribir('/condiciones-de-contratacion/index.html', paginaCondiciones());
  await escribir('/devoluciones/index.html', paginaDevoluciones());
  rutas.push('/aviso-legal/', '/privacidad/', '/condiciones-de-contratacion/', '/devoluciones/');

  await writeFile(`${SALIDA}/sitemap.xml`, sitemapXml(rutas));
  await writeFile(`${SALIDA}/robots.txt`, robotsTxt());

  console.log(`\n${rutas.length} páginas generadas en ${SALIDA}/`);
  if (!SITIO_INDEXABLE) console.log('Nota: robots.txt bloquea la indexación (dominio de previsualización).');
}

await main();
