// Todo lo que hace que un buscador entienda la web.
//
// Está separado de `plantillas.mjs` porque son dos trabajos distintos: aquel
// decide qué ve una persona, este qué ve Google. Mezclarlos hace que cambiar
// un `<h2>` obligue a releer el marcado de datos estructurados.

import { DOMINIO, SITIO_INDEXABLE, EMPRESA, CONTACTO, COMERCIAL, url } from './negocio.mjs';

export function escapar(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * El JSON-LD va dentro de un `<script>`, así que un `</script>` en el nombre
 * de un producto cerraría la etiqueta y volcaría el resto como HTML. Escapar
 * `<` lo impide sin romper el JSON.
 */
function comoJsonLd(objeto) {
  return `<script type="application/ld+json">${JSON.stringify(objeto).replace(/</g, '\\u003c')}</script>`;
}

/** Imagen que sale al compartir en WhatsApp o redes. Absoluta: las relativas no valen. */
const IMAGEN_POR_DEFECTO = url('/img/marca/og.png');

/**
 * Etiquetas de cabecera comunes a todas las páginas.
 *
 * `canonical` es obligatoria y absoluta. Sin ella, Google trata
 * `/producto/x/`, `/producto/x/index.html` y `/producto/x/?utm_source=…` como
 * tres páginas distintas y reparte entre las tres la autoridad de una sola.
 */
export function cabeceraSeo({ titulo, descripcion, ruta, imagen, tipo = 'website' }) {
  const absoluta = url(ruta);
  const foto = imagen ? url(imagen) : IMAGEN_POR_DEFECTO;

  return [
    `<link rel="canonical" href="${absoluta}">`,
    SITIO_INDEXABLE
      ? '<meta name="robots" content="index, follow, max-image-preview:large">'
      : '<meta name="robots" content="noindex, nofollow">',
    `<meta property="og:type" content="${tipo}">`,
    `<meta property="og:title" content="${escapar(titulo)}">`,
    `<meta property="og:description" content="${escapar(descripcion)}">`,
    `<meta property="og:url" content="${absoluta}">`,
    `<meta property="og:image" content="${foto}">`,
    `<meta property="og:site_name" content="${escapar(EMPRESA.nombreComercial)}">`,
    '<meta property="og:locale" content="es_ES">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapar(titulo)}">`,
    `<meta name="twitter:description" content="${escapar(descripcion)}">`,
    `<meta name="twitter:image" content="${foto}">`,
    '<meta name="theme-color" content="#c2632f">',
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Datos estructurados
// ---------------------------------------------------------------------------

/** Ficha de la empresa. Va en la portada y alimenta el panel lateral de Google. */
export function jsonLdNegocio() {
  const datos = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': url('/#negocio'),
    name: EMPRESA.nombreComercial,
    url: DOMINIO,
    email: CONTACTO.email,
    telephone: CONTACTO.telefono,
    image: IMAGEN_POR_DEFECTO,
    description: 'Personalización de camisetas, sudaderas, ropa de trabajo, pegatinas y tarjetas de visita.',
    priceRange: '€€',
    currenciesAccepted: 'EUR',
  };

  // La dirección solo se declara cuando existe de verdad. Un `addressLocality`
  // con el texto «PENDIENTE» dentro es peor que no poner dirección: Google lo
  // indexa igual y sale así en los resultados.
  if (!EMPRESA.domicilio.startsWith('PENDIENTE')) {
    datos.address = {
      '@type': 'PostalAddress',
      streetAddress: EMPRESA.domicilio,
      addressRegion: EMPRESA.provincia,
      addressCountry: 'ES',
    };
    datos.legalName = EMPRESA.razonSocial;
    datos.vatID = EMPRESA.nif;
  }

  return comoJsonLd(datos);
}

export function jsonLdSitio() {
  return comoJsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: EMPRESA.nombreComercial,
    url: DOMINIO,
    inLanguage: 'es-ES',
  });
}

/** Migas de pan. `pasos` es [{nombre, ruta}] de lo general a lo concreto. */
export function jsonLdMigas(pasos) {
  return comoJsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: pasos.map((paso, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: paso.nombre,
      item: url(paso.ruta),
    })),
  });
}

/**
 * Ficha de producto. Es la que puede sacar el precio y la disponibilidad
 * directamente en los resultados de búsqueda.
 */
export function jsonLdProducto({ producto, ruta, categoria }) {
  const datos = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.nombre,
    url: url(ruta),
    category: categoria,
    description: (producto.metaDescripcion || producto.descripcionCorta || producto.nombre)
      .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300),
    image: producto.imagenes?.length
      ? producto.imagenes.slice(0, 4).map((i) => url(i.ruta))
      : [IMAGEN_POR_DEFECTO],
    brand: { '@type': 'Brand', name: EMPRESA.nombreComercial },
  };

  if (producto.colores?.length) datos.color = producto.colores.map((c) => c.nombre).join(', ');
  if (producto.tallas?.length) datos.size = producto.tallas.join(', ');

  // Sin precio no se declara oferta. Un `price: 0` le dice a Google que el
  // producto es gratis, y así sale anunciado.
  if (producto.precio > 0) {
    datos.offers = {
      '@type': 'Offer',
      url: url(ruta),
      price: producto.precio.toFixed(2),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: EMPRESA.nombreComercial },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: COMERCIAL.gastosEnvio.toFixed(2),
          currency: 'EUR',
        },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'ES' },
      },
    };
  }

  return comoJsonLd(datos);
}

