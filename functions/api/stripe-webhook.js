// POST /api/stripe-webhook — Stripe avisa de que un pedido está pagado.
//
// Esta ruta es pública: cualquiera puede enviarle un JSON diciendo que el
// pedido KAM-XXXXXX está cobrado. Lo único que separa un aviso legítimo de
// uno inventado es la firma, así que **se verifica siempre y antes de mirar
// el contenido**. Sin esa comprobación, esto sería un botón de «marcar como
// pagado» abierto a internet.
//
// Stripe firma cada aviso con HMAC-SHA256 sobre `<marca de tiempo>.<cuerpo>`
// usando el secreto del endpoint, y lo manda en la cabecera `stripe-signature`.

const RESEND = 'https://api.resend.com/emails';

/**
 * Ventana de validez de la firma. Sin ella, quien capture un aviso legítimo
 * podría reenviarlo mañana y volver a marcar el pedido como pagado.
 */
const TOLERANCIA_SEGUNDOS = 300;

function escapar(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Descompone `t=1756368000,v1=abc…` en sus partes. */
export function analizarFirma(cabecera) {
  if (typeof cabecera !== 'string') return null;
  const marca = cabecera.match(/(?:^|,)\s*t=(\d+)/)?.[1];
  const firmas = [...cabecera.matchAll(/(?:^|,)\s*v1=([a-f0-9]{64})/g)].map((m) => m[1]);
  if (!marca || firmas.length === 0) return null;
  return { marca: Number(marca), firmas };
}

/**
 * Compara dos cadenas sin cortocircuitar en la primera diferencia. Un `===`
 * normal tarda más cuanto más largo es el prefijo correcto, y ese tiempo basta
 * para ir adivinando la firma carácter a carácter.
 */
export function iguales(a, b) {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i += 1) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

async function hmacHex(secreto, mensaje) {
  const codificador = new TextEncoder();
  const llave = await crypto.subtle.importKey(
    'raw', codificador.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const firma = await crypto.subtle.sign('HMAC', llave, codificador.encode(mensaje));
  return [...new Uint8Array(firma)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * `true` solo si la firma es de Stripe y es reciente.
 *
 * `cuerpo` tiene que ser el texto **crudo**: si se parsea y se vuelve a
 * serializar, cambia un espacio y la firma deja de cuadrar.
 */
export async function verificarFirma({ cuerpo, cabecera, secreto, ahora = Date.now() }) {
  const partes = analizarFirma(cabecera);
  if (!partes || !secreto) return false;

  const antiguedad = Math.abs(ahora / 1000 - partes.marca);
  if (antiguedad > TOLERANCIA_SEGUNDOS) return false;

  const esperada = await hmacHex(secreto, `${partes.marca}.${cuerpo}`);
  return partes.firmas.some((firma) => iguales(firma, esperada));
}

/** Aviso corto al taller: el pedido ya está cobrado y se puede producir. */
export function correoPagado({ referencia, sesion, fecha }) {
  const cliente = sesion.customer_details ?? {};
  const envio = sesion.shipping_details?.address ?? cliente.address;
  const total = ((sesion.amount_total ?? 0) / 100).toLocaleString('es-ES', {
    style: 'currency', currency: (sesion.currency ?? 'eur').toUpperCase(),
  });

  const direccion = envio
    ? [envio.line1, envio.line2, `${envio.postal_code ?? ''} ${envio.city ?? ''}`.trim(), envio.state, envio.country]
      .filter(Boolean).map(escapar).join('<br>')
    : 'No consta';

  return `<div style="max-width:640px;margin:0 auto;padding:24px;font:15px system-ui,sans-serif;color:#241d15">
    <p style="margin:0 0 4px;color:#6b6053">Pago recibido · ${escapar(fecha)}</p>
    <h1 style="font:700 24px system-ui;margin:0 0 6px">${escapar(referencia)} · PAGADO</h1>
    <p style="font:700 30px system-ui;color:#1f8b98;margin:0 0 22px">${escapar(total)}</p>

    <p style="margin:0 0 6px"><strong>Cliente:</strong> ${escapar(cliente.name ?? '—')}<br>
    <strong>Email:</strong> ${escapar(cliente.email ?? '—')}<br>
    <strong>Teléfono:</strong> ${escapar(cliente.phone ?? '—')}</p>

    <p style="margin:16px 0 0"><strong>Dirección de entrega:</strong><br>${direccion}</p>

    <p style="margin:24px 0 0;padding:12px 14px;background:#faf8f4;border-left:4px solid #1f8b98">
      Los archivos del diseño están en el correo anterior con la misma referencia.
      Ya se puede producir.
    </p>
  </div>`;
}

export async function onRequestPost({ request, env }) {
  // El cuerpo se lee como texto y no se vuelve a serializar: la firma se
  // calcula sobre los bytes exactos que mandó Stripe.
  const cuerpo = await request.text();

  const autentico = await verificarFirma({
    cuerpo,
    cabecera: request.headers.get('stripe-signature'),
    secreto: env.STRIPE_WEBHOOK_SECRET,
  });

  if (!autentico) {
    console.error('Aviso de pago con firma inválida o caducada. Descartado.');
    // Sin detalle: decirle a quien lo intenta *por qué* ha fallado le ayuda a
    // afinar el siguiente intento.
    return new Response('Firma no válida', { status: 400 });
  }

  let evento;
  try {
    evento = JSON.parse(cuerpo);
  } catch {
    return new Response('Cuerpo no válido', { status: 400 });
  }

  const responder = (datos) => new Response(JSON.stringify(datos), {
    status: 200, headers: { 'content-type': 'application/json; charset=utf-8' },
  });

  // Se responde 200 a todo lo demás: con un error, Stripe reintentaría el
  // mismo aviso durante días.
  if (evento.type !== 'checkout.session.completed') {
    return responder({ recibido: true, ignorado: evento.type });
  }

  const sesion = evento.data?.object ?? {};
  const referencia = sesion.metadata?.referencia ?? sesion.client_reference_id ?? '(sin referencia)';

  if (!env.RESEND_API_KEY || !env.EMAIL_PEDIDOS || !env.EMAIL_REMITENTE) {
    console.error(`Pago de ${referencia} cobrado. No se ha podido avisar: falta configurar el correo.`);
    return responder({ recibido: true });
  }

  const fecha = new Date().toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid', dateStyle: 'full', timeStyle: 'short',
  });

  try {
    const respuesta = await fetch(RESEND, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: `${env.NOMBRE_COMERCIAL || 'Kamusino'} <${env.EMAIL_REMITENTE}>`,
        to: [env.EMAIL_PEDIDOS],
        subject: `PAGADO · ${referencia}`,
        html: correoPagado({ referencia, sesion, fecha }),
      }),
    });
    if (!respuesta.ok) throw new Error(`Resend ${respuesta.status}`);
  } catch (fallo) {
    // El cobro ya está hecho y consta en Stripe. Devolver un error aquí solo
    // conseguiría que Stripe reintentara y se mandaran avisos repetidos.
    console.error(`Pago de ${referencia} cobrado, pero el aviso al taller ha fallado:`, fallo.message);
  }

  return responder({ recibido: true });
}

export function onRequest({ request, next }) {
  if (request.method === 'POST') return next();
  return new Response('Método no permitido', { status: 405, headers: { allow: 'POST' } });
}
