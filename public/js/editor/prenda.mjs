// Siluetas de prenda para el editor.
//
// El lienzo no usa la foto del producto: las 42 fotos del catálogo tienen
// encuadres distintos y muestran el color con el que se fotografiaron, que
// casi nunca es el que el cliente elige. Una silueta vectorial teñida con el
// color exacto del swatch resuelve las dos cosas, y además da un área de
// estampación conocida al píxel en vez de calibrada a ojo sobre cada foto.
//
// Las proporciones salen de una prenda real de talla L extendida en plano:
// 53 cm de pecho, 74 cm de largo, 47 cm de hombro a hombro, 21 cm de manga.
// Con las mangas abiertas la prenda es más ancha que alta, y por eso el
// lienzo es apaisado.
//
// Escala: 1 cm = 4,49 unidades. Lienzo 440 x 400, prenda centrada en x = 220.

export const LIENZO = { ancho: 440, alto: 400 };

/** Unidades de lienzo por centímetro real. */
export const POR_CM = 4.49;

const C = LIENZO.ancho / 2;

/** Puntos maestros, compartidos por todas las prendas de cuerpo. */
const P = {
  cuelloY: 34,
  cuelloMedio: 40,
  cuelloHondoDelante: 36,
  cuelloHondoDetras: 14,
  hombroX: 114,
  hombroY: 52,
  axilaX: 101,
  axilaY: 151,
  bajoX: 108,
  bajoY: 366,
};

function espejo(x) {
  return LIENZO.ancho - x;
}

/** Une pares de coordenadas en un tramo de curva cúbica. */
function curva(...puntos) {
  return ' C ' + puntos.map(([x, y]) => x + ',' + y).join(' ');
}

function linea([x, y]) {
  return ' L ' + x + ',' + y;
}

/** Refleja un tramo ya escrito, invirtiendo también el orden de sus puntos. */
function reflejar(puntos) {
  return puntos.map((tramo) => tramo.map(([x, y]) => [espejo(x), y]).reverse()).reverse();
}

// ---------------------------------------------------------------------------
// Mangas. Cada una se describe siempre del hombro a la axila, en tramos de
// tres puntos (una curva cúbica cada uno). El lado derecho reutiliza los
// mismos tramos reflejados y recorridos al revés.
// ---------------------------------------------------------------------------

const MANGA_CORTA = [
  [[84, 50], [50, 64], [22, 86]],
  [[30, 108], [46, 132], [62, 150]],
  [[76, 153], [92, 153], [P.axilaX, P.axilaY]],
];

const MANGA_LARGA = [
  [[84, 50], [48, 66], [24, 92]],
  [[16, 150], [12, 230], [18, 286]],
  [[24, 300], [46, 306], [58, 298]],
  [[62, 292], [66, 286], [68, 278]],
  [[76, 220], [86, 180], [P.axilaX, P.axilaY]],
];

/** Puño elástico de sudadera: el final de la manga se ensancha y se recoge. */
const MANGA_LARGA_PUNO = [
  [[84, 50], [48, 66], [24, 92]],
  [[16, 150], [10, 226], [14, 276]],
  [[10, 296], [28, 312], [48, 308]],
  [[62, 304], [70, 292], [70, 276]],
  [[78, 220], [88, 180], [P.axilaX, P.axilaY]],
];

/**
 * Sisa de tirantes: sin manga. Los puntos de control van a la derecha de la
 * recta hombro-axila para que la sisa quede cóncava; con ellos a la izquierda
 * la silueta se acampana y desaparece el hueco del brazo.
 */
const SISA_TIRANTES = [
  [[148, 42], [142, 48], [138, 56]],
  [[146, 96], [142, 140], [P.axilaX, 176]],
];

// ---------------------------------------------------------------------------
// Escotes. Se recorren de derecha a izquierda: el contorno los alcanza al
// cerrarse por arriba.
// ---------------------------------------------------------------------------

function escoteRedondo(medio, hondo) {
  const izq = C - medio;
  const der = C + medio;
  const fondo = P.cuelloY + hondo;
  return {
    izq,
    der,
    d: curva([der - 8, fondo], [C + 18, fondo + 3], [C, fondo + 3])
      + curva([C - 18, fondo + 3], [izq + 8, fondo], [izq, P.cuelloY]),
  };
}

