// Revisión de las páginas generadas.
//
// No comprueba una página de muestra: recorre las 58 y verifica cada una. Los
// fallos de SEO son casi siempre de una sola página descuidada —la que se
// añadió con prisa y se quedó sin descripción— y esa es justo la que una
// prueba de muestra no mira.

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOMINIO } from '../src/site/negocio.mjs';

const PUBLICO = join(fileURLToPath(new URL('..', import.meta.url)), 'public');

/** Todas las páginas HTML de `public/`, con su ruta pública y su contenido. */
async function recorrer(dir = PUBLICO) {
  const salida = [];
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const completa = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      // En `img/` hay 73 fotos y en `fonts/` cinco tipografías: no hay HTML
      // dentro y recorrerlos solo cuesta tiempo.
      if (entrada.name === 'img' || entrada.name === 'fonts') continue;
      salida.push(...await recorrer(completa));
      continue;
    }
    if (!entrada.name.endsWith('.html')) continue;

    const relativa = relative(PUBLICO, completa).split(sep).join('/');
    salida.push({
      ruta: '/' + relativa.replace(/index\.html$/, ''),
      fichero: relativa,
      html: await readFile(completa, 'utf8'),
    });
  }
  return salida;
}

const uno = (html, patron) => html.match(patron)?.[1] ?? null;
const cuantos = (html, patron) => (html.match(patron) ?? []).length;

let paginas;
let sitemap;
let redirects;
let cabeceras;

before(async () => {
  paginas = await recorrer();
  sitemap = await readFile(join(PUBLICO, 'sitemap.xml'), 'utf8');
  redirects = await readFile(join(PUBLICO, '_redirects'), 'utf8');
  cabeceras = await readFile(join(PUBLICO, '_headers'), 'utf8');
});

describe('cobertura', () => {
  test('se han generado todas las páginas esperadas', () => {
    assert.ok(paginas.length >= 55, `solo ${paginas.length} páginas`);
  });

  test('están las páginas fijas', () => {
    const rutas = paginas.map((p) => p.ruta);
    for (const esperada of [
      '/', '/personalizar/', '/contacto/', '/404.html',
      '/aviso-legal/', '/privacidad/', '/cookies/',
      '/condiciones-de-contratacion/', '/devoluciones/',
    ]) {
      assert.ok(rutas.includes(esperada), 'falta ' + esperada);
    }
  });
});

describe('título y descripción', () => {
  test('todas tienen un título con contenido', () => {
    for (const p of paginas) {
      const titulo = uno(p.html, /<title>([^<]*)<\/title>/);
      assert.ok(titulo && titulo.trim().length > 5, `${p.ruta}: «${titulo}»`);
    }
  });

  test('ningún título se repite', () => {
    const vistos = new Map();
    for (const p of paginas) {
      const titulo = uno(p.html, /<title>([^<]*)<\/title>/);
      assert.ok(!vistos.has(titulo), `«${titulo}» está en ${vistos.get(titulo)} y en ${p.ruta}`);
      vistos.set(titulo, p.ruta);
    }
  });

  test('ningún título pasa de 70 caracteres, que es donde Google lo corta', () => {
    for (const p of paginas) {
      const titulo = uno(p.html, /<title>([^<]*)<\/title>/);
      assert.ok(titulo.length <= 70, `${p.ruta}: ${titulo.length} caracteres — «${titulo}»`);
    }
  });

  test('todas tienen descripción de entre 60 y 175 caracteres', () => {
    for (const p of paginas) {
      const desc = uno(p.html, /<meta name="description" content="([^"]*)"/);
      assert.ok(desc, `${p.ruta}: sin descripción`);
      assert.ok(desc.length >= 60 && desc.length <= 175, `${p.ruta}: ${desc.length} caracteres`);
    }
  });

  test('ninguna descripción se repite', () => {
    const vistas = new Map();
    for (const p of paginas) {
      const desc = uno(p.html, /<meta name="description" content="([^"]*)"/);
      assert.ok(!vistas.has(desc), `misma descripción en ${vistas.get(desc)} y ${p.ruta}`);
      vistas.set(desc, p.ruta);
    }
  });
});

