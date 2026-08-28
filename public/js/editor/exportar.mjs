// Qué se manda al taller.
//
// Tres cosas por cada cara que lleve diseño:
//
//   mockup       — la prenda montada, para que el cliente y el taller vean lo
//                  mismo y no haya discusión sobre "yo lo puse más arriba".
//   estampación  — solo la tinta, con fondo transparente y a la resolución
//                  real de impresión. Es el fichero que entra en la máquina.
//   originales   — los ficheros tal cual los subió el cliente. Un PDF o un AI
//                  imprimen mejor que cualquier cosa que rastericemos aquí.

import { prenda, LIENZO } from './prenda.mjs';
import { CARAS, capasDe, todasLasCapas } from './estado.mjs';
import { escena, estampacion } from './lienzo.mjs';
import { medidasCm, pppEfectivo, dentroDelArea, PPP_MINIMO } from './geometria.mjs';

/** Ancho del mockup en píxeles. Suficiente para verlo bien en un email. */
const ANCHO_MOCKUP = 1000;

/**
 * Tope de píxeles del lienzo de estampación.
 *
 * A 300 ppp una estampación de 30 x 40 cm son 16,7 millones de píxeles, justo
 * en el límite que Safari en iPhone deja crear. Pasarse no da error: devuelve
 * un canvas en blanco, y el pedido saldría vacío sin que nadie se entere. Se
 * recorta la resolución antes de llegar ahí y se informa de la real.
 */
const MAX_PIXELES = 12e6;

function lienzoNuevo(ancho, alto) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(ancho);
  canvas.height = Math.round(alto);
  return canvas;
}

function aBlob(canvas, tipo = 'image/png') {
  return new Promise((resolver, rechazar) => {
    canvas.toBlob(
      (blob) => (blob ? resolver(blob) : rechazar(new Error('No se ha podido generar la imagen.'))),
      tipo,
    );
  });
}

export function carasConDiseno(doc) {
  return CARAS.filter((cara) => capasDe(doc, cara).length > 0);
}

/** Imagen de la prenda montada, sin tiradores ni guías. */
export async function mockup(doc, cara, recursos) {
  const canvas = lienzoNuevo(ANCHO_MOCKUP, (ANCHO_MOCKUP * LIENZO.alto) / LIENZO.ancho);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#faf8f4';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(canvas.width / LIENZO.ancho, canvas.height / LIENZO.alto);
  escena(ctx, { ...doc, cara }, { recursos, mostrarSeleccion: false, mostrarGuia: false });
  return aBlob(canvas);
}

/**
 * Fichero de estampación y la resolución con la que se ha podido generar.
 * `ppp` es un dato, no un adorno: si baja de 300 el taller tiene que saberlo
 * antes de imprimir.
 */
export async function ficheroEstampacion(doc, cara, recursos, pppDeseado = 300) {
  const p = prenda(doc.tipoPrenda, cara);
  const pulgadasAncho = p.imprimibleCm.ancho / 2.54;
  const pulgadasAlto = p.imprimibleCm.alto / 2.54;

  const holgura = Math.sqrt(MAX_PIXELES / (pulgadasAncho * pulgadasAlto * pppDeseado * pppDeseado));
  const ppp = Math.floor(pppDeseado * Math.min(1, holgura));

  const canvas = lienzoNuevo(pulgadasAncho * ppp, pulgadasAlto * ppp);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  estampacion(ctx, doc, cara, { recursos, escala: canvas.width / p.imprimible.ancho });

  return { blob: await aBlob(canvas), ppp, ancho: canvas.width, alto: canvas.height };
}

/**
 * Repasa cada capa y devuelve los avisos que hay que enseñar antes de pagar.
 * Es más barato decirlo aquí que reimprimir un pedido.
 */