function escoteV(medio, hondo) {
  const izq = C - medio;
  const der = C + medio;
  return {
    izq,
    der,
    d: linea([C + 3, P.cuelloY + hondo - 4]) + linea([C, P.cuelloY + hondo])
      + linea([C - 3, P.cuelloY + hondo - 4]) + linea([izq, P.cuelloY]),
  };
}

// ---------------------------------------------------------------------------
// Contorno
// ---------------------------------------------------------------------------

function ladoBajo(axilaY) {
  const { bajoX, bajoY } = P;
  return linea([bajoX, bajoY])
    + curva([bajoX, bajoY + 8], [bajoX + 5, bajoY + 12], [bajoX + 13, bajoY + 12])
    + linea([espejo(bajoX + 13), bajoY + 12])
    + curva([espejo(bajoX + 5), bajoY + 12], [espejo(bajoX), bajoY + 8], [espejo(bajoX), bajoY])
    + linea([espejo(P.axilaX), axilaY]);
}

function contorno({ manga, escote, hombroX = P.hombroX }) {
  const esc = escote.tipo === 'v'
    ? escoteV(escote.medio, escote.hondo)
    : escoteRedondo(escote.medio, escote.hondo);

  const axilaY = manga === SISA_TIRANTES ? 176 : P.axilaY;
  const inicioBrazo = manga === SISA_TIRANTES ? [hombroX, 40] : [hombroX, P.hombroY];

  return ('M ' + esc.izq + ',' + P.cuelloY
    + curva([esc.izq - 16, P.cuelloY + 2], [inicioBrazo[0] + 10, inicioBrazo[1] - 4], inicioBrazo)
    + manga.map((tramo) => curva(...tramo)).join('')
    + ladoBajo(axilaY)
    + reflejar(manga).map((tramo) => curva(...tramo)).join('')
    + curva([espejo(inicioBrazo[0]) - 10, inicioBrazo[1] - 4], [esc.der + 16, P.cuelloY + 2], [esc.der, P.cuelloY])
    + esc.d
    + ' Z');
}

// ---------------------------------------------------------------------------
// Detalles: lo que distingue una sudadera de una camiseta. Sin ellos, cuatro
// de las ocho prendas salen idénticas y el cliente no sabe qué está mirando.
// `detras` se pinta bajo el cuerpo con un tono más oscuro; `costuras` se
// traza encima con una línea translúcida.
// ---------------------------------------------------------------------------

/** Pespunte del bajo, común a todas las prendas de cuerpo. */
function costuraBajo() {
  return 'M ' + (P.bajoX + 2) + ',' + (P.bajoY - 16) + ' L ' + (espejo(P.bajoX + 2)) + ',' + (P.bajoY - 16);
}

/** Canalé del cuello: acompaña al escote por dentro. */
function costuraCuello(medio, hondo) {
  const izq = C - medio + 7;
  const der = C + medio - 7;
  const fondo = P.cuelloY + hondo - 7;
  return 'M ' + izq + ',' + (P.cuelloY + 5)
    + curva([izq + 6, fondo], [C - 16, fondo + 3], [C, fondo + 3])
    + curva([C + 16, fondo + 3], [der - 6, fondo], [der, P.cuelloY + 5]);
}

/** Remate de la manga corta, paralelo al borde. */
function costuraMangaCorta() {
  const izq = 'M 34,101' + curva([42, 122], [54, 140], [68, 154]);
  const der = 'M ' + espejo(34) + ',101' + curva([espejo(42), 122], [espejo(54), 140], [espejo(68), 154]);
  return [izq, der];
}

/** Puño de sudadera. */
function costuraPuno() {
  const izq = 'M 12,282' + curva([26, 296], [50, 296], [68, 282]);
  const der = 'M ' + espejo(12) + ',282' + curva([espejo(26), 296], [espejo(50), 296], [espejo(68), 282]);
  return [izq, der];
}

/** Capucha: casquete que asoma por detrás de los hombros. */
const CAPUCHA = 'M 146,74'
  + curva([148, 26], [180, 6], [220, 6])
  + curva([260, 6], [292, 26], [294, 74])
  + curva([270, 60], [170, 60], [146, 74])
  + ' Z';

/** Cordones de la capucha, a ambos lados del cuello. */
const CORDONES = 'M 196,76 L 192,132 M 244,76 L 248,132';

