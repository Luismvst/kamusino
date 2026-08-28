import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  girar, tirador, esquinas, tiradorRotacion, contiene, mover, escalar,
  rotarHacia, normalizarAngulo, envolvente, centrar, encajar, limitar,
  dentroDelArea, pppEfectivo, medidasCm, LADO_MINIMO,
} from '../public/js/editor/geometria.mjs';
import { POR_CM } from '../public/js/editor/prenda.mjs';

const capa = (extra = {}) => ({ x: 100, y: 100, ancho: 40, alto: 20, rotacion: 0, ...extra });
const area = { x: 0, y: 0, ancho: 200, alto: 300 };

const cerca = (a, b, tolerancia = 1e-6) =>
  assert.ok(Math.abs(a - b) < tolerancia, `${a} != ${b}`);

const cercaPunto = (p, q, tolerancia = 1e-6) => {
  cerca(p.x, q.x, tolerancia);
  cerca(p.y, q.y, tolerancia);
};

describe('girar', () => {
  test('90 grados lleva el eje x al eje y', () => {
    cercaPunto(girar({ x: 1, y: 0 }, 90), { x: 0, y: 1 }, 1e-9);
  });

  test('girar y desgirar devuelve el punto original', () => {
    cercaPunto(girar(girar({ x: 7, y: -3 }, 37), -37), { x: 7, y: -3 }, 1e-9);
  });
});

describe('tiradores', () => {
  test('sin rotación caen en las esquinas de la caja', () => {
    const c = capa();
    cercaPunto(tirador(c, 'no'), { x: 80, y: 90 });
    cercaPunto(tirador(c, 'se'), { x: 120, y: 110 });
  });

  test('con 90 grados la esquina noroeste pasa a estar arriba a la derecha', () => {
    const c = capa({ rotacion: 90 });
    cercaPunto(tirador(c, 'no'), { x: 110, y: 80 }, 1e-9);
  });

  test('las cuatro esquinas conservan el centro como promedio', () => {
    const c = capa({ rotacion: 33 });
    const pts = esquinas(c);
    cerca(pts.reduce((s, p) => s + p.x, 0) / 4, c.x, 1e-9);
    cerca(pts.reduce((s, p) => s + p.y, 0) / 4, c.y, 1e-9);
  });

  test('el tirador de rotación queda por encima del borde superior', () => {
    const t = tiradorRotacion(capa(), 26);
    cercaPunto(t, { x: 100, y: 100 - 10 - 26 });
  });
});

describe('contiene', () => {
  test('acierta dentro y fuera sin rotación', () => {
    assert.ok(contiene(capa(), { x: 100, y: 100 }));
    assert.ok(contiene(capa(), { x: 119, y: 109 }));
    assert.ok(!contiene(capa(), { x: 121, y: 100 }));
  });

  test('sigue a la capa cuando está rotada', () => {
    const c = capa({ rotacion: 90 });
    // Rotada 90°, la capa mide 20 de ancho y 40 de alto en pantalla.
    assert.ok(contiene(c, { x: 100, y: 118 }));
    assert.ok(!contiene(c, { x: 118, y: 100 }));
  });
});

describe('escalar', () => {
  test('la esquina opuesta no se mueve', () => {
    const opuestos = { no: 'se', ne: 'so', se: 'no', so: 'ne' };
    for (const nombre of Object.keys(opuestos)) {
      const c = capa({ rotacion: 25 });
      const fijoAntes = tirador(c, opuestos[nombre]);
      const nueva = escalar(c, nombre, { x: 160, y: 170 });
      cercaPunto(tirador(nueva, opuestos[nombre]), fijoAntes, 1e-6);
    }
  });

  test('el tirador arrastrado acaba bajo el puntero', () => {
    const c = capa();
    const destino = { x: 160, y: 150 };
    const nueva = escalar(c, 'se', destino, { proporcional: false });
    cercaPunto(tirador(nueva, 'se'), destino, 1e-6);
  });

  test('en modo proporcional se conserva la relación de aspecto', () => {
    const c = capa();
    const nueva = escalar(c, 'se', { x: 300, y: 130 });
    cerca(nueva.ancho / nueva.alto, c.ancho / c.alto, 1e-9);
  });

  test('nunca baja del lado mínimo, ni arrastrando al lado contrario', () => {
    const nueva = escalar(capa(), 'se', { x: 79, y: 89 }, { proporcional: false });
    assert.ok(nueva.ancho >= LADO_MINIMO);
    assert.ok(nueva.alto >= LADO_MINIMO);
  });

  test('escalar sobre una capa rotada no la desendereza', () => {
    const c = capa({ rotacion: 40 });
    const nueva = escalar(c, 'ne', { x: 150, y: 60 });
    assert.equal(nueva.rotacion, 40);
    assert.ok(Number.isFinite(nueva.x) && Number.isFinite(nueva.y));
  });
});

