// Pruebas del endpoint que recibe los pedidos.
//
// Se ejecuta la función tal cual la desplegará Cloudflare, con un `fetch`
// suplantado en lugar de Resend: lo que hay que comprobar es qué mensaje se
// compone y cuándo se decide no mandar nada, no que Resend funcione.

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  onRequestPost, onRequest, revisar, nuevaReferencia, nombreSeguro,
  emailValido, correoTaller, correoCliente, LIMITES,
} from '../functions/api/pedido.js';

const ENTORNO = {
  RESEND_API_KEY: 're_clave_de_prueba',
  EMAIL_PEDIDOS: 'pedidos@ejemplo.es',
  EMAIL_REMITENTE: 'no-responder@ejemplo.es',
  NOMBRE_COMERCIAL: 'Kamusino',
};

const capa = (extra = {}) => ({
  orden: 1, tipo: 'imagen', nombre: 'logo.png', texto: null, formato: 'PNG',
  medidasCm: { ancho: 12, alto: 6 }, rotacionGrados: 0, pppEstimado: 300, ...extra,
});

const pedido = (extra = {}) => ({
  contacto: { nombre: 'Ana Pérez', email: 'ana@ejemplo.es', telefono: '600123456', acepta: true, empresa: '' },
  resumen: {
    producto: { id: 2158, nombre: 'Camiseta Gildan Sofstyle', prenda: 'Camiseta' },
    color: 'Negro', colorHex: '#000000', talla: 'L', cantidad: 2, notas: '',
    caras: [{ cara: 'delantera', areaCm: { ancho: 30, alto: 40 }, capas: [capa()] }],
  },
  avisos: [],
  resoluciones: { delantera: { ppp: 300, ancho: 3543, alto: 4724 } },
  ...extra,
});

/** Construye la petición igual que la manda el editor. */
function peticion(datos, ficheros = []) {
  const formulario = new FormData();
  formulario.append('pedido', JSON.stringify(datos));
  for (const [campo, contenido, nombre] of ficheros) {
    formulario.append(campo, new Blob([contenido], { type: 'image/png' }), nombre);
  }
  return new Request('https://kamusino.es/api/pedido', { method: 'POST', body: formulario });
}

let enviados;
let fetchOriginal;
let respuestaResend;

