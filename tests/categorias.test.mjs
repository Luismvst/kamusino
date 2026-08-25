import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extraerCategorias } from '../src/scrape/categorias.mjs';

const portada = await readFile(new URL('./fixtures/portada.html', import.meta.url), 'utf8');

test('extrae todas las categorías del menú', () => {
  const cats = extraerCategorias(portada);
  assert.ok(cats.length >= 20, `esperaba 20+ categorías, obtuve ${cats.length}`);
});

test('cada categoría tiene id numérico, slug y url absoluta', () => {
  for (const c of extraerCategorias(portada)) {
    assert.equal(typeof c.id, 'number');
    assert.ok(Number.isInteger(c.id) && c.id > 0);
    assert.match(c.slug, /^[a-z0-9-]+$/);
    assert.ok(c.url.startsWith('https://kamusino.com/'));
  }
});

test('no repite categorías', () => {
  const ids = extraerCategorias(portada).map((c) => c.id);
  assert.equal(ids.length, new Set(ids).size);
});

test('incluye la categoría 104-camisetas', () => {
  const cats = extraerCategorias(portada);
  const camisetas = cats.find((c) => c.id === 104);
  assert.ok(camisetas, 'falta la categoría 104');
  assert.equal(camisetas.slug, 'camisetas');
});

test('no confunde una url de producto con una categoría', () => {
  const html = `
    <a href="https://kamusino.com/104-camisetas">Camisetas</a>
    <a href="https://kamusino.com/personaliza/2158-11723-camiseta-gildan-sofstyle.html">Producto</a>
    <a href="https://kamusino.com/content/2-aviso-legal">Aviso legal</a>
    <a href="https://kamusino.es/4-camisetas">Dominio muerto</a>
  `;
  const cats = extraerCategorias(html);
  assert.deepEqual(
    cats.map((c) => c.id),
    [104],
    `solo 104 es categoría; obtuve ${JSON.stringify(cats.map((c) => `${c.id}-${c.slug}`))}`,
  );
});
