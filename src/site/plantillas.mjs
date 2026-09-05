import { GRUPOS, CONTACTO, urlProducto, urlCategoria, esPresupuesto, formatoPrecio, enlaceWhatsApp, telefonoLegible, mensajePedido } from './datos.mjs';
import { cuerpoEditor, datosEditor } from './editor-plantilla.mjs';
import { admiteEditor } from '../../public/js/editor/prenda.mjs';
import {
  cabeceraSeo, jsonLdNegocio, jsonLdSitio, jsonLdMigas, jsonLdProducto, jsonLdPreguntas,
} from './seo.mjs';
import { EMPRESA, COMERCIAL, ANALITICA, MESES_CONSENTIMIENTO } from './negocio.mjs';
import { GUIAS, rutaGuia, guia } from './guias.mjs';
import {
  textoAvisoLegal, textoPrivacidad, textoCookies, textoCondiciones, textoDevoluciones,
} from './legal.mjs';

// Reexportado para que `build.mjs` decida qué avisar por consola. La
// definición vive en `negocio.mjs`, que es el único sitio configurable.
export { SITIO_INDEXABLE } from './negocio.mjs';

const ICONO_WHATSAPP = `<svg viewBox="0 0 24 24"><path d="M17.5 14.4c-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.6.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6l.4-.5c.1-.1.2-.3.2-.4.1-.1 0-.3 0-.4C11.9 9 11.4 7.8 11.2 7.3c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-1 1-1 2.3 0 1.4 1 2.7 1.1 2.9.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.9-1.3.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 00-8.5 15.2L2 22l4.9-1.3A10 10 0 1012 2z"/></svg>`;

