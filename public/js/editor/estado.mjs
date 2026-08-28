// El documento del diseño y su historial.
//
// El documento es JSON puro: es lo que se guarda, lo que se restaura al
// recargar y lo que viaja en el email del pedido. Las imágenes decodificadas
// y los blobs **no** entran en él; viven aparte, en `recursos`, indexados por
// el id de la capa. Mezclarlos haría el documento imposible de serializar y
// convertiría cada paso de deshacer en una copia de varios megabytes.

import { prenda, tipoDePrenda } from './prenda.mjs';
import { encajar, limitar } from './geometria.mjs';

export const VERSION_DOCUMENTO = 1;

export const CARAS = ['delantera', 'trasera'];

export const FUENTES = [
  { id: 'titular', etiqueta: 'Titular', css: "'Bricolage Grotesque', system-ui, sans-serif" },
  { id: 'texto', etiqueta: 'Texto', css: "'Instrument Sans', system-ui, sans-serif" },
  { id: 'serif', etiqueta: 'Clásica', css: "Georgia, 'Times New Roman', serif" },
  { id: 'mono', etiqueta: 'Máquina', css: "'Courier New', monospace" },
  { id: 'palo', etiqueta: 'Palo seco', css: "Impact, 'Arial Black', sans-serif" },
];

export function fuente(id) {
  return FUENTES.find((f) => f.id === id) ?? FUENTES[0];
}

/** Margen que deja un diseño recién importado respecto al borde imprimible. */
const MARGEN_ENCAJE = 8;

let contador = 0;
function nuevoId() {
  contador += 1;
  return 'c' + contador + '-' + Math.random().toString(36).slice(2, 7);
}

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------

export function documentoInicial(producto) {
  return {
    version: VERSION_DOCUMENTO,
    productoId: producto.id,
    productoNombre: producto.nombre,
    tipoPrenda: tipoDePrenda(producto.nombre),
    color: producto.colores?.[0] ?? { nombre: 'Blanco', hex: '#ffffff' },
    talla: producto.tallas?.[0] ?? '',
    cantidad: 1,
    cara: 'delantera',
    capas: { delantera: [], trasera: [] },
    seleccion: null,
    notas: '',
  };
}

export function areaImprimible(doc) {
  return prenda(doc.tipoPrenda, doc.cara).imprimible;
}

export function capasDe(doc, cara = doc.cara) {
  return doc.capas[cara] ?? [];
}

export function capaSeleccionada(doc) {
  return capasDe(doc).find((c) => c.id === doc.seleccion) ?? null;
}

/** Todas las capas de las dos caras, con su cara anotada. */
export function todasLasCapas(doc) {
  return CARAS.flatMap((cara) => capasDe(doc, cara).map((c) => ({ ...c, cara })));
}

