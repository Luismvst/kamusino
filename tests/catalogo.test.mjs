import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const RUTA = new URL('../src/data/catalogo.json', import.meta.url);

let catalogo;
try {
  catalogo = JSON.parse(await readFile(RUTA, 'utf8'));
} catch {
  catalogo = null;
}

describe('integridad del catálogo rescatado', { skip: catalogo ? false : 'aún no se ha ejecutado npm run scrape' }, () => {
  test('hay categorías y productos', () => {
    // Umbral deliberadamente bajo: varias de las 26 categorías son padres
    // (97-textil) o subcategorías de género (242-247), así que el total real
    // se desconoce hasta la primera ejecución. Este test solo detecta un
    // rescate catastróficamente vacío; el número real se fija en la Task 8.
    assert.ok(catalogo.categorias.length >= 20, `solo ${catalogo.categorias.length} categorías`);
    assert.ok(catalogo.productos.length >= 50, `solo ${catalogo.productos.length} productos`);
  });

  test('todo producto tiene precio positivo', () => {
    const malos = catalogo.productos.filter((p) => !(typeof p.precio === 'number' && p.precio > 0));
    assert.equal(malos.length, 0, `sin precio válido: ${malos.map((p) => p.slug).join(', ')}`);
  });

  test('todo producto tiene nombre', () => {
    const malos = catalogo.productos.filter((p) => !p.nombre?.trim());
    assert.equal(malos.length, 0, `sin nombre: ${malos.map((p) => p.id).join(', ')}`);
  });

  test('los slugs no se repiten', () => {
    const slugs = catalogo.productos.map((p) => p.slug);
    const repetidos = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    assert.deepEqual([...new Set(repetidos)], []);
  });

  test('toda categoría referenciada existe', () => {
    const ids = new Set(catalogo.categorias.map((c) => c.id));
    const huerfanos = catalogo.productos.filter((p) => !ids.has(p.categoriaId));
    assert.equal(huerfanos.length, 0, `categoría inexistente: ${huerfanos.map((p) => p.slug).join(', ')}`);
  });

  test('todo producto tiene al menos una imagen', () => {
    const sinFoto = catalogo.productos.filter((p) => !p.imagenes?.length);
    assert.equal(sinFoto.length, 0, `sin imágenes: ${sinFoto.map((p) => p.slug).join(', ')}`);
  });

  test('toda imagen existe en disco y no está vacía', async () => {
    const faltan = [];
    for (const p of catalogo.productos) {
      for (const img of p.imagenes) {
        const destino = join('public', img.ruta.replace(/^\//, ''));
        try {
          const s = await stat(destino);
          if (s.size === 0) faltan.push(`${destino} (0 bytes)`);
        } catch {
          faltan.push(destino);
        }
      }
    }
    assert.equal(faltan.length, 0, `imágenes que faltan:\n${faltan.slice(0, 20).join('\n')}`);
  });

  test('los productos personalizables declaran sus campos', () => {
    for (const p of catalogo.productos.filter((x) => x.personalizable)) {
      assert.ok(
        p.camposTexto + p.camposArchivo > 0,
        `${p.slug} dice ser personalizable pero no declara campos`,
      );
    }
  });

  test('ningún producto quedó con avisos de extracción', () => {
    const conAvisos = catalogo.productos.filter((p) => p.avisos?.length);
    assert.equal(
      conAvisos.length,
      0,
      `productos con extracción dudosa:\n${conAvisos.slice(0, 20).map((p) => `${p.slug}: ${p.avisos.join('; ')}`).join('\n')}`,
    );
  });
});