function escapar(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function cabeceraHtml(activo = '') {
  // `clase` marca las categorías: son las primeras que se esconden cuando la
  // cabecera se queda sin sitio.
  const nav = (slug, etiqueta, href, clase = '') =>
    `<a href="${href}" class="${[clase, activo === slug ? 'activo' : ''].filter(Boolean).join(' ')}">${etiqueta}</a>`;
  return `
<header class="cabecera">
  <div class="envoltorio">
    <a href="/" class="logo"><img src="/img/marca/logo.png" alt="Kamusino" width="182" height="50"></a>
    <nav class="nav-principal">
      ${nav('inicio', 'Inicio', '/')}
      ${GRUPOS.map((g) => nav(g.slug, g.nombre, urlCategoria(g), 'cat')).join('')}
      ${nav('contacto', 'Contacto', '/contacto/')}
      <a href="/personalizar/" class="nav-disenar${activo === 'personalizar' ? ' activo' : ''}">Diseñar</a>
    </nav>
    <a class="boton-whatsapp" href="${enlaceWhatsApp('Hola, tengo una consulta sobre vuestros productos.')}" target="_blank" rel="noopener">
      ${ICONO_WHATSAPP} <span>WhatsApp</span>
    </a>
  </div>
</header>`;
}

/**
 * Aviso de cookies y panel de preferencias.
 *
 * El marcado va en todas las páginas aunque hoy no haya nada que consentir:
 * así, el día que se active la analítica, el aviso aparece sin tocar ni una
 * plantilla. Sale oculto y solo lo enseña `consentimiento.mjs` si hace falta.
 *
 * Los dos botones de la primera capa son idénticos a propósito. La guía de
 * cookies de la AEPD considera infracción que «rechazar» sea más pequeño, más
 * gris o esté un nivel más abajo que «aceptar».
 */
function cookiesHtml() {
  const configuracion = JSON.stringify({
    analitica: ANALITICA,
    meses: MESES_CONSENTIMIENTO,
  }).replace(/</g, '\u003c');

  return `
<script type="application/json" id="config-cookies">${configuracion}</script>

<div class="aviso-cookies" id="aviso-cookies" role="dialog" aria-modal="false"
     aria-labelledby="cookies-titulo" hidden>
  <div class="cookies-caja">
    <h2 id="cookies-titulo" tabindex="-1">Cookies</h2>
    <p>Usamos una medición de visitas para saber qué páginas resultan útiles. No
    identifica a nadie ni se comparte con terceros para publicidad. Lo que
    necesita la web para funcionar va siempre, y de eso no se puede prescindir.</p>
    <div class="cookies-botones">
      <button type="button" class="cookies-boton" id="cookies-rechazar">Rechazar</button>
      <button type="button" class="cookies-boton" id="cookies-aceptar">Aceptar</button>
    </div>
    <div class="cookies-enlaces">
      <button type="button" class="cookies-texto" id="cookies-configurar">Configurar</button>
      <a href="/cookies/">Política de cookies</a>
    </div>
  </div>
</div>

<div class="panel-cookies" id="panel-cookies" role="dialog" aria-modal="true"
     aria-labelledby="cookies-panel-titulo" hidden>
  <div class="cookies-caja">
    <h2 id="cookies-panel-titulo" tabindex="-1">Preferencias de cookies</h2>

    <div class="cookies-grupo">
      <div class="cookies-fila">
        <strong>Necesarias</strong>
        <span class="cookies-fijo">Siempre activas</span>
      </div>
      <p>Guardan en tu navegador el diseño que estás montando en el editor, para
      que no lo pierdas al recargar. No salen de tu dispositivo y nosotros no
      podemos leerlas.</p>
    </div>

    <div class="cookies-grupo" id="cookies-bloque-analitica" hidden>
      <div class="cookies-fila">
        <strong>Medición de visitas</strong>
        <label class="cookies-interruptor">
          <input type="checkbox" id="cookies-analitica">
          <span aria-hidden="true"></span>
          <span class="visualmente-oculto">Permitir la medición de visitas</span>
        </label>
      </div>
      <p>Cuenta cuántas personas visitan cada página y desde dónde llegan. Sin
      perfiles y sin seguirte por otras webs.</p>
    </div>

    <p id="cookies-nada" class="cookies-nada">
      Ahora mismo esta web no usa ninguna cookie que necesite tu permiso, así que
      no hay nada que configurar. Si eso cambia, te lo preguntaremos antes.
    </p>

    <div class="cookies-botones">
      <button type="button" class="cookies-boton" id="cookies-cerrar">Cerrar</button>
      <button type="button" class="cookies-boton" id="cookies-guardar">Guardar</button>
    </div>
    <div class="cookies-enlaces">
      <a href="/cookies/">Qué guardamos exactamente</a>
    </div>
  </div>
</div>`;
}

function pieHtml() {
  const anio = new Date().getFullYear();
  return `
<footer class="pie">
  <div class="envoltorio">
    <div class="columnas">
      <div>
        <div class="logo"><img src="/img/marca/logo.png" alt="Kamusino" width="140" height="38"></div>
        <p style="font-size:0.85rem;color:var(--tinta-suave);max-width:32ch;">Personalización de ropa, pegatinas y tarjetas de visita, a tu medida.</p>
      </div>
      <div>
        <h4>Catálogo</h4>
        <ul>${GRUPOS.map((g) => `<li><a href="${urlCategoria(g)}">${g.nombre}</a></li>`).join('')}</ul>
      </div>
      <div>
        <h4>Ayuda</h4>
        <ul>
          <li><a href="/guias/">Guías y consejos</a></li>
          <li><a href="/precios/">Cuánto cuesta</a></li>
          <li><a href="/preparar-tu-diseno/">Preparar tu diseño</a></li>
          <li><a href="/contacto/">Contacto</a></li>
          <li><a href="/devoluciones/">Devoluciones</a></li>
        </ul>
      </div>
      <div>
        <h4>Legal</h4>
        <ul>
          <li><a href="/aviso-legal/">Aviso legal</a></li>
          <li><a href="/privacidad/">Privacidad</a></li>
          <li><a href="/condiciones-de-contratacion/">Condiciones de contratación</a></li>
          <li><a href="/cookies/">Cookies</a></li>
          <li><a href="/cookies/" data-abrir-cookies>Preferencias de cookies</a></li>
        </ul>
      </div>
    </div>
    <div class="franja-final">
      <span>© ${anio} Kamusino</span>
      <span>Pedidos por WhatsApp: <a class="tel-whatsapp" href="${enlaceWhatsApp('Hola, quiero hacer un pedido.')}" target="_blank" rel="noopener">${telefonoLegible(CONTACTO.whatsapp)}</a></span>
    </div>
  </div>
</footer>`;
}

/**
 * `ruta` no es opcional: de ella salen la canónica, la URL de OpenGraph y la
 * entrada del sitemap. Una página sin canónica se reparte entre varias URLs
 * la autoridad que debería concentrar en una.
 */
export function pagina({
  titulo, descripcion, ruta, activo = '', contenido,
  imagen = '', tipo = 'website', indexable = true, jsonLd = '', extraCabeza = '', extraFinal = '',
}) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(titulo)}</title>
<meta name="description" content="${escapar(descripcion)}">
${cabeceraSeo({ titulo, descripcion, ruta, imagen, tipo, indexable })}
${jsonLd}
<link rel="preload" href="/fonts/v9-3y9K6as8bTXq_nANBjzKo3IeZx8z6up5BeSl9D4dj_x9PpZBMlGIInE.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/tipografias.css">
<link rel="stylesheet" href="/css/estilo.css">
<link rel="stylesheet" href="/css/cookies.css">
${extraCabeza}
</head>
<body>
${cabeceraHtml(activo)}
${contenido}
${pieHtml()}
${cookiesHtml()}
<script type="module" src="/js/consentimiento.mjs"></script>
${extraFinal}
</body>
</html>`;
}

/**
 * Imagen con sus versiones WebP.
 *
 * Las fotos del catálogo son JPEG de 1100 px que en una rejilla se ven a 280.
 * `npm run imagenes` genera un WebP de 600 y otro de 1100 al lado de cada una,
 * y aquí se ofrecen los dos: el navegador elige el que le conviene según la
 * pantalla, y el JPEG queda de respaldo por si alguno no entiende WebP.
 *
 * `sizes` no es opcional: sin él el navegador supone que la imagen ocupa todo
 * el ancho de la ventana y se descarga la grande igualmente.
 */
function imagenResponsiva({ img, alt, sizes, prioritaria = false }) {
  const sinExtension = img.ruta.replace(/\.jpe?g$/i, '');
  const srcset = `${sinExtension}-600.webp 600w, ${sinExtension}-1100.webp 1100w`;

  return `<picture>
  <source type="image/webp" srcset="${srcset}" sizes="${sizes}">
  <img src="${img.ruta}" alt="${escapar(alt)}"
       width="${img.ancho || 1100}" height="${img.alto || 1422}"
       ${prioritaria ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}>