describe('canónica', () => {
  test('todas la declaran, absoluta y en el dominio configurado', () => {
    for (const p of paginas) {
      const canonica = uno(p.html, /<link rel="canonical" href="([^"]*)"/);
      assert.ok(canonica, `${p.ruta}: sin canónica`);
      assert.ok(canonica.startsWith(DOMINIO + '/'), `${p.ruta}: ${canonica}`);
    }
  });

  test('la canónica apunta a la propia página', () => {
    for (const p of paginas) {
      const canonica = uno(p.html, /<link rel="canonical" href="([^"]*)"/);
      assert.equal(canonica, DOMINIO + p.ruta, p.fichero);
    }
  });

  test('nunca hay más de una', () => {
    for (const p of paginas) {
      assert.equal(cuantos(p.html, /rel="canonical"/g), 1, p.ruta);
    }
  });
});

describe('compartir en redes', () => {
  test('todas llevan las etiquetas de OpenGraph', () => {
    for (const p of paginas) {
      for (const etiqueta of ['og:title', 'og:description', 'og:url', 'og:image', 'og:type']) {
        assert.ok(p.html.includes(`property="${etiqueta}"`), `${p.ruta}: falta ${etiqueta}`);
      }
    }
  });

  test('la imagen de OpenGraph es absoluta', () => {
    for (const p of paginas) {
      const img = uno(p.html, /<meta property="og:image" content="([^"]*)"/);
      assert.ok(img.startsWith('https://'), `${p.ruta}: ${img}`);
    }
  });

  test('la imagen por defecto existe y no está vacía', async () => {
    const og = await readFile(join(PUBLICO, 'img', 'marca', 'og.png'));
    assert.ok(og.length > 10000, 'og.png pesa ' + og.length);
  });
});

describe('estructura', () => {
  test('cada página tiene exactamente un h1', () => {
    for (const p of paginas) {
      assert.equal(cuantos(p.html, /<h1[\s>]/g), 1, `${p.ruta}: ${cuantos(p.html, /<h1[\s>]/g)} h1`);
    }
  });

  test('el idioma está declarado', () => {
    for (const p of paginas) {
      assert.ok(p.html.includes('<html lang="es">'), p.ruta);
    }
  });

  test('todas declaran el viewport, o en el móvil se ven diminutas', () => {
    for (const p of paginas) {
      assert.ok(p.html.includes('name="viewport"'), p.ruta);
    }
  });

  test('ninguna imagen se queda sin alt', () => {
    for (const p of paginas) {
      for (const [etiqueta] of p.html.matchAll(/<img\b[^>]*>/g)) {
        assert.ok(/\salt=/.test(etiqueta), `${p.ruta}: ${etiqueta.slice(0, 120)}`);
      }
    }
  });

  test('las imágenes de contenido declaran tamaño, para que la página no salte al cargar', () => {
    for (const p of paginas) {
      for (const [etiqueta] of p.html.matchAll(/<img\b[^>]*>/g)) {
        // Las decorativas (alt vacío) no desplazan nada: van en un contenedor
        // de tamaño fijo.
        if (/alt=""/.test(etiqueta)) continue;
        assert.ok(/\swidth=/.test(etiqueta) && /\sheight=/.test(etiqueta),
          `${p.ruta}: ${etiqueta.slice(0, 120)}`);
      }
    }
  });
});

