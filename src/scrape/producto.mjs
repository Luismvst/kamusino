const ENTIDADES = { '&quot;': '"', '&amp;': '&', '&#039;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' };

function decodificar(s) {
  return s.replace(/&quot;|&amp;|&#039;|&lt;|&gt;|&nbsp;/g, (m) => ENTIDADES[m]);
}

/**
 * PrestaShop 1.7 serializa el producto entero en el atributo data-product
 * del contenedor de la ficha. Es JSON con las entidades HTML escapadas.
 */
export function extraerDataProduct(html) {
  const m = html.match(/data-product="([^"]+)"/);
  if (!m) throw new Error('no se encontró data-product en la ficha');
  return JSON.parse(decodificar(m[1]));
}

/**
 * Las imágenes viven en /img/p/ con los dígitos del id como carpetas:
 * 11384 -> /img/p/1/1/3/8/4/11384-thickbox_default.jpg
 * La URL "bonita" que genera PrestaShop devuelve 404 porque al nginx
 * del servidor viejo le faltan las reglas de reescritura.
 */
export function rutaImagen(idImagen, tamano = 'thickbox_default') {
  const digitos = String(idImagen).split('').join('/');
  return `/img/p/${digitos}/${idImagen}-${tamano}.jpg`;
}

// Cada muestra de color es un <li> con el nombre en un atributo de texto
// y el hex en un style inline.
export function extraerColores(html) {
  const colores = [];
  const vistos = new Set();
  const bloques = html.match(/<li[^>]*class="[^"]*input-container[^"]*"[\s\S]*?<\/li>/g) ?? [];
  for (const b of bloques) {
    const hex = b.match(/background(?:-color)?:\s*(#[0-9A-Fa-f]{6})/)?.[1]?.toLowerCase();
    if (!hex) continue;
    const nombre = decodificar(
      b.match(/aria-label="([^"]+)"/)?.[1] ??
      b.match(/title="([^"]+)"/)?.[1] ??
      b.match(/<span[^>]*class="[^"]*sr-only[^"]*"[^>]*>([^<]+)</)?.[1] ??
      '',
    ).trim();
    const clave = `${nombre}|${hex}`;
    if (!nombre || vistos.has(clave)) continue;
    vistos.add(clave);
    colores.push({ nombre, hex });
  }
  return colores;
}

export function extraerTallas(html) {
  const select = html.match(/<select[^>]*name="group\[\d+\]"([\s\S]*?)<\/select>/)?.[1];
  if (!select) return [];
  return [...select.matchAll(/<option[^>]*>([^<]+)<\/option>/g)]
    .map(([, t]) => decodificar(t).trim())
    .filter(Boolean);
}

export function normalizar(html) {
  const d = extraerDataProduct(html);
  const imagenes = (d.images ?? []).map((img) => ({
    id: Number(img.id_image),
    ruta: rutaImagen(img.id_image),
    ancho: img.bySize?.thickbox_default?.width ?? img.large?.width ?? null,
    alto: img.bySize?.thickbox_default?.height ?? img.large?.height ?? null,
    leyenda: img.legend ?? '',
  }));

  return {
    id: Number(d.id_product),
    slug: d.link_rewrite,
    nombre: decodificar(String(d.name ?? '')).trim(),
    categoriaSlug: d.category ?? '',
    precio: Number(d.price_amount),
    referencia: d.reference ?? '',
    descripcionCorta: d.description_short ?? '',
    descripcion: d.description ?? '',
    metaTitulo: d.meta_title ?? '',
    metaDescripcion: d.meta_description ?? '',
    imagenes,
    colores: extraerColores(html),
    tallas: extraerTallas(html),
    personalizable: Number(d.customizable) > 0,
    camposTexto: Number(d.text_fields ?? 0),
    camposArchivo: Number(d.uploadable_files ?? 0),
  };
}
