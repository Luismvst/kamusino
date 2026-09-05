// Pruebas del editor en un navegador real.
//
// Lo que se comprueba aquí no se puede comprobar de otra forma: que el
// navegador abra cada formato, que un arrastre mueva el diseño, que un giro
// lo gire, y que lo que sale del formulario sea lo que el taller necesita.
// Se conduce Chrome de verdad contra `public/`.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { contexto } from './navegador.mjs';
import { crearMuestras, borrarMuestras } from './muestras.mjs';

let c;
let muestras;
/** Id del primer producto del selector: las pruebas entran con la prenda ya elegida. */
let productoPrueba;

/** Lo último que ha recibido /api/pedido, ya parseado como FormData. */
let recibido = null;

/** Lee el documento del editor desde dentro de la página. */
const doc = () => c.pagina.evaluate(() => JSON.parse(JSON.stringify(globalThis.__editor.almacen.doc)));

const capas = async (cara) => {
  const d = await doc();
  return d.capas[cara ?? d.cara];
};

const cajaLienzo = () => c.pagina.evaluate(() => {
  const r = document.getElementById('lienzo').getBoundingClientRect();
  return { x: r.x, y: r.y, ancho: r.width, alto: r.height };
});

/** Traduce un punto en coordenadas de lienzo (440x400) a píxeles de pantalla. */
async function aPantalla(punto) {
  const caja = await cajaLienzo();
  return {
    x: caja.x + (punto.x / 440) * caja.ancho,
    y: caja.y + (punto.y / 400) * caja.alto,
  };
}

async function subir(...rutas) {
  const antes = (await capas('delantera')).length + (await capas('trasera')).length;
  const entrada = await c.pagina.$('#fichero');
  await entrada.uploadFile(...rutas);
  // Los ficheros rechazados no crean capa, así que la espera no puede ser
  // obligatoria: se le da un margen y luego se comprueba lo que haya.
  await c.pagina.waitForFunction(
    (esperadas) => {
      const d = globalThis.__editor.almacen.doc;
      return d.capas.delantera.length + d.capas.trasera.length >= esperadas;
    },
    { timeout: 4000 },
    antes + rutas.length,
  ).catch(() => {});
}

async function arrastrar(desde, hasta, pasos = 12) {
  const a = await aPantalla(desde);
  const b = await aPantalla(hasta);
  await c.pagina.mouse.move(a.x, a.y);
  await c.pagina.mouse.down();
  for (let i = 1; i <= pasos; i += 1) {
    await c.pagina.mouse.move(a.x + ((b.x - a.x) * i) / pasos, a.y + ((b.y - a.y) * i) / pasos);
  }
  await c.pagina.mouse.up();
}

async function recargarLimpio() {
  await c.ir('/personalizar/?producto=' + productoPrueba);
  await c.pagina.waitForFunction(() => Boolean(globalThis.__editor), { timeout: 8000 });
}

/** Cada prueba arranca de una página limpia y sin sesión guardada. */
async function limpiar() {
  await c.pagina.evaluate(() => new Promise((listo) => {
    const p = indexedDB.deleteDatabase('kamusino-editor');
    p.onsuccess = listo;
    p.onerror = listo;
    p.onblocked = listo;
  }));
  await recargarLimpio();
  c.errores.length = 0;
}

before(async () => {
  muestras = crearMuestras();
  c = await contexto({
    ancho: 1400,
    alto: 1000,
    // El endpoint real llega en la fase siguiente. Este suplente recibe el
    // envío de verdad, con sus binarios, que es lo que hay que comprobar.
    api: {
      '/api/pedido': ({ formulario }) => {
        recibido = formulario;
        return { status: 200, json: { ok: true, referencia: 'KAM-7F3K9Q' } };
      },
    },
  });
  await c.ir('/personalizar/');
  productoPrueba = await c.pagina.$eval('#sel-producto option:not([value=""])', (o) => o.value);
  await recargarLimpio();
});

after(async () => {
  await c?.cerrar();
  if (muestras) borrarMuestras(muestras.dir);
});

