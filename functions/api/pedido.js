// POST /api/pedido — recibe el diseño del editor y lo manda por email.
//
// Es una función de Cloudflare Pages: el fichero es la ruta, no hace falta
// registrarla en ningún sitio.
//
// Salen dos correos: uno al taller, con todos los archivos, y otro al cliente
// confirmando lo que ha pedido. El del cliente no es cortesía: es el
// justificante de que el pedido existe y de con qué referencia reclamarlo.
//
// No hay base de datos a propósito. Para el volumen de esta tienda, el correo
// **es** el sistema de pedidos: está donde el dueño ya trabaja, se busca, se
// reenvía y se archiva solo.

const RESEND = 'https://api.resend.com/emails';

/** Se repiten aquí los límites del cliente: uno que solo vive en el navegador no es un límite. */
export const LIMITES = {
  maxCapas: 8,
  maxBytesPorFichero: 10 * 1024 * 1024,
  // Resend admite 40 MB de adjuntos. Se deja margen para el texto y para el
  // crecimiento del base64, que engorda los binarios un 33%.
  maxBytesAdjuntos: 28 * 1024 * 1024,
  maxCampoTexto: 600,
};

/**
 * Alfabeto sin caracteres que se confundan al dictarlos por teléfono: fuera
 * O y 0, I y 1. La referencia se lee en voz alta más veces de lo que parece.
 */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function nuevaReferencia() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return 'KAM-' + [...bytes].map((b) => ALFABETO[b % ALFABETO.length]).join('');
}

function json(datos, status = 200) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function error(mensaje, status = 400) {
  return json({ error: mensaje }, status);
}

function escapar(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Los saltos de línea en un asunto o en un nombre de fichero permiten inyectar
 * cabeceras de correo. Se quitan en todo lo que venga del cliente y acabe en
 * una cabecera.
 */
function unaLinea(texto, largo = 120) {
  return String(texto ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, largo);
}

export function nombreSeguro(nombre) {
  return unaLinea(nombre, 90).replace(/[^\w.\- ]+/g, '_') || 'archivo';
}

export function emailValido(valor) {
  return typeof valor === 'string' && valor.length <= 120 && /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(valor);
}

async function aBase64(fichero) {
  const bytes = new Uint8Array(await fichero.arrayBuffer());
  // Se convierte por trozos: pasarle 10 MB de golpe a `String.fromCharCode`
  // desborda la pila de argumentos.
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binario);
}

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

/** Devuelve un mensaje de error, `'trampa'` si es spam, o `null` si se acepta. */
export function revisar(datos, ficheros = []) {
  const contacto = datos?.contacto;
  const resumen = datos?.resumen;

  // La trampa antispam. Un robot rellena todos los campos que encuentra; una
  // persona no ve este, porque está fuera de la pantalla.
  if (contacto?.empresa) return 'trampa';

  if (!contacto?.nombre?.trim()) return 'Falta el nombre.';
  if (!emailValido(contacto.email)) return 'El email no es válido.';
  if (contacto.acepta !== true) return 'Hay que aceptar las condiciones de contratación y la política de privacidad.';

  if (!resumen?.caras?.length) return 'El pedido no lleva ningún diseño.';

  const capas = resumen.caras.reduce((n, cara) => n + (cara.capas?.length ?? 0), 0);
  if (capas === 0) return 'El pedido no lleva ningún diseño.';
  if (capas > LIMITES.maxCapas) return `El máximo es de ${LIMITES.maxCapas} diseños por pedido.`;

  if (!Number.isInteger(resumen.cantidad) || resumen.cantidad < 1 || resumen.cantidad > 999) {
    return 'La cantidad no es válida.';
  }

  for (const [campo, valor] of Object.entries({ nombre: contacto.nombre, notas: resumen.notas })) {
    if (typeof valor === 'string' && valor.length > LIMITES.maxCampoTexto) {
      return `El campo «${campo}» es demasiado largo.`;
    }
  }

  let total = 0;
  for (const fichero of ficheros) {
    if (fichero.size > LIMITES.maxBytesPorFichero) return `«${fichero.name}» supera el tamaño máximo por archivo.`;
    total += fichero.size;
  }
  if (total > LIMITES.maxBytesAdjuntos) {
    return 'Los archivos suman demasiado. Quita algún diseño o mándanoslos por email.';
  }

  return null;
}

