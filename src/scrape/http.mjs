export const UA = 'Kamusino-Rescate/1.0 (migracion autorizada; soporte@hazenergia.es)';
export const INTERVALO_MS = 1000;

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Serializa las llamadas a `fn` dejando al menos `intervaloMs` entre cada una.
 * Sin concurrencia: el servidor viejo es frágil.
 */
export function conRitmo(fn, intervaloMs = INTERVALO_MS) {
  let cola = Promise.resolve();
  let ultima = 0;
  return (...args) => {
    const turno = cola.then(async () => {
      const espera = ultima + intervaloMs - Date.now();
      if (espera > 0) await esperar(espera);
      ultima = Date.now();
      return fn(...args);
    });
    // La cola avanza aunque este turno falle, para no atascar los siguientes.
    cola = turno.then(() => {}, () => {});
    return turno;
  };
}

async function traer(url, intentos = 3) {
  let ultimoError;
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
      return res;
    } catch (err) {
      ultimoError = err;
      if (i < intentos - 1) await esperar(2000 * (i + 1));
    }
  }
  throw ultimoError;
}

export const pedirTexto = conRitmo(async (url) => (await traer(url)).text());

export const pedirBinario = conRitmo(async (url) =>
  Buffer.from(await (await traer(url)).arrayBuffer()),
);
