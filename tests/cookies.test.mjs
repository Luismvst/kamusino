// Pruebas del consentimiento de cookies.
//
// Lo que se comprueba aquí es lo que sanciona la AEPD, no que el cartel se vea
// bonito: que no se cargue nada antes de aceptar, que rechazar sea tan fácil y
// tan visible como aceptar, y que un «no» se respete y se recuerde.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { contexto } from './navegador.mjs';

let c;

before(async () => {
  c = await contexto({ ancho: 1200, alto: 900 });
});

after(async () => {
  await c?.cerrar();
});

async function limpiar(ruta = '/') {
  await c.ir(ruta);
  await c.pagina.evaluate(() => {
    try {
      localStorage.removeItem('kamusino-consentimiento');
    } catch { /* ventana privada: no hay nada que limpiar */ }
  });
  await c.ir(ruta);
  await c.pagina.waitForFunction(() => Boolean(globalThis.__cookies), { timeout: 5000 });
}

describe('con la analítica apagada', () => {
  test('no aparece ningún cartel', async () => {
    await limpiar();
    assert.equal(await c.pagina.$eval('#aviso-cookies', (e) => e.hidden), true);
  });

  test('el módulo sabe que no hay nada que consentir', async () => {
    assert.equal(await c.pagina.evaluate(() => globalThis.__cookies.HAY_ALGO_QUE_CONSENTIR), false);
  });

  test('no se guarda nada en el navegador solo por visitar', async () => {
    assert.equal(await c.pagina.evaluate(() => localStorage.getItem('kamusino-consentimiento')), null);
  });

  test('el enlace del pie sigue abriendo las preferencias', async () => {
    await c.pagina.click('[data-abrir-cookies]');
    assert.equal(await c.pagina.$eval('#panel-cookies', (e) => e.hidden), false);
  });

  test('y explica que no hay nada que configurar, en vez de enseñar un panel vacío', async () => {
    assert.equal(await c.pagina.$eval('#cookies-nada', (e) => e.hidden), false);
    assert.equal(await c.pagina.$eval('#cookies-bloque-analitica', (e) => e.hidden), true);
  });

  test('la tecla Escape cierra el panel', async () => {
    await c.pagina.keyboard.press('Escape');
    assert.equal(await c.pagina.$eval('#panel-cookies', (e) => e.hidden), true);
  });

  test('el enlace de preferencias está en todas las páginas', async () => {
    for (const ruta of ['/', '/personalizar/', '/privacidad/', '/guias/']) {
      await c.ir(ruta);
      assert.ok(await c.pagina.$('[data-abrir-cookies]'), 'falta en ' + ruta);
    }
  });
});

describe('los dos botones de la primera capa', () => {
  before(async () => {
    await limpiar();
    // El aviso está oculto con la analítica apagada, pero el marcado existe:
    // se enseña a la fuerza para poder medir los botones.
    await c.pagina.evaluate(() => { document.getElementById('aviso-cookies').hidden = false; });
  });

  test('miden exactamente lo mismo', async () => {
    const medidas = await c.pagina.evaluate(() => {
      const r = document.getElementById('cookies-rechazar').getBoundingClientRect();
      const a = document.getElementById('cookies-aceptar').getBoundingClientRect();
      return { anchoR: r.width, anchoA: a.width, altoR: r.height, altoA: a.height };
    });
    assert.ok(Math.abs(medidas.anchoR - medidas.anchoA) < 1, JSON.stringify(medidas));
    assert.ok(Math.abs(medidas.altoR - medidas.altoA) < 1, JSON.stringify(medidas));
  });

  test('están en la misma fila, no uno debajo del otro', async () => {
    const misma = await c.pagina.evaluate(() => {
      const r = document.getElementById('cookies-rechazar').getBoundingClientRect();
      const a = document.getElementById('cookies-aceptar').getBoundingClientRect();
      return Math.abs(r.top - a.top) < 1;
    });
    assert.ok(misma, 'rechazar y aceptar tienen que estar al mismo nivel');
  });

  test('comparten color de fondo, color de texto y grosor de letra', async () => {
    const iguales = await c.pagina.evaluate(() => {
      const estilo = (id) => getComputedStyle(document.getElementById(id));
      const r = estilo('cookies-rechazar');
      const a = estilo('cookies-aceptar');
      return {
        fondo: r.backgroundColor === a.backgroundColor,
        texto: r.color === a.color,
        peso: r.fontWeight === a.fontWeight,
        tamano: r.fontSize === a.fontSize,
        borde: r.borderColor === a.borderColor,
      };
    });
    assert.deepEqual(iguales, { fondo: true, texto: true, peso: true, tamano: true, borde: true });
  });

  test('rechazar está en la primera capa, no escondido tras «configurar»', async () => {
    assert.ok(await c.pagina.$('#aviso-cookies #cookies-rechazar'));
  });
});