</picture>`;
}

function fotoProducto(p, claseFoto = 'foto') {
  const img = p.imagenes?.[0];
  if (!img) return `<div class="${claseFoto}"><div class="sin-foto">${escapar(p.nombre)}</div></div>`;

  return `<div class="${claseFoto}">${imagenResponsiva({
    img,
    alt: p.nombre,
    sizes: '(max-width: 640px) 45vw, (max-width: 1180px) 30vw, 280px',
  })}</div>`;
}

export function tarjetaProducto(p) {
  const precio = esPresupuesto(p)
    ? `<p class="presupuesto">Presupuesto a medida</p>`
    : `<p class="precio">${formatoPrecio(p)}</p>`;
  return `
<a class="tarjeta-producto" href="${urlProducto(p)}">
  ${fotoProducto(p)}
  <div class="info">
    <p class="nombre">${escapar(p.nombre)}</p>
    ${precio}
  </div>
</a>`;
}

// ---------- Home ----------
export function paginaHome({ productos }) {
  const destacados = seleccionarDestacados(productos, 8);

  const categorias = GRUPOS.map((g) => {
    const productosGrupo = productos.filter((p) => p.grupo.slug === g.slug);
    const conFoto = productosGrupo.find((p) => p.imagenes?.length);
    const fondo = conFoto
      ? `<img src="${conFoto.imagenes[0].ruta.replace(/\.jpe?g$/i, '-600.webp')}" alt="" loading="lazy" decoding="async" width="600" height="776">`
      : '';
    return `
<a class="tarjeta-categoria" href="${urlCategoria(g)}">
  ${fondo}
  <div class="capa">
    <div>
      <h3>${g.nombre}</h3>
      <p>${escapar(g.resumen)}</p>
    </div>
  </div>
</a>`;
  }).join('');

  const contenido = `
<div class="envoltorio">
  <section class="hero">
    <h1>Personaliza tu ropa, tus pegatinas y tus tarjetas, a tu manera</h1>
    <p>En Kamusino eliges el producto, el color, la talla y tu diseño. Nosotros nos encargamos del resto — sin catálogos genéricos ni pedidos mínimos imposibles.</p>
    <div class="acciones">
      <a class="boton-primario" href="/personalizar/">Diseñar mi camiseta</a>
      <a class="boton-secundario" href="#categorias">Ver el catálogo</a>
    </div>
    <p class="hero-nota">Sube tu diseño, colócalo sobre la prenda y mándanoslo. Sin programas ni cuentas de usuario.</p>
  </section>

  <section id="categorias">
    <div class="titulo-seccion"><h2>Qué puedes personalizar</h2></div>
    <div class="rejilla-categorias">${categorias}</div>
  </section>

  <section class="valores">
    <div class="valor"><h3>Tú eliges el diseño</h3><p>Color, talla y personalización a tu gusto en cada producto.</p></div>
    <div class="valor"><h3>Pedidos por WhatsApp</h3><p>Sin formularios ni cuentas: hablas directamente con nosotros.</p></div>
    <div class="valor"><h3>Atención cercana</h3><p>Resolvemos tus dudas antes de que hagas el pedido, no después.</p></div>
  </section>

  ${destacados.length ? `
  <section>
    <div class="titulo-seccion"><h2>Destacados</h2></div>
    <div class="rejilla-productos">${destacados.map(tarjetaProducto).join('')}</div>
  </section>` : ''}
