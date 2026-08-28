// Guardado de la sesión de diseño.
//
// Perder media hora de trabajo por recargar sin querer es la peor experiencia
// que puede dar un editor, así que el diseño se guarda solo.
//
// Se usa IndexedDB y no `localStorage` porque `localStorage` solo admite
// texto y tiene un tope de unos 5 MB: una sola foto de móvil ya no cabría, y
// convertirla a base64 la haría un 33% más grande todavía. IndexedDB guarda
// los blobs tal cual y sin ese tope.
//
// Que falle no es grave: en modo privado o con el almacenamiento bloqueado el
// editor funciona igual, solo que sin recordar.

import { VERSION_DOCUMENTO } from './estado.mjs';

const BASE = 'kamusino-editor';
const ALMACEN = 'sesion';
const CLAVE = 'actual';

/** Pasada una semana, lo guardado ya no es lo que el cliente quería pedir. */
const CADUCIDAD_MS = 7 * 24 * 60 * 60 * 1000;

/** Espera entre el último cambio y el guardado, para no escribir en cada píxel. */
const ESPERA_MS = 600;

function abrir() {
  return new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(BASE, 1);
    peticion.onupgradeneeded = () => {
      const bd = peticion.result;
      if (!bd.objectStoreNames.contains(ALMACEN)) bd.createObjectStore(ALMACEN);
    };
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error);
  });
}

function transaccion(bd, modo, accion) {
  return new Promise((resolver, rechazar) => {
    const tx = bd.transaction(ALMACEN, modo);
    const peticion = accion(tx.objectStore(ALMACEN));
    tx.oncomplete = () => resolver(peticion?.result);
    tx.onerror = () => rechazar(tx.error);
    tx.onabort = () => rechazar(tx.error);
  });
}

let temporizador = null;

/** Guarda el documento y los blobs. Se agrupa: solo escribe cuando hay calma. */
export function guardar(doc, recursos) {
  clearTimeout(temporizador);
  temporizador = setTimeout(async () => {
    let bd;
    try {
      const blobs = {};
      for (const [id, recurso] of recursos) {
        if (recurso?.blob) blobs[id] = recurso.blob;
      }
      bd = await abrir();
      await transaccion(bd, 'readwrite', (almacen) => almacen.put(
        { version: VERSION_DOCUMENTO, doc, blobs, guardado: Date.now() },
        CLAVE,
      ));
    } catch {
      // Sin almacenamiento el editor sigue funcionando; simplemente no recuerda.
    } finally {
      bd?.close();
    }
  }, ESPERA_MS);
}

function cargarImagen(blob) {
  return new Promise((resolver) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolver(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolver(null); };
    img.src = url;
  });
}

/**
 * Devuelve la sesión guardada, o `null` si no hay, si ha caducado, si es de
 * una versión anterior del documento o si el producto ya no está en el
 * catálogo.
 */
export async function restaurar(productos) {
  let bd;
  try {
    bd = await abrir();
  } catch {
    return null;
  }

  try {
    const guardado = await transaccion(bd, 'readonly', (almacen) => almacen.get(CLAVE));
    if (!guardado?.doc) return null;
    if (guardado.version !== VERSION_DOCUMENTO) return null;
    if (Date.now() - (guardado.guardado ?? 0) > CADUCIDAD_MS) return null;
    if (!productos.some((p) => p.id === guardado.doc.productoId)) return null;

    const capas = [
      ...(guardado.doc.capas?.delantera ?? []),
      ...(guardado.doc.capas?.trasera ?? []),
    ];

    const recursos = new Map();
    for (const [id, blob] of Object.entries(guardado.blobs ?? {})) {
      const capa = capas.find((c) => c.id === id);
      // Los adjuntos no se pintan: basta con recuperar el fichero.
      const imagen = capa?.tipo === 'imagen' ? await cargarImagen(blob) : null;
      recursos.set(id, { blob, imagen, nombre: capa?.nombre, formato: capa?.formato });
    }

    return { doc: guardado.doc, recursos };
  } catch {
    return null;
  } finally {
    bd.close();
  }
}

/** Borra la sesión. Se llama al enviar el pedido: ya no hace falta guardarla. */
export async function olvidar() {
  clearTimeout(temporizador);
  let bd;
  try {
    bd = await abrir();
    await transaccion(bd, 'readwrite', (almacen) => almacen.delete(CLAVE));
  } catch {
    // Nada que hacer: el pedido ya se ha enviado.
  } finally {
    bd?.close();
  }
}
