import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  documentoInicial, agregarImagen, agregarTexto, actualizarCapa, transformarCapa,
  eliminarCapa, duplicarCapa, moverEnPila, seleccionar, cambiarCara, cambiarPrenda,
  capasDe, capaSeleccionada, todasLasCapas, bytesUsados, areaImprimible,
  crearAlmacen, fuente, FUENTES, CARAS,
} from '../public/js/editor/estado.mjs';
import { dentroDelArea } from '../public/js/editor/geometria.mjs';

const producto = {
  id: 2158,
  nombre: 'Camiseta Gildan Sofstyle Unisex',
  colores: [{ nombre: 'Negro', hex: '#000000' }, { nombre: 'Blanco', hex: '#ffffff' }],
  tallas: ['S', 'M', 'L'],
};

const recurso = (extra = {}) => ({
  clase: 'imagen', formato: 'PNG', nombre: 'logo.png', bytes: 1024,
  ancho: 800, alto: 400, ...extra,
});

describe('documentoInicial', () => {
  test('arranca con la primera talla y el primer color del producto', () => {
    const doc = documentoInicial(producto);
    assert.equal(doc.talla, 'S');
    assert.deepEqual(doc.color, { nombre: 'Negro', hex: '#000000' });
    assert.equal(doc.cantidad, 1);
  });

  test('deduce la prenda del nombre del producto', () => {
    assert.equal(documentoInicial(producto).tipoPrenda, 'camiseta');
    assert.equal(documentoInicial({ ...producto, nombre: 'Sudadera con capucha' }).tipoPrenda, 'sudadera-capucha');
  });

  test('un producto sin colores ni tallas no revienta', () => {
    const doc = documentoInicial({ id: 1, nombre: 'Camiseta' });
    assert.equal(doc.talla, '');
    assert.ok(doc.color.hex);
  });

  test('empieza sin capas en ninguna de las dos caras', () => {
    const doc = documentoInicial(producto);
    for (const cara of CARAS) assert.equal(capasDe(doc, cara).length, 0);
  });
});

describe('agregarImagen', () => {
  test('encaja la capa dentro del área imprimible', () => {
    const doc = agregarImagen(documentoInicial(producto), recurso());
    assert.ok(dentroDelArea(capasDe(doc)[0], areaImprimible(doc)));
  });

  test('conserva la proporción de la imagen original', () => {
    const doc = agregarImagen(documentoInicial(producto), recurso({ ancho: 800, alto: 400 }));
    const capa = capasDe(doc)[0];
    assert.ok(Math.abs(capa.ancho / capa.alto - 2) < 1e-9);
  });

  test('deja la capa nueva seleccionada', () => {
    const doc = agregarImagen(documentoInicial(producto), recurso());
    assert.equal(doc.seleccion, capasDe(doc)[0].id);
  });

  test('guarda el tamaño de origen para poder avisar de la resolución', () => {
    const capa = capasDe(agregarImagen(documentoInicial(producto), recurso()))[0];
    assert.equal(capa.anchoOrigen, 800);
    assert.equal(capa.altoOrigen, 400);
  });

  test('un adjunto entra como capa de tipo adjunto y cuadrada', () => {
    const doc = agregarImagen(documentoInicial(producto), recurso({ clase: 'adjunto', formato: 'PDF', ancho: undefined, alto: undefined }));
    const capa = capasDe(doc)[0];
    assert.equal(capa.tipo, 'adjunto');
    assert.ok(Math.abs(capa.ancho - capa.alto) < 1e-9);
  });

  test('las capas se apilan en la cara activa', () => {
    let doc = documentoInicial(producto);
    doc = agregarImagen(doc, recurso());
    doc = cambiarCara(doc, 'trasera');
    doc = agregarImagen(doc, recurso({ nombre: 'otro.png' }));
    assert.equal(capasDe(doc, 'delantera').length, 1);
    assert.equal(capasDe(doc, 'trasera').length, 1);
  });
});