</div>`;

  return pagina({
    titulo: 'Kamusino — Ropa, pegatinas y tarjetas personalizadas',
    descripcion: 'Personaliza camisetas, sudaderas, ropa de trabajo, pegatinas y tarjetas de visita. Pide directamente por WhatsApp.',
    ruta: '/',
    activo: 'inicio',
    contenido,
    jsonLd: jsonLdNegocio() + jsonLdSitio(),
  });
}

function seleccionarDestacados(productos, cuantos) {
  const conFoto = productos.filter((p) => p.imagenes?.length);
  // Reparte la selección entre grupos para no enseñar 8 camisetas seguidas.
  const porGrupo = new Map();
  for (const p of conFoto) {
    const lista = porGrupo.get(p.grupo.slug) ?? [];
    lista.push(p);
    porGrupo.set(p.grupo.slug, lista);
  }
  const resultado = [];
  let indice = 0;
  while (resultado.length < cuantos) {
    let añadido = false;
    for (const lista of porGrupo.values()) {
      if (lista[indice]) { resultado.push(lista[indice]); añadido = true; }
      if (resultado.length >= cuantos) break;
    }
    if (!añadido) break;
    indice++;
  }
  return resultado;
}

// ---------- Categoría ----------
export function paginaCategoria({ grupo, productos }) {
  const contenido = `
<div class="envoltorio">
  <p class="migas"><a href="/">Inicio</a> / ${escapar(grupo.nombre)}</p>
  <div class="cabecera-categoria">
    <h1>${escapar(grupo.nombre)}</h1>
    <p>${escapar(grupo.resumen)}</p>
  </div>
  ${grupo.slug === 'ropa-personalizada' ? `
  <a class="banda-editor" href="/personalizar/">
    <div>
      <strong>Diseña tu prenda aquí mismo</strong>
      <span>Sube tu logo o tu foto, colócala sobre la camiseta y mándanosla. Se ve al momento.</span>
    </div>
    <span class="banda-flecha" aria-hidden="true">→</span>
  </a>` : ''}
  ${productos.length
    ? `<div class="rejilla-productos">${productos.map(tarjetaProducto).join('')}</div>`
    : `<div class="vacio">Todavía no hay productos publicados en esta categoría.</div>`}

  ${grupo.slug === 'ropa-personalizada' ? `
  <section class="mas-guias">
    <div class="titulo-seccion"><h2>Antes de pedir</h2></div>
    <div class="rejilla-guias">
      ${GUIAS.slice(0, 4).map((g) => `
      <a class="tarjeta-guia" href="${rutaGuia(g)}">
        <strong>${escapar(g.tituloPagina)}</strong>
        <span>${escapar(g.resumen)}</span>
      </a>`).join('')}
    </div>
  </section>` : ''}
</div>`;

  return pagina({
    titulo: `${grupo.nombre} — Kamusino`,
    descripcion: grupo.resumen,
    ruta: urlCategoria(grupo),
    activo: grupo.slug,
    contenido,
    imagen: productos.find((p) => p.imagenes?.length)?.imagenes[0].ruta,
    jsonLd: jsonLdMigas([
      { nombre: 'Inicio', ruta: '/' },
      { nombre: grupo.nombre, ruta: urlCategoria(grupo) },
    ]),
  });
}

// ---------- Producto ----------
/**
 * Cuatro productos del mismo grupo, sin repetir el actual.
 *
 * No es un adorno de tienda: son los enlaces que reparten autoridad entre las
 * 47 fichas. Sin ellos, cada ficha cuelga solo de su categoría y Google las
 * trata como hojas sueltas.
 */
function relacionados(p, todos) {
  return todos
    .filter((otro) => otro.id !== p.id && otro.grupo.slug === p.grupo.slug && otro.imagenes?.length)
    .slice(0, 4);
}

/** La guía que de verdad ayuda a quien está mirando esta prenda. */
function guiaParaProducto(p) {
  if (/sudadera|polar|cazadora/i.test(p.nombre)) return guia('ropa-de-trabajo-personalizada');
  if (/nin|niñ/i.test(p.nombre)) return guia('ropa-personalizada-colegios');
  if (/polo|mandil|delantal/i.test(p.nombre)) return guia('ropa-de-trabajo-personalizada');
  return guia('camisetas-despedida-soltera');
}

export function paginaProducto({ producto, catalogo = [] }) {
  const p = producto;
  const galeria = p.imagenes?.length
    ? `