// ---------------------------------------------------------------------------
// Redacción de los correos
// ---------------------------------------------------------------------------

const ESTILO_TABLA = 'border-collapse:collapse;width:100%;font:14px system-ui,sans-serif';
const TD = 'padding:6px 10px;border:1px solid #e8e0d2;vertical-align:top';
const TH = TD + ';background:#faf8f4;text-align:left;width:34%';

function fila(etiqueta, valor) {
  return `<tr><th style="${TH}">${escapar(etiqueta)}</th><td style="${TD}">${valor}</td></tr>`;
}

function tablaCapas(cara) {
  const filas = cara.capas.map((capa) => {
    const que = capa.tipo === 'texto' ? `Texto: «${escapar(capa.texto ?? '')}»` : escapar(capa.nombre ?? '—');
    const resolucion = capa.pppEstimado
      ? `${capa.pppEstimado} ppp${capa.pppEstimado < 150 ? ' <strong style="color:#b3261e">(baja)</strong>' : ''}`
      : '—';
    return `<tr>
      <td style="${TD}">${capa.orden}</td>
      <td style="${TD}">${que}</td>
      <td style="${TD}">${escapar(capa.formato ?? capa.tipo)}</td>
      <td style="${TD}">${capa.medidasCm.ancho} × ${capa.medidasCm.alto} cm</td>
      <td style="${TD}">${capa.rotacionGrados}°</td>
      <td style="${TD}">${resolucion}</td>
    </tr>`;
  }).join('');

  return `
    <h3 style="font:600 15px system-ui;margin:22px 0 8px">
      Cara ${escapar(cara.cara)} · área de ${cara.areaCm.ancho} × ${cara.areaCm.alto} cm
    </h3>
    <table style="${ESTILO_TABLA}">
      <tr>
        <th style="${TH};width:auto">#</th><th style="${TH};width:auto">Diseño</th>
        <th style="${TH};width:auto">Formato</th><th style="${TH};width:auto">Tamaño</th>
        <th style="${TH};width:auto">Giro</th><th style="${TH};width:auto">Resolución</th>
      </tr>
      ${filas}
    </table>`;
}

export function correoTaller({ referencia, datos, fecha }) {
  const { contacto, resumen, avisos, resoluciones } = datos;

  const listaAvisos = avisos?.length
    ? `<div style="margin:20px 0;padding:12px 14px;border:1px solid #e8c9a0;background:#fdf6ec;border-radius:8px">
         <strong style="font:600 14px system-ui">Avisos que vio el cliente antes de enviar</strong>
         <ul style="margin:8px 0 0;padding-left:20px;font:14px system-ui">
           ${avisos.map((a) => `<li>${escapar(a)}</li>`).join('')}
         </ul>
       </div>`
    : '';

  const impresion = Object.entries(resoluciones ?? {})
    .map(([cara, r]) => `${escapar(cara)}: ${r.ancho} × ${r.alto} px a ${r.ppp} ppp`)
    .join('<br>');

  return `<div style="max-width:760px;margin:0 auto;padding:24px;font:14px system-ui,sans-serif;color:#241d15">
    <p style="margin:0 0 4px;color:#6b6053">Pedido nuevo desde el editor · ${escapar(fecha)}</p>
    <h1 style="font:700 24px system-ui;margin:0 0 20px">${escapar(referencia)}</h1>

    <table style="${ESTILO_TABLA}">
      ${fila('Cliente', escapar(contacto.nombre))}
      ${fila('Email', `<a href="mailto:${escapar(contacto.email)}">${escapar(contacto.email)}</a>`)}
      ${contacto.telefono ? fila('Teléfono', escapar(contacto.telefono)) : ''}
      ${fila('Producto', `${escapar(resumen.producto.nombre)} <span style="color:#6b6053">(ref. ${escapar(resumen.producto.id)})</span>`)}
      ${fila('Prenda', escapar(resumen.producto.prenda))}
      ${fila('Color', `<span style="display:inline-block;width:13px;height:13px;border:1px solid #241d15;background:${escapar(resumen.colorHex)};vertical-align:-2px"></span> ${escapar(resumen.color)} <span style="color:#6b6053">${escapar(resumen.colorHex)}</span>`)}
      ${fila('Talla', escapar(resumen.talla) || '—')}
      ${fila('Cantidad', escapar(resumen.cantidad))}
      ${resumen.notas ? fila('Notas del cliente', escapar(resumen.notas).replace(/\n/g, '<br>')) : ''}
      ${impresion ? fila('Archivos de impresión', impresion) : ''}
    </table>

    ${resumen.caras.map(tablaCapas).join('')}
    ${listaAvisos}

    <p style="margin:22px 0 0;color:#6b6053;font-size:13px">
      Adjuntos: <strong>mockup-*</strong> es cómo lo ve el cliente ·
      <strong>estampacion-*</strong> es el archivo para la máquina, con fondo transparente y ya al tamaño del área ·
      el resto son los originales tal como los subió, que suelen imprimir mejor.
    </p>
    <p style="margin:8px 0 0;color:#6b6053;font-size:13px">
      Responde a este correo y le llega directamente al cliente.
    </p>
  </div>`;
}