/** Preguntas frecuentes: pueden salir desplegables bajo el resultado. */
export function jsonLdPreguntas(preguntas) {
  return comoJsonLd({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: preguntas.map((p) => ({
      '@type': 'Question',
      name: p.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: p.respuesta },
    })),
  });
}

// ---------------------------------------------------------------------------
// Ficheros del sitio
// ---------------------------------------------------------------------------

/**
 * `rutas` es [{ruta, prioridad, frecuencia}]. La fecha de modificación es la
 * de la generación: el sitio se regenera entero en cada despliegue, así que
 * es la única fecha que se puede afirmar con honradez.
 */
export function sitemapXml(rutas, fecha = new Date()) {
  const dia = fecha.toISOString().slice(0, 10);
  const urls = rutas.map(({ ruta, prioridad = 0.6, frecuencia = 'monthly' }) => `  <url>
    <loc>${url(ruta)}</loc>
    <lastmod>${dia}</lastmod>
    <changefreq>${frecuencia}</changefreq>
    <priority>${prioridad.toFixed(1)}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function robotsTxt() {
  if (!SITIO_INDEXABLE) {
    // Dominio de previsualización: fuera de los buscadores hasta que la web
    // viva en el dominio real, para que Google no la confunda con la buena.
    return 'User-agent: *\nDisallow: /\n';
  }
  return `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${url('/sitemap.xml')}
`;
}

/**
 * Reglas de `_headers` de Cloudflare Pages.
 *
 * La CSP es la que evita que un fallo de escapado en cualquier plantilla se
 * convierta en ejecución de código ajeno. `'self'` en `script-src` basta
 * porque no se carga JavaScript de terceros en ninguna página.
 */
export function cabecerasHttp() {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    // El editor pinta con estilos calculados en línea; sin `unsafe-inline` en
    // los estilos habría que llevar un nonce por elemento, y no compensa: el
    // estilo no ejecuta código.
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    // `blob:` es lo que permite previsualizar el diseño que sube el cliente
    // sin que el fichero salga de su navegador.
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  return `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: geolocation=(), microphone=(), camera=(), interest-cohort=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: ${csp}

# Las imágenes llevan el identificador en la ruta: cuando cambian, cambia la
# URL, así que se pueden cachear para siempre.
/img/*
  Cache-Control: public, max-age=31536000, immutable

/css/*
  Cache-Control: public, max-age=3600

/js/*
  Cache-Control: public, max-age=3600

/api/*
  Cache-Control: no-store
`;
}

/**
 * Reglas de `_redirects`.
 *
 * Las URLs viejas de PrestaShop llevan años indexadas y con enlaces
 * apuntándolas. Un 301 traslada esa autoridad a la URL nueva; un 404 la tira
 * a la basura, y con ella las posiciones que ya estaban ganadas.
 */
export function redirecciones({ catalogo, urlProducto, urlCategoria, grupoDeCategoria }) {
  const lineas = [
    '# Generado por src/site/build.mjs. No editar a mano.',
    '',
    '# Fichas de producto de la tienda vieja (PrestaShop: /{id}-{slug}.html)',
  ];

  for (const producto of catalogo.productos) {
    const destino = urlProducto(producto);
    lineas.push(`/${producto.id}-${producto.slug}.html  ${destino}  301`);
    // PrestaShop servía la misma ficha también sin la extensión.
    lineas.push(`/${producto.id}-${producto.slug}  ${destino}  301`);
  }

  lineas.push('', '# Categorías de la tienda vieja');
  for (const categoria of catalogo.categorias ?? []) {
    const grupo = grupoDeCategoria(categoria.id);
    if (!grupo) continue;
    lineas.push(`/${categoria.id}-${categoria.slug}  ${urlCategoria(grupo)}  301`);
  }

  lineas.push(
    '',
    '# Rutas fijas que cambiaron de nombre',
    '/index.php  /  301',
    '/contactenos  /contacto/  301',
    '/aviso-legal.html  /aviso-legal/  301',
    '',
    '# El buscador interno y el carrito de PrestaShop ya no existen',
    '/buscar  /  301',
    '/carrito  /personalizar/  301',
    '',
  );

  return lineas.join('\n');
}

/**
 * Favicon. Se genera en SVG en vez de en PNG porque así vale para cualquier
 * tamaño con un solo fichero de 400 bytes, y no hay que mantener seis copias.
 */
export function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#c2632f"/>
  <path d="M20 14h8v16.5L42 14h10L36.5 32 52 50H42L28 33.5V50h-8z" fill="#faf8f4"/>
  <circle cx="47" cy="20" r="4.5" fill="#1f8b98"/>
</svg>
`;
}
