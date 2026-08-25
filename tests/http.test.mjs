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