describe('arranque', () => {
  test('la página carga sin errores de consola', async () => {
    await limpiar();
    assert.deepEqual(c.errores, []);
  });

  test('ofrece los productos de ropa que el editor sabe dibujar', async () => {
    const n = await c.pagina.$eval('#sel-producto', (s) => s.options.length);
    assert.ok(n >= 35, `solo ${n} productos en el selector`);
  });

  test('no ofrece pantalones ni calcetines, que no sabe representar', async () => {
    const nombres = await c.pagina.$$eval('#sel-producto option', (os) => os.map((o) => o.textContent));
    const sobran = nombres.filter((n) => /pantal|calcetin/i.test(n));
    assert.deepEqual(sobran, []);
  });

  test('empieza sin capas y con el panel de ajustes escondido', async () => {
    assert.equal((await capas()).length, 0);
    assert.equal(await c.pagina.$eval('#bloque-propiedades', (e) => e.hidden), true);
  });

  test('el lienzo tiene tamaño real', async () => {
    const caja = await cajaLienzo();
    assert.ok(caja.ancho > 200 && caja.alto > 200, JSON.stringify(caja));
  });
});

describe('elección de la prenda', () => {
  test('sin producto en la URL arranca en el paso 1, sin lienzo ni zona de subida', async () => {
    await limpiar();
    await c.ir('/personalizar/');
    await c.pagina.waitForFunction(() => Boolean(globalThis.__editor), { timeout: 8000 });
    assert.equal(await c.pagina.$eval('#sel-producto', (s) => s.value), '');
    assert.equal(await c.pagina.$eval('#editor', (e) => e.classList.contains('sin-prenda')), true);
    assert.equal(await c.pagina.$eval('#soltar', (e) => e.offsetParent), null);
    assert.match(await c.pagina.$eval('.paso.activo', (e) => e.textContent), /Elige la prenda/);
  });

  test('al elegir la prenda aparecen el lienzo y el resto de pasos', async () => {
    await c.pagina.select('#sel-producto', productoPrueba);
    assert.equal(await c.pagina.$eval('#editor', (e) => e.classList.contains('sin-prenda')), false);
    assert.notEqual(await c.pagina.$eval('#soltar', (e) => e.offsetParent), null);
    const caja = await cajaLienzo();
    assert.ok(caja.ancho > 200 && caja.alto > 200, JSON.stringify(caja));
    assert.match(await c.pagina.$eval('.paso.activo', (e) => e.textContent), /Sube tu diseño/);
    await recargarLimpio();
  });
});

describe('importación de formatos', () => {
  test('un PNG entra como capa de imagen con su tamaño de origen', async () => {
    await limpiar();
    await subir(muestras.png);
    const [capa] = await capas();
    assert.equal(capa.tipo, 'imagen');
    assert.equal(capa.formato, 'PNG');
    assert.equal(capa.anchoOrigen, 800);
    assert.equal(capa.altoOrigen, 400);
  });

  test('entra encajado en el área imprimible y con su proporción', async () => {
    const [capa] = await capas();
    assert.ok(Math.abs(capa.ancho / capa.alto - 2) < 0.02);
    // Área imprimible de la camiseta: x 153..288, y 104..284.
    assert.ok(capa.x > 153 && capa.x < 288, 'x=' + capa.x);
    assert.ok(capa.y > 104 && capa.y < 284, 'y=' + capa.y);
  });

  test('un JPG de verdad se abre', async (t) => {
    if (!muestras.jpg) return t.skip('no hay foto de catálogo en el repo');
    await limpiar();
    await subir(muestras.jpg);
    const [capa] = await capas();
    assert.equal(capa.formato, 'JPG');
    assert.equal(capa.anchoOrigen, 1100);
  });

  test('un SVG entra marcado como vectorial', async () => {
    await limpiar();
    await subir(muestras.svg);
    const [capa] = await capas();
    assert.equal(capa.formato, 'SVG');
    assert.equal(capa.vectorial, true);
  });

  test('un SVG sin width ni height saca la medida del viewBox', async () => {
    await limpiar();
    await subir(muestras.svgSinMedidas);
    const [capa] = await capas();
    assert.ok(capa.anchoOrigen > 0 && capa.altoOrigen > 0, JSON.stringify(capa));
    assert.ok(Math.abs(capa.ancho / capa.alto - 4) < 0.05, 'proporción ' + capa.ancho / capa.alto);
  });

  test('un SVG con script no ejecuta nada', async () => {
    await limpiar();
    await subir(muestras.svgPeligroso);
    assert.equal(await c.pagina.evaluate(() => globalThis.__colado ?? false), false);
    assert.equal((await capas()).length, 1);
  });

  test('GIF y WEBP se admiten', async () => {
    await limpiar();
    await subir(muestras.gif, muestras.webp);
    const formatos = (await capas()).map((k) => k.formato).sort();
    assert.deepEqual(formatos, ['GIF', 'WEBP']);
  });

  test('un PDF entra como adjunto, no como imagen', async () => {
    await limpiar();
    await subir(muestras.pdf);
    const [capa] = await capas();
    assert.equal(capa.tipo, 'adjunto');
    assert.equal(capa.formato, 'PDF');
  });

  test('un .ai se reconoce por la extensión aunque el tipo venga vacío', async () => {
    await limpiar();
    await subir(muestras.ai);
    const [capa] = await capas();
    assert.equal(capa.tipo, 'adjunto');
    assert.equal(capa.formato, 'AI');
  });

  test('un formato que no admitimos se rechaza con un mensaje claro', async () => {
    await limpiar();
    await subir(muestras.texto);
    assert.equal((await capas()).length, 0);
    assert.match(await c.pagina.$eval('#estado-envio', (e) => e.textContent), /no es un formato/i);
  });

  test('un archivo demasiado grande se rechaza diciendo el límite', async () => {
    await limpiar();
    await subir(muestras.enorme);
    assert.equal((await capas()).length, 0);
    assert.match(await c.pagina.$eval('#estado-envio', (e) => e.textContent), /m[aá]ximo por archivo/i);
  });

  test('se pueden subir varios archivos de una vez', async () => {
    await limpiar();
    await subir(muestras.png, muestras.svg, muestras.pdf);
    assert.equal((await capas()).length, 3);
  });
});

