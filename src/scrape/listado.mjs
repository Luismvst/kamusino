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

export function urlCategoriaCompleta(urlCategoria) {
  return `${urlCategoria}?resultsPerPage=9999999`;
}