describe('agregarTexto', () => {
  test('crea una capa de texto centrada en el área', () => {
    const doc = agregarTexto(documentoInicial(producto), 'HOLA');
    const capa = capasDe(doc)[0];
    const area = areaImprimible(doc);
    assert.equal(capa.tipo, 'texto');
    assert.equal(capa.texto, 'HOLA');
    assert.equal(capa.x, area.x + area.ancho / 2);
  });
});

describe('actualizarCapa y transformarCapa', () => {
  test('actualizar cambia solo la capa indicada', () => {
    let doc = agregarImagen(documentoInicial(producto), recurso());
    doc = agregarImagen(doc, recurso({ nombre: 'b.png' }));
    const [primera, segunda] = capasDe(doc);
    doc = actualizarCapa(doc, primera.id, { opacidad: 0.5 });
    assert.equal(capasDe(doc)[0].opacidad, 0.5);
    assert.equal(capasDe(doc)[1].opacidad, segunda.opacidad);
  });

  test('transformar no deja escapar el centro del área', () => {
    let doc = agregarImagen(documentoInicial(producto), recurso());
    const id = capasDe(doc)[0].id;
    doc = transformarCapa(doc, id, (c) => ({ ...c, x: -9999, y: 9999 }));
    const area = areaImprimible(doc);
    const capa = capasDe(doc)[0];
    assert.ok(capa.x >= area.x && capa.x <= area.x + area.ancho);
    assert.ok(capa.y >= area.y && capa.y <= area.y + area.alto);
  });

  test('un id desconocido deja el documento intacto', () => {
    const doc = agregarImagen(documentoInicial(producto), recurso());
    assert.equal(actualizarCapa(doc, 'no-existe', { opacidad: 0 }), doc);
  });
});

describe('eliminar y duplicar', () => {
  test('eliminar la capa seleccionada pasa la selección a la anterior', () => {
    let doc = agregarImagen(documentoInicial(producto), recurso());
    doc = agregarImagen(doc, recurso({ nombre: 'b.png' }));
    const [primera, segunda] = capasDe(doc);
    doc = eliminarCapa(doc, segunda.id);
    assert.equal(doc.seleccion, primera.id);
  });

  test('eliminar la última capa deja la selección vacía', () => {
    let doc = agregarImagen(documentoInicial(producto), recurso());
    doc = eliminarCapa(doc, capasDe(doc)[0].id);
    assert.equal(doc.seleccion, null);
    assert.equal(capasDe(doc).length, 0);
  });

  test('duplicar crea una capa nueva desplazada y la selecciona', () => {
    let doc = agregarImagen(documentoInicial(producto), recurso());
    const original = capasDe(doc)[0];
    doc = duplicarCapa(doc, original.id);
    const copia = capasDe(doc)[1];
    assert.equal(capasDe(doc).length, 2);
    assert.notEqual(copia.id, original.id);
    assert.equal(copia.x, original.x + 12);
    assert.equal(doc.seleccion, copia.id);
  });

  test('eliminar funciona también sobre una capa de la cara no activa', () => {
    let doc = agregarImagen(documentoInicial(producto), recurso());
    const idDelantera = capasDe(doc)[0].id;
    doc = cambiarCara(doc, 'trasera');
    doc = eliminarCapa(doc, idDelantera);
    assert.equal(capasDe(doc, 'delantera').length, 0);
  });
});