describe('datos estructurados', () => {
  const bloques = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => m[1]);

  test('todos los bloques JSON-LD son JSON válido', () => {
    for (const p of paginas) {
      for (const bloque of bloques(p.html)) {
        assert.doesNotThrow(() => JSON.parse(bloque), `${p.ruta}: JSON-LD inválido`);
      }
    }
  });

  test('todos declaran su contexto y su tipo', () => {
    for (const p of paginas) {
      for (const bloque of bloques(p.html)) {
        const datos = JSON.parse(bloque);
        assert.equal(datos['@context'], 'https://schema.org', p.ruta);
        assert.ok(datos['@type'], p.ruta);
      }
    }
  });

  test('las fichas de producto declaran Product con su oferta', () => {
    const fichas = paginas.filter((p) => p.ruta.startsWith('/producto/'));
    assert.ok(fichas.length > 40, 'solo ' + fichas.length + ' fichas');

    let conOferta = 0;
    for (const p of fichas) {
      const producto = bloques(p.html).map((b) => JSON.parse(b)).find((d) => d['@type'] === 'Product');
      assert.ok(producto, `${p.ruta}: sin Product`);
      assert.ok(producto.name && producto.image?.length, p.ruta);
      if (producto.offers) {
        conOferta += 1;
        assert.equal(producto.offers.priceCurrency, 'EUR', p.ruta);
        assert.ok(Number(producto.offers.price) > 0, `${p.ruta}: precio ${producto.offers.price}`);
      }
    }
    assert.ok(conOferta > 35, `solo ${conOferta} fichas con precio`);
  });

  test('ninguna oferta anuncia precio cero, que Google leería como «gratis»', () => {
    for (const p of paginas) {
      for (const bloque of bloques(p.html)) {
        const datos = JSON.parse(bloque);
        if (datos.offers) assert.notEqual(datos.offers.price, '0.00', p.ruta);
      }
    }
  });

  test('las fichas y las categorías llevan migas de pan', () => {
    const conMigas = paginas.filter((x) => x.ruta.startsWith('/producto/') || x.ruta.startsWith('/categoria/'));
    for (const p of conMigas) {
      const migas = bloques(p.html).map((b) => JSON.parse(b)).find((d) => d['@type'] === 'BreadcrumbList');
      assert.ok(migas, `${p.ruta}: sin migas`);
      assert.ok(migas.itemListElement.length >= 2, p.ruta);
    }
  });

  test('la portada identifica el negocio y el sitio', () => {
    const tipos = bloques(paginas.find((p) => p.ruta === '/').html).map((b) => JSON.parse(b)['@type']);
    assert.ok(tipos.includes('LocalBusiness'), tipos.join());
    assert.ok(tipos.includes('WebSite'), tipos.join());
  });

  test('no se publica una dirección con el texto PENDIENTE dentro', () => {
    for (const p of paginas) {
      for (const bloque of bloques(p.html)) {
        assert.ok(!bloque.includes('PENDIENTE'), `${p.ruta}: hay datos sin rellenar en el JSON-LD`);
      }
    }
  });
});

describe('privacidad y terceros', () => {
  test('ninguna página pide nada a un dominio ajeno', () => {
    for (const p of paginas) {
      const externos = [...p.html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)]
        .map((m) => m[1])
        // Nuestro propio dominio no es un tercero: ahí están la canónica y
        // las etiquetas de OpenGraph, que son absolutas por obligación.
        .filter((u) => !u.startsWith(DOMINIO))
        // Los enlaces a la plataforma europea, a la AEPD o a WhatsApp son
        // enlaces que el usuario decide pulsar, no peticiones automáticas.
        .filter((u) => !/^https:\/\/(ec\.europa\.eu|www\.aepd\.es|wa\.me|schema\.org)/.test(u));
      assert.deepEqual(externos, [], `${p.ruta} carga recursos de terceros`);
    }
  });

  test('las tipografías se sirven desde nuestro dominio', () => {
    for (const p of paginas) {
      assert.ok(!p.html.includes('fonts.googleapis.com'), p.ruta);
      assert.ok(!p.html.includes('fonts.gstatic.com'), p.ruta);
      assert.ok(p.html.includes('/fonts/tipografias.css'), `${p.ruta}: sin tipografías`);
    }
  });

  test('los enlaces externos que se abren en otra pestaña llevan rel="noopener"', () => {
    for (const p of paginas) {
      for (const [etiqueta] of p.html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
        assert.ok(/rel="[^"]*noopener/.test(etiqueta), `${p.ruta}: ${etiqueta.slice(0, 100)}`);
      }
    }
  });
});

