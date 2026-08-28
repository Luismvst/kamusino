// Importación de ficheros de diseño.
//
// Dos caminos, según lo que el navegador sepa pintar:
//
//   imagen  — PNG, JPG, WEBP, GIF y SVG. Se rasterizan y se ven en el lienzo.
//   adjunto — PDF, AI, EPS, PSD. El navegador no los dibuja sin arrastrar un
//             visor entero, así que se aceptan, se muestran como una ficha
//             en la lista de capas y viajan al taller en su formato original,
//             que además es el bueno para imprimir.
//
// Se comprueba tipo **y** extensión: Windows manda a menudo los .ai y .eps
// con el tipo vacío o con uno inventado, y fiarse solo del tipo declarado
// dejaría fuera ficheros perfectamente válidos.

export const FORMATOS_IMAGEN = {
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/webp': 'WEBP',
  'image/gif': 'GIF',
  'image/svg+xml': 'SVG',
};

export const FORMATOS_ADJUNTO = {
  'application/pdf': 'PDF',
  'application/postscript': 'EPS',
  'application/illustrator': 'AI',
  'image/vnd.adobe.photoshop': 'PSD',
  'application/x-photoshop': 'PSD',
};

const EXTENSIONES_IMAGEN = { png: 'PNG', jpg: 'JPG', jpeg: 'JPG', webp: 'WEBP', gif: 'GIF', svg: 'SVG' };
const EXTENSIONES_ADJUNTO = { pdf: 'PDF', ai: 'AI', eps: 'EPS', psd: 'PSD' };

/** Lista para el atributo `accept` del selector de ficheros. */
export const ACEPTA = [
  ...Object.keys(FORMATOS_IMAGEN),
  ...Object.keys(FORMATOS_ADJUNTO),
  ...Object.keys(EXTENSIONES_IMAGEN).map((e) => '.' + e),
  ...Object.keys(EXTENSIONES_ADJUNTO).map((e) => '.' + e),
].join(',');

export function extension(nombre = '') {
  const punto = nombre.lastIndexOf('.');
  return punto === -1 ? '' : nombre.slice(punto + 1).toLowerCase();
}

/**
 * Clasifica el fichero. Devuelve `{ clase, formato }` o `null` si no se
 * admite. El tipo declarado manda; la extensión es la red de seguridad.
 */
export function clasificar({ type = '', name = '' } = {}) {
  if (FORMATOS_IMAGEN[type]) return { clase: 'imagen', formato: FORMATOS_IMAGEN[type] };
  if (FORMATOS_ADJUNTO[type]) return { clase: 'adjunto', formato: FORMATOS_ADJUNTO[type] };

  const ext = extension(name);
  if (EXTENSIONES_IMAGEN[ext]) return { clase: 'imagen', formato: EXTENSIONES_IMAGEN[ext] };
  if (EXTENSIONES_ADJUNTO[ext]) return { clase: 'adjunto', formato: EXTENSIONES_ADJUNTO[ext] };

  return null;
}

export function formatoLegible(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (Math.round((bytes / (1024 * 1024)) * 10) / 10).toString().replace('.', ',') + ' MB';
}

/**
 * Comprueba que el fichero se puede aceptar. Devuelve `null` si todo va bien
 * o un mensaje pensado para enseñárselo al cliente tal cual.
 */
