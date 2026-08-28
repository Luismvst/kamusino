// Hoja de contactos de todas las prendas, delantera y trasera.
//
// La geometría de una silueta no se puede revisar leyendo números: hay que
// verla. Este script la pinta y guarda una captura, para poder comparar
// antes y después de tocar los puntos.
//
//   node tests/ver-prendas.mjs [ruta-de-salida.png]

import { prenda, tiposDePrenda, LIENZO } from '../public/js/editor/prenda.mjs';
import { abrirNavegador } from './navegador.mjs';

const SALIDA = process.argv[2] ?? 'verif-prendas.png';

function svg(p, color = '#2f9fb0') {
  const a = p.imprimible;
  const detras = p.detras.map((d) => `<path d="${d}" fill="#00000022"/>`).join('');
  const claro = p.rellenoClaro.map((d) => `<path d="${d}" fill="#ffffff55" stroke="#00000033" stroke-width="1.5"/>`).join('');
  const costuras = p.costuras.map((d) => `<path d="${d}" fill="none" stroke="#00000038" stroke-width="1.5" stroke-linecap="round"/>`).join('');
  return `<svg viewBox="0 0 ${LIENZO.ancho} ${LIENZO.alto}" width="270">
    <g stroke-linejoin="round">
      ${detras}
      <path d="${p.contorno}" fill="${color}" stroke="#0000004d" stroke-width="2"/>
      ${claro}${costuras}
      <rect x="${a.x}" y="${a.y}" width="${a.ancho}" height="${a.alto}" fill="none" stroke="#e0245e" stroke-width="1.5" stroke-dasharray="7 5"/>
    </g>
  </svg>`;
}

const filas = tiposDePrenda().map((t) => {
  const del = prenda(t, 'delantera');
  const tra = prenda(t, 'trasera');
  return `<section><h2>${t}</h2><div class="par">
    <figure>${svg(del)}<figcaption>delantera · ${del.imprimibleCm.ancho}×${del.imprimibleCm.alto} cm</figcaption></figure>
    <figure>${svg(tra, '#c2632f')}<figcaption>trasera</figcaption></figure>
  </div></section>`;
}).join('');

const html = `<!doctype html><meta charset="utf-8"><style>
  body{background:#faf8f4;font:13px system-ui;margin:0;padding:16px;display:flex;flex-wrap:wrap;gap:12px}
  section{background:#fff;border-radius:12px;padding:10px 12px}
  h2{font:600 13px system-ui;margin:0 0 6px;color:#6b6053}
  .par{display:flex;gap:6px}
  figure{margin:0;text-align:center}
  figcaption{color:#6b6053;font-size:11px;margin-top:2px}
</style>${filas}`;

const { navegador, cerrar } = await abrirNavegador();
const pagina = await navegador.newPage();
await pagina.setViewport({ width: 1240, height: 1000 });
await pagina.setContent(html);
await pagina.screenshot({ path: SALIDA, fullPage: true });
await cerrar();
console.log('captura en ' + SALIDA);