describe('moverEnPila', () => {
  const conTres = () => {
    let doc = documentoInicial(producto);
    for (const n of ['a', 'b', 'c']) doc = agregarImagen(doc, recurso({ nombre: n + '.png' }));
    return doc;
  };

  test('subir intercambia con la siguiente', () => {
    const doc = conTres();
    const ids = capasDe(doc).map((c) => c.id);
    const movido = moverEnPila(doc, ids[0], 1);
    assert.deepEqual(capasDe(movido).map((c) => c.id), [ids[1], ids[0], ids[2]]);
  });

  test('bajar la primera no hace nada', () => {
    const doc = conTres();
    assert.equal(moverEnPila(doc, capasDe(doc)[0].id, -1), doc);
  });

  test('subir la última no hace nada', () => {
    const doc = conTres();
    assert.equal(moverEnPila(doc, capasDe(doc).at(-1).id, 1), doc);
  });
});

describe('caras y prendas', () => {
  test('cambiar de cara selecciona la última capa de esa cara', () => {
    let doc = agregarImagen(documentoInicial(producto), recurso());
    const idDelantera = capasDe(doc)[0].id;
    doc = cambiarCara(doc, 'trasera');
    assert.equal(doc.seleccion, null);
    doc = cambiarCara(doc, 'delantera');
    assert.equal(doc.seleccion, idDelantera);
  });

  test('cambiar a la cara actual no crea documento nuevo', () => {
    const doc = documentoInicial(producto);
    assert.equal(cambiarCara(doc, 'delantera'), doc);
  });

  test('cambiar de prenda recoloca las capas en la nueva área', () => {
    let doc = agregarImagen(documentoInicial(producto), recurso());
    doc = cambiarPrenda(doc, 'sudadera-cremallera');
    const area = areaImprimible(doc);
    const capa = capasDe(doc)[0];
    assert.equal(doc.tipoPrenda, 'sudadera-cremallera');
    assert.ok(capa.x >= area.x && capa.x <= area.x + area.ancho);
  });
});

describe('consultas', () => {
  test('todasLasCapas junta las dos caras anotando cuál es cuál', () => {
    let doc = agregarImagen(documentoInicial(producto), recurso());
    doc = cambiarCara(doc, 'trasera');
    doc = agregarImagen(doc, recurso({ nombre: 'b.png' }));
    const todas = todasLasCapas(doc);
    assert.equal(todas.length, 2);
    assert.deepEqual(todas.map((c) => c.cara), ['delantera', 'trasera']);
  });

  test('bytesUsados suma las dos caras', () => {
    let doc = agregarImagen(documentoInicial(producto), recurso({ bytes: 1000 }));
    doc = cambiarCara(doc, 'trasera');
    doc = agregarImagen(doc, recurso({ bytes: 2500 }));
    assert.equal(bytesUsados(doc), 3500);
  });

  test('capaSeleccionada devuelve null cuando no hay selección', () => {
    assert.equal(capaSeleccionada(documentoInicial(producto)), null);
  });

  test('seleccionar dos veces lo mismo no crea documento nuevo', () => {
    const doc = agregarImagen(documentoInicial(producto), recurso());
    assert.equal(seleccionar(doc, doc.seleccion), doc);
  });
});

describe('fuentes', () => {
  test('un id desconocido cae en la primera fuente', () => {
    assert.equal(fuente('inventada'), FUENTES[0]);
  });
});

