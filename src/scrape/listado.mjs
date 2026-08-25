// Ficha de producto: /{categoria}/{idProducto}-{idCombinacion}-{slug}.html
const RE_PRODUCTO = /https:\/\/kamusino\.com\/([a-z0-9-]+)\/(\d+)-(\d+)-([a-z0-9-]+)\.html/g;

export function extraerUrlsProducto(html) {
  const porProducto = new Map();
  for (const [url, , idProducto] of html.matchAll(RE_PRODUCTO)) {
    const id = Number(idProducto);
    // Nos quedamos con la primera variante encontrada: la ficha trae el producto entero.
    if (!porProducto.has(id)) porProducto.set(id, url);
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