describe('colocación con el ratón', () => {
  test('arrastrar mueve el diseño', async () => {
    await limpiar();
    await subir(muestras.pngCuadrado);
    const antes = (await capas())[0];
    await arrastrar({ x: antes.x, y: antes.y }, { x: antes.x + 40, y: antes.y + 30 });
    const despues = (await capas())[0];
    assert.ok(Math.abs(despues.x - (antes.x + 40)) < 4, `x ${antes.x} -> ${despues.x}`);
    assert.ok(Math.abs(despues.y - (antes.y + 30)) < 4, `y ${antes.y} -> ${despues.y}`);
  });

  test('el diseño no se puede sacar del área imprimible', async () => {
    const area = { x: 153, y: 104, ancho: 135, alto: 180 };
    const antes = (await capas())[0];
    await arrastrar({ x: antes.x, y: antes.y }, { x: 10, y: 380 });
    const despues = (await capas())[0];
    assert.ok(despues.x >= area.x - 0.5, 'x=' + despues.x);
    assert.ok(despues.y <= area.y + area.alto + 0.5, 'y=' + despues.y);
  });

  test('tirar de una esquina cambia el tamaño', async () => {
    await limpiar();
    await subir(muestras.pngCuadrado);
    const antes = (await capas())[0];
    const esquina = { x: antes.x + antes.ancho / 2, y: antes.y + antes.alto / 2 };
    await arrastrar(esquina, { x: esquina.x - 30, y: esquina.y - 30 });
    const despues = (await capas())[0];
    assert.ok(despues.ancho < antes.ancho - 10, `${antes.ancho} -> ${despues.ancho}`);
  });

  test('al escalar se conserva la proporción', async () => {
    await limpiar();
    await subir(muestras.png);
    const antes = (await capas())[0];
    const esquina = { x: antes.x + antes.ancho / 2, y: antes.y + antes.alto / 2 };
    await arrastrar(esquina, { x: esquina.x + 25, y: esquina.y + 2 });
    const despues = (await capas())[0];
    assert.ok(
      Math.abs(despues.ancho / despues.alto - antes.ancho / antes.alto) < 0.02,
      `${antes.ancho / antes.alto} -> ${despues.ancho / despues.alto}`,
    );
  });

  test('el tirador de arriba gira el diseño', async () => {
    await limpiar();
    await subir(muestras.pngCuadrado);
    const antes = (await capas())[0];
    assert.equal(antes.rotacion, 0);
    const mango = { x: antes.x, y: antes.y - antes.alto / 2 - 26 };
    await arrastrar(mango, { x: antes.x + 60, y: antes.y - 20 });
    const despues = (await capas())[0];
    assert.ok(despues.rotacion > 20 && despues.rotacion < 160, 'rotación=' + despues.rotacion);
  });

  test('pulsar fuera de cualquier diseño quita la selección', async () => {
    const fuera = await aPantalla({ x: 30, y: 380 });
    await c.pagina.mouse.click(fuera.x, fuera.y);
    assert.equal((await doc()).seleccion, null);
  });

  test('pulsar sobre un diseño lo selecciona', async () => {
    const capa = (await capas())[0];
    const centro = await aPantalla({ x: capa.x, y: capa.y });
    await c.pagina.mouse.click(centro.x, centro.y);
    assert.equal((await doc()).seleccion, capa.id);
  });

  test('con dos diseños superpuestos se agarra el de encima', async () => {
    await limpiar();
    await subir(muestras.pngCuadrado, muestras.svg);
    const lista = await capas();
    const arriba = lista[1];
    await c.pagina.evaluate(() => globalThis.__editor.almacen.aplicar((d) => ({ ...d, seleccion: null })));
    const punto = await aPantalla({ x: arriba.x, y: arriba.y });
    await c.pagina.mouse.click(punto.x, punto.y);
    assert.equal((await doc()).seleccion, arriba.id);
  });
});

