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
    // pasar en verde. El umbral de productos es el suelo verificado de la primera
    // ejecución correcta (con la regex de listado.mjs arreglada), no una estimación:
    // solo detecta un rescate catastróficamente vacío.
    assert.ok(catalogo.categorias.length >= 26, `solo ${catalogo.categorias.length} categorías de las 26 esperadas`);
    assert.ok(catalogo.productos.length >= 40, `solo ${catalogo.productos.length} productos`);
  });

  test('todo producto tiene un precio numérico y no negativo', () => {
    // Cero es legítimo: las pegatinas se presupuestan a medida. Lo que no puede
    // pasar es un NaN o un negativo, que serían fallo de extracción.
    const malos = catalogo.productos.filter(
      (p) => !Number.isFinite(p.precio) || p.precio < 0,
    );
    assert.equal(malos.length, 0, `precio inválido: ${malos.map((p) => `${p.slug}=${p.precio}`).join(', ')}`);
  });

  test('todo producto tiene nombre', () => {
    const malos = catalogo.productos.filter((p) => !p.nombre?.trim());
    assert.equal(malos.length, 0, `sin nombre: ${malos.map((p) => p.id).join(', ')}`);
  });

  test('los ids no se repiten', () => {
    const ids = catalogo.productos.map((p) => p.id);
    const repetidos = ids.filter((x, i) => ids.indexOf(x) !== i);
    assert.deepEqual([...new Set(repetidos)], [], 'un id repetido significa producto duplicado en el rescate');
  });

  test('todo producto tiene slug e id utilizables', () => {
    // Ojo: el slug NO es único (32 productos distintos comparten
    // "camiseta-gildan-sofstyle" en el origen). La web nueva deberá construir sus
    // URL con el id, o regenerar el slug desde el nombre.
    const malos = catalogo.productos.filter((p) => !p.slug?.trim() || !Number.isInteger(p.id));
    assert.equal(malos.length, 0, `slug o id inservible: ${malos.map((p) => p.id).join(', ')}`);
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

  test('los contadores de personalización son números válidos', () => {
    // Que un producto se declare personalizable y no liste campos es una
    // incoherencia de la tienda de origen, no un fallo del rescate. Aquí solo
    // verificamos que los contadores se extrajeron y no llegaron corruptos.
    const malos = catalogo.productos.filter(
      (p) => !Number.isInteger(p.camposTexto) || !Number.isInteger(p.camposArchivo),
    );
    assert.equal(malos.length, 0, `contadores corruptos: ${malos.map((p) => p.slug).join(', ')}`);
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
