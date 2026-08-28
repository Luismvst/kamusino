// Pruebas del cobro con tarjeta.
//
// Aquí se comprueban las dos cosas que, si fallan, cuestan dinero de verdad:
// que el importe salga del catálogo del servidor y no de la petición, y que
// un aviso de «pedido pagado» sin firma válida no cuele.

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  onRequestPost as abrirPago, onRequest as metodoPago,
  referenciaValida, calcularImporte, aFormularioStripe, sesionDeStripe,
} from '../functions/api/checkout.js';
import {
  onRequestPost as recibirAviso, analizarFirma, verificarFirma, iguales, correoPagado,
} from '../functions/api/stripe-webhook.js';
import { PRECIOS } from '../functions/api/_precios.js';

const ENTORNO = {
  STRIPE_SECRET_KEY: 'sk_test_prueba',
  STRIPE_WEBHOOK_SECRET: 'whsec_prueba',
  RESEND_API_KEY: 're_prueba',
  EMAIL_PEDIDOS: 'pedidos@ejemplo.es',
  EMAIL_REMITENTE: 'no-responder@ejemplo.es',
};

/** Un producto real del catálogo generado, para no inventarse el precio. */
const ID_CAMISETA = 2158;

let llamadas;
let fetchOriginal;
let respuestaStripe;