export function avisos(doc) {
  const lista = [];
  for (const capa of todasLasCapas(doc)) {
    const area = prenda(doc.tipoPrenda, capa.cara).imprimible;
    const donde = capa.cara === 'delantera' ? 'delante' : 'detrás';
    const comoSeLlama = capa.nombre ?? (capa.texto ? `«${capa.texto}»` : 'el diseño');

    if (capa.tipo === 'imagen' && !capa.vectorial && capa.anchoOrigen) {
      const ppp = pppEfectivo(capa, capa.anchoOrigen);
      if (ppp < PPP_MINIMO) {
        lista.push({
          nivel: 'aviso',
          capa: capa.id,
          texto: `«${capa.nombre}» (${donde}) quedaría a ${ppp} ppp al tamaño elegido. Por debajo de ${PPP_MINIMO} ppp la estampación se ve pixelada: hazlo más pequeño o mándanos el archivo con más resolución.`,
        });
      }
    }

    if (!dentroDelArea(capa, area)) {
      lista.push({
        nivel: 'aviso',
        capa: capa.id,
        texto: `${comoSeLlama} (${donde}) se sale del área imprimible y se recortará por el borde.`,
      });
    }

    if (capa.tipo === 'adjunto') {
      lista.push({
        nivel: 'info',
        capa: capa.id,
        texto: `«${capa.nombre}» es un ${capa.formato}: no se puede previsualizar aquí, pero lo recibimos entero y lo colocamos donde lo has puesto.`,
      });
    }
  }
  return lista;
}

/** Resumen legible del pedido, el mismo que verá el cliente y el taller. */
export function resumen(doc) {
  return {
    producto: { id: doc.productoId, nombre: doc.productoNombre, prenda: prenda(doc.tipoPrenda).nombre },
    color: doc.color?.nombre ?? '',
    colorHex: doc.color?.hex ?? '',
    talla: doc.talla,
    cantidad: doc.cantidad,
    notas: doc.notas,
    caras: carasConDiseno(doc).map((cara) => ({
      cara,
      areaCm: prenda(doc.tipoPrenda, cara).imprimibleCm,
      capas: capasDe(doc, cara).map((capa, indice) => ({
        orden: indice + 1,
        tipo: capa.tipo,
        nombre: capa.nombre ?? null,
        texto: capa.tipo === 'texto' ? capa.texto : null,
        formato: capa.formato ?? null,
        medidasCm: medidasCm(capa),
        rotacionGrados: Math.round(capa.rotacion),
        pppEstimado: capa.anchoOrigen ? pppEfectivo(capa, capa.anchoOrigen) : null,
      })),
    })),
  };
}

export function nombreSeguro(nombre) {
  // El nombre viene del ordenador del cliente y acaba de nombre de adjunto:
  // se le quita todo lo que pueda hacer de separador de ruta o de cabecera.
  return String(nombre ?? '').replace(/[^\w.\- ]+/g, '_').slice(0, 80) || 'archivo';
}

/**
 * Monta el envío completo. Devuelve un `FormData` listo para `POST`.
 * `contacto` son los datos del formulario; `doc` el diseño.
 */
export async function paquete(doc, recursos, contacto) {
  const datos = new FormData();
  const resoluciones = {};

  for (const cara of carasConDiseno(doc)) {
    datos.append(`mockup-${cara}`, await mockup(doc, cara, recursos), `mockup-${cara}.png`);
    const imprenta = await ficheroEstampacion(doc, cara, recursos);
    datos.append(`estampacion-${cara}`, imprenta.blob, `estampacion-${cara}.png`);
    resoluciones[cara] = { ppp: imprenta.ppp, ancho: imprenta.ancho, alto: imprenta.alto };
  }

  let indice = 0;
  for (const capa of todasLasCapas(doc)) {
    const recurso = recursos.get(capa.id);
    if (!recurso?.blob) continue;
    indice += 1;
    datos.append(`original-${indice}`, recurso.blob, `${indice}-${nombreSeguro(capa.nombre)}`);
  }

  datos.append('pedido', JSON.stringify({
    contacto,
    resumen: resumen(doc),
    avisos: avisos(doc).map((a) => a.texto),
    resoluciones,
    documento: doc,
  }));

  return datos;
}
