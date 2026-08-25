export const BASE = 'https://kamusino.com';

// Las URL de categoría de PrestaShop tienen la forma /{id}-{slug}.
// Se descartan las de producto, que llevan un segundo número y acaban en .html.
const RE_CATEGORIA = /https:\/\/kamusino\.com\/(\d+)-([a-z0-9-]+)(?=["'?#\s])/g;

export function extraerCategorias(html) {
  const porId = new Map();
  for (const [, id, slug] of html.matchAll(RE_CATEGORIA)) {
    const idNum = Number(id);
    if (porId.has(idNum)) continue;
    porId.set(idNum, { id: idNum, slug, url: `${BASE}/${id}-${slug}` });
  }
  return [...porId.values()].sort((a, b) => a.id - b.id);
}
