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
