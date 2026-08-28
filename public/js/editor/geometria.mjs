// Transformaciones de una capa sobre el lienzo.
//
// Una capa se guarda por su **centro**, no por su esquina: rotar y escalar
// alrededor del centro es una resta y un giro, mientras que hacerlo desde la
// esquina obliga a recalcular el origen en cada paso y acumula error.
//
//   { x, y, ancho, alto, rotacion }   rotacion en grados, sentido horario
//
// Módulo sin DOM a propósito: toda la matemática del editor se puede probar
// en Node, que es donde los errores de signo salen baratos.

import { POR_CM } from './prenda.mjs';

/** Por debajo de esto una capa deja de poder agarrarse con el ratón. */
export const LADO_MINIMO = 12;

/** Resolución por debajo de la cual la estampación se ve pixelada. */
export const PPP_MINIMO = 150;

const GRADO = Math.PI / 180;

export function girar({ x, y }, grados) {
  const a = grados * GRADO;
  const cos = Math.cos(a);
  const sen = Math.sin(a);
  return { x: x * cos - y * sen, y: x * sen + y * cos };
}

/** Desplazamientos de cada tirador respecto al centro, en unidades de media capa. */
const TIRADORES = {
  no: { sx: -1, sy: -1 },
  ne: { sx: 1, sy: -1 },
  se: { sx: 1, sy: 1 },
  so: { sx: -1, sy: 1 },
};

export const NOMBRES_TIRADORES = Object.keys(TIRADORES);

function opuesto(tirador) {
  const { sx, sy } = TIRADORES[tirador];
  return NOMBRES_TIRADORES.find((t) => TIRADORES[t].sx === -sx && TIRADORES[t].sy === -sy);
}

/** Posición absoluta de un tirador, ya rotada. */
export function tirador(capa, nombre) {
  const { sx, sy } = TIRADORES[nombre];
  const d = girar({ x: (sx * capa.ancho) / 2, y: (sy * capa.alto) / 2 }, capa.rotacion);
  return { x: capa.x + d.x, y: capa.y + d.y };
}

/** Las cuatro esquinas en orden no, ne, se, so. */
export function esquinas(capa) {
  return NOMBRES_TIRADORES.map((n) => tirador(capa, n));
}

/** Tirador de rotación: por encima del borde superior, siguiendo el giro. */
export function tiradorRotacion(capa, separacion = 26) {
  const d = girar({ x: 0, y: -capa.alto / 2 - separacion }, capa.rotacion);
  return { x: capa.x + d.x, y: capa.y + d.y };
}

/** Lleva un punto del lienzo al sistema local de la capa (centro en 0,0, sin giro). */
export function aLocal(capa, punto) {
  return girar({ x: punto.x - capa.x, y: punto.y - capa.y }, -capa.rotacion);
}

/** ¿El punto cae dentro de la capa? Se comprueba en su sistema local. */
export function contiene(capa, punto) {
  const l = aLocal(capa, punto);
  return Math.abs(l.x) <= capa.ancho / 2 && Math.abs(l.y) <= capa.alto / 2;
}

export function mover(capa, dx, dy) {
  return { ...capa, x: capa.x + dx, y: capa.y + dy };
}

/**
 * Escala arrastrando un tirador. La esquina opuesta se queda clavada donde
 * estaba, que es lo que uno espera al tirar de una esquina; si en su lugar se
 * fijara el centro, la capa se escaparía bajo el dedo.
 */