describe('varios diseños y capas', () => {
  test('se apilan y se pueden reordenar', async () => {
    await limpiar();
    await subir(muestras.png, muestras.svg);
    const antes = (await capas()).map((k) => k.id);
    // La lista se pinta al revés, así que la última fila es la capa de abajo.
    await c.pagina.click('.capa:last-child .capa-acciones button[aria-label="Subir una posición"]');
    const despues = (await capas()).map((k) => k.id);
    assert.deepEqual(despues, [antes[1], antes[0]]);
  });

  test('duplicar crea otra capa que también se ve', async () => {
    await limpiar();
    await subir(muestras.png);
    await c.pagina.click('#btn-duplicar');
    const lista = await capas();
    assert.equal(lista.length, 2);
    assert.notEqual(lista[0].id, lista[1].id);
    const tieneRecurso = await c.pagina.evaluate(
      (id) => Boolean(globalThis.__editor.almacen.recurso(id)?.imagen),
      lista[1].id,
    );
    assert.equal(tieneRecurso, true, 'la copia se quedó sin imagen');
  });

  test('borrar quita la capa de la lista', async () => {
    await c.pagina.click('#btn-borrar');
    assert.equal((await capas()).length, 1);
  });

  test('se respeta el máximo de diseños por pedido', async () => {
    await limpiar();
    await subir(...Array.from({ length: 9 }, () => muestras.gif));
    assert.equal((await capas()).length, 8);
    assert.match(await c.pagina.$eval('#estado-envio', (e) => e.textContent), /m[aá]ximo/i);
  });
});

describe('texto', () => {
  test('se añade una capa de texto', async () => {
    await limpiar();
    await c.pagina.click('#btn-texto');
    const [capa] = await capas();
    assert.equal(capa.tipo, 'texto');
    assert.ok(capa.texto.length > 0);
  });

  test('escribir cambia el texto y reajusta el ancho de la caja', async () => {
    const antes = (await capas())[0];
    await c.pagina.click('#texto-contenido', { clickCount: 3 });
    await c.pagina.type('#texto-contenido', 'KAMUSINO');
    await c.pagina.waitForFunction(() => globalThis.__editor.almacen.doc.capas.delantera[0].texto === 'KAMUSINO');
    const despues = (await capas())[0];
    assert.equal(despues.texto, 'KAMUSINO');
    assert.notEqual(Math.round(despues.ancho), Math.round(antes.ancho));
  });

  test('la negrita se alterna', async () => {
    const antes = (await capas())[0].negrita;
    await c.pagina.click('#texto-negrita');
    assert.equal((await capas())[0].negrita, !antes);
  });

  test('sobre prenda clara el texto no se queda en blanco invisible', async () => {
    const { color, tinta } = await c.pagina.evaluate(() => {
      const hex = globalThis.__editor.almacen.doc.color.hex;
      return { color: hex, tinta: globalThis.__editor.tintaSobre(hex) };
    });
    if (tinta === '#1c1c1c') {
      assert.notEqual((await capas())[0].color, '#ffffff', 'texto blanco sobre ' + color);
    }
  });

  test('escribir en el campo no borra la capa con la tecla de retroceso', async () => {
    await c.pagina.focus('#texto-contenido');
    await c.pagina.keyboard.press('Backspace');
    assert.equal((await capas()).length, 1);
  });
});

