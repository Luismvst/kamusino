import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conRitmo, UA } from '../src/scrape/http.mjs';

test('el user-agent identifica el proyecto', () => {
  assert.match(UA, /Kamusino-Rescate/);
});

test('conRitmo separa las llamadas al menos el intervalo pedido', async () => {
  const marcas = [];
  const tic = conRitmo(async (n) => { marcas.push(n); return n; }, 50);
  const t0 = Date.now();
  await Promise.all([tic(1), tic(2), tic(3)]);
  const transcurrido = Date.now() - t0;
  assert.deepEqual(marcas, [1, 2, 3], 'debe respetar el orden de llamada');
  assert.ok(transcurrido >= 100, `esperaba >=100ms para 3 llamadas a 50ms, fueron ${transcurrido}ms`);
});

test('conRitmo propaga los errores sin bloquear la cola', async () => {
  const tic = conRitmo(async (n) => { if (n === 1) throw new Error('boom'); return n; }, 10);
  await assert.rejects(() => tic(1), /boom/);
  assert.equal(await tic(2), 2);
});

test('pedirTexto y pedirBinario comparten la misma cola: nunca hay dos peticiones a la vez', async () => {
  const { pedirTexto, pedirBinario } = await import('../src/scrape/http.mjs');
  const fetchOriginal = globalThis.fetch;
  let enVuelo = 0;
  let maximoEnVuelo = 0;

  globalThis.fetch = async () => {
    enVuelo++;
    maximoEnVuelo = Math.max(maximoEnVuelo, enVuelo);
    await new Promise((r) => setTimeout(r, 30));
    enVuelo--;
    return {
      ok: true,
      status: 200,
      text: async () => 'hola',
      arrayBuffer: async () => new ArrayBuffer(4),
    };
  };

  try {
    await Promise.all([
      pedirTexto('https://kamusino.com/a'),
      pedirBinario('https://kamusino.com/b.jpg'),
    ]);
  } finally {
    globalThis.fetch = fetchOriginal;
  }

  assert.equal(maximoEnVuelo, 1, `hubo ${maximoEnVuelo} peticiones simultáneas contra el servidor del cliente`);
});

test('un 404 no se reintenta; un 500 sí', async () => {
  const { pedirTexto } = await import('../src/scrape/http.mjs');
  const fetchOriginal = globalThis.fetch;
  let intentos = 0;

  globalThis.fetch = async () => {
    intentos++;
    return { ok: false, status: 404, text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) };
  };
  try {
    await assert.rejects(() => pedirTexto('https://kamusino.com/no-existe'), /404/);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
  assert.equal(intentos, 1, `un 404 debe pedirse una sola vez, se pidió ${intentos}`);
});