<div class="galeria">
  <div class="principal">${imagenResponsiva({
    img: p.imagenes[0],
    alt: p.nombre,
    sizes: '(max-width: 900px) 92vw, 560px',
    prioritaria: true,
  })}</div>
  ${p.imagenes.length > 1 ? `<div class="miniaturas">${p.imagenes.slice(1).map((i) => `<img src="${i.ruta.replace(/\.jpe?g$/i, '-600.webp')}" alt="" loading="lazy" decoding="async" width="600" height="776">`).join('')}</div>` : ''}
</div>`
    : `<div class="galeria"><div class="principal"><div class="sin-foto" style="border-radius:var(--radio);width:100%;height:100%;"><span>${escapar(p.nombre)}</span><span class="subtitulo">Foto disponible bajo pedido</span></div></div></div>`;

  const precio = esPresupuesto(p)
    ? `<p class="presupuesto-grande">Presupuesto a medida</p>`
    : `<p class="precio-grande">${formatoPrecio(p)}</p>`;

  const colores = p.colores?.length
    ? `<div class="bloque-ficha"><h3>Colores disponibles</h3><div class="swatches">${p.colores.map((c) => `<span class="swatch" style="background:${c.hex}" title="${escapar(c.nombre)}"></span>`).join('')}</div></div>`
    : '';

  const tallas = p.tallas?.length
    ? `<div class="bloque-ficha"><h3>Tallas</h3><div class="tallas">${p.tallas.map((t) => `<span class="talla">${escapar(t)}</span>`).join('')}</div></div>`
    : '';

  // La descripción original de los productos a presupuesto viene de la tienda
  // vieja y menciona un carrito y un editor de diseño que ya no existen aquí:
  // el pedido se cierra por WhatsApp. Se sustituye por un texto que sí describe
  // el flujo real, en vez de confundir con pasos de una web que ya no está.
  const descripcion = esPresupuesto(p)
    ? `<div class="bloque-ficha"><h3>Cómo pedirlo</h3><div class="descripcion"><p>Cuéntanos las medidas, la cantidad y tu diseño (archivo, foto o boceto) por WhatsApp. Te respondemos con el presupuesto sin compromiso.</p></div></div>`
    : p.descripcionCorta
      ? `<div class="bloque-ficha"><h3>Descripción</h3><div class="descripcion">${p.descripcionCorta}</div></div>`
      : '';

  // El editor solo sabe representar prendas de vestir. Para lo demás
  // (pegatinas, tarjetas) el pedido sigue cerrándose por WhatsApp.
  const disenable = admiteEditor(p.nombre) && p.grupo.slug === 'ropa-personalizada';

  const notaPedido = disenable
    ? 'Eliges color y talla, colocas tu diseño y nos lo mandas. Te respondemos con el presupuesto y el plazo; no se produce nada hasta que lo confirmas.'
    : p.personalizable
      ? 'Cuéntanos las medidas y adjunta tu diseño por WhatsApp: te pasamos el presupuesto sin compromiso.'
      : 'Escríbenos por WhatsApp para confirmar el pedido y la forma de entrega.';

  const otros = relacionados(p, catalogo);
  const guiaUtil = disenable ? guiaParaProducto(p) : null;

  const contenido = `
<div class="envoltorio">
  <p class="migas"><a href="/">Inicio</a> / <a href="${urlCategoria(p.grupo)}">${escapar(p.grupo.nombre)}</a> / ${escapar(p.nombre)}</p>
  <div class="ficha">
    ${galeria}
    <div>
      <h1>${escapar(p.nombre)}</h1>
      ${precio}
      ${colores}
      ${tallas}
      ${descripcion}
      ${guiaUtil ? `
      <p class="pista-guia">
        ¿Primera vez? <a href="${rutaGuia(guiaUtil)}">${escapar(guiaUtil.tituloPagina)}</a>
        · <a href="/preparar-tu-diseno/">Cómo preparar tu diseño</a>
      </p>` : ''}
      <div class="cta-pedido">
        ${disenable
          ? `<a class="boton-primario grande" href="/personalizar/?producto=${p.id}">Diseñar esta prenda</a>
             <a class="boton-secundario" href="${enlaceWhatsApp(mensajePedido(p))}" target="_blank" rel="noopener">Prefiero preguntar por WhatsApp</a>`
          : `<a class="boton-primario" href="${enlaceWhatsApp(mensajePedido(p))}" target="_blank" rel="noopener">Pedir por WhatsApp</a>`}
        <p class="nota">${notaPedido}</p>
      </div>
    </div>
  </div>

  ${otros.length ? `
  <section class="relacionados">
    <div class="titulo-seccion"><h2>Otras prendas de ${escapar(p.grupo.nombre.toLowerCase())}</h2></div>
    <div class="rejilla-productos">${otros.map(tarjetaProducto).join('')}</div>
  </section>` : ''}