export function bytesUsados(doc) {
  return todasLasCapas(doc).reduce((suma, c) => suma + (c.bytes ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Operaciones sobre el documento. Todas devuelven un documento nuevo.
// ---------------------------------------------------------------------------

function conCapas(doc, cara, capas) {
  return { ...doc, capas: { ...doc.capas, [cara]: capas } };
}

function caraDe(doc, id) {
  return CARAS.find((c) => capasDe(doc, c).some((k) => k.id === id));
}

function mapearCapa(doc, id, fn) {
  const cara = caraDe(doc, id);
  if (!cara) return doc;
  return conCapas(doc, cara, capasDe(doc, cara).map((k) => (k.id === id ? fn(k) : k)));
}

/** Añade una capa de imagen o de adjunto a partir de un fichero ya importado. */
export function agregarImagen(doc, recurso) {
  const area = areaImprimible(doc);
  const id = nuevoId();

  // Un adjunto no se puede previsualizar, así que ocupa un recuadro cuadrado
  // en el sitio donde irá; sirve para colocarlo y para decirle al taller
  // dónde lo quiere el cliente.
  const proporciones = recurso.clase === 'adjunto'
    ? { ancho: 100, alto: 100 }
    : { ancho: recurso.ancho, alto: recurso.alto };

  const encajada = encajar({ ...proporciones, x: 0, y: 0, rotacion: 0 }, area, { margen: MARGEN_ENCAJE });

  const capa = {
    id,
    tipo: recurso.clase === 'adjunto' ? 'adjunto' : 'imagen',
    nombre: recurso.nombre,
    formato: recurso.formato,
    bytes: recurso.bytes,
    anchoOrigen: recurso.ancho ?? null,
    altoOrigen: recurso.alto ?? null,
    vectorial: Boolean(recurso.vectorial),
    opacidad: 1,
    ...encajada,
  };

  return { ...conCapas(doc, doc.cara, [...capasDe(doc), capa]), seleccion: id };
}

export function agregarTexto(doc, texto = 'Tu texto') {
  const area = areaImprimible(doc);
  const id = nuevoId();
  const ancho = area.ancho * 0.8;
  const capa = {
    id,
    tipo: 'texto',
    texto,
    fuente: 'titular',
    color: '#ffffff',
    negrita: true,
    cursiva: false,
    opacidad: 1,
    x: area.x + area.ancho / 2,
    y: area.y + area.alto / 2,
    ancho,
    alto: ancho / 4,
    rotacion: 0,
  };
  return { ...conCapas(doc, doc.cara, [...capasDe(doc), capa]), seleccion: id };
}

export function actualizarCapa(doc, id, cambios) {
  return mapearCapa(doc, id, (capa) => ({ ...capa, ...cambios }));
}

/** Sustituye la capa por su versión transformada, sin dejar que se pierda fuera. */
export function transformarCapa(doc, id, transformar) {
  const area = areaImprimible(doc);
  return mapearCapa(doc, id, (capa) => limitar(transformar(capa), area));
}

export function eliminarCapa(doc, id) {
  const cara = caraDe(doc, id);
  if (!cara) return doc;
  const restantes = capasDe(doc, cara).filter((k) => k.id !== id);
  return {
    ...conCapas(doc, cara, restantes),
    seleccion: doc.seleccion === id ? (restantes.at(-1)?.id ?? null) : doc.seleccion,
  };
}

/** Duplica una capa y la deja ligeramente desplazada, para que se vea que son dos. */
export function duplicarCapa(doc, id) {
  const cara = caraDe(doc, id);
  if (!cara) return doc;
  const capas = capasDe(doc, cara);
  const original = capas.find((k) => k.id === id);
  const copia = { ...original, id: nuevoId(), x: original.x + 12, y: original.y + 12 };
  return { ...conCapas(doc, cara, [...capas, copia]), seleccion: copia.id };
}

/**
 * Mueve una capa en el orden de apilado. El final del array es lo que queda
 * encima, igual que en el orden de dibujo del lienzo.
 */
export function moverEnPila(doc, id, direccion) {
  const cara = caraDe(doc, id);
  if (!cara) return doc;
  const capas = [...capasDe(doc, cara)];
  const desde = capas.findIndex((k) => k.id === id);
  const hasta = Math.min(Math.max(desde + direccion, 0), capas.length - 1);
  if (desde === hasta) return doc;
  capas.splice(hasta, 0, capas.splice(desde, 1)[0]);
  return conCapas(doc, cara, capas);
}

export function seleccionar(doc, id) {
  return doc.seleccion === id ? doc : { ...doc, seleccion: id };
}

export function cambiarCara(doc, cara) {
  if (doc.cara === cara) return doc;
  return { ...doc, cara, seleccion: capasDe(doc, cara).at(-1)?.id ?? null };
}

/**
 * Al cambiar de prenda cambia el área imprimible, y las capas colocadas para
 * la anterior pueden quedar fuera. Se recolocan dentro de la nueva área, que
 * es menos malo que dejarlas flotando sobre una manga.
 */
export function cambiarPrenda(doc, tipoPrenda) {
  const recolocadas = Object.fromEntries(CARAS.map((cara) => {
    const area = prenda(tipoPrenda, cara).imprimible;
    return [cara, capasDe(doc, cara).map((capa) => limitar(capa, area))];
  }));
  return { ...doc, tipoPrenda, capas: recolocadas };
}

// ---------------------------------------------------------------------------
// Almacén con historial
// ---------------------------------------------------------------------------

const MAX_HISTORIAL = 60;

/**
 * Guarda el documento, el historial y los recursos binarios.
 *
 * `etiqueta` sirve para fundir pasos: durante un arrastre llegan decenas de
 * cambios por segundo, y sin fundirlos un solo gesto llenaría el historial de
 * pasos intermedios que nadie quiere deshacer uno a uno.
 */
export function crearAlmacen(documento) {
  let doc = documento;
  let pasados = [];
  let futuros = [];
  let ultimaEtiqueta = null;
  const recursos = new Map();
  const oyentes = new Set();

  function avisar() {
    for (const fn of oyentes) fn(doc);
  }

  return {
    get doc() { return doc; },
    get puedeDeshacer() { return pasados.length > 0; },
    get puedeRehacer() { return futuros.length > 0; },

    suscribir(fn) {
      oyentes.add(fn);
      fn(doc);
      return () => oyentes.delete(fn);
    },

    /** Aplica un cambio y lo anota en el historial. */
    aplicar(cambio, { etiqueta = null } = {}) {
      const siguiente = cambio(doc);
      if (siguiente === doc) return;

      const funde = etiqueta !== null && etiqueta === ultimaEtiqueta;
      if (!funde) {
        pasados = [...pasados.slice(-(MAX_HISTORIAL - 1)), doc];
      }
      ultimaEtiqueta = etiqueta;
      futuros = [];
      doc = siguiente;
      avisar();
    },

    /** Cierra el gesto en curso para que el siguiente cambio abra un paso nuevo. */
    cerrarGesto() {
      ultimaEtiqueta = null;
    },

    deshacer() {
      if (!pasados.length) return;
      futuros = [doc, ...futuros];
      doc = pasados.at(-1);
      pasados = pasados.slice(0, -1);
      ultimaEtiqueta = null;
      avisar();
    },

    rehacer() {
      if (!futuros.length) return;
      pasados = [...pasados, doc];
      doc = futuros[0];
      futuros = futuros.slice(1);
      ultimaEtiqueta = null;
      avisar();
    },

    /** Sustituye el documento entero sin historial: al restaurar una sesión. */
    reemplazar(nuevo) {
      doc = nuevo;
      pasados = [];
      futuros = [];
      ultimaEtiqueta = null;
      avisar();
    },

    guardarRecurso(id, recurso) { recursos.set(id, recurso); },
    recurso(id) { return recursos.get(id) ?? null; },
    todosLosRecursos() { return recursos; },
    olvidarRecurso(id) { recursos.delete(id); },
  };
}