describe('enlaces internos', () => {
  test('ninguno apunta a una página que no existe', () => {
    const existentes = new Set(paginas.map((p) => p.ruta));
    const ficherosSueltos = new Set(['/sitemap.xml', '/robots.txt', '/favicon.svg']);

    for (const p of paginas) {
      for (const [, destino] of p.html.matchAll(/href="(\/[^"#?]*)"/g)) {
        if (destino.startsWith('/img/') || destino.startsWith('/css/')
          || destino.startsWith('/js/') || destino.startsWith('/fonts/')
          || destino.startsWith('/api/') || ficherosSueltos.has(destino)) continue;
        assert.ok(existentes.has(destino), `${p.ruta} enlaza a ${destino}, que no existe`);
      }
    }
  });

  test('los legales están enlazados desde todas las páginas', () => {
    for (const p of paginas) {
      for (const legal of ['/aviso-legal/', '/privacidad/', '/cookies/', '/condiciones-de-contratacion/']) {
        assert.ok(p.html.includes(`href="${legal}"`), `${p.ruta}: no enlaza ${legal}`);
      }
    }
  });

  test('el editor se alcanza desde la portada y desde las fichas de ropa', () => {
    assert.ok(paginas.find((p) => p.ruta === '/').html.includes('href="/personalizar/"'));
    const camiseta = paginas.find((p) => p.ruta.includes('2158-camiseta'));
    assert.ok(camiseta.html.includes('/personalizar/?producto=2158'), 'la ficha no lleva al editor');
  });
});

/**
 * Páginas que existen pero no deben salir en Google: solo tienen sentido
 * llegando desde un error o desde la pasarela de pago.
 */
const FUERA_DEL_INDICE = ['/404.html', '/pedido/gracias/', '/pedido/cancelado/'];

describe('sitemap', () => {
  test('incluye todas las páginas indexables', () => {
    for (const p of paginas) {
      if (FUERA_DEL_INDICE.includes(p.ruta)) continue;
      assert.ok(sitemap.includes(`<loc>${DOMINIO}${p.ruta}</loc>`), 'falta en el sitemap: ' + p.ruta);
    }
  });

  test('no anuncia la de error ni las de vuelta del pago', () => {
    for (const ruta of FUERA_DEL_INDICE) {
      assert.ok(!sitemap.includes(`<loc>${DOMINIO}${ruta}</loc>`), ruta + ' no debe estar en el sitemap');
    }
  });

  test('esas páginas además se marcan como no indexables', () => {
    for (const ruta of FUERA_DEL_INDICE) {
      const pagina = paginas.find((p) => p.ruta === ruta);
      assert.ok(pagina.html.includes('content="noindex, nofollow"'), ruta + ' debería llevar noindex');
    }
  });

  test('todas las entradas llevan fecha en formato ISO', () => {
    const fechas = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    assert.ok(fechas.length > 0);
    for (const fecha of fechas) assert.match(fecha, /^\d{4}-\d{2}-\d{2}$/);
  });

  test('no hay ninguna URL rota', () => {
    assert.ok(!sitemap.includes('undefined'), 'hay rutas sin resolver');
  });
});

describe('redirecciones', () => {
  test('cubren las fichas de la tienda anterior', () => {
    assert.ok(redirects.includes('/2158-camiseta-gildan-sofstyle.html'), 'falta la ficha 2158');
    assert.ok(redirects.split('\n').filter((l) => l.trim().endsWith('301')).length > 90);
  });

  test('todas van a una página que existe', () => {
    const existentes = new Set(paginas.map((p) => p.ruta));
    for (const linea of redirects.split('\n')) {
      if (!linea.trim() || linea.startsWith('#')) continue;
      const [, destino] = linea.trim().split(/\s+/);
      assert.ok(existentes.has(destino), `redirección rota: ${linea.trim()}`);
    }
  });

  test('ninguna se redirige a sí misma, que sería un bucle', () => {
    for (const linea of redirects.split('\n')) {
      if (!linea.trim() || linea.startsWith('#')) continue;
      const [origen, destino] = linea.trim().split(/\s+/);
      assert.notEqual(origen, destino, linea.trim());
    }
  });
});

describe('cabeceras HTTP', () => {
  test('están las de seguridad', () => {
    for (const cabecera of [
      'X-Content-Type-Options: nosniff',
      'Referrer-Policy:',
      'X-Frame-Options: DENY',
      'Strict-Transport-Security:',
      'Content-Security-Policy:',
    ]) {
      assert.ok(cabeceras.includes(cabecera), 'falta ' + cabecera);
    }
  });

  test('la política de seguridad no permite scripts de terceros ni marcos', () => {
    assert.match(cabeceras, /script-src 'self'/);
    assert.match(cabeceras, /frame-ancestors 'none'/);
    assert.match(cabeceras, /object-src 'none'/);
  });

  test('la política no permite `unsafe-inline` en los scripts', () => {
    const csp = cabeceras.match(/Content-Security-Policy: (.+)/)[1];
    const script = csp.split(';').find((d) => d.trim().startsWith('script-src'));
    assert.ok(!script.includes('unsafe-inline'), script);
    assert.ok(!script.includes('unsafe-eval'), script);
  });

  test('las respuestas de la API no se cachean', () => {
    assert.match(cabeceras, /\/api\/\*\s+Cache-Control: no-store/);
  });
});

describe('textos legales', () => {
  const legal = (ruta) => paginas.find((p) => p.ruta === ruta).html;

  test('el aviso legal cita la ley que lo exige', () => {
    assert.match(legal('/aviso-legal/'), /Ley 34\/2002/);
  });

  test('la privacidad explica cómo reclamar ante la AEPD', () => {
    const html = legal('/privacidad/');
    assert.match(html, /Agencia Española de Protección de Datos/);
    assert.match(html, /aepd\.es/);
    assert.match(html, /Jorge Juan/);
  });

  test('la privacidad enumera los derechos del RGPD', () => {
    const html = legal('/privacidad/');
    for (const derecho of ['Acceso', 'Rectificación', 'Supresión', 'Oposición', 'Limitación', 'Portabilidad']) {
      assert.ok(html.includes(derecho), 'falta el derecho de ' + derecho);
    }
  });

  test('la privacidad nombra a los encargados del tratamiento', () => {
    const html = legal('/privacidad/');
    for (const proveedor of ['Cloudflare', 'Resend', 'Stripe']) {
      assert.ok(html.includes(proveedor), 'falta ' + proveedor);
    }
  });

  test('las condiciones citan la garantía y el proceso de compra', () => {
    const html = legal('/condiciones-de-contratacion/');
    assert.match(html, /7\/2021/);
    assert.match(html, /pasos-legales/);
  });

  test('las condiciones enlazan la plataforma europea de litigios', () => {
    assert.match(legal('/condiciones-de-contratacion/'), /ec\.europa\.eu\/consumers\/odr/);
  });

  test('devoluciones cita la excepción de los productos personalizados y su artículo', () => {
    const html = legal('/devoluciones/');
    assert.match(html, /103\.c\)/);
    assert.match(html, /14 días naturales/);
  });

  test('devoluciones incluye el formulario oficial de desistimiento', () => {
    const html = legal('/devoluciones/');
    assert.match(html, /formulario-legal/);
    assert.match(html, /desisto de mi contrato/);
  });

  test('la política de cookies declara lo que se guarda de verdad', () => {
    const html = legal('/cookies/');
    assert.match(html, /kamusino-editor/);
    assert.match(html, /IndexedDB/);
    assert.match(html, /22\.2/);
  });

  test('todos los legales dicen cuándo se revisaron', () => {
    for (const ruta of ['/aviso-legal/', '/privacidad/', '/cookies/', '/condiciones-de-contratacion/', '/devoluciones/']) {
      assert.match(legal(ruta), /Última revisión:/, ruta);
    }
  });
});

describe('formulario de pedido', () => {
  const editor = () => paginas.find((p) => p.ruta === '/personalizar/').html;

  test('la casilla de condiciones existe, es obligatoria y no viene marcada', () => {
    const casilla = editor().match(/<input type="checkbox" name="acepta"[^>]*>/)[0];
    assert.ok(casilla.includes('required'), casilla);
    assert.ok(!casilla.includes('checked'), 'la casilla no puede venir marcada de serie');
  });

  test('la casilla enlaza los documentos que hay que aceptar', () => {
    const html = editor();
    assert.ok(html.includes('href="/condiciones-de-contratacion/" target="_blank"'));
    assert.ok(html.includes('href="/privacidad/" target="_blank"'));
  });

  test('la trampa antispam está fuera de la pantalla, no oculta', () => {
    // Un campo con `display:none` lo ignoran muchos robots, y entonces no
    // caerían en la trampa.
    assert.match(editor(), /class="trampa"/);
    assert.match(editor(), /aria-hidden="true"/);
  });
});
