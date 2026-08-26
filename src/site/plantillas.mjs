import { GRUPOS, CONTACTO, urlProducto, urlCategoria, esPresupuesto, formatoPrecio, enlaceWhatsApp, mensajePedido } from './datos.mjs';

// El sitio vive hoy en un dominio de previsualización (*.pages.dev), no en
// kamusino.com todavía. Mientras tanto no debe indexarse, para que Google no
// lo confunda con la web definitiva. Cambiar a `true` en cuanto se publique
// en el dominio real.
export const SITIO_INDEXABLE = false;

const ICONO_WHATSAPP = `<svg viewBox="0 0 24 24"><path d="M17.5 14.4c-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.6.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6l.4-.5c.1-.1.2-.3.2-.4.1-.1 0-.3 0-.4C11.9 9 11.4 7.8 11.2 7.3c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-1 1-1 2.3 0 1.4 1 2.7 1.1 2.9.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.9-1.3.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 00-8.5 15.2L2 22l4.9-1.3A10 10 0 1012 2z"/></svg>`;

function escapar(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function metaRobots() {
  return SITIO_INDEXABLE ? '' : '<meta name="robots" content="noindex, nofollow">';
}

function cabeceraHtml(activo = '') {
  const nav = (slug, etiqueta, href) =>
    `<a href="${href}" class="${activo === slug ? 'activo' : ''}">${etiqueta}</a>`;
  return `
<header class="cabecera">
  <div class="envoltorio">
    <a href="/" class="logo"><img src="/img/marca/logo.png" alt="Kamusino" width="182" height="50"></a>
    <nav class="nav-principal">
      ${nav('inicio', 'Inicio', '/')}
      ${GRUPOS.map((g) => nav(g.slug, g.nombre, urlCategoria(g))).join('')}
      ${nav('contacto', 'Contacto', '/contacto/')}
    </nav>
    <a class="boton-whatsapp" href="${enlaceWhatsApp('Hola, tengo una consulta sobre vuestros productos.')}" target="_blank" rel="noopener">
      ${ICONO_WHATSAPP} WhatsApp
    </a>
  </div>
</header>`;
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
        </ul>
      </div>
    </div>
    <div class="franja-final">
      <span>© ${anio} Kamusino</span>
      <span>Pedidos por WhatsApp: ${CONTACTO.whatsapp.replace('34', '+34 ')}</span>
    </div>
  </div>
</footer>`;
}

export function pagina({ titulo, descripcion, activo = '', contenido, canonical = '' }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(titulo)}</title>
<meta name="description" content="${escapar(descripcion)}">
${metaRobots()}
${canonical ? `<link rel="canonical" href="${canonical}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/estilo.css">
</head>
<body>
${cabeceraHtml(activo)}
${contenido}
${pieHtml()}
</body>
</html>`;
}

function fotoProducto(p, claseFoto = 'foto') {
  const img = p.imagenes?.[0];
  if (img) {
    return `<div class="${claseFoto}"><img src="${img.ruta}" loading="lazy" alt="${escapar(p.nombre)}" width="${img.ancho || 600}" height="${img.alto || 780}"></div>`;
  }
  return `<div class="${claseFoto}"><div class="sin-foto">${escapar(p.nombre)}</div></div>`;
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
      ? `<img src="${conFoto.imagenes[0].ruta}" alt="" loading="lazy">`
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
      <a class="boton-primario" href="#categorias">Ver catálogo</a>
      <a class="boton-secundario" href="${enlaceWhatsApp('Hola, quiero información sobre vuestros productos personalizados.')}" target="_blank" rel="noopener">Pedir por WhatsApp</a>
    </div>
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
    activo: 'inicio',
    contenido,
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
  ${productos.length
    ? `<div class="rejilla-productos">${productos.map(tarjetaProducto).join('')}</div>`
    : `<div class="vacio">Todavía no hay productos publicados en esta categoría.</div>`}
</div>`;

  return pagina({
    titulo: `${grupo.nombre} — Kamusino`,
    descripcion: grupo.resumen,
    activo: grupo.slug,
    contenido,
    canonical: '',
  });
}

// ---------- Producto ----------
export function paginaProducto({ producto }) {
  const p = producto;
  const galeria = p.imagenes?.length
    ? `
<div class="galeria">
  <div class="principal"><img src="${p.imagenes[0].ruta}" alt="${escapar(p.nombre)}" width="${p.imagenes[0].ancho || 600}" height="${p.imagenes[0].alto || 780}"></div>
  ${p.imagenes.length > 1 ? `<div class="miniaturas">${p.imagenes.slice(1).map((i) => `<img src="${i.ruta}" alt="" loading="lazy">`).join('')}</div>` : ''}
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

  const notaPedido = p.personalizable
    ? 'Cuéntanos color, talla y adjunta tu diseño o texto por WhatsApp: te confirmamos el pedido enseguida.'
    : 'Escríbenos por WhatsApp para confirmar el pedido y la forma de entrega.';

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
      <div class="cta-pedido">
        <a class="boton-primario" href="${enlaceWhatsApp(mensajePedido(p))}" target="_blank" rel="noopener">Pedir por WhatsApp</a>
        <p class="nota">${notaPedido}</p>
      </div>
    </div>
  </div>
</div>`;

  return pagina({
    titulo: `${p.nombre} — Kamusino`,
    descripcion: p.metaDescripcion || `${p.nombre}. Personalízalo y pídelo por WhatsApp en Kamusino.`,
    activo: p.grupo.slug,
    contenido,
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
    activo: 'contacto',
    contenido,
  });
}

// ---------- Legal ----------
const AVISO_PLANTILLA = `<div class="aviso-plantilla"><strong>Nota para el titular del negocio:</strong> este texto es una plantilla estándar de uso habitual en tiendas online españolas. Antes de publicarla debe completarse con los datos fiscales reales de la empresa (CIF/NIF, domicilio social, datos de registro) y revisarla con un asesor legal.</div>`;

export function paginaAvisoLegal() {
  const contenido = `
<div class="envoltorio legal">
  <h1>Aviso legal</h1>
  ${AVISO_PLANTILLA}
  <p>En cumplimiento de la Ley 34/2002, de Servicios de la Sociedad de la Información y Comercio Electrónico (LSSI-CE), se informa de los siguientes datos:</p>
  <h2>Datos identificativos</h2>
  <p>Titular: <em>[razón social pendiente]</em><br>
  NIF/CIF: <em>[pendiente]</em><br>
  Domicilio: <em>[pendiente]</em><br>
  Email de contacto: ${CONTACTO.email}</p>
  <h2>Objeto</h2>
  <p>Kamusino ofrece productos textiles y de impresión personalizados (ropa, pegatinas, rotulación y tarjetas de visita) bajo pedido, gestionado directamente con el cliente por WhatsApp o email.</p>
  <h2>Propiedad intelectual</h2>
  <p>Los contenidos de este sitio (textos, imágenes, diseño) son propiedad de Kamusino o se usan con la autorización correspondiente. Los diseños que el cliente aporta para personalizar un producto son responsabilidad exclusiva de quien los envía.</p>
  <h2>Responsabilidad sobre los diseños aportados</h2>
  <p>El cliente garantiza que dispone de los derechos necesarios sobre cualquier imagen, texto o diseño que envíe para personalizar un producto, y exime a Kamusino de cualquier reclamación derivada de un uso indebido de derechos de terceros.</p>
</div>`;
  return pagina({
    titulo: 'Aviso legal — Kamusino',
    descripcion: 'Información legal de Kamusino.',
    contenido,
  });
}

export function paginaPrivacidad() {
  const contenido = `
<div class="envoltorio legal">
  <h1>Política de privacidad</h1>
  ${AVISO_PLANTILLA}
  <h2>Responsable del tratamiento</h2>
  <p><em>[razón social pendiente]</em>, con contacto en ${CONTACTO.email}.</p>
  <h2>Finalidad</h2>
  <p>Los datos que nos facilitas por WhatsApp o email (nombre, teléfono, dirección de entrega, diseño a personalizar) se usan exclusivamente para gestionar tu pedido y responder a tus consultas.</p>
  <h2>Legitimación</h2>
  <p>La relación contractual derivada de tu pedido y, en su caso, tu consentimiento al escribirnos.</p>
  <h2>Conservación</h2>
  <p>Los datos se conservan mientras dure la relación comercial y, posteriormente, durante los plazos legalmente exigidos (por ejemplo, obligaciones fiscales).</p>
  <h2>Destinatarios</h2>
  <p>No se ceden datos a terceros salvo obligación legal o los proveedores estrictamente necesarios para la entrega del pedido (por ejemplo, empresas de transporte).</p>
  <h2>Tus derechos</h2>
  <p>Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a ${CONTACTO.email}.</p>
</div>`;
  return pagina({
    titulo: 'Política de privacidad — Kamusino',
    descripcion: 'Cómo tratamos tus datos personales en Kamusino.',
    contenido,
  });
}

export function paginaCondiciones() {
  const contenido = `
<div class="envoltorio legal">
  <h1>Condiciones de contratación</h1>
  ${AVISO_PLANTILLA}
  <h2>Proceso de pedido</h2>
  <p>Los pedidos se gestionan directamente por WhatsApp o email: el cliente indica el producto, las opciones (color, talla, cantidad) y, si procede, el diseño a personalizar. Kamusino confirma precio, plazo y forma de pago antes de iniciar la producción.</p>
  <h2>Precios</h2>
  <p>Los precios mostrados en la web son orientativos y están en euros. Los productos marcados como "presupuesto a medida" se cotizan según las necesidades del cliente antes de confirmar el pedido.</p>
  <h2>Personalización</h2>
  <p>Al aportar un diseño, texto o imagen para personalizar un producto, el cliente confirma tener los derechos necesarios sobre ese contenido.</p>
  <h2>Pago y entrega</h2>
  <p>La forma de pago y el plazo de entrega se acuerdan directamente con el cliente al confirmar el pedido.</p>
  <h2>Legislación aplicable</h2>
  <p>Estas condiciones se rigen por la legislación española de consumidores y usuarios.</p>
</div>`;
  return pagina({
    titulo: 'Condiciones de contratación — Kamusino',
    descripcion: 'Condiciones de compra en Kamusino.',
    contenido,
  });
}

export function paginaDevoluciones() {
  const contenido = `
<div class="envoltorio legal">
  <h1>Devoluciones y desistimiento</h1>
  ${AVISO_PLANTILLA}
  <h2>Derecho de desistimiento</h2>
  <p>Con carácter general, dispones de 14 días naturales desde la recepción del pedido para desistir de la compra sin justificar el motivo, conforme al Real Decreto Legislativo 1/2007 (Ley General para la Defensa de los Consumidores y Usuarios).</p>
  <h2>Excepción: productos personalizados</h2>
  <p><strong>Los productos confeccionados conforme a las especificaciones del cliente o claramente personalizados —que son la mayor parte de nuestro catálogo— quedan excluidos del derecho de desistimiento</strong>, de acuerdo con el artículo 103.c) de la misma ley. Te lo confirmamos siempre antes de cerrar el pedido.</p>
  <h2>Productos con defectos</h2>
  <p>Si un producto llega dañado o con un defecto de fabricación, contáctanos por WhatsApp o email y lo resolvemos: reposición o devolución según el caso.</p>
  <h2>Cómo tramitarlo</h2>
  <p>Escríbenos a ${CONTACTO.email} o por WhatsApp indicando el número de pedido y el motivo.</p>
</div>`;
  return pagina({
    titulo: 'Devoluciones — Kamusino',
    descripcion: 'Política de devoluciones y derecho de desistimiento en Kamusino.',
    contenido,
  });
}
