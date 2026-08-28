// Descarga las tipografías de Google y las deja servidas desde nuestro dominio.
//
//   npm run fuentes
//
// Se hace en el montaje, no en cada visita, por dos motivos:
//
//   Privacidad — cargar una tipografía desde `fonts.gstatic.com` transfiere la
//   IP del visitante a Google. Eso es una comunicación de datos a un tercero,
//   y obligaría a pedir consentimiento antes de que la página pinte nada.
//
//   Velocidad — una hoja de estilos de otro dominio bloquea el pintado hasta
//   que se resuelve el DNS, se negocia el TLS y llega la respuesta. Servida
//   desde el mismo sitio que el HTML, la conexión ya está abierta.
//
// Solo hay que volver a ejecutarlo si se cambian las familias o los pesos.

import { writeFile, mkdir } from 'node:fs/promises';

const FAMILIAS = 'https://fonts.googleapis.com/css2'
  + '?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700'
  + '&family=Instrument+Sans:wght@400;500;600'
  + '&display=swap';

/**
 * Google decide el formato según quién pregunta: con un navegador antiguo
 * devuelve TTF, y con uno moderno WOFF2, que pesa la mitad. Por eso se declara
 * un agente actual en vez de dejar el de Node.
 */
const AGENTE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const DESTINO = 'public/fonts';

const CABECERA = `/* Tipografías autoalojadas.

   Generado por \`npm run fuentes\`. No editar a mano.

   Se sirven desde nuestro dominio para que ninguna visita transfiera su IP a
   un tercero: eso es lo que obligaría a pedir consentimiento de cookies, y de
   paso desaparece una petición externa que bloquea el pintado. */
`;

async function principal() {
  await mkdir(DESTINO, { recursive: true });

  const respuesta = await fetch(FAMILIAS, { headers: { 'user-agent': AGENTE } });
  if (!respuesta.ok) throw new Error(`Google ha respondido ${respuesta.status}`);
  const css = await respuesta.text();

  const urls = [...new Set(
    [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]),
  )];
  if (urls.length === 0) throw new Error('No se ha encontrado ningún fichero de fuente en la respuesta.');

  let local = css;
  let bytes = 0;

  for (const url of urls) {
    // Las dos últimas partes de la URL identifican la versión y el corte, que
    // es justo lo que hace falta para que dos ficheros no se pisen.
    const nombre = url.split('/').slice(-2).join('-');
    const datos = new Uint8Array(await (await fetch(url)).arrayBuffer());
    await writeFile(`${DESTINO}/${nombre}`, datos);
    local = local.replaceAll(url, `/fonts/${nombre}`);
    bytes += datos.length;
  }

  await writeFile(`${DESTINO}/tipografias.css`, CABECERA + local);
  console.log(`${urls.length} tipografías descargadas (${Math.round(bytes / 1024)} KB) en ${DESTINO}/`);
}

await principal();
