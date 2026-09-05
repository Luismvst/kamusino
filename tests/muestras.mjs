// Ficheros de muestra para las pruebas de importación.
//
// Se generan de verdad, con sus cabeceras correctas, en vez de fingirlos: lo
// que se está probando es precisamente que el navegador sepa abrirlos, y un
// fichero inventado pasaría la prueba sin demostrar nada.

import { mkdtempSync, writeFileSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function trozoPng(tipo, datos) {
  const longitud = Buffer.alloc(4);
  longitud.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'latin1'), datos]);
  const suma = Buffer.alloc(4);
  suma.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([longitud, cuerpo, suma]);
}

/**
 * PNG RGBA real del tamaño pedido, con un degradado y un marco oscuro para
 * que se distinga a simple vista en una captura.
 */
export function png(ancho, alto) {
  const filas = [];
  for (let y = 0; y < alto; y += 1) {
    // Cada fila de un PNG empieza por su byte de filtro; 0 = sin filtro.
    const fila = Buffer.alloc(1 + ancho * 4);
    for (let x = 0; x < ancho; x += 1) {
      const borde = x < 6 || y < 6 || x >= ancho - 6 || y >= alto - 6;
      const i = 1 + x * 4;
      fila[i] = borde ? 20 : Math.round((x / ancho) * 255);
      fila[i + 1] = borde ? 20 : Math.round((y / alto) * 255);
      fila[i + 2] = borde ? 20 : 180;
      fila[i + 3] = 255;
    }
    filas.push(fila);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // color RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    trozoPng('IHDR', ihdr),
    trozoPng('IDAT', deflateSync(Buffer.concat(filas))),
    trozoPng('IEND', Buffer.alloc(0)),
  ]);
}

/** SVG con degradado y `viewBox`, para comprobar también la medida vectorial. */
export const SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs><linearGradient id="g"><stop offset="0" stop-color="#c2632f"/><stop offset="1" stop-color="#1f8b98"/></linearGradient></defs>
  <rect width="300" height="200" fill="url(#g)"/>
  <circle cx="150" cy="100" r="60" fill="#fff" opacity="0.85"/>
</svg>`;

/** SVG con script, con `onload` y con una imagen remota: nada debe sobrevivir al saneado. */
export const SVG_PELIGROSO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" onload="globalThis.__colado = true">
  <script>globalThis.__colado = true;</script>
  <image href="https://ejemplo.invalido/pixel.png" x="0" y="0" width="10" height="10"/>
  <rect width="100" height="100" fill="#1f8b98"/>
</svg>`;

/** SVG sin `width` ni `height`: la medida tiene que salir del `viewBox`. */
export const SVG_SIN_MEDIDAS = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 160"><rect width="640" height="160" fill="#c2632f"/></svg>';

/** GIF de 1x1 transparente. Es el GIF válido más corto que existe. */
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

/** WEBP de 1x1, con su contenedor RIFF y un fotograma VP8L mínimo. */
const WEBP = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64');

/** PDF de una página con texto. Estructura mínima pero válida. */
const PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length 46>>stream
BT /F1 24 Tf 40 100 Td (Diseno de prueba) Tj ET
endstream
endobj
trailer<</Root 1 0 R>>
%%EOF`;

/**
 * Crea todos los ficheros en un directorio temporal y devuelve sus rutas.
 * `enorme` supera a propósito el límite por fichero, para comprobar que se
 * rechaza con un mensaje y no reventando.
 */
export function crearMuestras({ bytesEnorme = 11 * 1024 * 1024 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'kamusino-muestras-'));
  const en = (nombre) => join(dir, nombre);

  writeFileSync(en('logo.png'), png(800, 400));
  // Nombre largo de verdad, como el que sale de un banco de imágenes.
  writeFileSync(en('logotipo-corporativo-definitivo-version-final-2026-alta-resolucion.png'), png(800, 400));
  writeFileSync(en('cuadrado.png'), png(300, 300));
  writeFileSync(en('diminuto.png'), png(40, 40));
  writeFileSync(en('marca.svg'), SVG);
  writeFileSync(en('peligroso.svg'), SVG_PELIGROSO);
  writeFileSync(en('sin-medidas.svg'), SVG_SIN_MEDIDAS);
  writeFileSync(en('punto.gif'), GIF);
  writeFileSync(en('punto.webp'), WEBP);
  writeFileSync(en('folleto.pdf'), PDF);
  writeFileSync(en('vectorial.ai'), PDF); // los .ai modernos son PDF por dentro
  writeFileSync(en('notas.txt'), 'esto no es un diseño');
  writeFileSync(en('enorme.png'), Buffer.alloc(bytesEnorme));

  // Una foto de verdad del catálogo: un JPEG hecho a mano no probaría nada.
  const foto = join(RAIZ, 'public', 'img', 'p', '1', '1', '3', '0', '8', '11308-thickbox_default.jpg');
  const jpg = en('foto.jpg');
  if (existsSync(foto)) copyFileSync(foto, jpg);

  return {
    dir,
    png: en('logo.png'),
    nombreLargo: en('logotipo-corporativo-definitivo-version-final-2026-alta-resolucion.png'),
    pngCuadrado: en('cuadrado.png'),
    pngDiminuto: en('diminuto.png'),
    svg: en('marca.svg'),
    svgPeligroso: en('peligroso.svg'),
    svgSinMedidas: en('sin-medidas.svg'),
    gif: en('punto.gif'),
    webp: en('punto.webp'),
    pdf: en('folleto.pdf'),
    ai: en('vectorial.ai'),
    texto: en('notas.txt'),
    enorme: en('enorme.png'),
    jpg: existsSync(foto) ? jpg : null,
  };
}

export function borrarMuestras(dir) {
  rmSync(dir, { recursive: true, force: true });
}