describe('la decisión se guarda y se respeta', () => {
  test('rechazar deja constancia con su fecha', async () => {
    await limpiar();
    await c.pagina.evaluate(() => document.getElementById('cookies-rechazar').click());
    const guardado = JSON.parse(await c.pagina.evaluate(() => localStorage.getItem('kamusino-consentimiento')));
    assert.equal(guardado.analitica, false);
    assert.equal(guardado.version, 1);
    assert.match(guardado.fecha, /^\d{4}-\d{2}-\d{2}T/);
  });

  test('aceptar también, y con el mismo formato', async () => {
    await limpiar();
    await c.pagina.evaluate(() => document.getElementById('cookies-aceptar').click());
    const guardado = JSON.parse(await c.pagina.evaluate(() => localStorage.getItem('kamusino-consentimiento')));
    assert.equal(guardado.analitica, true);
  });

  test('un consentimiento caducado no cuenta: se vuelve a preguntar', async () => {
    await c.pagina.evaluate(() => {
      const hace3anos = new Date();
      hace3anos.setFullYear(hace3anos.getFullYear() - 3);
      localStorage.setItem('kamusino-consentimiento', JSON.stringify({
        version: 1, analitica: true, fecha: hace3anos.toISOString(),
      }));
    });
    await c.ir('/');
    assert.equal(await c.pagina.evaluate(() => globalThis.__cookies.leer()), null);
  });

  test('un registro de otra versión tampoco vale', async () => {
    await c.pagina.evaluate(() => localStorage.setItem('kamusino-consentimiento', JSON.stringify({
      version: 99, analitica: true, fecha: new Date().toISOString(),
    })));
    await c.ir('/');
    assert.equal(await c.pagina.evaluate(() => globalThis.__cookies.leer()), null);
  });

  test('un registro corrupto no rompe la página', async () => {
    await c.pagina.evaluate(() => localStorage.setItem('kamusino-consentimiento', 'esto no es json'));
    await c.ir('/');
    c.errores.length = 0;
    assert.equal(await c.pagina.evaluate(() => globalThis.__cookies.leer()), null);
    assert.deepEqual(c.errores, []);
  });
});

describe('la página de cookies dice la verdad', () => {
  test('declara exactamente lo que se guarda y bajo qué artículo', async () => {
    await c.ir('/cookies/');
    const texto = await c.pagina.evaluate(() => document.querySelector('.legal').innerText);
    assert.match(texto, /kamusino-editor/);
    assert.match(texto, /IndexedDB/);
    assert.match(texto, /22\.2/);
  });

  test('explica cómo se borra en cada navegador', async () => {
    const texto = await c.pagina.evaluate(() => document.querySelector('.legal').innerText);
    for (const navegador of ['Chrome', 'Firefox', 'Safari']) {
      assert.match(texto, new RegExp(navegador));
    }
  });

  test('promete el botón de rechazar del mismo peso si algún día hay analítica', async () => {
    const texto = await c.pagina.evaluate(() => document.querySelector('.legal').innerText);
    assert.match(texto, /rechazar tan visible y tan fácil de pulsar como/i);
  });
});
