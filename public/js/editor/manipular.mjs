// Gestos sobre el lienzo: arrastrar, escalar, rotar, con ratón y con dedo.
//
// Todo el trabajo real lo hace `geometria.mjs`; aquí solo se decide **qué**
// se ha agarrado y se traducen los eventos del navegador a esas llamadas.
//
// Los eventos son de tipo puntero, no de ratón ni de tacto: un único juego de
// manejadores cubre ratón, dedo y lápiz, y evita el clásico doble disparo de
// `touchstart` seguido de `mousedown`.

import {
  contiene, mover, escalar, rotarHacia, tirador, tiradorRotacion, NOMBRES_TIRADORES,
} from './geometria.mjs';
import { capasDe, transformarCapa, seleccionar, eliminarCapa } from './estado.mjs';
import { aCoordenadasLienzo, radioTiradorEnLienzo } from './lienzo.mjs';

/** Con la tecla de mayúsculas, el giro se imanta a estos grados. */
const PASO_IMANTADO = 15;

/** Lo que se mueve una capa con las flechas del teclado. */
const PASO_FLECHA = 2;
const PASO_FLECHA_GRANDE = 12;

function distancia(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function anguloEntre(a, b) {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

/**
 * Qué hay bajo el punto. Los tiradores de la capa seleccionada ganan siempre,
 * porque sobresalen de la capa y si no fuera así nunca se podrían agarrar.
 */
export function agarreEn(doc, punto, radio) {
  const capas = capasDe(doc);
  const seleccionada = capas.find((c) => c.id === doc.seleccion);

  if (seleccionada) {
    if (distancia(tiradorRotacion(seleccionada), punto) <= radio) {
      return { tipo: 'rotar', id: seleccionada.id };
    }
    for (const nombre of NOMBRES_TIRADORES) {
      if (distancia(tirador(seleccionada, nombre), punto) <= radio) {
        return { tipo: 'escalar', id: seleccionada.id, tirador: nombre };
      }
    }
  }

  // De arriba abajo: lo último dibujado es lo primero que se agarra.
  for (let i = capas.length - 1; i >= 0; i -= 1) {
    if (contiene(capas[i], punto)) return { tipo: 'mover', id: capas[i].id };
  }
  return { tipo: 'ninguno' };
}

/** Cursor que corresponde a cada agarre, para que se note qué se puede hacer. */
export function cursorPara(agarre) {
  if (agarre.tipo === 'rotar') return 'grab';
  if (agarre.tipo === 'escalar') return agarre.tirador === 'no' || agarre.tirador === 'se' ? 'nwse-resize' : 'nesw-resize';
  if (agarre.tipo === 'mover') return 'move';
  return 'default';
}

/**
 * Conecta los gestos a un canvas. Devuelve una función para desconectarlos.
 *
 * `almacen` es el que crea `estado.mjs`; los cambios se aplican con etiqueta
 * para que un gesto entero sea un único paso de deshacer.
 */
export function conectarManipulacion(canvas, almacen) {
  const punteros = new Map();
  let gesto = null;
  let pellizco = null;

  const puntoDe = (evento) => aCoordenadasLienzo(canvas, evento.clientX, evento.clientY);

  function capa(id) {
    return capasDe(almacen.doc).find((c) => c.id === id) ?? null;
  }

  function alPulsar(evento) {
    canvas.setPointerCapture(evento.pointerId);
    punteros.set(evento.pointerId, puntoDe(evento));

    if (punteros.size === 2) {
      iniciarPellizco();
      return;
    }

    const punto = puntoDe(evento);
    const agarre = agarreEn(almacen.doc, punto, radioTiradorEnLienzo(canvas));

    if (agarre.tipo === 'ninguno') {
      almacen.aplicar((d) => seleccionar(d, null));
      gesto = null;
      return;
    }

    if (almacen.doc.seleccion !== agarre.id) {
      almacen.aplicar((d) => seleccionar(d, agarre.id));
    }

    const actual = capa(agarre.id);
    gesto = {
      ...agarre,
      // Se guarda el desfase entre el puntero y el centro de la capa para que
      // al arrastrar no dé un salto colocándose bajo el cursor.
      desfase: { x: actual.x - punto.x, y: actual.y - punto.y },
      etiqueta: agarre.tipo + '-' + agarre.id + '-' + Date.now(),
    };
  }

  function iniciarPellizco() {
    const [a, b] = [...punteros.values()];
    const seleccionada = capa(almacen.doc.seleccion);
    if (!seleccionada) return;
    gesto = null;
    pellizco = {
      id: seleccionada.id,
      distancia: distancia(a, b),
      angulo: anguloEntre(a, b),
      ancho: seleccionada.ancho,
      alto: seleccionada.alto,
      rotacion: seleccionada.rotacion,
      etiqueta: 'pellizco-' + seleccionada.id + '-' + Date.now(),
    };
  }

  function alMover(evento) {
    if (!punteros.has(evento.pointerId)) {
      if (!gesto && !pellizco) alPasar(evento);
      return;
    }
    punteros.set(evento.pointerId, puntoDe(evento));

    if (pellizco && punteros.size >= 2) {
      const [a, b] = [...punteros.values()];
      const factor = distancia(a, b) / (pellizco.distancia || 1);
      const giro = anguloEntre(a, b) - pellizco.angulo;
      almacen.aplicar((d) => transformarCapa(d, pellizco.id, (c) => ({
        ...c,
        ancho: Math.max(12, pellizco.ancho * factor),
        alto: Math.max(12, pellizco.alto * factor),
        rotacion: pellizco.rotacion + giro,
      })), { etiqueta: pellizco.etiqueta });
      return;
    }

    if (!gesto) return;
    const punto = puntoDe(evento);

    if (gesto.tipo === 'mover') {
      almacen.aplicar((d) => transformarCapa(d, gesto.id, (c) => {
        const destinoX = punto.x + gesto.desfase.x;
        const destinoY = punto.y + gesto.desfase.y;
        return mover(c, destinoX - c.x, destinoY - c.y);
      }), { etiqueta: gesto.etiqueta });
      return;
    }

    if (gesto.tipo === 'escalar') {
      // Con Alt se libera la proporción; por defecto se conserva, que es lo
      // que quiere quien sube un logo y no quiere deformarlo sin darse cuenta.
      const proporcional = !evento.altKey;
      almacen.aplicar((d) => transformarCapa(d, gesto.id,
        (c) => escalar(c, gesto.tirador, punto, { proporcional })), { etiqueta: gesto.etiqueta });
      return;
    }

    if (gesto.tipo === 'rotar') {
      const paso = evento.shiftKey ? PASO_IMANTADO : 0;
      almacen.aplicar((d) => transformarCapa(d, gesto.id,
        (c) => rotarHacia(c, punto, { paso })), { etiqueta: gesto.etiqueta });
    }
  }

  function alSoltar(evento) {
    punteros.delete(evento.pointerId);
    if (canvas.hasPointerCapture?.(evento.pointerId)) {
      canvas.releasePointerCapture(evento.pointerId);
    }
    if (punteros.size < 2) pellizco = null;
    if (punteros.size === 0) {
      gesto = null;
      almacen.cerrarGesto();
    }
  }

  function alPasar(evento) {
    const agarre = agarreEn(almacen.doc, puntoDe(evento), radioTiradorEnLienzo(canvas));
    canvas.style.cursor = cursorPara(agarre);
  }

  function alTeclear(evento) {
    // Mientras se escribe en un campo, el teclado es del campo: si no, borrar
    // una letra del texto borraría la capa entera.
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(evento.target?.tagName ?? '')) return;

    if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'z') {
      evento.preventDefault();
      if (evento.shiftKey) almacen.rehacer(); else almacen.deshacer();
      return;
    }
    if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'y') {
      evento.preventDefault();
      almacen.rehacer();
      return;
    }

    if (!almacen.doc.seleccion) return;

    if (evento.key === 'Delete' || evento.key === 'Backspace') {
      evento.preventDefault();
      almacen.aplicar((d) => eliminarCapa(d, d.seleccion));
      almacen.cerrarGesto();
      return;
    }

    if (evento.key === 'Escape') {
      almacen.aplicar((d) => seleccionar(d, null));
      return;
    }

    const flechas = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    };
    const direccion = flechas[evento.key];
    if (!direccion) return;

    evento.preventDefault();
    const paso = evento.shiftKey ? PASO_FLECHA_GRANDE : PASO_FLECHA;
    almacen.aplicar((d) => transformarCapa(d, d.seleccion,
      (c) => mover(c, direccion[0] * paso, direccion[1] * paso)), { etiqueta: 'teclado-' + almacen.doc.seleccion });
  }

  canvas.addEventListener('pointerdown', alPulsar);
  canvas.addEventListener('pointermove', alMover);
  canvas.addEventListener('pointerup', alSoltar);
  canvas.addEventListener('pointercancel', alSoltar);
  globalThis.addEventListener('keydown', alTeclear);

  return () => {
    canvas.removeEventListener('pointerdown', alPulsar);
    canvas.removeEventListener('pointermove', alMover);
    canvas.removeEventListener('pointerup', alSoltar);
    canvas.removeEventListener('pointercancel', alSoltar);
    globalThis.removeEventListener('keydown', alTeclear);
  };
}
