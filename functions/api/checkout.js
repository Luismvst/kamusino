// POST /api/checkout — abre una sesión de pago con tarjeta.
//
// Se usa Stripe Checkout, que es una página alojada por Stripe: el cliente
// escribe la tarjeta allí, no aquí. Así ningún dato de tarjeta pasa por
// nuestro servidor y la tienda queda fuera del alcance de PCI-DSS, que es la
// diferencia entre montar esto en una tarde y montarlo en un trimestre.
//
// El importe **no** viene en la petición. Llega solo el producto y la
// cantidad, y el precio se busca en `_precios.js`, que genera el mismo
// proceso que las páginas. Si el navegador dijera el precio, cualquiera
// podría comprar una sudadera por un céntimo cambiando un número.

import { PRECIOS } from './_precios.js';

const STRIPE = 'https://api.stripe.com/v1/checkout/sessions';

/** Envío y umbral de envío gratis, en céntimos. Deben coincidir con `negocio.mjs`. */
const ENVIO_CENTIMOS = 495;
const ENVIO_GRATIS_DESDE_CENTIMOS = 6000;

const MAX_UNIDADES = 999;

function json(datos, status = 200) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function error(mensaje, status = 400) {
  return json({ error: mensaje }, status);
}

/** Una referencia con la forma que emite `pedido.js`, y nada más. */
export function referenciaValida(valor) {
  return typeof valor === 'string' && /^KAM-[A-HJ-NP-Z2-9]{6}$/.test(valor);
}

/**
 * Calcula el importe en céntimos a partir del catálogo del servidor.
 * Devuelve `null` si el producto no existe o no se vende por la web.
 */
export function calcularImporte(productoId, cantidad) {
  const producto = PRECIOS[String(productoId)];
  if (!producto) return null;
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_UNIDADES) return null;

  // Se trabaja en céntimos enteros de principio a fin. Con decimales, 12,10 €
  // por 3 da 36,299999999999997 y se acaba cobrando un céntimo de menos.
  const unitario = Math.round(producto.precio * 100);
  const subtotal = unitario * cantidad;
  const envio = subtotal >= ENVIO_GRATIS_DESDE_CENTIMOS ? 0 : ENVIO_CENTIMOS;

  return { nombre: producto.nombre, unitario, cantidad, subtotal, envio, total: subtotal + envio };
}

/**
 * Stripe espera `application/x-www-form-urlencoded` con claves anidadas del
 * estilo `line_items[0][price_data][currency]`. Esta función aplana el objeto
 * a ese formato para no tener que escribir esas claves a mano.
 */
export function aFormularioStripe(objeto, prefijo = '', salida = new URLSearchParams()) {
  for (const [clave, valor] of Object.entries(objeto)) {
    if (valor === undefined || valor === null) continue;
    const nombre = prefijo ? `${prefijo}[${clave}]` : clave;
    if (typeof valor === 'object') {
      aFormularioStripe(valor, nombre, salida);
    } else {
      salida.append(nombre, String(valor));
    }
  }
  return salida;
}

export function sesionDeStripe({ importe, referencia, email, origen }) {
  const lineas = {
    0: {
      quantity: importe.cantidad,
      price_data: {
        currency: 'eur',
        unit_amount: importe.unitario,
        product_data: { name: importe.nombre, description: `Personalizado · pedido ${referencia}` },
      },
    },
  };

  if (importe.envio > 0) {
    lineas[1] = {
      quantity: 1,
      price_data: {
        currency: 'eur',
        unit_amount: importe.envio,
        product_data: { name: 'Gastos de envío' },
      },
    };
  }

  return {
    mode: 'payment',
    // Sin estas dos, quien no complete el pago se queda sin manera de volver.
    success_url: `${origen}/pedido/gracias/?ref=${referencia}`,
    cancel_url: `${origen}/pedido/cancelado/?ref=${referencia}`,
    customer_email: email,
    // La referencia viaja por dos caminos: `client_reference_id` se ve en el
    // panel de Stripe y `metadata` es la que llega al webhook.
    client_reference_id: referencia,
    metadata: { referencia },
    locale: 'es',
    // Sin dirección no se puede enviar el pedido, y pedirla después por email
    // es una ida y vuelta en la que se pierden clientes.
    shipping_address_collection: { allowed_countries: { 0: 'ES' } },
    line_items: lineas,
  };
}

export async function onRequestPost({ request, env }) {
  const clave = env.STRIPE_SECRET_KEY;
  if (!clave) {
    console.error('Falta STRIPE_SECRET_KEY: el pago con tarjeta no está configurado.');
    return error('El pago con tarjeta no está disponible ahora mismo. Te mandamos el presupuesto por email y lo resolvemos.', 503);
  }

  let cuerpo;
  try {
    cuerpo = await request.json();
  } catch {
    return error('La petición no se entiende.');
  }

  if (!referenciaValida(cuerpo.referencia)) return error('La referencia del pedido no es válida.');

  const importe = calcularImporte(cuerpo.productoId, cuerpo.cantidad);
  if (!importe) return error('Ese producto no se puede pagar por la web. Te pasamos presupuesto por email.');

  const origen = new URL(request.url).origin;
  const formulario = aFormularioStripe(sesionDeStripe({
    importe,
    referencia: cuerpo.referencia,
    email: typeof cuerpo.email === 'string' ? cuerpo.email.slice(0, 120) : undefined,
    origen,
  }));

  const respuesta = await fetch(STRIPE, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${clave}`,
      'content-type': 'application/x-www-form-urlencoded',
      // Si el cliente pulsa dos veces, Stripe devuelve la misma sesión en vez
      // de abrir dos y arriesgarse a cobrar dos veces.
      'idempotency-key': cuerpo.referencia,
    },
    body: formulario,
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '');
    console.error(`Stripe ${respuesta.status}: ${detalle.slice(0, 400)}`);
    return error('No hemos podido abrir la pasarela de pago. Inténtalo en un momento.', 502);
  }

  const sesion = await respuesta.json();
  return json({ url: sesion.url, total: importe.total });
}

export function onRequest({ request, next }) {
  if (request.method === 'POST') return next();
  return new Response('Método no permitido', { status: 405, headers: { allow: 'POST' } });
}