export function correoCliente({ referencia, datos, empresa }) {
  const { contacto, resumen } = datos;
  const nombrePila = escapar(String(contacto.nombre).trim().split(/\s+/)[0]);
  return `<div style="max-width:600px;margin:0 auto;padding:24px;font:15px system-ui,sans-serif;color:#241d15">
    <h1 style="font:700 22px system-ui;margin:0 0 6px">Hemos recibido tu diseño</h1>
    <p style="margin:0 0 20px;color:#6b6053">Hola ${nombrePila}, gracias por confiar en ${escapar(empresa)}.</p>

    <p style="margin:0 0 6px">Tu referencia de pedido es:</p>
    <p style="font:700 26px system-ui;letter-spacing:0.06em;margin:0 0 22px;color:#c2632f">${escapar(referencia)}</p>

    <table style="${ESTILO_TABLA}">
      ${fila('Producto', escapar(resumen.producto.nombre))}
      ${fila('Color y talla', `${escapar(resumen.color)}${resumen.talla ? ' · talla ' + escapar(resumen.talla) : ''}`)}
      ${fila('Cantidad', escapar(resumen.cantidad))}
      ${fila('Diseños', resumen.caras.map((c) => `${c.capas.length} en la cara ${escapar(c.cara)}`).join('<br>'))}
    </table>

    <p style="margin:22px 0 0">
      Te adjuntamos cómo ha quedado. <strong>Todavía no hemos empezado a producir nada:</strong>
      primero te respondemos con el presupuesto y el plazo, y solo seguimos adelante cuando nos digas que sí.
    </p>
    <p style="margin:14px 0 0">Si algo no cuadra, responde a este correo indicando la referencia y lo cambiamos.</p>

    <p style="margin:26px 0 0;color:#6b6053;font-size:13px">
      Guarda este correo: es el justificante de tu pedido.
    </p>
  </div>`;
}

// ---------------------------------------------------------------------------
// Envío
// ---------------------------------------------------------------------------

async function enviarCorreo(clave, mensaje) {
  const respuesta = await fetch(RESEND, {
    method: 'POST',
    headers: { authorization: `Bearer ${clave}`, 'content-type': 'application/json' },
    body: JSON.stringify(mensaje),
  });
  if (!respuesta.ok) {
    // El detalle va al log del servidor, no al navegador: puede llevar dentro
    // trozos de la configuración de la cuenta.
    const detalle = await respuesta.text().catch(() => '');
    throw new Error(`Resend ${respuesta.status}: ${detalle.slice(0, 400)}`);
  }
  return respuesta.json();
}