</div>`;

  return pagina({
    titulo: `${p.nombre} — Kamusino`,
    descripcion: p.metaDescripcion || `${p.nombre}. Personalízalo a tu gusto y pídelo en Kamusino: eliges color, talla y tu propio diseño.`,
    ruta: urlProducto(p),
    activo: p.grupo.slug,
    contenido,
    imagen: p.imagenes?.[0]?.ruta,
    tipo: 'product',
    jsonLd: jsonLdProducto({ producto: p, ruta: urlProducto(p), categoria: p.grupo.nombre })
      + jsonLdMigas([
        { nombre: 'Inicio', ruta: '/' },
        { nombre: p.grupo.nombre, ruta: urlCategoria(p.grupo) },
        { nombre: p.nombre, ruta: urlProducto(p) },
      ]),
  });
}

// ---------- Contacto ----------
export function paginaContacto() {
  const contenido = `
<div class="envoltorio">
  <section class="hero" style="padding-top:2.5rem;">
    <h1>Hablemos de tu pedido</h1>
    <p>Resolvemos dudas, confirmamos diseños y cerramos pedidos directamente por WhatsApp o email.</p>
  </section>
  <section class="contacto-tarjetas">
    <div class="contacto-tarjeta">
      <h3>WhatsApp</h3>
      <p>La forma más rápida de escribirnos.</p>
      <a class="boton-primario" href="${enlaceWhatsApp('Hola, tengo una consulta.')}" target="_blank" rel="noopener">Abrir WhatsApp</a>
    </div>
    <div class="contacto-tarjeta">
      <h3>Email</h3>
      <p>${CONTACTO.email}</p>
      <a class="boton-secundario" href="mailto:${CONTACTO.email}">Escribir email</a>
    </div>
  </section>
</div>`;

  return pagina({
    titulo: 'Contacto — Kamusino',
    descripcion: 'Contacta con Kamusino por WhatsApp o email para tu pedido personalizado.',
    ruta: '/contacto/',
    activo: 'contacto',
    contenido,
  });
}

// ---------- Legal ----------
//
// El contenido vive en `legal.mjs`. Aquí solo se envuelve con la plantilla y
// se le pone título y descripción: separarlos permite que un asesor revise
// los textos sin tener que leer código.

function paginaLegal({ titulo, descripcion, ruta, texto }) {
  return pagina({
    titulo: `${titulo} — Kamusino`,
    descripcion,
    ruta,
    contenido: `<div class="envoltorio legal">${texto}</div>`,
  });
}

export function paginaAvisoLegal() {
  return paginaLegal({
    titulo: 'Aviso legal',
    descripcion: 'Datos identificativos del titular de Kamusino, condiciones de uso del sitio y responsabilidad sobre los diseños que aporta el cliente.',
    ruta: '/aviso-legal/',
    texto: textoAvisoLegal(),
  });
}

export function paginaPrivacidad() {
  return paginaLegal({
    titulo: 'Política de privacidad',
    descripcion: 'Qué datos personales tratamos en Kamusino, para qué, cuánto tiempo los guardamos, quién más accede a ellos y cómo ejercer tus derechos.',
    ruta: '/privacidad/',
    texto: textoPrivacidad(),
  });
}

export function paginaCookies() {
  return paginaLegal({
    titulo: 'Política de cookies',
    descripcion: 'Kamusino no usa cookies ni analítica. Solo guarda en tu navegador el diseño que estás montando, para que no lo pierdas al recargar.',
    ruta: '/cookies/',
    texto: textoCookies(),
  });
}

export function paginaCondiciones() {
  return paginaLegal({
    titulo: 'Condiciones de contratación',
    descripcion: 'Cómo se hace un pedido en Kamusino paso a paso: precios con IVA, gastos de envío, formas de pago, plazos y garantía legal de tres años.',
    ruta: '/condiciones-de-contratacion/',
    texto: textoCondiciones(),
  });
}

export function paginaDevoluciones() {
  return paginaLegal({
    titulo: 'Devoluciones y desistimiento',
    descripcion: 'Los productos personalizados están excluidos del desistimiento por ley, pero un producto defectuoso se repone siempre. Incluye el formulario oficial.',
    ruta: '/devoluciones/',
    texto: textoDevoluciones(),
  });
}

// ---------- Editor de diseño ----------

/**
 * `productos` es el catálogo completo de ropa: el editor deja cambiar de
 * prenda sin salir de la página, así que los necesita todos incrustados.
 */
export function paginaEditor({ productos }) {
  const disenables = productos.filter((p) => admiteEditor(p.nombre));
  return pagina({
    titulo: 'Diseña tu camiseta online — Kamusino',
    descripcion: 'Sube tu diseño, colócalo sobre la prenda y envíanoslo. Camisetas, sudaderas y polos personalizados, sin programas ni cuentas de usuario.',
    ruta: '/personalizar/',
    activo: 'personalizar',
    contenido: cuerpoEditor(),
    jsonLd: jsonLdPreguntas(PREGUNTAS_EDITOR),
    extraCabeza: '<link rel="stylesheet" href="/css/editor.css">',
    extraFinal: datosEditor(disenables),
  });
}

// ---------- Vuelta de la pasarela de pago ----------

/**
 * Páginas a las que Stripe devuelve al cliente. Existen aunque el pago no
 * esté activo todavía: `checkout.js` las declara como destino, y una pasarela
 * que devuelve a un 404 es peor que no tener pasarela.
 *
 * La referencia llega en `?ref=`; no se lee aquí porque estas páginas son
 * estáticas. El correo de confirmación ya la lleva, que es donde el cliente
 * la va a buscar de verdad.
 */
export function paginaPagoCorrecto() {
  const contenido = `
