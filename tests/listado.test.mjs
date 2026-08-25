import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { articulosDeclarados, extraerUrlsProducto } from '../src/scrape/listado.mjs';

const html = await readFile(new URL('./fixtures/categoria-104.html', import.meta.url), 'utf8');

test('encuentra los 20 productos de la categoría', () => {
  const urls = extraerUrlsProducto(html);
  assert.equal(urls.length, 20, `la categoría dice "20 artículo(s)", obtuve ${urls.length}`);
});

test('deduplica las variantes del mismo producto', () => {
  const urls = extraerUrlsProducto(html);
  assert.equal(urls.length, new Set(urls).size);
  // 246 enlaces .html en bruto contra 20 productos: la deduplicación es obligatoria.
  const enBruto = html.match(/https:\/\/kamusino\.com\/[^"']*\.html/g) ?? [];
  assert.ok(enBruto.length > urls.length * 5, 'el fixture debería traer muchas más variantes que productos');
});

test('devuelve urls absolutas de ficha', () => {
  for (const u of extraerUrlsProducto(html)) {
    assert.match(u, /^https:\/\/kamusino\.com\/[a-z0-9-]+\/\d+-\d+-[a-z0-9-]+\.html$/);
  }
});

test('lee el total que declara la propia página', () => {
  assert.equal(articulosDeclarados(html), 20);
  assert.equal(articulosDeclarados('<p>sin totales</p>'), null);
});
