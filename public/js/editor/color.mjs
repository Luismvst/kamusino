// Utilidades de color de la prenda.
//
// Viven en su propio módulo porque las necesitan tanto `lienzo.mjs` (para
// teñir la silueta y sus costuras) como `estado.mjs` (para elegir el color de
// un texto nuevo), y `lienzo.mjs` ya importa a `estado.mjs`: dejarlas en el
// lienzo cerraría el círculo.

function aRgb(hex) {
  const limpio = String(hex).replace('#', '');
  const completo = limpio.length === 3 ? limpio.split('').map((c) => c + c).join('') : limpio;
  const n = parseInt(completo, 16);
  return Number.isFinite(n) && completo.length === 6
    ? { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
    : { r: 255, g: 255, b: 255 };
}

/** Luminancia percibida, para decidir si la prenda es clara u oscura. */
export function esClaro(hex) {
  const { r, g, b } = aRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

/** `cantidad` negativa oscurece, positiva aclara. Rango -1 a 1. */
export function tono(hex, cantidad) {
  const { r, g, b } = aRgb(hex);
  const mezcla = (v) => Math.round(cantidad < 0 ? v * (1 + cantidad) : v + (255 - v) * cantidad);
  return `rgb(${mezcla(r)}, ${mezcla(g)}, ${mezcla(b)})`;
}

/**
 * Color de tinta que se lee sobre la prenda elegida. Es lo que evita que un
 * texto nuevo salga blanco sobre una camiseta blanca y el cliente crea que el
 * editor no ha hecho nada.
 */
export function tintaSobre(hex) {
  return esClaro(hex) ? '#1c1c1c' : '#ffffff';
}
