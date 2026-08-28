import { mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  cargarCatalogo, GRUPOS, productosDeGrupo, urlProducto, urlCategoria, grupoDeCategoria,
} from './datos.mjs';
import {
  sitemapXml, robotsTxt, cabecerasHttp, redirecciones, faviconSvg,
} from './seo.mjs';
import {
  paginaHome, paginaCategoria, paginaProducto, paginaContacto,
  paginaAvisoLegal, paginaPrivacidad, paginaCookies, paginaCondiciones, paginaDevoluciones,
  paginaEditor, pagina404,
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
const DIRECTORIOS_GENERADOS = ['producto', 'categoria', 'contacto', 'aviso-legal', 'privacidad', 'condiciones-de-contratacion', 'devoluciones', 'personalizar', 'cookies'];
const FICHEROS_GENERADOS = [
  'index.html', '404.html', 'sitemap.xml', 'robots.txt', 'catalogo.json',
  'favicon.svg', '_headers', '_redirects',
];

async function limpiarSalidaAnterior() {
  for (const dir of DIRECTORIOS_GENERADOS) await rm(`${SALIDA}/${dir}`, { recursive: true, force: true });
  for (const f of FICHEROS_GENERADOS) await rm(`${SALIDA}/${f}`, { force: true });
}

async function main() {
  await limpiarSalidaAnterior();

  const catalogo = await cargarCatalogo();
  // Cada ruta lleva su peso en el sitemap: la portada y el editor son las
  // páginas que interesa que Google visite a menudo; las legales, no.
  const rutas = [{ ruta: '/', prioridad: 1.0, frecuencia: 'weekly' }];

  console.log(`Generando sitio: ${catalogo.productos.length} productos en ${GRUPOS.length} categorías…`);

  await escribir('/index.html', paginaHome({ productos: catalogo.productos }));

  for (const grupo of GRUPOS) {
    const productos = productosDeGrupo(catalogo.productos, grupo.slug);
    await escribir(`${urlCategoria(grupo)}index.html`, paginaCategoria({ grupo, productos }));
    rutas.push({ ruta: urlCategoria(grupo), prioridad: 0.9, frecuencia: 'weekly' });
    console.log(`  ${grupo.nombre}: ${productos.length} productos`);
  }

  for (const producto of catalogo.productos) {
    await escribir(`${urlProducto(producto)}index.html`, paginaProducto({ producto }));
    rutas.push({ ruta: urlProducto(producto), prioridad: 0.8 });
  }

  const ropa = productosDeGrupo(catalogo.productos, 'ropa-personalizada');
  await escribir('/personalizar/index.html', paginaEditor({ productos: ropa }));
  rutas.push({ ruta: '/personalizar/', prioridad: 1.0, frecuencia: 'weekly' });

  await escribir('/contacto/index.html', paginaContacto());
  rutas.push({ ruta: '/contacto/', prioridad: 0.7 });

  await escribir('/aviso-legal/index.html', paginaAvisoLegal());
  await escribir('/privacidad/index.html', paginaPrivacidad());
  await escribir('/cookies/index.html', paginaCookies());
  await escribir('/condiciones-de-contratacion/index.html', paginaCondiciones());
  await escribir('/devoluciones/index.html', paginaDevoluciones());
  for (const legal of ['/aviso-legal/', '/privacidad/', '/cookies/', '/condiciones-de-contratacion/', '/devoluciones/']) {
    rutas.push({ ruta: legal, prioridad: 0.3, frecuencia: 'yearly' });
  }

  // La 404 no entra en el sitemap: una página de error indexada es un error.
  await escribir('/404.html', pagina404());

  await writeFile(`${SALIDA}/sitemap.xml`, sitemapXml(rutas));
  await writeFile(`${SALIDA}/robots.txt`, robotsTxt());
  await writeFile(`${SALIDA}/favicon.svg`, faviconSvg());
  await writeFile(`${SALIDA}/_headers`, cabecerasHttp());
  await writeFile(`${SALIDA}/_redirects`, redirecciones({
    catalogo, urlProducto, urlCategoria, grupoDeCategoria,
  }));

  const viejas = catalogo.productos.length * 2 + (catalogo.categorias?.length ?? 0);
  console.log(`
${rutas.length} páginas generadas en ${SALIDA}/`);
  console.log(`${viejas} redirecciones desde las URLs de la tienda anterior.`);
  if (!SITIO_INDEXABLE) {
    console.log('Nota: robots.txt bloquea la indexación (dominio de previsualización).');
  }
}

await main();