/** Bolsillo canguro de la sudadera con capucha. */
const BOLSILLO = 'M 132,268 L 148,244 L 292,244 L 308,268 L 308,318'
  + curva([308, 322], [304, 324], [300, 324])
  + ' L 140,324'
  + curva([136, 324], [132, 322], [132, 318])
  + ' Z';

/** Cuello y tapeta del polo, con dos botones. */
const CUELLO_POLO = 'M 186,38 C 176,38 170,46 168,58 L 164,88 L 208,72 C 196,66 190,54 186,38 Z'
  + ' M 254,38 C 264,38 270,46 272,58 L 276,88 L 232,72 C 244,66 250,54 254,38 Z';
const TAPETA_POLO = 'M 206,74 L 206,146 M 234,74 L 234,146 M 220,88 m -4,0 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0 M 220,120 m -4,0 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0';

/** Cremallera central, de arriba abajo. */
const CREMALLERA = 'M 220,70 L 220,378';

// ---------------------------------------------------------------------------
// Delantal: no comparte cuerpo con las demás, se describe entero.
// ---------------------------------------------------------------------------

const DELANTAL = 'M 168,86 L 272,86'
  + curva([282, 86], [288, 94], [290, 106])
  + ' L 306,178'
  + curva([320, 226], [326, 282], [326, 330])
  + ' L 326,368'
  + curva([326, 376], [320, 382], [312, 382])
  + ' L 128,382'
  + curva([120, 382], [114, 376], [114, 368])
  + ' L 114,330'
  + curva([114, 282], [120, 226], [134, 178])
  + ' L 150,106'
  + curva([152, 94], [158, 86], [168, 86])
  + ' Z';

/** Tirante del cuello y cintas de la cintura. */
const DELANTAL_CINTAS = 'M 178,88'
  + curva([182, 34], [258, 34], [262, 88])
  + ' M 118,196 L 60,214 M 322,196 L 380,214';

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

function base(escote) {
  return { medio: P.cuelloMedio, hondo: P.cuelloHondoDelante, ...escote };
}

const PRENDAS = {
  camiseta: {
    nombre: 'Camiseta',
    manga: MANGA_CORTA,
    escote: base({}),
    costuras: () => [costuraBajo(), ...costuraMangaCorta()],
    imprimible: { x: 153, y: 104, ancho: 135, alto: 180 },
    imprimibleCm: { ancho: 30, alto: 40 },
  },
  'camiseta-manga-larga': {
    nombre: 'Camiseta de manga larga',
    manga: MANGA_LARGA,
    escote: base({}),
    costuras: () => [costuraBajo()],
    imprimible: { x: 153, y: 104, ancho: 135, alto: 180 },
    imprimibleCm: { ancho: 30, alto: 40 },
  },
  'camiseta-tirantes': {
    nombre: 'Camiseta de tirantes',
    manga: SISA_TIRANTES,
    escote: base({ medio: 48, hondo: 46 }),
    hombroX: 152,
    costuras: () => [costuraBajo()],
    imprimible: { x: 166, y: 120, ancho: 108, alto: 144 },
    imprimibleCm: { ancho: 24, alto: 32 },
  },
  'camiseta-cuello-v': {
    nombre: 'Camiseta de cuello de pico',
    manga: MANGA_CORTA,
    escote: base({ tipo: 'v', medio: 42, hondo: 74 }),
    costuras: () => [costuraBajo(), ...costuraMangaCorta()],
    imprimible: { x: 153, y: 120, ancho: 135, alto: 148 },
    imprimibleCm: { ancho: 30, alto: 33 },
  },
  sudadera: {
    nombre: 'Sudadera',
    manga: MANGA_LARGA_PUNO,
    escote: base({ hondo: 30 }),
    costuras: () => [costuraBajo(), ...costuraPuno()],
    imprimible: { x: 153, y: 104, ancho: 135, alto: 166 },
    imprimibleCm: { ancho: 30, alto: 37 },
  },
  'sudadera-capucha': {
    nombre: 'Sudadera con capucha',
    manga: MANGA_LARGA_PUNO,
    escote: base({ hondo: 30 }),
    detras: [CAPUCHA],
    costuras: () => [costuraBajo(), ...costuraPuno(), CORDONES, BOLSILLO],
    imprimible: { x: 153, y: 136, ancho: 135, alto: 139 },
    imprimibleCm: { ancho: 30, alto: 31 },
  },
  'sudadera-cremallera': {
    nombre: 'Sudadera con cremallera',
    manga: MANGA_LARGA_PUNO,
    escote: base({ hondo: 30 }),
    detras: [CAPUCHA],
    costuras: () => [costuraBajo(), ...costuraPuno(), CREMALLERA],
    // Con cremallera central solo se puede estampar a un lado del pecho.
    imprimible: { x: 238, y: 136, ancho: 62, alto: 62 },
    imprimibleCm: { ancho: 14, alto: 14 },
  },
  polo: {
    nombre: 'Polo',
    manga: MANGA_CORTA,
    escote: base({ medio: 34, hondo: 26 }),
    costuras: () => [costuraBajo(), ...costuraMangaCorta(), TAPETA_POLO],
    rellenoClaro: [CUELLO_POLO],
    imprimible: { x: 153, y: 158, ancho: 135, alto: 148 },
    imprimibleCm: { ancho: 30, alto: 33 },
  },
  delantal: {
    nombre: 'Delantal',
    contornoFijo: DELANTAL,
    costuras: () => [DELANTAL_CINTAS],
    imprimible: { x: 152, y: 150, ancho: 135, alto: 166 },
    imprimibleCm: { ancho: 30, alto: 37 },
  },
};