describe('almacén', () => {
  test('deshacer y rehacer recorren el historial', () => {
    const almacen = crearAlmacen(documentoInicial(producto));
    almacen.aplicar((d) => agregarImagen(d, recurso()));
    assert.equal(capasDe(almacen.doc).length, 1);

    almacen.deshacer();
    assert.equal(capasDe(almacen.doc).length, 0);

    almacen.rehacer();
    assert.equal(capasDe(almacen.doc).length, 1);
  });

  test('deshacer con historial vacío no rompe nada', () => {
    const almacen = crearAlmacen(documentoInicial(producto));
    almacen.deshacer();
    assert.equal(almacen.puedeDeshacer, false);
    assert.equal(capasDe(almacen.doc).length, 0);
  });

  test('los cambios con la misma etiqueta se funden en un solo paso', () => {
    const almacen = crearAlmacen(documentoInicial(producto));
    almacen.aplicar((d) => agregarImagen(d, recurso()));
    const id = capasDe(almacen.doc)[0].id;
    const xInicial = capasDe(almacen.doc)[0].x;

    for (let i = 0; i < 20; i += 1) {
      almacen.aplicar((d) => transformarCapa(d, id, (c) => ({ ...c, x: c.x + 1 })), { etiqueta: 'arrastre-' + id });
    }

    // Un único deshacer debe cancelar el arrastre entero, no el último píxel.
    almacen.deshacer();
    assert.equal(capasDe(almacen.doc)[0].x, xInicial);
  });

  test('cerrarGesto separa dos arrastres consecutivos', () => {
    const almacen = crearAlmacen(documentoInicial(producto));
    almacen.aplicar((d) => agregarImagen(d, recurso()));
    const id = capasDe(almacen.doc)[0].id;

    almacen.aplicar((d) => transformarCapa(d, id, (c) => ({ ...c, x: c.x + 5 })), { etiqueta: 'a' });
    almacen.cerrarGesto();
    almacen.aplicar((d) => transformarCapa(d, id, (c) => ({ ...c, x: c.x + 5 })), { etiqueta: 'a' });

    const antes = capasDe(almacen.doc)[0].x;
    almacen.deshacer();
    assert.equal(capasDe(almacen.doc)[0].x, antes - 5);
  });

  test('un cambio nuevo borra el futuro', () => {
    const almacen = crearAlmacen(documentoInicial(producto));
    almacen.aplicar((d) => agregarImagen(d, recurso()));
    almacen.deshacer();
    assert.equal(almacen.puedeRehacer, true);
    almacen.aplicar((d) => agregarTexto(d, 'x'));
    assert.equal(almacen.puedeRehacer, false);
  });

  test('un cambio que devuelve el mismo documento no ensucia el historial', () => {
    const almacen = crearAlmacen(documentoInicial(producto));
    almacen.aplicar((d) => d);
    assert.equal(almacen.puedeDeshacer, false);
  });

  test('avisa a los suscriptores al suscribirse y en cada cambio', () => {
    const almacen = crearAlmacen(documentoInicial(producto));
    const vistos = [];
    almacen.suscribir((d) => vistos.push(capasDe(d).length));
    almacen.aplicar((d) => agregarImagen(d, recurso()));
    assert.deepEqual(vistos, [0, 1]);
  });

  test('darse de baja deja de recibir avisos', () => {
    const almacen = crearAlmacen(documentoInicial(producto));
    let veces = 0;
    const baja = almacen.suscribir(() => { veces += 1; });
    baja();
    almacen.aplicar((d) => agregarImagen(d, recurso()));
    assert.equal(veces, 1);
  });

  test('reemplazar limpia el historial', () => {
    const almacen = crearAlmacen(documentoInicial(producto));
    almacen.aplicar((d) => agregarImagen(d, recurso()));
    almacen.reemplazar(documentoInicial(producto));
    assert.equal(almacen.puedeDeshacer, false);
    assert.equal(capasDe(almacen.doc).length, 0);
  });

  test('los recursos se guardan aparte del documento', () => {
    const almacen = crearAlmacen(documentoInicial(producto));
    almacen.guardarRecurso('c1', { imagen: 'falsa' });
    assert.deepEqual(almacen.recurso('c1'), { imagen: 'falsa' });
    assert.equal(almacen.recurso('otro'), null);
    almacen.olvidarRecurso('c1');
    assert.equal(almacen.recurso('c1'), null);
  });

  test('el documento sigue siendo serializable a JSON', () => {
    const almacen = crearAlmacen(documentoInicial(producto));
    almacen.aplicar((d) => agregarImagen(d, recurso()));
    almacen.guardarRecurso(capasDe(almacen.doc)[0].id, { imagen: {} });
    assert.deepEqual(JSON.parse(JSON.stringify(almacen.doc)), almacen.doc);
  });
});