describe('deshacer y rehacer', () => {
  test('deshacer quita el último diseño y rehacer lo devuelve', async () => {
    await limpiar();
    await subir(muestras.png);
    assert.equal((await capas()).length, 1);

    await c.pagina.click('#btn-deshacer');
    assert.equal((await capas()).length, 0);

    await c.pagina.click('#btn-rehacer');
    assert.equal((await capas()).length, 1);
  });

  test('un arrastre entero se deshace de una sola vez', async () => {
    const antes = (await capas())[0];
    await arrastrar({ x: antes.x, y: antes.y }, { x: antes.x + 35, y: antes.y + 25 });
    assert.notEqual(Math.round((await capas())[0].x), Math.round(antes.x));

    await c.pagina.click('#btn-deshacer');
    const vuelto = (await capas())[0];
    assert.ok(Math.abs(vuelto.x - antes.x) < 0.01, `${antes.x} -> ${vuelto.x}`);
  });

  test('Ctrl+Z también deshace', async () => {
    await limpiar();
    await subir(muestras.png);
    await c.pagina.keyboard.down('Control');
    await c.pagina.keyboard.press('KeyZ');
    await c.pagina.keyboard.up('Control');
    assert.equal((await capas()).length, 0);
  });
});

describe('teclado', () => {
  test('las flechas mueven el diseño seleccionado', async () => {
    await limpiar();
    await subir(muestras.png);
    const antes = (await capas())[0];
    await c.pagina.keyboard.press('ArrowRight');
    await c.pagina.keyboard.press('ArrowRight');
    assert.ok((await capas())[0].x > antes.x);
  });

  test('la tecla Suprimir borra el diseño seleccionado', async () => {
    await c.pagina.keyboard.press('Delete');
    assert.equal((await capas()).length, 0);
  });
});

describe('caras', () => {
  test('cada cara tiene sus propios diseños', async () => {
    await limpiar();
    await subir(muestras.png);
    await c.pagina.click('.cara[data-cara="trasera"]');
    assert.equal((await capas('trasera')).length, 0);
    await subir(muestras.svg);
    assert.equal((await capas('trasera')).length, 1);
    assert.equal((await capas('delantera')).length, 1);
  });

  test('la pestaña muestra cuántos diseños lleva cada cara', async () => {
    const cuantas = await c.pagina.$$eval('.cara', (bs) => bs.map((b) => b.dataset.cuantas));
    assert.deepEqual(cuantas, ['1', '1']);
  });
});

describe('prenda y color', () => {
  test('cambiar de color cambia el documento', async () => {
    await limpiar();
    await c.pagina.click('.muestra:nth-child(2)');
    const d = await doc();
    assert.ok(d.color.nombre);
    assert.notEqual(d.color.hex, '#ffffff');
  });

  test('cambiar de talla cambia el documento', async () => {
    await c.pagina.click('.talla-elegible:nth-child(3)');
    const etiqueta = await c.pagina.$eval('.talla-elegible:nth-child(3)', (b) => b.textContent);
    assert.equal((await doc()).talla, etiqueta);
  });

  test('cambiar de producto cambia la prenda y recoloca los diseños', async () => {
    await limpiar();
    await subir(muestras.png);
    const idSudadera = await c.pagina.$$eval('#sel-producto option', (os) => {
      const o = os.find((x) => /capucha/i.test(x.textContent));
      return o ? o.value : null;
    });
    assert.ok(idSudadera, 'no hay ninguna sudadera con capucha en el catálogo');

    await c.pagina.select('#sel-producto', idSudadera);
    const d = await doc();
    assert.equal(d.tipoPrenda, 'sudadera-capucha');
    // Área imprimible de la sudadera con capucha: y de 136 a 275.
    const capa = d.capas.delantera[0];
    assert.ok(capa.y >= 136 && capa.y <= 275, 'y=' + capa.y);
  });

  test('al cambiar de producto se conserva una talla que exista en el nuevo', async () => {
    const d = await doc();
    const tallas = await c.pagina.$$eval('.talla-elegible', (bs) => bs.map((b) => b.textContent));
    assert.ok(tallas.includes(d.talla), `${d.talla} no está en ${tallas}`);
  });
});