export async function onRequestPost({ request, env }) {
  const clave = env.RESEND_API_KEY;
  const destino = env.EMAIL_PEDIDOS;
  const remitente = env.EMAIL_REMITENTE;
  const empresa = env.NOMBRE_COMERCIAL || 'Kamusino';

  if (!clave || !destino || !remitente) {
    console.error('Faltan variables de entorno: RESEND_API_KEY, EMAIL_PEDIDOS o EMAIL_REMITENTE.');
    return error('Ahora mismo no podemos recibir pedidos por la web. Escríbenos por WhatsApp y lo resolvemos al momento.', 503);
  }

  let formulario;
  let datos;
  try {
    formulario = await request.formData();
    datos = JSON.parse(formulario.get('pedido'));
  } catch {
    return error('El envío ha llegado incompleto. Inténtalo otra vez.');
  }

  const ficheros = [...formulario.entries()]
    .filter(([, valor]) => valor && typeof valor === 'object' && typeof valor.arrayBuffer === 'function')
    .map(([campo, fichero]) => ({ campo, fichero, name: fichero.name, size: fichero.size }));

  const problema = revisar(datos, ficheros);
  if (problema === 'trampa') {
    // Se responde que todo ha ido bien y no se manda nada: un robot que
    // recibe un error reintenta, y uno que recibe un OK se va.
    return json({ ok: true, referencia: nuevaReferencia() });
  }
  if (problema) return error(problema);

  const referencia = nuevaReferencia();
  const fecha = new Date().toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid', dateStyle: 'full', timeStyle: 'short',
  });

  const adjuntos = [];
  for (const { campo, fichero } of ficheros) {
    // Los originales conservan el nombre que les puso el cliente; a los que
    // generamos nosotros se les antepone la referencia, para que en el buzón
    // del taller se agrupen solos por pedido. La extensión sale del fichero
    // real: sin ella, en el taller un doble clic no abre nada.
    const extension = fichero.name.match(/\.[a-z0-9]{1,5}$/i)?.[0] ?? '.png';
    const nombre = campo.startsWith('original-')
      ? nombreSeguro(fichero.name)
      : nombreSeguro(`${referencia}-${campo}${extension}`);
    adjuntos.push({ filename: nombre, content: await aBase64(fichero) });
  }

  // Solo los mockups van también al cliente: los ficheros de imprenta pesan
  // mucho y a él no le sirven de nada.
  const mockups = adjuntos.filter((a) => a.filename.includes('mockup'));

  const de = `${unaLinea(empresa, 60)} <${unaLinea(remitente, 120)}>`;

  try {
    await enviarCorreo(clave, {
      from: de,
      to: [destino],
      reply_to: datos.contacto.email,
      subject: `${referencia} · ${unaLinea(datos.resumen.producto.nombre, 60)} · ${unaLinea(datos.contacto.nombre, 40)}`,
      html: correoTaller({ referencia, datos, fecha }),
      attachments: adjuntos,
    });
  } catch (fallo) {
    console.error('No se ha podido avisar al taller:', fallo.message);
    return error('No hemos podido enviar tu diseño. Inténtalo en un minuto, o escríbenos por WhatsApp.', 502);
  }

  // El pedido ya está a salvo en el buzón del taller. Si la confirmación al
  // cliente falla, se anota y se sigue: perder el acuse es molesto, perder el
  // pedido sería grave.
  try {
    await enviarCorreo(clave, {
      from: de,
      to: [datos.contacto.email],
      reply_to: destino,
      subject: `Tu pedido ${referencia} en ${unaLinea(empresa, 60)}`,
      html: correoCliente({ referencia, datos, empresa }),
      attachments: mockups,
    });
  } catch (fallo) {
    console.error(`Pedido ${referencia} recibido, pero la confirmación al cliente ha fallado:`, fallo.message);
  }

  return json({ ok: true, referencia });
}

/** Solo se admite POST: cualquier otro método se rechaza sin dar pistas. */
export function onRequest({ request, next }) {
  if (request.method === 'POST') return next();
  return new Response('Método no permitido', { status: 405, headers: { allow: 'POST' } });
}
