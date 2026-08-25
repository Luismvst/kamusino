import { mkdir, rename, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pedirBinario } from './http.mjs';
import { BASE } from './categorias.mjs';

async function existe(p) {
  try {
    const s = await stat(p);
    return s.size > 0;
  } catch {
    return false;
  }
}

/**
 * `traer` se inyecta para poder probar sin red.
 * Un fichero de 0 bytes es peor que ninguno: pasaría el test de integridad
 * y dejaría un hueco invisible en la web. Por eso se rechaza.
 */
export async function descargarImagen(ruta, { destinoBase = 'public', traer = pedirBinario } = {}) {
  const destino = join(destinoBase, ruta.replace(/^\//, ''));
  if (await existe(destino)) return 'ya-existia';

  const datos = await traer(`${BASE}${ruta}`);
  if (!datos || datos.length === 0) throw new Error(`respuesta vacía para ${ruta}`);

  await mkdir(dirname(destino), { recursive: true });
  const temporal = `${destino}.tmp`;
  await writeFile(temporal, datos);
  await rename(temporal, destino);
  return 'descargada';
}