describe('avisos antes de enviar', () => {
  test('avisa cuando la resolución no da para imprimir', async () => {
    await limpiar();
    await subir(muestras.pngDiminuto);
    await c.pagina.waitForSelector('#bloque-avisos:not([hidden])', { timeout: 4000 });
    assert.match(await c.pagina.$eval('#avisos', (e) => e.textContent), /ppp/i);
  });

  test('explica que un PDF no se previsualiza pero sí llega', async () => {
    await limpiar();
    await subir(muestras.pdf);
    await c.pagina.waitForSelector('#bloque-avisos:not([hidden])', { timeout: 4000 });
    assert.match(await c.pagina.$eval('#avisos', (e) => e.textContent), /no se puede previsualizar/i);
  });

  test('sin problemas no se enseña el bloque de avisos', async () => {
    await limpiar();
    await subir(muestras.svg);
    assert.equal(await c.pagina.$eval('#bloque-avisos', (e) => e.hidden), true);
  });
});

describe('guardado de la sesión', () => {
  test('el diseño sobrevive a recargar la página', async () => {
    await limpiar();
    await subir(muestras.png);
    const antes = (await capas())[0];
    // El guardado se agrupa: hay que darle su margen antes de recargar.
    await new Promise((r) => setTimeout(r, 1200));

    await recargarLimpio();
    await c.pagina.waitForFunction(
      () => globalThis.__editor.almacen.doc.capas.delantera.length === 1,
      { timeout: 6000 },
    );
    const despues = (await capas())[0];
    assert.equal(despues.nombre, antes.nombre);
    assert.ok(Math.abs(despues.x - antes.x) < 0.01);

    const tieneImagen = await c.pagina.evaluate(
      (id) => Boolean(globalThis.__editor.almacen.recurso(id)?.imagen),
      despues.id,
    );
    assert.equal(tieneImagen, true, 'se recuperó la capa pero no su imagen');
  });
});

describe('validación del formulario', () => {
  test('no deja enviar sin ningún diseño', async () => {
    await limpiar();
    await c.pagina.click('#btn-enviar');
    assert.match(await c.pagina.$eval('#estado-envio', (e) => e.textContent), /a[ñn]ade al menos un dise[ñn]o/i);
  });

  test('exige el nombre', async () => {
    await subir(muestras.svg);
    await c.pagina.click('#btn-enviar');
    assert.match(await c.pagina.$eval('#estado-envio', (e) => e.textContent), /nombre/i);
  });

  test('exige un email con forma de email', async () => {
    await c.pagina.type('#f-nombre', 'Ana Pérez');
    await c.pagina.type('#f-email', 'esto-no-es-un-email');
    await c.pagina.click('#btn-enviar');
    assert.match(await c.pagina.$eval('#estado-envio', (e) => e.textContent), /email/i);
  });

  test('exige aceptar las condiciones', async () => {
    await c.pagina.click('#f-email', { clickCount: 3 });
    await c.pagina.type('#f-email', 'ana@ejemplo.es');
    await c.pagina.click('#btn-enviar');
    assert.match(await c.pagina.$eval('#estado-envio', (e) => e.textContent), /condiciones/i);
  });
});