<div class="envoltorio">
  <section class="hero" style="padding-top:3.5rem;">
    <h1>Pago recibido</h1>
    <p>Gracias. Ya tenemos tu pedido y tu diseño, y empezamos a producirlo.</p>
    <p>Te hemos mandado la confirmación por email, con tu referencia y el resumen de lo que has pedido.
    Si no la ves en unos minutos, mira en la carpeta de spam.</p>
    <div class="acciones">
      <a class="boton-primario" href="/">Volver al inicio</a>
      <a class="boton-secundario" href="/contacto/">Tengo una duda</a>
    </div>
  </section>
</div>`;
  return pagina({
    titulo: 'Pago recibido — Kamusino',
    descripcion: 'Hemos recibido tu pago y tu diseño. Te confirmamos el pedido por email con tu referencia y empezamos a producirlo.',
    ruta: '/pedido/gracias/',
    indexable: false,
    contenido,
  });
}

export function paginaPagoCancelado() {
  const contenido = `
<div class="envoltorio">
  <section class="hero" style="padding-top:3.5rem;">
    <h1>No se ha completado el pago</h1>
    <p>No te hemos cobrado nada. <strong>Tu diseño no se ha perdido:</strong> ya nos había llegado,
    y lo tenemos guardado con tu referencia.</p>
    <p>Puedes volver a intentarlo cuando quieras, o escribirnos y lo cerramos por otra vía.</p>
    <div class="acciones">
      <a class="boton-primario" href="/personalizar/">Volver al editor</a>
      <a class="boton-secundario" href="/contacto/">Escríbenos</a>
    </div>
  </section>
</div>`;
  return pagina({
    titulo: 'Pago no completado — Kamusino',
    descripcion: 'El pago no se ha completado y no se te ha cobrado nada. Tu diseño sigue guardado con su referencia y puedes retomarlo cuando quieras.',
    ruta: '/pedido/cancelado/',
    indexable: false,
    contenido,
  });
}

// ---------- Guías y páginas de uso ----------

/**
 * Estas páginas son las que pueden traer visitas a un dominio nuevo. Las
 * fichas de producto no: todas las tiendas venden la misma camiseta Gildan y
 * compiten con la descripción del fabricante. Aquí se responde a lo que
 * alguien escribe en el buscador cuando ya quiere comprar algo.
 */
export function paginaGuia({ guia }) {
  const otras = GUIAS.filter((g) => g.slug !== guia.slug).slice(0, 3);

  const contenido = `
<div class="envoltorio">
  <p class="migas"><a href="/">Inicio</a> / <a href="/guias/">Guías</a> / ${escapar(guia.titulo)}</p>
  <article class="guia">
    <h1>${escapar(guia.tituloPagina)}</h1>
    ${guia.cuerpo()}
    ${guia.preguntas?.length ? `
    <section class="preguntas">
      <h2>Preguntas frecuentes</h2>
      <dl>
        ${guia.preguntas.map((p) => `<dt>${escapar(p.pregunta)}</dt><dd>${escapar(p.respuesta)}</dd>`).join('')}
      </dl>
    </section>` : ''}
  </article>

  <aside class="mas-guias">
    <h2>Te puede servir</h2>
    <div class="rejilla-guias">
      ${otras.map((g) => `
      <a class="tarjeta-guia" href="${rutaGuia(g)}">
        <strong>${escapar(g.titulo)}</strong>
        <span>${escapar(g.resumen)}</span>
      </a>`).join('')}
    </div>
  </aside>