export function validar(fichero, { maxBytesPorFichero, maxBytesTotales, maxCapas }, yaUsado = { bytes: 0, capas: 0 }) {
  const tipo = clasificar(fichero);
  if (!tipo) {
    return `«${fichero.name}» no es un formato que podamos usar. Admitimos PNG, JPG, WEBP, GIF, SVG, PDF, AI y EPS.`;
  }
  if (fichero.size === 0) {
    return `«${fichero.name}» está vacío.`;
  }
  if (fichero.size > maxBytesPorFichero) {
    return `«${fichero.name}» ocupa ${formatoLegible(fichero.size)} y el máximo por archivo es ${formatoLegible(maxBytesPorFichero)}.`;
  }
  if (yaUsado.capas >= maxCapas) {
    return `Ya has añadido ${maxCapas} diseños, que es el máximo por pedido.`;
  }
  if (yaUsado.bytes + fichero.size > maxBytesTotales) {
    return `Con «${fichero.name}» se superan los ${formatoLegible(maxBytesTotales)} de todos los archivos juntos. Quita algún diseño o mándanos el resto por email.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// SVG
// ---------------------------------------------------------------------------

/** Etiquetas que no pintan nada y sí pueden ejecutar o traer contenido externo. */
const ETIQUETAS_PROHIBIDAS = ['script', 'foreignObject', 'iframe', 'embed', 'object', 'audio', 'video', 'set', 'animate'];

/**
 * Limpia un SVG antes de usarlo.
 *
 * Un SVG dentro de un `<img>` ya es pasivo (el navegador no le ejecuta los
 * scripts ni le carga los recursos externos), así que rasterizarlo es seguro
 * de por sí. Se limpia igualmente porque el mismo texto acaba adjunto en el
 * email del pedido, y quien lo abra al otro lado puede no tener esa
 * protección.
 */
export function sanearSvg(texto) {
  const doc = new DOMParser().parseFromString(texto, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return null;

  const raiz = doc.documentElement;
  if (!raiz || raiz.nodeName.toLowerCase() !== 'svg') return null;

  for (const etiqueta of ETIQUETAS_PROHIBIDAS) {
    for (const nodo of [...doc.getElementsByTagName(etiqueta)]) nodo.remove();
  }

  for (const nodo of doc.querySelectorAll('*')) {
    for (const attr of [...nodo.attributes]) {
      const nombre = attr.name.toLowerCase();
      const valor = attr.value.trim().toLowerCase();
      // Manejadores de eventos, y cualquier referencia que salga a la red o
      // a un `javascript:`. Las referencias internas (`#id`) se conservan:
      // son las que hacen funcionar los degradados y las máscaras.
      const referenciaExterna = /^(https?:|\/\/|javascript:)/.test(valor)
        || (valor.startsWith('data:') && !valor.startsWith('data:image/'));
      if (nombre.startsWith('on') || referenciaExterna) nodo.removeAttribute(attr.name);
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

/**
 * Tamaño intrínseco de un SVG. Muchos SVG de imprenta no traen `width` ni
 * `height`, solo `viewBox`; sin este respaldo saldrían con tamaño cero y el
 * cliente vería el lienzo vacío sin entender por qué.
 */
export function medidaSvg(texto) {
  const doc = new DOMParser().parseFromString(texto, 'image/svg+xml');
  const raiz = doc.documentElement;
  if (!raiz || doc.querySelector('parsererror')) return null;

  const numero = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const ancho = numero(raiz.getAttribute('width'));
  const alto = numero(raiz.getAttribute('height'));
  if (ancho && alto) return { ancho, alto };

  const caja = (raiz.getAttribute('viewBox') || '').split(/[\s,]+/).filter(Boolean).map(Number);
  if (caja.length === 4 && caja[2] > 0 && caja[3] > 0) return { ancho: caja[2], alto: caja[3] };

  return { ancho: 300, alto: 300 };
}

// ---------------------------------------------------------------------------
// Carga
// ---------------------------------------------------------------------------

function cargarImagen(url) {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => rechazar(new Error('El navegador no ha podido abrir la imagen.'));
    img.src = url;
  });
}

/**
 * Convierte un fichero en algo dibujable.
 *
 * Devuelve siempre `{ clase, formato, nombre, bytes, blob }` y, para las
 * imágenes, además `{ imagen, ancho, alto }` con el tamaño en píxeles reales,
 * que es lo que luego permite avisar de si la resolución da para imprimir.
 */
export async function importar(fichero) {
  const tipo = clasificar(fichero);
  if (!tipo) throw new Error('Formato no admitido.');

  const comun = {
    clase: tipo.clase,
    formato: tipo.formato,
    nombre: fichero.name,
    bytes: fichero.size,
    blob: fichero,
  };

  if (tipo.clase === 'adjunto') return comun;

  if (tipo.formato === 'SVG') {
    const original = await fichero.text();
    const limpio = sanearSvg(original);
    if (!limpio) throw new Error('El SVG está dañado o no se puede leer.');

    const medida = medidaSvg(limpio);
    const blob = new Blob([limpio], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    try {
      const imagen = await cargarImagen(url);
      return {
        ...comun,
        blob,
        imagen,
        // Un SVG rasterizado por el navegador puede declarar 0 en
        // naturalWidth; en ese caso mandan las medidas del propio documento.
        ancho: imagen.naturalWidth || medida.ancho,
        alto: imagen.naturalHeight || medida.alto,
        vectorial: true,
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const url = URL.createObjectURL(fichero);
  try {
    const imagen = await cargarImagen(url);
    if (!imagen.naturalWidth || !imagen.naturalHeight) {
      throw new Error('La imagen no tiene tamaño.');
    }
    return { ...comun, imagen, ancho: imagen.naturalWidth, alto: imagen.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}