beforeEach(() => {
  enviados = [];
  respuestaResend = { ok: true, status: 200 };
  fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url, opciones) => {
    enviados.push({ url, cabeceras: opciones.headers, mensaje: JSON.parse(opciones.body) });
    if (!respuestaResend.ok) {
      return new Response('{"message":"algo ha ido mal"}', { status: respuestaResend.status });
    }
    return new Response(JSON.stringify({ id: 'msg_' + enviados.length }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

describe('referencia', () => {
  test('tiene el formato KAM- y seis caracteres', () => {
    assert.match(nuevaReferencia(), /^KAM-[A-Z2-9]{6}$/);
  });

  test('no usa caracteres que se confunden al dictarlos', () => {
    const muchas = Array.from({ length: 400 }, nuevaReferencia).join('').replace(/KAM-/g, '');
    assert.ok(!/[OI01]/.test(muchas), 'hay caracteres ambiguos');
  });

  test('no se repite', () => {
    assert.equal(new Set(Array.from({ length: 1000 }, nuevaReferencia)).size, 1000);
  });
});

describe('emailValido', () => {
  test('acepta direcciones normales', () => {
    for (const e of ['ana@ejemplo.es', 'a.b+c@sub.dominio.com']) assert.ok(emailValido(e), e);
  });

  test('rechaza lo que no lo es', () => {
    for (const e of ['sin-arroba', 'a@b', 'a@b.c d', '', null, undefined, 'a@'.repeat(80)]) {
      assert.ok(!emailValido(e), String(e));
    }
  });
});

describe('nombreSeguro', () => {
  test('quita los separadores de ruta', () => {
    assert.ok(!nombreSeguro('../../etc/passwd').includes('/'));
    assert.ok(!nombreSeguro('C:\\Windows\\logo.png').includes('\\'));
  });

  test('quita los saltos de línea, que permitirían inyectar cabeceras', () => {
    assert.ok(!/[\r\n]/.test(nombreSeguro('logo.png\r\nBcc: otro@ejemplo.es')));
  });

  test('conserva un nombre normal', () => {
    assert.equal(nombreSeguro('mi diseno-2.png'), 'mi diseno-2.png');
  });

  test('nunca devuelve vacío', () => {
    assert.ok(nombreSeguro('///').length > 0);
    assert.ok(nombreSeguro('').length > 0);
  });
});

describe('revisar', () => {
  test('acepta un pedido correcto', () => {
    assert.equal(revisar(pedido()), null);
  });

  test('detecta la trampa antispam', () => {
    const p = pedido();
    p.contacto.empresa = 'Robot S.L.';
    assert.equal(revisar(p), 'trampa');
  });

  test('exige el nombre', () => {
    const p = pedido();
    p.contacto.nombre = '   ';
    assert.match(revisar(p), /nombre/i);
  });

  test('exige un email válido', () => {
    const p = pedido();
    p.contacto.email = 'no-vale';
    assert.match(revisar(p), /email/i);
  });

  test('exige la aceptación de las condiciones', () => {
    const p = pedido();
    p.contacto.acepta = false;
    assert.match(revisar(p), /condiciones/i);
  });

  test('rechaza un pedido sin diseños', () => {
    const p = pedido();
    p.resumen.caras = [];
    assert.match(revisar(p), /ning[úu]n dise/i);

    const q = pedido();
    q.resumen.caras = [{ cara: 'delantera', areaCm: { ancho: 30, alto: 40 }, capas: [] }];
    assert.match(revisar(q), /ning[úu]n dise/i);
  });

  test('rechaza más capas de las permitidas, aunque el navegador diga otra cosa', () => {
    const p = pedido();
    p.resumen.caras[0].capas = Array.from({ length: LIMITES.maxCapas + 1 }, (_, i) => capa({ orden: i + 1 }));
    assert.match(revisar(p), /m[áa]ximo/i);
  });

  test('rechaza cantidades absurdas', () => {
    for (const cantidad of [0, -3, 1000, 2.5, '5', null]) {
      const p = pedido();
      p.resumen.cantidad = cantidad;
      assert.match(revisar(p), /cantidad/i, String(cantidad));
    }
  });

  test('rechaza campos de texto desmesurados', () => {
    const p = pedido();
    p.resumen.notas = 'x'.repeat(LIMITES.maxCampoTexto + 1);
    assert.match(revisar(p), /demasiado largo/i);
  });

  test('rechaza un fichero que pase del límite por archivo', () => {
    const grande = [{ name: 'enorme.png', size: LIMITES.maxBytesPorFichero + 1 }];
    assert.match(revisar(pedido(), grande), /tama[ñn]o m[áa]ximo/i);
  });

  test('rechaza un conjunto de ficheros que pase del total', () => {
    const muchos = Array.from({ length: 4 }, (_, i) => ({ name: `a${i}.png`, size: 9 * 1024 * 1024 }));
    assert.match(revisar(pedido(), muchos), /suman demasiado/i);
  });

  test('no revienta con un cuerpo vacío o sin forma', () => {
    for (const basura of [null, {}, { contacto: {} }, { contacto: { nombre: 'x' } }]) {
      assert.equal(typeof revisar(basura), 'string');
    }
  });
});

describe('redacción de los correos', () => {
  const datos = pedido();

  test('el del taller lleva la referencia, el producto y las medidas', () => {
    const html = correoTaller({ referencia: 'KAM-ABC234', datos, fecha: 'viernes, 28 de agosto de 2026, 12:34' });
    for (const trozo of ['KAM-ABC234', 'Camiseta Gildan Sofstyle', 'Negro', 'logo.png', '12 × 6 cm', '300 ppp']) {
      assert.ok(html.includes(trozo), 'falta ' + trozo);
    }
  });

  test('el del taller marca la resolución baja', () => {
    const flojo = pedido();
    flojo.resumen.caras[0].capas = [capa({ pppEstimado: 60 })];
    assert.match(correoTaller({ referencia: 'KAM-ABC234', datos: flojo, fecha: 'hoy' }), /60 ppp.*\(baja\)/);
  });

  test('el del taller repite los avisos que vio el cliente', () => {
    const conAvisos = pedido({ avisos: ['El diseño se sale del área imprimible.'] });
    assert.match(correoTaller({ referencia: 'KAM-ABC234', datos: conAvisos, fecha: 'hoy' }), /se sale del área/);
  });

  test('el del cliente saluda por el nombre de pila y aclara que no se ha producido nada', () => {
    const html = correoCliente({ referencia: 'KAM-ABC234', datos, empresa: 'Kamusino' });
    assert.match(html, /Hola Ana,/);
    assert.match(html, /todav[íi]a no hemos empezado a producir nada/i);
    assert.match(html, /KAM-ABC234/);
  });

  test('un nombre con HTML dentro no se cuela en el correo', () => {
    const malicioso = pedido();
    malicioso.contacto.nombre = '<img src=x onerror=alert(1)>';
    malicioso.resumen.notas = '</table><script>alert(2)</script>';
    const html = correoTaller({ referencia: 'KAM-ABC234', datos: malicioso, fecha: 'hoy' });
    assert.ok(!html.includes('<img src=x'), 'se ha colado una etiqueta img');
    assert.ok(!html.includes('<script>'), 'se ha colado un script');
    assert.ok(html.includes('&lt;img'), 'no se ha escapado el nombre');
  });
});

describe('onRequestPost', () => {
  const tresFicheros = [
    ['mockup-delantera', 'a', 'mockup-delantera.png'],
    ['estampacion-delantera', 'b', 'estampacion-delantera.png'],
    ['original-1', 'c', '1-logo.png'],
  ];

  test('manda dos correos y devuelve la referencia', async () => {
    const respuesta = await onRequestPost({ request: peticion(pedido(), tresFicheros), env: ENTORNO });
    assert.equal(respuesta.status, 200);
    const cuerpo = await respuesta.json();
    assert.equal(cuerpo.ok, true);
    assert.match(cuerpo.referencia, /^KAM-[A-Z2-9]{6}$/);
    assert.equal(enviados.length, 2);
  });

  test('el primero va al taller con todos los adjuntos y responde al cliente', async () => {
    await onRequestPost({ request: peticion(pedido(), tresFicheros), env: ENTORNO });
    const [taller] = enviados;
    assert.deepEqual(taller.mensaje.to, ['pedidos@ejemplo.es']);
    assert.equal(taller.mensaje.reply_to, 'ana@ejemplo.es');
    assert.equal(taller.mensaje.attachments.length, 3);
    assert.match(taller.mensaje.subject, /^KAM-[A-Z2-9]{6} · Camiseta Gildan Sofstyle · Ana Pérez$/);
  });

  test('al cliente solo le llegan los mockups, no los ficheros de imprenta', async () => {
    await onRequestPost({ request: peticion(pedido(), tresFicheros), env: ENTORNO });
    const [, cliente] = enviados;
    assert.deepEqual(cliente.mensaje.to, ['ana@ejemplo.es']);
    assert.equal(cliente.mensaje.reply_to, 'pedidos@ejemplo.es');
    assert.equal(cliente.mensaje.attachments.length, 1);
    assert.match(cliente.mensaje.attachments[0].filename, /mockup/);
  });

  test('los adjuntos van en base64', async () => {
    await onRequestPost({
      request: peticion(pedido(), [['mockup-delantera', 'hola', 'mockup-delantera.png']]),
      env: ENTORNO,
    });
    assert.equal(enviados[0].mensaje.attachments[0].content, Buffer.from('hola').toString('base64'));
  });

  test('los archivos que generamos se renombran con la referencia', async () => {
    await onRequestPost({
      request: peticion(pedido(), [
        ['mockup-delantera', 'a', 'mockup-delantera.png'],
        ['original-1', 'c', '1-mi archivo.png'],
      ]),
      env: ENTORNO,
    });
    const nombres = enviados[0].mensaje.attachments.map((a) => a.filename);
    assert.ok(nombres.some((n) => /^KAM-[A-Z2-9]{6}-mockup-delantera\.png$/.test(n)), nombres.join());
    // Sin extensión, en el taller un doble clic no abriría el archivo.
    assert.ok(nombres.every((n) => /\.[a-z0-9]{1,5}$/i.test(n)), nombres.join());
    // El original conserva el nombre que le puso el cliente.
    assert.ok(nombres.includes('1-mi archivo.png'), nombres.join());
  });

  test('la clave de Resend viaja en la cabecera y no en el cuerpo', async () => {
    await onRequestPost({ request: peticion(pedido()), env: ENTORNO });
    assert.equal(enviados[0].cabeceras.authorization, 'Bearer re_clave_de_prueba');
    assert.ok(!JSON.stringify(enviados[0].mensaje).includes('re_clave_de_prueba'));
  });

  test('el spam recibe un OK y no se manda ningún correo', async () => {
    const p = pedido();
    p.contacto.empresa = 'Robot S.L.';
    const respuesta = await onRequestPost({ request: peticion(p), env: ENTORNO });
    assert.equal(respuesta.status, 200);
    assert.equal(enviados.length, 0);
  });

  test('un pedido inválido se rechaza sin mandar nada', async () => {
    const p = pedido();
    p.contacto.acepta = false;
    const respuesta = await onRequestPost({ request: peticion(p), env: ENTORNO });
    assert.equal(respuesta.status, 400);
    assert.match((await respuesta.json()).error, /condiciones/i);
    assert.equal(enviados.length, 0);
  });

  test('sin claves configuradas se avisa sin dejar al cliente colgado', async () => {
    const respuesta = await onRequestPost({ request: peticion(pedido()), env: {} });
    assert.equal(respuesta.status, 503);
    assert.match((await respuesta.json()).error, /WhatsApp/);
    assert.equal(enviados.length, 0);
  });

  test('si falla el correo al taller se devuelve error, porque el pedido se perdería', async () => {
    respuestaResend = { ok: false, status: 422 };
    const respuesta = await onRequestPost({ request: peticion(pedido()), env: ENTORNO });
    assert.equal(respuesta.status, 502);
    assert.match((await respuesta.json()).error, /int[ée]ntalo/i);
  });

  test('el error de Resend no se le enseña al cliente', async () => {
    respuestaResend = { ok: false, status: 422 };
    const respuesta = await onRequestPost({ request: peticion(pedido()), env: ENTORNO });
    const texto = JSON.stringify(await respuesta.json());
    assert.ok(!texto.includes('422'));
    assert.ok(!texto.includes('algo ha ido mal'));
  });

  test('si solo falla la confirmación al cliente, el pedido sigue siendo válido', async () => {
    let llamadas = 0;
    globalThis.fetch = async () => {
      llamadas += 1;
      return llamadas === 1
        ? new Response('{"id":"msg_1"}', { status: 200 })
        : new Response('{"message":"buzón inexistente"}', { status: 422 });
    };
    const respuesta = await onRequestPost({ request: peticion(pedido()), env: ENTORNO });
    assert.equal(respuesta.status, 200);
    assert.equal((await respuesta.json()).ok, true);
  });

  test('un cuerpo que no es un formulario no revienta la función', async () => {
    const respuesta = await onRequestPost({
      request: new Request('https://kamusino.es/api/pedido', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'esto no es un formulario',
      }),
      env: ENTORNO,
    });
    assert.equal(respuesta.status, 400);
    assert.equal(enviados.length, 0);
  });

  test('la respuesta no se guarda en ninguna caché', async () => {
    const respuesta = await onRequestPost({ request: peticion(pedido()), env: ENTORNO });
    assert.equal(respuesta.headers.get('cache-control'), 'no-store');
  });
});

describe('métodos', () => {
  test('un GET se rechaza con 405', async () => {
    const respuesta = await onRequest({
      request: new Request('https://kamusino.es/api/pedido'),
      next: () => new Response('no debería llegar aquí'),
    });
    assert.equal(respuesta.status, 405);
    assert.equal(respuesta.headers.get('allow'), 'POST');
  });

  test('un POST se deja pasar', async () => {
    const respuesta = await onRequest({
      request: new Request('https://kamusino.es/api/pedido', { method: 'POST' }),
      next: () => new Response('adelante'),
    });
    assert.equal(await respuesta.text(), 'adelante');
  });
});