/**
 * La cara trasera comparte silueta pero cambia el escote (mucho menos hondo)
 * y pierde los detalles frontales: bolsillo, tapeta, cordones y cremallera
 * solo existen delante.
 */
const SOLO_DELANTE = new Set([BOLSILLO, TAPETA_POLO, CORDONES, CREMALLERA]);

function construir(def, cara) {
  const trasera = cara === 'trasera';
  const escote = def.escote && trasera
    ? { ...def.escote, tipo: 'redondo', hondo: P.cuelloHondoDetras }
    : def.escote;

  const trazo = def.contornoFijo
    ?? contorno({ manga: def.manga, escote, hombroX: def.hombroX });

  const costuras = (def.costuras?.() ?? []).filter((c) => !(trasera && SOLO_DELANTE.has(c)));
  const cuello = escote && !trasera && !def.rellenoClaro
    ? [costuraCuello(escote.medio, escote.hondo)]
    : [];

  return {
    nombre: def.nombre,
    cara,
    contorno: trazo,
    detras: def.detras ?? [],
    rellenoClaro: trasera ? [] : (def.rellenoClaro ?? []),
    costuras: [...costuras, ...cuello],
    imprimible: def.imprimible,
    imprimibleCm: def.imprimibleCm,
  };
}

export const PRENDA_POR_DEFECTO = 'camiseta';

/**
 * Reglas de detección, en orden: la primera que coincide gana. Por eso
 * "manga larga" va antes que "camiseta", y "capucha" antes que "sudadera".
 */
const REGLAS = [
  [/mandil|delantal/i, 'delantal'],
  [/polo/i, 'polo'],
  [/capucha|hood/i, 'sudadera-capucha'],
  [/cremallera|fuzip|zip/i, 'sudadera-cremallera'],
  [/sudadera|polar|cazadora|sweat/i, 'sudadera'],
  [/tirantes/i, 'camiseta-tirantes'],
  [/cuello\s*v|pico/i, 'camiseta-cuello-v'],
  [/manga\s*larga/i, 'camiseta-manga-larga'],
  [/camiseta/i, 'camiseta'],
];

/** Deduce el tipo de prenda a partir del nombre del producto. */
export function tipoDePrenda(nombreProducto = '') {
  const regla = REGLAS.find(([patron]) => patron.test(nombreProducto));
  return regla ? regla[1] : PRENDA_POR_DEFECTO;
}

/** Devuelve la prenda lista para dibujar, por cara. */
export function prenda(tipo, cara = 'delantera') {
  return construir(PRENDAS[tipo] ?? PRENDAS[PRENDA_POR_DEFECTO], cara);
}

export function tiposDePrenda() {
  return Object.keys(PRENDAS);
}

/**
 * Productos que el editor no sabe representar. Se excluyen en vez de
 * dibujarlos como una camiseta, que sería mentirle al cliente sobre lo que
 * está comprando.
 */
export function admiteEditor(nombreProducto = '') {
  return !/pantal[oó]n|calcetines/i.test(nombreProducto);
}
