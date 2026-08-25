import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { descargarImagen } from '../src/scrape/imagenes.mjs';

test('descarga y guarda respetando la ruta', async () => {
  const base = await mkdtemp(join(tmpdir(), 'km-'));
  let llamadas = 0;
  const traer = async () => { llamadas++; return Buffer.from('JPEGFALSO'); };

  const r = await descargarImagen('/img/p/1/2/12-thickbox_default.jpg', { destinoBase: base, traer });

  assert.equal(r, 'descargada');
  assert.equal(llamadas, 1);
  const guardado = await readFile(join(base, 'img/p/1/2/12-thickbox_default.jpg'), 'utf8');
  assert.equal(guardado, 'JPEGFALSO');
});

test('no vuelve a pedir lo que ya está en disco', async () => {
  const base = await mkdtemp(join(tmpdir(), 'km-'));
  const destino = join(base, 'img/p/1/2/12-thickbox_default.jpg');
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, 'YA');

  let llamadas = 0;
  const traer = async () => { llamadas++; return Buffer.from('NUEVO'); };

  const r = await descargarImagen('/img/p/1/2/12-thickbox_default.jpg', { destinoBase: base, traer });

  assert.equal(r, 'ya-existia');
  assert.equal(llamadas, 0, 'no debe tocar la red si el fichero existe');
  assert.equal(await readFile(destino, 'utf8'), 'YA');
});

test('rechaza una respuesta vacía en vez de guardar un fichero de 0 bytes', async () => {
  const base = await mkdtemp(join(tmpdir(), 'km-'));
  const traer = async () => Buffer.alloc(0);
  await assert.rejects(
    () => descargarImagen('/img/p/9/9-thickbox_default.jpg', { destinoBase: base, traer }),
    /vacía/,
  );
});
