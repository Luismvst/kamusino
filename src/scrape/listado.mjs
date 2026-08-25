// Ficha de producto: /{categoria}/{idProducto}[-{idCombinacion}]-{slug}.html
// Los productos SIN combinaciones de atributos no llevan id de combinación:
// /personaliza/2003-pantalon-personalizado-.html
const RE_PRODUCTO = /https:\/\/kamusino\.com\/([a-z0-9-]+)\/(\d+)-(?:\d+-)?([a-z0-9-]+)\.html/g;

/** Fuente única del id de producto a partir de su URL. */
export function idProductoDeUrl(url) {
  const m = url.match(/\/(\d+)-(?:\d+-)?[a-z0-9-]+\.html$/);
  return m ? Number(m[1]) : null;
}

export function extraerUrlsProducto(html) {
  const porProducto = new Map();
  for (const [url] of html.matchAll(RE_PRODUCTO)) {
    const id = idProductoDeUrl(url);
    // Nos quedamos con la primera variante encontrada: la ficha trae el producto entero.
    if (id !== null && !porProducto.has(id)) porProducto.set(id, url);
  }
  return [...porProducto.values()];
}

/** El total que la propia página declara, para contrastarlo con lo que extraemos. */
export function articulosDeclarados(html) {
  const m = html.match(/de\s+(\d+)\s+art[íi]culo/i);
  return m ? Number(m[1]) : null;
}

export function urlCategoriaCompleta(urlCategoria) {
  return `${urlCategoria}?resultsPerPage=9999999`;
}
