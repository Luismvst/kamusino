// Convierte las fotos del catálogo a WebP en dos tamaños.
//
//   npm run imagenes
//
// Las fotos vienen de la tienda anterior: 73 JPEG de 1100 x 1422 y unos 120 KB
// cada uno, servidos siempre a tamaño completo aunque en una rejilla ocupen
// 280 píxeles. Eso es lo que más penaliza el Largest Contentful Paint, y en un
// móvil con datos es medio megabyte para ver una miniatura.
//
// De cada foto salen dos WebP: uno de 600 px para las rejillas y otro de 1100
// para la ficha. El JPEG original **no se toca**: se conserva como respaldo
// dentro de un `<picture>`, así que ningún navegador se queda sin ver la foto.
//
// La conversión la hace Chrome, no una librería de imagen. Suena raro, pero el
// navegador ya trae dentro el codificador de WebP y ya estaba instalado para
// las pruebas: añadir `sharp` traería un binario nativo de 30 MB para hacer
// exactamente lo mismo una vez cada varios meses.

import { readdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirNavegador, servirPublico } from '../../tests/navegador.mjs';

const PUBLICO = fileURLToPath(new URL('../../public/', import.meta.url));
const ORIGEN = join(PUBLICO, 'img', 'p');

/** Anchos que se generan. 600 para las rejillas, 1100 para la ficha. */
export const ANCHOS = [600, 1100];

/** Calidad de WebP. Por encima de 0,85 el archivo crece sin que se note. */
const CALIDAD = 0.82;

/** Cuántas se convierten a la vez. Más de esto y la pestaña se queda sin memoria. */
const LOTE = 8;

async function jpegsDelCatalogo(dir = ORIGEN) {
  if (!existsSync(dir)) return [];
  const salida = [];
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const completa = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      salida.push(...await jpegsDelCatalogo(completa));
    } else if (/\.jpe?g$/i.test(entrada.name)) {
      salida.push('/' + relative(PUBLICO, completa).split(sep).join('/'));
    }
  }
  return salida;
}

/**
 * Dibuja la imagen en un lienzo del ancho pedido y la devuelve en WebP.
 * Se ejecuta dentro de la página, que es donde vive el codificador.
 */
function convertirEnLaPagina(ruta, anchos, calidad) {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onerror = () => rechazar(new Error('no se ha podido abrir ' + ruta));
    img.onload = () => {
      const salidas = {};
      for (const ancho of anchos) {
        // Nunca se amplía: una foto de 400 px estirada a 1100 pesa más y no
        // añade un solo detalle.
        const destino = Math.min(ancho, img.naturalWidth);
        const lienzo = document.createElement('canvas');
        lienzo.width = destino;
        lienzo.height = Math.round((destino / img.naturalWidth) * img.naturalHeight);
        const ctx = lienzo.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
        salidas[ancho] = {
          datos: lienzo.toDataURL('image/webp', calidad).split(',')[1],
          ancho: lienzo.width,
          alto: lienzo.height,
        };
      }
      resolver({ salidas });
    };
    img.src = ruta;
  });
}

async function principal() {
  const rutas = await jpegsDelCatalogo();
  if (rutas.length === 0) {
    console.log('No hay fotos que convertir en public/img/p/.');
    return;
  }

  const servidor = await servirPublico();
  const { navegador, cerrar } = await abrirNavegador();
  const pagina = await navegador.newPage();
  await pagina.goto(servidor.base + '/', { waitUntil: 'domcontentloaded' });

  let bytesAntes = 0;
  let bytesDespues = 0;
  let hechas = 0;

  for (let i = 0; i < rutas.length; i += LOTE) {
    const lote = rutas.slice(i, i + LOTE);
    // Cada conversión devuelve sus cifras y se suman después, en serie.
    // `total += (await algo).size` dentro de un `Promise.all` pierde sumas:
    // `+=` lee la variable ANTES de esperar al await, así que las ocho tareas
    // parten del mismo valor y solo sobrevive la última en terminar.
    const resultados = await Promise.all(lote.map(async (ruta) => {
      const origen = join(PUBLICO, ruta.slice(1));
      const antes = (await stat(origen)).size;

      const { salidas } = await pagina.evaluate(convertirEnLaPagina, ruta, ANCHOS, CALIDAD);
      let despues = 0;
      for (const [ancho, salida] of Object.entries(salidas)) {
        const bytes = Buffer.from(salida.datos, 'base64');
        await writeFile(origen.replace(/\.jpe?g$/i, `-${ancho}.webp`), bytes);
        despues += bytes.length;
      }
      return { antes, despues };
    }));

    for (const r of resultados) {
      bytesAntes += r.antes;
      bytesDespues += r.despues;
      hechas += 1;
    }
    process.stdout.write(`\r  ${hechas}/${rutas.length} fotos convertidas…`);
  }

  await cerrar();
  await servidor.cerrar();

  const mb = (n) => (n / 1024 / 1024).toFixed(1).replace('.', ',');
  const ahorro = Math.round((1 - bytesDespues / ANCHOS.length / bytesAntes) * 100);
  console.log(`\n${hechas} fotos · ${mb(bytesAntes)} MB en JPEG → ${mb(bytesDespues)} MB en WebP `
    + `repartidos en ${ANCHOS.length} tamaños. Cada foto servida pesa un ${ahorro}% menos.`);
}

await principal();
