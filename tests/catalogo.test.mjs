import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const RUTA = new URL('../src/data/catalogo.json', import.meta.url);

let catalogo = null;
let contenido = null;
let errorDeParseo = null;

try {
  contenido = await readFile(RUTA, 'utf8');
} catch {
  contenido = null; // Todavía no se ha ejecutado el rescate: es una situación esperada.
}

if (contenido !== null) {
  try {
    catalogo = JSON.parse(contenido);
  } catch (err) {
    errorDeParseo = err;
  }
}

// Un fichero corrupto NO puede saltarse la red de seguridad: eso daría verde a un
// rescate roto. Solo la ausencia del fichero justifica saltarse los tests.
test('si catalogo.json existe, es JSON válido', { skip: contenido === null ? 'aún no se ha ejecutado npm run scrape' : false }, () => {
  assert.equal(
    errorDeParseo,
    null,
    `src/data/catalogo.json existe (${contenido?.length ?? 0} bytes) pero no es JSON válido: ${errorDeParseo?.message}. ` +
      'Probablemente se cortó a media escritura. Vuelve a ejecutar npm run scrape ANTES del 10 de septiembre.',
  );
});

describe('integridad del catálogo rescatado', { skip: contenido === null ? 'aún no se ha ejecutado npm run scrape' : false }, () => {
  test('hay categorías y productos', () => {
    // La portada declara 26 categorías: perder cinco con sus productos no puede
    // pasar en verde. El umbral de productos sigue siendo deliberadamente bajo
    // porque el total real se desconoce hasta la primera ejecución; solo detecta
    // un rescate catastróficamente vacío.
    assert.ok(catalogo.categorias.length >= 26, `solo ${catalogo.categorias.length} categorías de las 26 esperadas`);
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
