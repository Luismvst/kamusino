// Dibujo del lienzo.
//
// Dos escenas distintas salen de aquí:
//
//   escena()       — lo que ve el cliente: prenda teñida, diseños encima,
//                    guía del área imprimible y tiradores de la selección.
//   estampacion()  — lo que ve el taller: solo los diseños, sin prenda y con
//                    fondo transparente, a la resolución real de impresión.
//
// Que las dos salgan del mismo código es lo que garantiza que lo estampado
// sea exactamente lo que el cliente colocó.

import { prenda, LIENZO } from './prenda.mjs';
import { capasDe, fuente } from './estado.mjs';
import { esquinas, tiradorRotacion, NOMBRES_TIRADORES } from './geometria.mjs';
import { esClaro, tono, tintaSobre } from './color.mjs';

export const RADIO_TIRADOR = 7;

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

/** El cuerpo de letra sale del alto de la capa: escalar la capa escala la letra. */
export function cuerpoDeLetra(capa) {
  return Math.max(4, capa.alto * 0.78);
}

export function fuenteCss(capa) {
  const estilo = capa.cursiva ? 'italic ' : '';
  const grosor = capa.negrita ? '700 ' : '400 ';
  return `${estilo}${grosor}${cuerpoDeLetra(capa)}px ${fuente(capa.fuente).css}`;
}

/**
 * Ancho que ocupa el texto con su cuerpo actual. El editor lo usa para
 * ajustar la caja de la capa cuando cambia el texto o la fuente, de forma que
 * los tiradores sigan pegados a las letras y no a una caja inventada.
 */
export function anchoDeTexto(ctx, capa) {
  ctx.save();
  ctx.font = fuenteCss(capa);
  const ancho = ctx.measureText(capa.texto || ' ').width;
  ctx.restore();
  return Math.max(8, ancho);
}

// ---------------------------------------------------------------------------
// Capas
// ---------------------------------------------------------------------------

function conTransformacion(ctx, capa, pintar) {
  ctx.save();
  ctx.translate(capa.x, capa.y);
  ctx.rotate((capa.rotacion * Math.PI) / 180);
  ctx.globalAlpha = capa.opacidad ?? 1;
  pintar();
  ctx.restore();
}

