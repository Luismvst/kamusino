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
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) });
      if (res.ok) return res;
      const err = new Error(`HTTP ${res.status} en ${url}`);
      // Un 4xx (salvo 429) es un recurso que no está: reintentarlo solo gasta tiempo.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        err.definitivo = true;
      }
      throw err;
    } catch (err) {
      ultimoError = err;
      if (err.definitivo) throw err;
      if (i < intentos - 1) await esperar(2000 * (i + 1));
    }
  }
  throw ultimoError;
}

/**
 * Una sola puerta para TODO el módulo: cualquier petición al servidor del
 * cliente —HTML o imagen— pasa por esta cola. Dos instancias distintas de
 * conRitmo serían dos relojes independientes y permitirían concurrencia real.
 * La lectura del cuerpo ocurre dentro del turno, para que la petición siguiente
 * no arranque mientras esta aún se está descargando.
 */
const pedirConRitmo = conRitmo(async (url, modo) => {
  const res = await traer(url);
  return modo === 'binario' ? Buffer.from(await res.arrayBuffer()) : res.text();
});

export const pedirTexto = (url) => pedirConRitmo(url, 'texto');
export const pedirBinario = (url) => pedirConRitmo(url, 'binario');
