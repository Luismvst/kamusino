// Arnés de pruebas en navegador real.
//
// El editor es canvas y eventos de puntero: no se puede verificar con jsdom
// ni leyendo el DOM. Hace falta un navegador de verdad que dibuje y que
// reciba gestos reales, así que se levanta un servidor estático sobre
// `public/` y se conduce Chrome contra él.
//
// Usa `puppeteer-core` contra el Chrome ya instalado en el sistema, en vez de
// `puppeteer`, que se descargaría su propia copia de 150 MB para hacer lo
// mismo.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import puppeteer from 'puppeteer-core';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const PUBLICO = join(RAIZ, 'public');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const CHROMES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA ? process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe' : null,
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

function rutaChrome() {
  const encontrado = CHROMES.find((r) => r && existsSync(r));
  if (!encontrado) throw new Error('No se encuentra Chrome. Rutas probadas:\n' + CHROMES.filter(Boolean).join('\n'));
  return encontrado;
}

/** Servidor estático sobre `public/`, con index.html implícito en los directorios. */
export async function servirPublico() {
  const servidor = createServer(async (peticion, respuesta) => {
    try {
      const ruta = decodeURIComponent(new URL(peticion.url, 'http://x').pathname);
      // Sin esta normalización, una petición a `/../../secreto` saldría de
      // `public/`. Es un servidor de pruebas, pero un servidor con recorrido
      // de directorios no es una herramienta que convenga tener a mano.
      let destino = normalize(join(PUBLICO, ruta));
      if (!destino.startsWith(PUBLICO + sep) && destino !== PUBLICO) {
        respuesta.writeHead(403).end('prohibido');
        return;
      }
      if (!extname(destino)) destino = join(destino, 'index.html');

      const cuerpo = await readFile(destino);
      respuesta.writeHead(200, { 'content-type': TIPOS[extname(destino)] ?? 'application/octet-stream' });
      respuesta.end(cuerpo);
    } catch {
      respuesta.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      respuesta.end('no encontrado');
    }
  });

  await new Promise((listo) => servidor.listen(0, '127.0.0.1', listo));
  const { port } = servidor.address();

  return {
    base: `http://127.0.0.1:${port}`,
    async cerrar() {
      await new Promise((listo) => servidor.close(listo));
    },
  };
}

/**
 * Abre Chrome con un perfil temporal propio. Un perfil recién creado en cada
 * ejecución evita la pelea por el bloqueo del perfil compartido y garantiza
 * que ninguna prueba arrastra `localStorage` de la anterior.
 */
export async function abrirNavegador({ visible = false } = {}) {
  const perfil = mkdtempSync(join(tmpdir(), 'kamusino-chrome-'));
  const navegador = await puppeteer.launch({
    executablePath: rutaChrome(),
    headless: !visible,
    userDataDir: perfil,
    args: ['--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars'],
  });

  return {
    navegador,
    async cerrar() {
      await navegador.close();
      rmSync(perfil, { recursive: true, force: true });
    },
  };
}

/**
 * Contexto completo: servidor + navegador + una pestaña que registra los
 * errores de consola. Una excepción silenciosa en el editor no se ve en una
 * captura, así que las pruebas comprueban `errores` explícitamente.
 */
export async function contexto({ visible = false, ancho = 1280, alto = 900 } = {}) {
  const servidor = await servirPublico();
  const { navegador, cerrar: cerrarNavegador } = await abrirNavegador({ visible });
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: ancho, height: alto });

  const errores = [];
  pagina.on('pageerror', (e) => errores.push(String(e)));
  pagina.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });

  return {
    pagina,
    base: servidor.base,
    errores,
    async ir(ruta) {
      await pagina.goto(servidor.base + ruta, { waitUntil: 'networkidle0' });
    },
    async cerrar() {
      await cerrarNavegador();
      await servidor.cerrar();
    },
  };
}