/** Ficha que ocupa el sitio de un PDF o un AI, que no se pueden previsualizar. */
function dibujarAdjunto(ctx, capa, colorPrenda) {
  const w = capa.ancho;
  const h = capa.alto;
  ctx.fillStyle = esClaro(colorPrenda) ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.18)';
  ctx.fillRect(-w / 2, -h / 2, w, h);

  ctx.strokeStyle = tintaSobre(colorPrenda);
  ctx.globalAlpha = (capa.opacidad ?? 1) * 0.55;
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.setLineDash([]);

  ctx.fillStyle = tintaSobre(colorPrenda);
  ctx.globalAlpha = capa.opacidad ?? 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.min(w, h) * 0.24}px system-ui, sans-serif`;
  ctx.fillText(capa.formato, 0, -h * 0.06);
  ctx.font = `400 ${Math.min(w, h) * 0.11}px system-ui, sans-serif`;
  ctx.fillText('se envía tal cual', 0, h * 0.16);
}

function dibujarCapa(ctx, capa, recurso, colorPrenda) {
  conTransformacion(ctx, capa, () => {
    if (capa.tipo === 'texto') {
      ctx.fillStyle = capa.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = fuenteCss(capa);
      ctx.fillText(capa.texto || '', 0, 0);
      return;
    }
    if (capa.tipo === 'adjunto') {
      dibujarAdjunto(ctx, capa, colorPrenda);
      return;
    }
    if (recurso?.imagen) {
      ctx.drawImage(recurso.imagen, -capa.ancho / 2, -capa.alto / 2, capa.ancho, capa.alto);
    }
  });
}

// ---------------------------------------------------------------------------
// Prenda
// ---------------------------------------------------------------------------

function dibujarPrenda(ctx, doc) {
  const p = prenda(doc.tipoPrenda, doc.cara);
  const color = doc.color?.hex ?? '#ffffff';
  const borde = tono(color, esClaro(color) ? -0.22 : 0.28);

  ctx.lineJoin = 'round';

  for (const d of p.detras) {
    const camino = new Path2D(d);
    ctx.fillStyle = tono(color, esClaro(color) ? -0.12 : 0.16);
    ctx.fill(camino);
    ctx.strokeStyle = borde;
    ctx.lineWidth = 2;
    ctx.stroke(camino);
  }

  const cuerpo = new Path2D(p.contorno);
  ctx.fillStyle = color;
  ctx.fill(cuerpo);
  ctx.strokeStyle = borde;
  ctx.lineWidth = 2;
  ctx.stroke(cuerpo);

  for (const d of p.rellenoClaro) {
    const camino = new Path2D(d);
    ctx.fillStyle = tono(color, esClaro(color) ? -0.08 : 0.12);
    ctx.fill(camino);
    ctx.strokeStyle = borde;
    ctx.lineWidth = 1.5;
    ctx.stroke(camino);
  }

  ctx.strokeStyle = borde;
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  for (const d of p.costuras) ctx.stroke(new Path2D(d));

  return p;
}

function dibujarGuia(ctx, area, color) {
  ctx.save();
  ctx.strokeStyle = esClaro(color) ? 'rgba(0,0,0,0.32)' : 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([7, 6]);
  ctx.strokeRect(area.x, area.y, area.ancho, area.alto);
  ctx.restore();
}

function dibujarSeleccion(ctx, capa) {
  const pts = esquinas(capa);
  const rot = tiradorRotacion(capa);

  ctx.save();
  ctx.strokeStyle = '#c2632f';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.stroke();

  // Tallo del tirador de giro: sin él, el círculo de arriba parece suelto.
  const medioSuperior = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  ctx.beginPath();
  ctx.moveTo(medioSuperior.x, medioSuperior.y);
  ctx.lineTo(rot.x, rot.y);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  for (const p of [...pts, rot]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, RADIO_TIRADOR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Escenas
// ---------------------------------------------------------------------------

/**
 * Pinta el lienzo completo en un contexto ya escalado a `LIENZO`.
 * `recursos` es el mapa de imágenes decodificadas del almacén.
 */
export function escena(ctx, doc, { recursos, mostrarSeleccion = true, mostrarGuia = true } = {}) {
  ctx.clearRect(0, 0, LIENZO.ancho, LIENZO.alto);

  const p = dibujarPrenda(ctx, doc);
  const area = p.imprimible;
  const color = doc.color?.hex ?? '#ffffff';

  // Los diseños se recortan al área imprimible: enseñar tinta sobre la manga
  // sería prometer algo que la máquina no puede hacer.
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.ancho, area.alto);
  ctx.clip();
  for (const capa of capasDe(doc)) {
    dibujarCapa(ctx, capa, recursos?.get(capa.id), color);
  }
  ctx.restore();

  if (mostrarGuia) dibujarGuia(ctx, area, color);

  if (mostrarSeleccion) {
    const seleccionada = capasDe(doc).find((c) => c.id === doc.seleccion);
    if (seleccionada) dibujarSeleccion(ctx, seleccionada);
  }
}

/**
 * Pinta solo lo que se estampa, en las coordenadas del área imprimible y con
 * fondo transparente. `escala` traduce unidades de lienzo a píxeles finales.
 */
export function estampacion(ctx, doc, cara, { recursos, escala }) {
  const area = prenda(doc.tipoPrenda, cara).imprimible;
  ctx.save();
  ctx.scale(escala, escala);
  ctx.translate(-area.x, -area.y);
  for (const capa of capasDe(doc, cara)) {
    dibujarCapa(ctx, capa, recursos?.get(capa.id), doc.color?.hex ?? '#ffffff');
  }
  ctx.restore();
}

/**
 * Ajusta el tamaño físico del canvas a su tamaño en pantalla y a la densidad
 * del dispositivo, y deja el contexto en coordenadas de `LIENZO`. Sin esto,
 * en una pantalla de alta densidad todo sale borroso.
 */
export function prepararContexto(canvas, anchoCss) {
  const densidad = Math.min(globalThis.devicePixelRatio || 1, 3);
  const altoCss = (anchoCss * LIENZO.alto) / LIENZO.ancho;

  canvas.width = Math.round(anchoCss * densidad);
  canvas.height = Math.round(altoCss * densidad);
  canvas.style.width = anchoCss + 'px';
  canvas.style.height = altoCss + 'px';

  const ctx = canvas.getContext('2d');
  ctx.setTransform(canvas.width / LIENZO.ancho, 0, 0, canvas.height / LIENZO.alto, 0, 0);
  return ctx;
}

/** Convierte un punto del ratón (en píxeles CSS) a coordenadas del lienzo. */
export function aCoordenadasLienzo(canvas, clienteX, clienteY) {
  const caja = canvas.getBoundingClientRect();
  return {
    x: ((clienteX - caja.left) / caja.width) * LIENZO.ancho,
    y: ((clienteY - caja.top) / caja.height) * LIENZO.alto,
  };
}

/** Radio del tirador expresado en coordenadas de lienzo, para acertar al pulsar. */
export function radioTiradorEnLienzo(canvas) {
  const caja = canvas.getBoundingClientRect();
  const factor = caja.width ? LIENZO.ancho / caja.width : 1;
  // En táctil el dedo es más gordo que el puntero: se amplía la zona sensible.
  const grueso = globalThis.matchMedia?.('(pointer: coarse)').matches;
  return (grueso ? 16 : RADIO_TIRADOR) * factor;
}

// Se reexportan para que quien pinta no tenga que importar de dos sitios.
export { NOMBRES_TIRADORES, esClaro, tono, tintaSobre };
