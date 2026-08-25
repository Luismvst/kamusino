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