beforeEach(() => {
  llamadas = [];
  respuestaStripe = { ok: true };
  fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    if (!respuestaStripe.ok) {
      return new Response('{"error":{"message":"clave no válida"}}', { status: respuestaStripe.status ?? 400 });
    }
    return new Response(JSON.stringify({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

const peticionPago = (cuerpo) => new Request('https://kamusino.es/api/checkout', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(cuerpo),
});

describe('catálogo de precios del servidor', () => {
  test('se ha generado con productos reales', () => {
    assert.ok(Object.keys(PRECIOS).length > 35, 'solo ' + Object.keys(PRECIOS).length);
    assert.ok(PRECIOS[ID_CAMISETA], 'falta el producto ' + ID_CAMISETA);
  });

  test('ningún producto entra con precio cero', () => {
    for (const [id, p] of Object.entries(PRECIOS)) {
      assert.ok(p.precio > 0, `${id} tiene precio ${p.precio}`);
    }
  });
});

describe('referenciaValida', () => {
  test('acepta las que emite el endpoint de pedidos', () => {
    assert.ok(referenciaValida('KAM-ABC234'));
    assert.ok(referenciaValida('KAM-XYZ789'));
  });

  test('rechaza cualquier otra cosa', () => {
    const malas = ['', null, 'KAM-abc234', 'KAM-ABC23', 'KAM-ABCD2345', 'OTRO-ABC234',
      'KAM-ABC2O4', 'KAM-ABC2I4', "KAM-ABC234' OR 1=1"];
    for (const mala of malas) assert.ok(!referenciaValida(mala), String(mala));
  });
});

describe('calcularImporte', () => {
  test('multiplica el precio del catálogo por la cantidad', () => {
    const importe = calcularImporte(ID_CAMISETA, 2);
    const esperado = Math.round(PRECIOS[ID_CAMISETA].precio * 100);
    assert.equal(importe.unitario, esperado);
    assert.equal(importe.subtotal, esperado * 2);
  });

  test('trabaja en céntimos enteros, sin arrastrar decimales', () => {
    for (let n = 1; n <= 40; n += 1) {
      const importe = calcularImporte(ID_CAMISETA, n);
      assert.ok(Number.isInteger(importe.total), `${n} unidades dan ${importe.total}`);
      assert.ok(Number.isInteger(importe.subtotal));
    }
  });

  test('cobra el envío por debajo del umbral y lo perdona por encima', () => {
    const pocas = calcularImporte(ID_CAMISETA, 1);
    assert.ok(pocas.envio > 0, 'un pedido pequeño debería pagar envío');
    assert.equal(pocas.total, pocas.subtotal + pocas.envio);

    const muchas = calcularImporte(ID_CAMISETA, 50);
    assert.equal(muchas.envio, 0, 'un pedido grande no debería pagar envío');
    assert.equal(muchas.total, muchas.subtotal);
  });

  test('rechaza un producto que no existe', () => {
    assert.equal(calcularImporte(999999, 1), null);
    assert.equal(calcularImporte('../../etc/passwd', 1), null);
    assert.equal(calcularImporte(null, 1), null);
  });

  test('rechaza cantidades que no son enteros positivos razonables', () => {
    for (const cantidad of [0, -1, 1.5, 1000, '2', null, undefined, NaN, Infinity]) {
      assert.equal(calcularImporte(ID_CAMISETA, cantidad), null, String(cantidad));
    }
  });
});

describe('formato que espera Stripe', () => {
  test('aplana los objetos anidados con corchetes', () => {
    const salida = aFormularioStripe({ a: 1, b: { c: 'x', d: { e: true } } });
    assert.equal(salida.get('a'), '1');
    assert.equal(salida.get('b[c]'), 'x');
    assert.equal(salida.get('b[d][e]'), 'true');
  });

  test('omite lo que no tiene valor, en vez de mandar «undefined»', () => {
    const salida = aFormularioStripe({ a: 1, b: undefined, c: null });
    assert.equal(salida.has('b'), false);
    assert.equal(salida.has('c'), false);
  });

  test('la sesión lleva la referencia por los dos caminos', () => {
    const sesion = sesionDeStripe({
      importe: calcularImporte(ID_CAMISETA, 1),
      referencia: 'KAM-ABC234',
      email: 'ana@ejemplo.es',
      origen: 'https://kamusino.es',
    });
    assert.equal(sesion.client_reference_id, 'KAM-ABC234');
    assert.equal(sesion.metadata.referencia, 'KAM-ABC234');
  });

  test('la sesión sabe a dónde volver, se pague o no', () => {
    const sesion = sesionDeStripe({
      importe: calcularImporte(ID_CAMISETA, 1),
      referencia: 'KAM-ABC234',
      origen: 'https://kamusino.es',
    });
    assert.match(sesion.success_url, /^https:\/\/kamusino\.es\/pedido\/gracias\/\?ref=KAM-ABC234$/);
    assert.match(sesion.cancel_url, /^https:\/\/kamusino\.es\/pedido\/cancelado\/\?ref=KAM-ABC234$/);
  });

  test('el envío aparece como línea aparte solo cuando se cobra', () => {
    const conEnvio = sesionDeStripe({
      importe: calcularImporte(ID_CAMISETA, 1), referencia: 'KAM-ABC234', origen: 'https://x',
    });
    assert.ok(conEnvio.line_items[1], 'debería haber línea de envío');

    const sinEnvio = sesionDeStripe({
      importe: calcularImporte(ID_CAMISETA, 50), referencia: 'KAM-ABC234', origen: 'https://x',
    });
    assert.equal(sinEnvio.line_items[1], undefined);
  });
});

describe('POST /api/checkout', () => {
  test('abre la sesión y devuelve la URL de pago', async () => {
    const respuesta = await abrirPago({
      request: peticionPago({ referencia: 'KAM-ABC234', productoId: ID_CAMISETA, cantidad: 2, email: 'ana@ejemplo.es' }),
      env: ENTORNO,
    });
    assert.equal(respuesta.status, 200);
    const cuerpo = await respuesta.json();
    assert.match(cuerpo.url, /^https:\/\/checkout\.stripe\.com\//);
    assert.equal(cuerpo.total, calcularImporte(ID_CAMISETA, 2).total);
  });

  test('ignora el precio que mande el navegador', async () => {
    await abrirPago({
      request: peticionPago({
        referencia: 'KAM-ABC234', productoId: ID_CAMISETA, cantidad: 1,
        precio: 1, total: 1, unit_amount: 1, amount: 1,
      }),
      env: ENTORNO,
    });
    const enviado = llamadas[0].opciones.body;
    const esperado = String(Math.round(PRECIOS[ID_CAMISETA].precio * 100));
    assert.equal(enviado.get('line_items[0][price_data][unit_amount]'), esperado);
    assert.notEqual(esperado, '1');
  });

  test('manda una clave de idempotencia, para que dos clics no cobren dos veces', async () => {
    await abrirPago({
      request: peticionPago({ referencia: 'KAM-ABC234', productoId: ID_CAMISETA, cantidad: 1 }),
      env: ENTORNO,
    });
    assert.equal(llamadas[0].opciones.headers['idempotency-key'], 'KAM-ABC234');
  });

  test('la clave secreta viaja en la cabecera y no en el cuerpo', async () => {
    await abrirPago({
      request: peticionPago({ referencia: 'KAM-ABC234', productoId: ID_CAMISETA, cantidad: 1 }),
      env: ENTORNO,
    });
    assert.equal(llamadas[0].opciones.headers.authorization, 'Bearer sk_test_prueba');
    assert.ok(!llamadas[0].opciones.body.toString().includes('sk_test_prueba'));
  });

  test('rechaza una referencia inventada sin llamar a Stripe', async () => {
    const respuesta = await abrirPago({
      request: peticionPago({ referencia: 'inventada', productoId: ID_CAMISETA, cantidad: 1 }),
      env: ENTORNO,
    });
    assert.equal(respuesta.status, 400);
    assert.equal(llamadas.length, 0);
  });

  test('rechaza un producto sin precio publicado', async () => {
    const respuesta = await abrirPago({
      request: peticionPago({ referencia: 'KAM-ABC234', productoId: 999999, cantidad: 1 }),
      env: ENTORNO,
    });
    assert.equal(respuesta.status, 400);
    assert.match((await respuesta.json()).error, /presupuesto/i);
    assert.equal(llamadas.length, 0);
  });

  test('sin clave configurada avisa sin dejar al cliente colgado', async () => {
    const respuesta = await abrirPago({
      request: peticionPago({ referencia: 'KAM-ABC234', productoId: ID_CAMISETA, cantidad: 1 }),
      env: {},
    });
    assert.equal(respuesta.status, 503);
    assert.match((await respuesta.json()).error, /presupuesto/i);
  });

  test('si Stripe falla, su mensaje no llega al cliente', async () => {
    respuestaStripe = { ok: false, status: 401 };
    const respuesta = await abrirPago({
      request: peticionPago({ referencia: 'KAM-ABC234', productoId: ID_CAMISETA, cantidad: 1 }),
      env: ENTORNO,
    });
    assert.equal(respuesta.status, 502);
    assert.ok(!JSON.stringify(await respuesta.json()).includes('clave no válida'));
  });

  test('un cuerpo que no es JSON no revienta la función', async () => {
    const respuesta = await abrirPago({
      request: new Request('https://kamusino.es/api/checkout', { method: 'POST', body: 'no soy json' }),
      env: ENTORNO,
    });
    assert.equal(respuesta.status, 400);
  });

  test('un GET se rechaza con 405', async () => {
    const respuesta = await metodoPago({
      request: new Request('https://kamusino.es/api/checkout'),
      next: () => new Response('no debería llegar'),
    });
    assert.equal(respuesta.status, 405);
  });
});

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

/** Firma un cuerpo igual que lo haría Stripe. */
async function firmar(cuerpo, secreto, marca = Math.floor(Date.now() / 1000)) {
  const codificador = new TextEncoder();
  const llave = await crypto.subtle.importKey(
    'raw', codificador.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const firma = await crypto.subtle.sign('HMAC', llave, codificador.encode(`${marca}.${cuerpo}`));
  const hex = [...new Uint8Array(firma)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `t=${marca},v1=${hex}`;
}

const EVENTO_PAGADO = {
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_1',
      amount_total: 2895,
      currency: 'eur',
      metadata: { referencia: 'KAM-ABC234' },
      customer_details: { name: 'Ana Pérez', email: 'ana@ejemplo.es', phone: '600123456' },
      shipping_details: {
        address: { line1: 'Calle Falsa 123', line2: '2º B', postal_code: '28001', city: 'Madrid', country: 'ES' },
      },
    },
  },
};

const peticionAviso = (cuerpo, firma) => new Request('https://kamusino.es/api/stripe-webhook', {
  method: 'POST',
  headers: firma ? { 'stripe-signature': firma } : {},
  body: cuerpo,
});

describe('iguales', () => {
  test('acierta con cadenas iguales y distintas', () => {
    assert.ok(iguales('abc', 'abc'));
    assert.ok(!iguales('abc', 'abd'));
    assert.ok(!iguales('abc', 'abcd'));
    assert.ok(!iguales('', 'a'));
  });
});

describe('analizarFirma', () => {
  test('extrae la marca de tiempo y las firmas', () => {
    const partes = analizarFirma('t=1756368000,v1=' + 'a'.repeat(64));
    assert.equal(partes.marca, 1756368000);
    assert.equal(partes.firmas.length, 1);
  });

  test('admite varias firmas, que es lo que manda Stripe al rotar el secreto', () => {
    const partes = analizarFirma(`t=1,v1=${'a'.repeat(64)},v1=${'b'.repeat(64)}`);
    assert.equal(partes.firmas.length, 2);
  });

  test('devuelve null con cabeceras que no valen', () => {
    const malas = [null, undefined, '', 'basura', 't=1', 'v1=' + 'a'.repeat(64), 't=1,v1=corta'];
    for (const mala of malas) assert.equal(analizarFirma(mala), null, String(mala));
  });
});

describe('verificarFirma', () => {
  test('acepta una firma legítima y reciente', async () => {
    const cuerpo = JSON.stringify(EVENTO_PAGADO);
    const cabecera = await firmar(cuerpo, 'whsec_prueba');
    assert.equal(await verificarFirma({ cuerpo, cabecera, secreto: 'whsec_prueba' }), true);
  });

  test('rechaza una firma hecha con otro secreto', async () => {
    const cuerpo = JSON.stringify(EVENTO_PAGADO);
    const cabecera = await firmar(cuerpo, 'whsec_del_atacante');
    assert.equal(await verificarFirma({ cuerpo, cabecera, secreto: 'whsec_prueba' }), false);
  });

  test('rechaza si el cuerpo se ha tocado después de firmarlo', async () => {
    const cuerpo = JSON.stringify(EVENTO_PAGADO);
    const cabecera = await firmar(cuerpo, 'whsec_prueba');
    assert.equal(await verificarFirma({ cuerpo: cuerpo.replace('2895', '1'), cabecera, secreto: 'whsec_prueba' }), false);
  });

  test('rechaza una firma antigua, para que no se pueda reenviar', async () => {
    const cuerpo = JSON.stringify(EVENTO_PAGADO);
    const hace10min = Math.floor(Date.now() / 1000) - 600;
    const cabecera = await firmar(cuerpo, 'whsec_prueba', hace10min);
    assert.equal(await verificarFirma({ cuerpo, cabecera, secreto: 'whsec_prueba' }), false);
  });

  test('rechaza cuando no hay secreto configurado', async () => {
    const cuerpo = JSON.stringify(EVENTO_PAGADO);
    const cabecera = await firmar(cuerpo, 'whsec_prueba');
    assert.equal(await verificarFirma({ cuerpo, cabecera, secreto: undefined }), false);
  });
});

describe('POST /api/stripe-webhook', () => {
  test('un aviso legítimo avisa al taller', async () => {
    const cuerpo = JSON.stringify(EVENTO_PAGADO);
    const respuesta = await recibirAviso({
      request: peticionAviso(cuerpo, await firmar(cuerpo, 'whsec_prueba')),
      env: ENTORNO,
    });
    assert.equal(respuesta.status, 200);
    assert.equal(llamadas.length, 1);
    const mensaje = JSON.parse(llamadas[0].opciones.body);
    assert.deepEqual(mensaje.to, ['pedidos@ejemplo.es']);
    assert.match(mensaje.subject, /^PAGADO · KAM-ABC234$/);
  });

  test('un aviso sin firma se descarta y no manda nada', async () => {
    const respuesta = await recibirAviso({
      request: peticionAviso(JSON.stringify(EVENTO_PAGADO), null),
      env: ENTORNO,
    });
    assert.equal(respuesta.status, 400);
    assert.equal(llamadas.length, 0);
  });

  test('un aviso con firma falsa se descarta y no manda nada', async () => {
    const cuerpo = JSON.stringify(EVENTO_PAGADO);
    const respuesta = await recibirAviso({
      request: peticionAviso(cuerpo, `t=${Math.floor(Date.now() / 1000)},v1=${'0'.repeat(64)}`),
      env: ENTORNO,
    });
    assert.equal(respuesta.status, 400);
    assert.equal(llamadas.length, 0);
  });

  test('un aviso con el importe cambiado tras la firma se descarta', async () => {
    const original = JSON.stringify(EVENTO_PAGADO);
    const cabecera = await firmar(original, 'whsec_prueba');
    const respuesta = await recibirAviso({
      request: peticionAviso(original.replace('2895', '1'), cabecera),
      env: ENTORNO,
    });
    assert.equal(respuesta.status, 400);
    assert.equal(llamadas.length, 0);
  });

  test('los eventos que no son un pago se aceptan pero se ignoran', async () => {
    const cuerpo = JSON.stringify({ type: 'payment_intent.created', data: { object: {} } });
    const respuesta = await recibirAviso({
      request: peticionAviso(cuerpo, await firmar(cuerpo, 'whsec_prueba')),
      env: ENTORNO,
    });
    // 200 a propósito: con un error, Stripe reintentaría durante días.
    assert.equal(respuesta.status, 200);
    assert.equal(llamadas.length, 0);
  });

  test('si el aviso al taller falla, se responde 200 igualmente', async () => {
    globalThis.fetch = async () => new Response('{"message":"error"}', { status: 500 });
    const cuerpo = JSON.stringify(EVENTO_PAGADO);
    const respuesta = await recibirAviso({
      request: peticionAviso(cuerpo, await firmar(cuerpo, 'whsec_prueba')),
      env: ENTORNO,
    });
    // El cobro ya está hecho: un error aquí solo provocaría avisos repetidos.
    assert.equal(respuesta.status, 200);
  });
});

describe('correo de pago recibido', () => {
  const sesion = EVENTO_PAGADO.data.object;

  test('lleva el importe en euros y la dirección de entrega', () => {
    const html = correoPagado({ referencia: 'KAM-ABC234', sesion, fecha: 'hoy' });
    assert.match(html, /28,95/);
    assert.match(html, /Calle Falsa 123/);
    assert.match(html, /28001 Madrid/);
    assert.match(html, /KAM-ABC234/);
  });

  test('no revienta cuando faltan datos del cliente', () => {
    const html = correoPagado({ referencia: 'KAM-ABC234', sesion: {}, fecha: 'hoy' });
    assert.match(html, /No consta/);
    assert.match(html, /0,00/);
  });

  test('un nombre con HTML dentro sale escapado', () => {
    const conHtml = { ...sesion, customer_details: { name: '<script>alert(1)</script>' } };
    const html = correoPagado({ referencia: 'KAM-ABC234', sesion: conHtml, fecha: 'hoy' });
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
  });
});
