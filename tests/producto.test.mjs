import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extraerDataProduct, extraerColores, extraerTallas, rutaImagen, normalizar }
  from '../src/scrape/producto.mjs';

const html = await readFile(new URL('./fixtures/producto-2158.html', import.meta.url), 'utf8');

test('extraerDataProduct devuelve el objeto de PrestaShop', () => {
  const d = extraerDataProduct(html);
  assert.equal(Number(d.id_product), 2158);
  assert.equal(d.link_rewrite, 'camiseta-gildan-sofstyle');
  assert.equal(d.price_amount, 12);
  assert.equal(d.category, 'personaliza');
});

test('rutaImagen reparte los dígitos del id en carpetas', () => {
  assert.equal(rutaImagen(11384), '/img/p/1/1/3/8/4/11384-thickbox_default.jpg');
  assert.equal(rutaImagen(7, 'home_default'), '/img/p/7/7-home_default.jpg');
});

test('extraerColores devuelve nombres y hex', () => {
  const colores = extraerColores(html);
  assert.ok(colores.length >= 15, `esperaba 15+ colores, obtuve ${colores.length}`);
  for (const c of colores) {
    assert.match(c.hex, /^#[0-9a-f]{6}$/);
    assert.ok(c.nombre.length > 0);
  }
  assert.ok(colores.some((c) => c.hex === '#ffffff'), 'debe existir el blanco');
});

test('extraerTallas devuelve las tallas del grupo', () => {
  const tallas = extraerTallas(html);
  assert.equal(tallas.length, 7);
  assert.ok(tallas.includes('XS'));
});

test('normalizar produce un producto completo', () => {
  const p = normalizar(html);
  assert.equal(p.id, 2158);
  assert.equal(p.precio, 12);
  assert.equal(p.slug, 'camiseta-gildan-sofstyle');
  assert.ok(p.imagenes.length >= 1);
  assert.match(p.imagenes[0].ruta, /^\/img\/p\//);
  assert.equal(p.personalizable, true);
  assert.equal(p.camposTexto, 1);
  assert.equal(p.camposArchivo, 0);
});

test('normalizar no deja precios a cero ni nombres vacíos', () => {
  const p = normalizar(html);
  assert.ok(p.precio > 0);
  assert.ok(p.nombre.trim().length > 0);
});

test('el producto real no genera avisos', () => {
  assert.deepEqual(normalizar(html).avisos, []);
});

test('avisa si declara grupo de color pero no se extrae ninguno', () => {
  // Ficha sin marcado de swatches: los grupos declarados no cuadran con lo extraído.
  const dp = JSON.stringify({
    id_product: 99, link_rewrite: 'x', name: 'X', category: 'c', price_amount: 5,
    customizable: 0, text_fields: 0, uploadable_files: 0, images: [],
    attributes: { 1: { id_attribute_group: '1', name: 'Rojo', group: 'Color de camisetas' } },
  }).replace(/"/g, '&quot;');
  const avisos = normalizar(`<div data-product="${dp}"></div>`).avisos;
  assert.ok(
    avisos.some((a) => /color/i.test(a)),
    `esperaba un aviso de color, obtuve ${JSON.stringify(avisos)}`,
  );
});

test('avisa si el precio no es numérico y no propaga NaN', () => {
  const dp = JSON.stringify({
    id_product: 98, link_rewrite: 'y', name: 'Y', category: 'c', price_amount: null,
    customizable: 0, text_fields: 0, uploadable_files: 0, images: [], attributes: {},
  }).replace(/"/g, '&quot;');
  const p = normalizar(`<div data-product="${dp}"></div>`);
  assert.ok(avisosIncluyenPrecio(p.avisos), `esperaba aviso de precio, obtuve ${JSON.stringify(p.avisos)}`);
  assert.equal(p.precio, 0, 'el precio roto no debe propagarse como NaN');
  function avisosIncluyenPrecio(a) { return a.some((x) => /precio/i.test(x)); }
});

test('extraerTallas elige el select por id de grupo, no por posición', () => {
  const doc = `
    <select name="group[1]"><option>Rojo</option><option>Azul</option></select>
    <select name="group[2]"><option>S</option><option>M</option></select>
  `;
  assert.deepEqual(extraerTallas(doc, '2'), ['S', 'M']);
  assert.deepEqual(extraerTallas(doc, '1'), ['Rojo', 'Azul']);
});
