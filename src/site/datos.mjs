import { readFile } from 'node:fs/promises';

const RUTA_CATALOGO = new URL('../data/catalogo.json', import.meta.url);

// "De prueba Iván" (id 2155, 0 €, 6 capturas de pantalla como fotos) es basura
// de pruebas que quedó publicada en la tienda de origen. No es un producto real.
const EXCLUIDOS = new Set([2155]);

// La tienda de origen tenía 26 categorías, pero solo 7 tenían productos, y la
// mayoría con uno solo (restos de una taxonomía que nunca se terminó). Para el
// cliente esto se ve mejor agrupado en 3 secciones con sentido, no como 7
// categorías casi vacías con nombres técnicos de PrestaShop.
export const GRUPOS = [
  {
    slug: 'ropa-personalizada',
    nombre: 'Ropa personalizada',
    resumen: 'Camisetas, sudaderas, polos y ropa de trabajo, personalizados a tu gusto.',
    categoriaIds: [97],
  },
  {
    slug: 'pegatinas-y-rotulacion',
    nombre: 'Pegatinas y rotulación',
    resumen: 'Pegatinas a medida y rotulación para vehículos, escaparates y paredes.',
    categoriaIds: [39, 40, 150, 151, 152],
  },
  {
    slug: 'tarjetas-de-visita',
    nombre: 'Tarjetas de visita',
    resumen: 'Tarjetas de visita personalizadas para tu negocio.',
    categoriaIds: [17],
  },
];

// Contacto real de la tienda, verificado en la web pública antes del rescate.
export const CONTACTO = {
  whatsapp: '34747413526',
  email: 'tucamisetaonline@outlook.es',
};

export async function cargarCatalogo() {
  const catalogo = JSON.parse(await readFile(RUTA_CATALOGO, 'utf8'));
  const productos = catalogo.productos
    .filter((p) => !EXCLUIDOS.has(p.id))
    .map((p) => ({ ...p, grupo: grupoDe(p.categoriaId) }))
    .filter((p) => p.grupo); // descarta productos de categorías sin grupo asignado

  return { ...catalogo, productos };
}

function grupoDe(categoriaId) {
  return GRUPOS.find((g) => g.categoriaIds.includes(categoriaId)) ?? null;
}

export function productosDeGrupo(productos, grupoSlug) {
  return productos.filter((p) => p.grupo.slug === grupoSlug);
}

// El slug de origen no es fiable para URLs públicas: 32 productos comparten
// "camiseta-gildan-sofstyle", y al menos uno filtra el nombre de la persona
// que lo dio de alta en el backoffice ("tarjetas-visita-ivan"). Se genera la
// URL desde el nombre real del producto; el id delante evita cualquier
// colisión si dos nombres coincidieran.
function slugificar(texto) {
  return texto
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function urlProducto(p) {
  return `/producto/${p.id}-${slugificar(p.nombre)}/`;
}

export function urlCategoria(grupo) {
  return `/categoria/${grupo.slug}/`;
}

export function esPresupuesto(p) {
  return !(p.precio > 0);
}

export function formatoPrecio(p) {
  return p.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

/** Enlace de WhatsApp con el pedido ya redactado; el cliente solo confirma y envía. */
export function enlaceWhatsApp(mensaje) {
  return `https://wa.me/${CONTACTO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

export function mensajePedido(p) {
  const lineas = [`Hola, quiero pedir: ${p.nombre} (ref. #${p.id}).`];
  if (esPresupuesto(p)) {
    lineas[0] = `Hola, quiero un presupuesto para: ${p.nombre}.`;
    lineas.push('Medidas: ');
    lineas.push('Cantidad: ');
  } else {
    if (p.colores?.length) lineas.push('Color: ');
    if (p.tallas?.length) lineas.push('Talla: ');
    lineas.push('Cantidad: ');
  }
  if (p.personalizable) lineas.push('Adjunto mi diseño/foto para personalizar.');
  return lineas.join('\n');
}