describe('envío del pedido', () => {
  test('manda mockup, fichero de imprenta, originales y resumen', async () => {
    await limpiar();
    recibido = null;

    await subir(muestras.png, muestras.pdf);
    await c.pagina.click('.cara[data-cara="trasera"]');
    await subir(muestras.svg);

    await c.pagina.type('#f-nombre', 'Ana Pérez');
    await c.pagina.type('#f-email', 'ana@ejemplo.es');
    await c.pagina.type('#f-notas', 'Para el sábado si puede ser');
    await c.pagina.click('#f-acepta');

    await c.pagina.click('#btn-enviar');
    await c.pagina.waitForSelector('.enviado', { timeout: 40000 });

    assert.ok(recibido, 'no ha llegado nada al servidor');
    for (const parte of [
      'pedido', 'mockup-delantera', 'mockup-trasera',
      'estampacion-delantera', 'estampacion-trasera', 'original-1',
    ]) {
      assert.ok(recibido.has(parte), 'falta ' + parte);
    }
  });

  test('las imágenes que llegan son PNG de verdad y no están vacías', async () => {
    for (const parte of ['mockup-delantera', 'estampacion-delantera', 'estampacion-trasera']) {
      const fichero = recibido.get(parte);
      const bytes = new Uint8Array(await fichero.arrayBuffer());
      assert.ok(bytes.length > 1000, `${parte} pesa ${bytes.length} bytes`);
      // Firma PNG: 89 50 4E 47.
      assert.deepEqual([...bytes.slice(0, 4)], [0x89, 0x50, 0x4E, 0x47], parte + ' no es un PNG');
    }
  });

  test('el fichero de imprenta sale a resolución de imprenta', async () => {
    const json = JSON.parse(recibido.get('pedido'));
    assert.ok(json.resoluciones.delantera.ppp >= 150, JSON.stringify(json.resoluciones));
    assert.ok(json.resoluciones.delantera.ancho > 1000, 'ancho ' + json.resoluciones.delantera.ancho);
  });

  test('los archivos originales llegan enteros y con su nombre', async () => {
    const originales = [...recibido.keys()].filter((k) => k.startsWith('original-'));
    assert.equal(originales.length, 3, originales.join());
    const nombres = originales.map((k) => recibido.get(k).name);
    assert.ok(nombres.some((n) => n.endsWith('logo.png')), nombres.join());
    assert.ok(nombres.some((n) => n.endsWith('folleto.pdf')), nombres.join());
    assert.ok(nombres.some((n) => n.endsWith('marca.svg')), nombres.join());
  });

  test('el PDF original llega byte a byte como lo subió el cliente', async () => {
    const clave = [...recibido.keys()].find((k) => k.startsWith('original-') && recibido.get(k).name.endsWith('.pdf'));
    const texto = await recibido.get(clave).text();
    assert.ok(texto.startsWith('%PDF-'), 'no empieza por la firma de PDF');
    assert.match(texto, /Diseno de prueba/);
  });

  test('el SVG adjunto va saneado, sin script ni referencias remotas', async () => {
    await limpiar();
    recibido = null;
    await subir(muestras.svgPeligroso);
    await c.pagina.type('#f-nombre', 'Ana Pérez');
    await c.pagina.type('#f-email', 'ana@ejemplo.es');
    await c.pagina.click('#f-acepta');
    await c.pagina.click('#btn-enviar');
    await c.pagina.waitForSelector('.enviado', { timeout: 40000 });

    const clave = [...recibido.keys()].find((k) => k.startsWith('original-'));
    const svg = await recibido.get(clave).text();
    assert.ok(!/<script/i.test(svg), 'el script ha sobrevivido');
    assert.ok(!/onload=/i.test(svg), 'el manejador onload ha sobrevivido');
    assert.ok(!/https:\/\/ejemplo\.invalido/.test(svg), 'la referencia remota ha sobrevivido');
    assert.match(svg, /<rect/, 'se ha llevado por delante el dibujo');
  });

  test('el resumen describe el pedido en términos que el taller entiende', async () => {
    await limpiar();
    recibido = null;
    await subir(muestras.png);
    await c.pagina.type('#f-nombre', 'Ana Pérez');
    await c.pagina.type('#f-email', 'ana@ejemplo.es');
    await c.pagina.type('#f-notas', 'Para el sábado si puede ser');
    await c.pagina.click('#f-acepta');
    await c.pagina.click('#btn-enviar');
    await c.pagina.waitForSelector('.enviado', { timeout: 40000 });

    const json = JSON.parse(recibido.get('pedido'));
    assert.equal(json.contacto.email, 'ana@ejemplo.es');
    assert.equal(json.contacto.acepta, true);
    assert.match(json.resumen.notas, /sábado/);
    assert.ok(json.resumen.producto.nombre.length > 0);
    assert.ok(json.resumen.talla.length > 0);
    assert.equal(json.resumen.cantidad, 1);

    const capa = json.resumen.caras[0].capas[0];
    assert.equal(capa.nombre, 'logo.png');
    assert.ok(capa.medidasCm.ancho > 0 && capa.medidasCm.alto > 0, JSON.stringify(capa.medidasCm));
    assert.equal(typeof capa.rotacionGrados, 'number');
    assert.ok(capa.pppEstimado > 0);
  });

  test('la trampa antispam viaja vacía cuando la rellena una persona', async () => {
    const json = JSON.parse(recibido.get('pedido'));
    assert.equal(json.contacto.empresa, '');
  });

  test('la pantalla final enseña la referencia del pedido', async () => {
    assert.match(await c.pagina.$eval('.enviado', (e) => e.textContent), /KAM-7F3K9Q/);
  });

  test('tras enviar ya no queda sesión guardada', async () => {
    await recargarLimpio();
    assert.equal((await capas('delantera')).length, 0);
  });
});