</div>`;

  return pagina({
    titulo: `${guia.tituloPagina} — Kamusino`,
    descripcion: guia.descripcion,
    ruta: rutaGuia(guia),
    tipo: 'article',
    contenido,
    jsonLd: jsonLdMigas([
      { nombre: 'Inicio', ruta: '/' },
      { nombre: 'Guías', ruta: '/guias/' },
      { nombre: guia.titulo, ruta: rutaGuia(guia) },
    ]) + (guia.preguntas?.length ? jsonLdPreguntas(guia.preguntas) : ''),
  });
}

/** Índice de guías: es lo que las enlaza entre sí y desde el pie. */
export function paginaIndiceGuias() {
  const contenido = `
<div class="envoltorio">
  <p class="migas"><a href="/">Inicio</a> / Guías</p>
  <div class="cabecera-categoria">
    <h1>Guías y consejos</h1>
    <p>Lo que hemos aprendido preparando pedidos, contado para que no tengas que
    preguntarlo. Sin rodeos y sin vender nada por el camino.</p>
  </div>
  <div class="rejilla-guias grande">
    ${GUIAS.map((g) => `
    <a class="tarjeta-guia" href="${rutaGuia(g)}">
      <strong>${escapar(g.tituloPagina)}</strong>
      <span>${escapar(g.resumen)}</span>
    </a>`).join('')}
  </div>
</div>`;

  return pagina({
    titulo: 'Guías sobre ropa personalizada — Kamusino',
    descripcion: 'Cómo preparar un diseño, qué técnica de estampación elegir, cuánto cuesta personalizar una camiseta y qué tener en cuenta según para qué sea el pedido.',
    ruta: '/guias/',
    contenido,
    jsonLd: jsonLdMigas([{ nombre: 'Inicio', ruta: '/' }, { nombre: 'Guías', ruta: '/guias/' }]),
  });
}

// ---------- 404 ----------

/**
 * Página de error. Cloudflare Pages sirve `404.html` sola.
 *
 * Una 404 útil no dice «no encontrado» y se queda tan ancha: ofrece a dónde
 * ir. Buena parte de quien llega aquí viene de un enlace viejo de la tienda
 * anterior, y lo que buscaba sigue existiendo con otra dirección.
 */
export function pagina404() {
  const contenido = `
<div class="envoltorio">
  <section class="hero" style="padding-top:3rem;">
    <h1>Esta página ya no está aquí</h1>
    <p>Puede que el enlace sea de la tienda anterior. Lo que buscabas casi seguro que sigue existiendo:</p>
    <div class="acciones">
      <a class="boton-primario" href="/personalizar/">Diseñar mi camiseta</a>
      <a class="boton-secundario" href="/">Ver el catálogo</a>
    </div>
  </section>
  <section>
    <div class="titulo-seccion"><h2>Nuestras secciones</h2></div>
    <div class="rejilla-categorias">
      ${GRUPOS.map((g) => `
      <a class="tarjeta-categoria" href="${urlCategoria(g)}">
        <div class="capa"><div><h3>${g.nombre}</h3><p>${escapar(g.resumen)}</p></div></div>
      </a>`).join('')}
    </div>
  </section>
</div>`;

  return pagina({
    titulo: 'Página no encontrada — Kamusino',
    descripcion: 'La página que buscas ya no existe. Te ayudamos a encontrar lo que necesitas.',
    ruta: '/404.html',
    indexable: false,
    contenido,
  });
}

/**
 * Preguntas del editor. No son relleno de SEO: son las cuatro que decide
 * responder cualquiera antes de subir un archivo, y Google puede enseñarlas
 * desplegadas bajo el resultado.
 */
export const PREGUNTAS_EDITOR = [
  {
    pregunta: '¿Qué formatos de archivo puedo subir para personalizar mi camiseta?',
    respuesta: 'PNG, JPG, WEBP, GIF y SVG se ven al momento sobre la prenda. '
      + 'También aceptamos PDF, AI, EPS y PSD: no se previsualizan en el navegador, '
      + 'pero llegan enteros al taller y suelen ser los que mejor imprimen.',
  },
  {
    pregunta: '¿Puedo poner varios diseños en la misma prenda?',
    respuesta: 'Sí. Puedes añadir hasta ocho diseños por pedido y repartirlos entre '
      + 'la parte delantera y la trasera, moverlos, girarlos y cambiarles el tamaño.',
  },
  {
    pregunta: '¿Qué resolución necesita mi diseño para que se imprima bien?',
    respuesta: 'Recomendamos 300 puntos por pulgada al tamaño real de la estampación. '
      + 'El editor calcula la resolución mientras colocas el diseño y te avisa si baja '
      + 'de 150 ppp, que es donde se empieza a notar pixelado.',
  },
  {
    pregunta: '¿Me cobráis al enviar el diseño?',
    respuesta: 'No. Al enviarlo recibes una referencia de pedido y te respondemos con el '
      + 'presupuesto y el plazo. No se produce nada hasta que lo confirmas.',
  },
];