describe('rotarHacia', () => {
  test('un punto justo encima del centro deja la capa sin girar', () => {
    cerca(rotarHacia(capa(), { x: 100, y: 50 }).rotacion, 0, 1e-9);
  });

  test('un punto a la derecha del centro la gira 90 grados', () => {
    cerca(rotarHacia(capa(), { x: 150, y: 100 }).rotacion, 90, 1e-9);
  });

  test('el imantado redondea al múltiplo del paso', () => {
    const casi = rotarHacia(capa(), { x: 150, y: 96 }, { paso: 15 });
    assert.equal(casi.rotacion % 15, 0);
  });

  test('el ángulo siempre queda en [0, 360)', () => {
    const r = rotarHacia(capa(), { x: 60, y: 60 }).rotacion;
    assert.ok(r >= 0 && r < 360);
  });
});

describe('normalizarAngulo', () => {
  test('devuelve el equivalente positivo', () => {
    assert.equal(normalizarAngulo(-90), 270);
    assert.equal(normalizarAngulo(450), 90);
    assert.equal(normalizarAngulo(360), 0);
  });
});

describe('envolvente', () => {
  test('sin rotación coincide con la propia capa', () => {
    assert.deepEqual(envolvente(capa()), { x: 80, y: 90, ancho: 40, alto: 20 });
  });

  test('rotada 45 grados es mayor que la capa', () => {
    const e = envolvente(capa({ rotacion: 45 }));
    assert.ok(e.ancho > 40 && e.alto > 20);
  });
});

describe('encajar y centrar', () => {
  test('centrar lleva la capa al medio del área', () => {
    const c = centrar(capa(), area);
    assert.deepEqual({ x: c.x, y: c.y }, { x: 100, y: 150 });
  });

  test('encajar deja la capa dentro y tocando un borde', () => {
    const c = encajar({ x: 0, y: 0, ancho: 800, alto: 400, rotacion: 0 }, area);
    assert.ok(dentroDelArea(c, area));
    cerca(c.ancho, 200);
  });

  test('encajar respeta el margen', () => {
    const c = encajar({ x: 0, y: 0, ancho: 800, alto: 400, rotacion: 0 }, area, { margen: 10 });
    cerca(c.ancho, 180);
  });

  test('encajar amplía una capa diminuta hasta llenar el área', () => {
    const c = encajar({ x: 0, y: 0, ancho: 10, alto: 10, rotacion: 0 }, area);
    cerca(c.ancho, 200);
    cerca(c.alto, 200);
  });
});

describe('limitar', () => {
  test('devuelve el centro al área cuando se ha salido', () => {
    const c = limitar(capa({ x: -500, y: 900 }), area);
    assert.deepEqual({ x: c.x, y: c.y }, { x: 0, y: 300 });
  });

  test('no toca una capa que ya está dentro', () => {
    const original = capa();
    assert.deepEqual(limitar(original, area), original);
  });
});

describe('dentroDelArea', () => {
  test('detecta que una capa rotada se sale por las esquinas', () => {
    const ajustada = { x: 100, y: 150, ancho: 200, alto: 100, rotacion: 0 };
    assert.ok(dentroDelArea(ajustada, area));
    assert.ok(!dentroDelArea({ ...ajustada, rotacion: 30 }, area));
  });
});

describe('resolución', () => {
  test('una imagen grande sobre una capa pequeña da mucho ppp', () => {
    // 10 cm de ancho con 2000 px de origen -> 2000 / (10/2,54) = 508 ppp
    const c = { ...capa(), ancho: 10 * POR_CM };
    assert.equal(pppEfectivo(c, 2000), 508);
  });

  test('una imagen pequeña estirada da poco ppp', () => {
    const c = { ...capa(), ancho: 30 * POR_CM };
    assert.ok(pppEfectivo(c, 300) < 50);
  });

  test('una capa sin ancho no revienta la división', () => {
    assert.equal(pppEfectivo({ ...capa(), ancho: 0 }, 1000), 0);
  });
});

describe('medidasCm', () => {
  test('traduce unidades de lienzo a centímetros', () => {
    const c = { ...capa(), ancho: 30 * POR_CM, alto: 40 * POR_CM };
    assert.deepEqual(medidasCm(c), { ancho: 30, alto: 40 });
  });
});

describe('mover', () => {
  test('desplaza el centro y no toca el tamaño', () => {
    const c = mover(capa(), 5, -7);
    assert.deepEqual(
      { x: c.x, y: c.y, ancho: c.ancho, alto: c.alto },
      { x: 105, y: 93, ancho: 40, alto: 20 },
    );
  });
});