export function escalar(capa, nombre, punto, { proporcional = true } = {}) {
  const fijo = tirador(capa, opuesto(nombre));
  const d = girar({ x: punto.x - fijo.x, y: punto.y - fijo.y }, -capa.rotacion);

  let ancho = Math.abs(d.x);
  let alto = Math.abs(d.y);

  if (proporcional) {
    // Se toma el eje que más ha crecido, para que la capa siga al puntero en
    // vez de quedarse corta en la diagonal.
    const factor = Math.max(ancho / capa.ancho, alto / capa.alto);
    ancho = capa.ancho * factor;
    alto = capa.alto * factor;
  }

  ancho = Math.max(LADO_MINIMO, ancho);
  alto = Math.max(LADO_MINIMO, alto);

  const { sx, sy } = TIRADORES[nombre];
  const off = girar({ x: (sx * ancho) / 2, y: (sy * alto) / 2 }, capa.rotacion);
  return { ...capa, ancho, alto, x: fijo.x + off.x, y: fijo.y + off.y };
}

/** Normaliza a [0, 360). */
export function normalizarAngulo(grados) {
  return ((grados % 360) + 360) % 360;
}

/**
 * Gira la capa para que su tirador de rotación apunte al puntero. Con
 * `paso` distinto de 0 el ángulo se imanta a múltiplos de ese valor, que es
 * como se consigue dejar un diseño recto sin pelearse con el ratón.
 */
export function rotarHacia(capa, punto, { paso = 0 } = {}) {
  const angulo = Math.atan2(punto.y - capa.y, punto.x - capa.x) / GRADO + 90;
  const imantado = paso > 0 ? Math.round(angulo / paso) * paso : angulo;
  return { ...capa, rotacion: normalizarAngulo(imantado) };
}

/** Caja alineada a los ejes que envuelve a la capa ya rotada. */
export function envolvente(capa) {
  const pts = esquinas(capa);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    ancho: Math.max(...xs) - Math.min(...xs),
    alto: Math.max(...ys) - Math.min(...ys),
  };
}

export function centro(area) {
  return { x: area.x + area.ancho / 2, y: area.y + area.alto / 2 };
}

export function centrar(capa, area) {
  const c = centro(area);
  return { ...capa, x: c.x, y: c.y };
}

/** Escala la capa al mayor tamaño que quepa entero dentro del área, y la centra. */
export function encajar(capa, area, { margen = 0 } = {}) {
  const disponibleAncho = area.ancho - margen * 2;
  const disponibleAlto = area.alto - margen * 2;
  const factor = Math.min(disponibleAncho / capa.ancho, disponibleAlto / capa.alto);
  return centrar({ ...capa, ancho: capa.ancho * factor, alto: capa.alto * factor }, area);
}

/**
 * Impide que una capa se pierda fuera del área. No se recorta al área: el
 * cliente puede querer que el diseño sangre por el borde. Lo que se garantiza
 * es que su centro siga dentro, para poder volver a agarrarla siempre.
 */
export function limitar(capa, area) {
  return {
    ...capa,
    x: Math.min(Math.max(capa.x, area.x), area.x + area.ancho),
    y: Math.min(Math.max(capa.y, area.y), area.y + area.alto),
  };
}

/** ¿La capa cabe entera dentro del área imprimible? */
export function dentroDelArea(capa, area) {
  const e = envolvente(capa);
  return e.x >= area.x - 0.5
    && e.y >= area.y - 0.5
    && e.x + e.ancho <= area.x + area.ancho + 0.5
    && e.y + e.alto <= area.y + area.alto + 0.5;
}

/**
 * Resolución real con la que se estamparía la capa, en puntos por pulgada.
 * Es el aviso que evita la reclamación posterior: una imagen de 300 px
 * estirada a 30 cm sale borrosa, y eso hay que decirlo **antes** de imprimir.
 */
export function pppEfectivo(capa, pixelesOrigen) {
  const anchoCm = capa.ancho / POR_CM;
  if (anchoCm <= 0) return 0;
  return Math.round(pixelesOrigen / (anchoCm / 2.54));
}

/** Medidas reales de la capa sobre la prenda, redondeadas al milímetro. */
export function medidasCm(capa) {
  return {
    ancho: Math.round((capa.ancho / POR_CM) * 10) / 10,
    alto: Math.round((capa.alto / POR_CM) * 10) / 10,
  };
}
