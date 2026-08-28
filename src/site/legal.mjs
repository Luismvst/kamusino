// Textos legales.
//
// Cinco documentos que en España no son opcionales para una tienda online:
//
//   Aviso legal        Ley 34/2002 (LSSI-CE), art. 10
//   Privacidad         Reglamento (UE) 2016/679 (RGPD), arts. 13 y 14, y LO 3/2018
//   Cookies            LSSI-CE art. 22.2 y guía de cookies de la AEPD
//   Condiciones        RDL 1/2007 (consumidores) y RDL 7/2021 (garantías)
//   Devoluciones       RDL 1/2007, arts. 68 a 79, con el formulario del anexo B
//
// Están aquí y no en `plantillas.mjs` porque son texto que revisa un asesor,
// no maquetación: quien los lea no debería tener que atravesar código de
// generación de HTML para encontrarlos.
//
// Todo dato identificativo sale de `negocio.mjs`. Si falta alguno, la propia
// página lo dice en un recuadro visible, para que nadie publique la web
// creyendo que ya está completa.

import { EMPRESA, CONTACTO, COMERCIAL, DOMINIO, datosFiscalesPendientes } from './negocio.mjs';

/** Fecha de última revisión de los textos. Se cambia a mano al revisarlos. */
export const REVISADO = '28 de agosto de 2026';

const AEPD = 'la Agencia Española de Protección de Datos (C/ Jorge Juan, 6, 28001 Madrid — '
  + '<a href="https://www.aepd.es" rel="nofollow noopener" target="_blank">www.aepd.es</a>)';

function dato(valor) {
  return valor.startsWith('PENDIENTE') ? `<mark class="pendiente">${valor}</mark>` : valor;
}

/**
 * Recuadro que aparece mientras falte algún dato fiscal. Publicar sin ellos es
 * una infracción de la LSSI sancionable, así que el aviso tiene que verse.
 */
function avisoDatosPendientes() {
  const faltan = datosFiscalesPendientes();
  if (faltan.length === 0) return '';
  return `<div class="aviso-plantilla">
    <strong>No publicar todavía.</strong> Faltan ${faltan.length} datos que la ley obliga a mostrar
    (${faltan.join(', ')}). Se rellenan en <code>src/site/negocio.mjs</code> y se vuelve a generar la web.
    Estos textos siguen las prácticas habituales del comercio electrónico español, pero conviene que
    un asesor los revise contra la actividad real del negocio antes de publicarlos.
  </div>`;
}

function identificacion() {
  const provincia = EMPRESA.provincia.startsWith('PENDIENTE') ? '' : ', ' + EMPRESA.provincia;
  return `<p>
    <strong>Titular:</strong> ${dato(EMPRESA.razonSocial)}<br>
    <strong>Nombre comercial:</strong> ${EMPRESA.nombreComercial}<br>
    <strong>NIF/CIF:</strong> ${dato(EMPRESA.nif)}<br>
    <strong>Domicilio:</strong> ${dato(EMPRESA.domicilio)}${provincia}, ${EMPRESA.pais}<br>
    <strong>Email:</strong> <a href="mailto:${CONTACTO.email}">${CONTACTO.email}</a><br>
    <strong>Teléfono:</strong> ${CONTACTO.telefono}
    ${EMPRESA.registroMercantil ? `<br><strong>Registro mercantil:</strong> ${EMPRESA.registroMercantil}` : ''}
  </p>`;
}

const PIE_REVISION = `<p class="revision">Última revisión: ${REVISADO}.</p>`;

// ---------------------------------------------------------------------------
// Aviso legal
// ---------------------------------------------------------------------------

export function textoAvisoLegal() {
  return `
<h1>Aviso legal</h1>
${avisoDatosPendientes()}

<p>En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la
Información y de Comercio Electrónico (LSSI-CE), se ponen a disposición de los usuarios
los siguientes datos identificativos del titular de este sitio web.</p>

<h2>1. Datos identificativos</h2>
${identificacion()}

<h2>2. Objeto</h2>
<p>Este sitio web ofrece productos textiles y de impresión personalizados —ropa, pegatinas,
rotulación y tarjetas de visita— fabricados bajo pedido, así como una herramienta de diseño
en línea con la que el cliente coloca sus propios archivos sobre la prenda antes de pedirla.</p>

<h2>3. Condiciones de uso</h2>
<p>El acceso a este sitio es gratuito y no exige registro. Al utilizarlo, el usuario se
compromete a hacerlo conforme a la ley, a este aviso legal y a la buena fe, absteniéndose de
cualquier uso que pueda dañar el sitio, impedir su normal funcionamiento o perjudicar a
terceros.</p>

<h2>4. Propiedad intelectual e industrial</h2>
<p>Los textos, el diseño gráfico, el código, las fotografías de producto y la marca
${EMPRESA.nombreComercial} son titularidad del titular del sitio o se utilizan con la
autorización correspondiente. Queda prohibida su reproducción, distribución o transformación
sin autorización escrita, salvo los usos permitidos por la ley.</p>

<h2>5. Diseños aportados por el cliente</h2>
<p>Los archivos, imágenes, logotipos y textos que el cliente sube a la herramienta de diseño
siguen siendo suyos en todo momento. Al enviarlos, el cliente <strong>garantiza que dispone de
los derechos necesarios para reproducirlos</strong> sobre un producto y asume la
responsabilidad exclusiva frente a cualquier reclamación de terceros por derechos de autor,
marcas, derechos de imagen u otros.</p>
<p>Usamos esos archivos únicamente para fabricar el pedido y para enseñarle al propio cliente
cómo queda. No los publicamos, no los cedemos y no los usamos como muestra sin su permiso
expreso.</p>
<p>Nos reservamos el derecho de rechazar, sin coste alguno para el cliente, cualquier encargo
cuyo contenido sea ilícito, incite al odio o a la violencia, resulte injurioso, o vulnere de
forma manifiesta derechos de terceros.</p>

<h2>6. Enlaces</h2>
<p>Si este sitio incluye enlaces a páginas de terceros, no controlamos ni respondemos de sus
contenidos ni de sus políticas. Su inclusión no implica que los recomendemos.</p>

<h2>7. Exclusión de responsabilidad</h2>
<p>Procuramos que la información publicada sea exacta y esté actualizada, pero no podemos
garantizar la ausencia de errores tipográficos ni la disponibilidad ininterrumpida del sitio.
Los precios y plazos publicados son orientativos hasta que se confirman por escrito en el
presupuesto.</p>

<h2>8. Legislación aplicable</h2>
<p>Este aviso legal se rige por la legislación española. Para cualquier controversia serán
competentes los juzgados que correspondan conforme a la normativa aplicable; tratándose de
consumidores, los de su lugar de residencia.</p>

${PIE_REVISION}`;
}

// ---------------------------------------------------------------------------
// Privacidad
// ---------------------------------------------------------------------------

export function textoPrivacidad() {
  const anosFiscales = Math.max(COMERCIAL.aniosGarantia, 4);
  return `
<h1>Política de privacidad</h1>
${avisoDatosPendientes()}

<p>Esta política explica qué datos personales tratamos, para qué, durante cuánto tiempo y qué
puedes hacer al respecto. Está redactada conforme al Reglamento (UE) 2016/679 (RGPD) y a la
Ley Orgánica 3/2018 de Protección de Datos y garantía de los derechos digitales.</p>

<h2>1. Responsable del tratamiento</h2>
${identificacion()}
<p>No hemos designado delegado de protección de datos porque nuestra actividad no se encuentra
entre los supuestos que lo exigen (artículo 37 del RGPD). Para cualquier cuestión sobre tus
datos, escribe a <a href="mailto:${CONTACTO.email}">${CONTACTO.email}</a>.</p>

<h2>2. Qué datos tratamos y de dónde salen</h2>
<p>Solo tratamos los datos que tú nos das. No los compramos, no los sacamos de redes sociales
y no elaboramos perfiles.</p>
<ul>
  <li><strong>Datos de contacto:</strong> nombre y apellidos, email y, si lo facilitas, teléfono.</li>
  <li><strong>Contenido de tu pedido:</strong> producto, color, talla, cantidad, tus notas y los
      <strong>archivos de diseño</strong> que subes. Si un diseño incluye una fotografía de
      personas, esa imagen es un dato personal y la tratamos con la misma reserva que el resto.</li>
  <li><strong>Datos de entrega:</strong> dirección postal, cuando el pedido se envía.</li>
  <li><strong>Datos de facturación:</strong> los que exige la normativa fiscal para emitir la factura.</li>
  <li><strong>Datos de pago:</strong> <em>no los recibimos</em>. Si pagas con tarjeta, los
      introduces directamente en la pasarela de pago; nosotros solo sabemos si el pago se ha
      completado.</li>
</ul>

<h2>3. Para qué los usamos y con qué amparo legal</h2>
<table class="tabla-legal">
  <thead><tr><th>Finalidad</th><th>Base jurídica</th><th>Conservación</th></tr></thead>
  <tbody>
    <tr>
      <td>Preparar el presupuesto y gestionar tu pedido</td>
      <td>Ejecución de un contrato o de medidas precontractuales a petición tuya (art. 6.1.b RGPD)</td>
      <td>Mientras dure la relación comercial</td>
    </tr>
    <tr>
      <td>Responder a las consultas que nos haces</td>
      <td>Tu consentimiento al escribirnos (art. 6.1.a RGPD)</td>
      <td>1 año desde el último mensaje</td>
    </tr>
    <tr>
      <td>Emitir facturas y cumplir con Hacienda</td>
      <td>Obligación legal (art. 6.1.c RGPD)</td>
      <td>${anosFiscales} años (Ley General Tributaria) y 6 años de los libros de comercio (Código de Comercio)</td>
    </tr>
    <tr>
      <td>Atender garantías, devoluciones y reclamaciones</td>
      <td>Obligación legal e interés legítimo en defendernos frente a reclamaciones (art. 6.1.c y 6.1.f RGPD)</td>
      <td>${COMERCIAL.aniosGarantia} años desde la entrega, más los plazos de prescripción aplicables</td>
    </tr>
  </tbody>
</table>

<p><strong>Tus archivos de diseño</strong> se conservan un máximo de 24 meses desde la entrega,
para que puedas repetir el pedido sin volver a mandarlos. Puedes pedirnos que los borremos
antes en cualquier momento, y lo hacemos.</p>

<p>No tomamos decisiones automatizadas que produzcan efectos jurídicos sobre ti, ni te
elaboramos perfiles.</p>

<h2>4. Quién más accede a tus datos</h2>
<p>No vendemos ni cedemos tus datos. Solo acceden a ellos los proveedores estrictamente
necesarios para prestar el servicio, cada uno con su contrato de encargado de tratamiento
(art. 28 RGPD):</p>
<table class="tabla-legal">
  <thead><tr><th>Proveedor</th><th>Para qué</th><th>Dónde</th></tr></thead>
  <tbody>
    <tr><td>Cloudflare, Inc.</td><td>Alojamiento de la web y de los envíos del editor</td><td>UE / EE. UU. con garantías adecuadas</td></tr>
    <tr><td>Resend (Plus Five Five, Inc.)</td><td>Envío de los correos de pedido</td><td>UE / EE. UU. con garantías adecuadas</td></tr>
    <tr><td>Stripe Payments Europe, Ltd.</td><td>Cobro con tarjeta, cuando se usa</td><td>Irlanda (UE)</td></tr>
    <tr><td>Empresa de transporte</td><td>Entrega del pedido</td><td>España</td></tr>
    <tr><td>Asesoría y administración</td><td>Obligaciones contables y fiscales</td><td>España</td></tr>
  </tbody>
</table>
<p>Cuando algún proveedor trata datos fuera del Espacio Económico Europeo, la transferencia se
ampara en las cláusulas contractuales tipo aprobadas por la Comisión Europea o en una decisión
de adecuación. Puedes pedirnos copia de esas garantías.</p>
<p>Además, cederemos tus datos a las administraciones públicas, jueces y tribunales cuando una
norma nos obligue.</p>

<h2>5. Tus derechos</h2>
<p>Puedes ejercer en cualquier momento, y gratuitamente, los derechos de:</p>
<ul>
  <li><strong>Acceso:</strong> saber qué datos tuyos tenemos.</li>
  <li><strong>Rectificación:</strong> corregir los que sean inexactos.</li>
  <li><strong>Supresión:</strong> que los borremos cuando ya no sean necesarios.</li>
  <li><strong>Oposición:</strong> pedirnos que dejemos de tratarlos por motivos de tu situación particular.</li>
  <li><strong>Limitación:</strong> que los conservemos pero no los usemos, mientras se resuelve una reclamación.</li>
  <li><strong>Portabilidad:</strong> recibir tus datos en un formato que puedas llevarte.</li>
  <li><strong>Retirar tu consentimiento</strong> en cualquier momento, sin que ello afecte al tratamiento anterior.</li>
</ul>
<p>Escríbenos a <a href="mailto:${CONTACTO.email}">${CONTACTO.email}</a> indicando qué derecho
quieres ejercer. Te responderemos en el plazo máximo de un mes. Podemos pedirte que acredites
tu identidad, únicamente para asegurarnos de que no le entregamos tus datos a otra persona.</p>
<p>Si crees que no hemos atendido bien tu solicitud, puedes reclamar ante ${AEPD}, aunque te
agradeceríamos que nos lo dijeras antes para intentar resolverlo.</p>

<h2>6. Seguridad</h2>
<p>La web se sirve íntegramente cifrada (HTTPS). Los archivos que subes al editor se procesan
<strong>en tu propio navegador</strong>: solo salen de tu dispositivo cuando pulsas el botón de
enviar. El acceso a los pedidos está restringido a las personas que los tramitan.</p>
<p>Si llegara a producirse una brecha de seguridad que suponga un riesgo alto para tus derechos,
te lo comunicaríamos sin dilación indebida, además de notificarlo a la autoridad de control.</p>

<h2>7. Menores</h2>
<p>Este sitio no está dirigido a menores de 14 años. Si eres menor de esa edad, necesitas que
un padre, madre o tutor haga el pedido por ti.</p>

<h2>8. Cambios en esta política</h2>
<p>Si cambiamos de proveedores o de forma de trabajar, actualizaremos esta política y cambiaremos
la fecha de revisión. Los cambios importantes se avisan además por email a los clientes activos.</p>

${PIE_REVISION}`;
}

// ---------------------------------------------------------------------------
// Cookies
// ---------------------------------------------------------------------------

export function textoCookies() {
  return `
<h1>Política de cookies</h1>

<div class="destacado-legal">
  <strong>Resumen honesto: esta web no usa cookies.</strong> Ni propias, ni de terceros, ni de
  analítica, ni publicitarias. Tampoco cargamos tipografías, mapas ni vídeos de otros servicios,
  así que tu visita no se comparte con nadie. Por eso no verás ningún cartel pidiéndote permiso:
  no tendríamos nada que pedirte.
</div>

<h2>1. Qué es una cookie</h2>
<p>Una cookie es un pequeño archivo que una web guarda en tu dispositivo para reconocerte en
visitas posteriores. Junto a las cookies existen otras formas de almacenamiento local con las
que se puede hacer lo mismo, como <code>localStorage</code> o <code>IndexedDB</code>. La
normativa (artículo 22.2 de la LSSI-CE) las trata a todas por igual.</p>

<h2>2. Qué guardamos exactamente</h2>
<p>Solo una cosa, y únicamente si usas el editor de diseño:</p>
<table class="tabla-legal">
  <thead><tr><th>Nombre</th><th>Tipo</th><th>Para qué sirve</th><th>Cuánto dura</th></tr></thead>
  <tbody>
    <tr>
      <td><code>kamusino-editor</code></td>
      <td>Almacenamiento local (IndexedDB), propio</td>
      <td>Guardar en tu navegador el diseño que estás montando, para que no lo pierdas si
          recargas la página o se te cierra sin querer.</td>
      <td>7 días, o hasta que envías el pedido</td>
    </tr>
  </tbody>
</table>

<h2>3. Por qué no te pedimos permiso para eso</h2>
<p>El artículo 22.2 de la LSSI-CE exime del consentimiento al almacenamiento
<em>estrictamente necesario para prestar un servicio expresamente solicitado por el usuario</em>.
Guardar el diseño que estás haciendo es justo eso: sin ello, el editor no podría cumplir lo que
le has pedido. No se usa para reconocerte, ni para medir, ni para publicidad, y
<strong>nunca sale de tu dispositivo</strong>: nosotros no podemos leerlo.</p>

<h2>4. Cómo borrarlo</h2>
<p>Se borra solo al enviar el pedido, y a los 7 días si no lo envías. Si quieres eliminarlo
antes, basta con borrar los datos de navegación de este sitio en tu navegador:</p>
<ul>
  <li><strong>Chrome y Edge:</strong> Configuración → Privacidad y seguridad → Datos de sitios.</li>
  <li><strong>Firefox:</strong> Ajustes → Privacidad y seguridad → Cookies y datos del sitio.</li>
  <li><strong>Safari:</strong> Preferencias → Privacidad → Gestionar datos de sitios web.</li>
</ul>
<p>También puedes usar una ventana privada: al cerrarla no queda nada.</p>

<h2>5. Si esto cambia</h2>
<p>Si en el futuro añadimos analítica o cualquier herramienta de terceros, aparecerá un aviso
antes de instalar nada, con un botón de <strong>rechazar tan visible y tan fácil de pulsar como
el de aceptar</strong>, tal y como exige la guía de cookies de la Agencia Española de Protección
de Datos. Hasta entonces, no hay nada que consentir.</p>

${PIE_REVISION}`;
}

// ---------------------------------------------------------------------------
// Condiciones de contratación
// ---------------------------------------------------------------------------

export function textoCondiciones() {
  return `
<h1>Condiciones de contratación</h1>
${avisoDatosPendientes()}

<p>Estas condiciones regulan la compra de productos personalizados a través de
${DOMINIO.replace('https://', '')}. Al confirmar un pedido, aceptas su contenido. Te
recomendamos guardarlas o imprimirlas.</p>

<h2>1. Quién vende</h2>
${identificacion()}

<h2>2. Qué se vende</h2>
<p>Productos textiles y de impresión personalizados según las especificaciones de cada cliente:
ropa, pegatinas, rotulación y tarjetas de visita. Cada producto se fabrica <strong>bajo pedido y
a medida</strong>; no hay stock de producto terminado.</p>

<h2>3. Cómo se hace un pedido</h2>
<ol class="pasos-legales">
  <li><strong>Diseñas.</strong> Eliges el producto, el color, la talla y la cantidad, y colocas
      tus archivos sobre la prenda en el editor.</li>
  <li><strong>Nos lo envías.</strong> Rellenas tus datos de contacto y aceptas estas condiciones.
      Recibes al momento un correo con tu <strong>referencia de pedido</strong>. Este paso
      <em>no</em> es todavía una compra: es una solicitud de presupuesto.</li>
  <li><strong>Te presupuestamos.</strong> Revisamos que los archivos sirvan para imprimir y te
      respondemos con el precio final, el plazo y la forma de pago.</li>
  <li><strong>Confirmas.</strong> Solo cuando aceptas el presupuesto por escrito queda cerrado
      el contrato de compraventa.</li>
  <li><strong>Producimos y enviamos.</strong> Fabricamos el pedido y te avisamos al expedirlo.</li>
</ol>
<p>Mientras no completes el paso 4, no se produce nada y no se te cobra nada.</p>

<h2>4. Precios e impuestos</h2>
<p>Los precios que figuran en la web están en euros e incluyen el ${COMERCIAL.ivaPorcentaje}% de
IVA. Son orientativos y corresponden a la unidad sin personalizar: el precio final depende de la
cantidad, del número de tintas y del tamaño de la estampación, y se confirma siempre en el
presupuesto antes de que aceptes nada.</p>
<p>Los productos marcados como «presupuesto a medida» no tienen precio publicado porque depende
enteramente de las medidas y del acabado.</p>

<h2>5. Gastos de envío</h2>
<p>El envío a península cuesta ${COMERCIAL.gastosEnvio.toFixed(2).replace('.', ',')} € y es
<strong>gratuito a partir de ${COMERCIAL.envioGratisDesde} €</strong>. Los envíos a Baleares,
Canarias, Ceuta y Melilla se presupuestan aparte; en Canarias, Ceuta y Melilla pueden aplicarse
además impuestos y trámites de aduana que corren por cuenta del cliente.</p>

<h2>6. Formas de pago</h2>
<p>Se acuerdan al confirmar el presupuesto. Habitualmente: transferencia bancaria, Bizum o
tarjeta a través de una pasarela de pago segura. <strong>En ningún caso recibimos ni almacenamos
los datos de tu tarjeta</strong>: los introduces directamente en la pasarela.</p>
<p>Para pedidos de cierto volumen podemos solicitar un anticipo antes de empezar a producir,
que se indicará siempre en el presupuesto.</p>

<h2>7. Plazos</h2>
<p>La producción tarda ${COMERCIAL.plazoProduccionDias} desde que confirmas el presupuesto y,
si procede, se recibe el pago o el anticipo. El transporte añade ${COMERCIAL.plazoEntregaDias}.
Los plazos se cuentan en días laborables y pueden verse afectados en campañas de mucha demanda,
en cuyo caso te avisaremos antes.</p>
<p>Si no pudiéramos cumplir el plazo comprometido, te lo comunicaremos y podrás elegir entre
esperar o cancelar el pedido con devolución íntegra de lo pagado.</p>

<h2>8. Tus diseños</h2>
<p>Al enviarnos un archivo garantizas que tienes derecho a reproducirlo. Nos reservamos el
derecho de rechazar, sin coste para ti, encargos con contenido ilícito, que inciten al odio o a
la violencia, o que vulneren de forma manifiesta derechos de terceros.</p>
<p>La estampación reproduce el archivo tal como lo has colocado. Si la resolución es baja, el
editor te avisa antes de enviarlo y volvemos a advertírtelo en el presupuesto; si aun así
decides seguir adelante, el resultado impreso no se considera defectuoso.</p>
<p>Los colores en pantalla y los colores impresos nunca coinciden al cien por cien, porque cada
pantalla y cada tejido los reproducen de forma distinta. Si necesitas un color exacto, dínoslo
y te mandamos una muestra física antes de producir.</p>

<h2>9. Garantía legal</h2>
<p>Como consumidor, dispones de una garantía legal de conformidad de
<strong>${COMERCIAL.aniosGarantia} años</strong> desde la entrega (Real Decreto Legislativo
7/2021). Si el producto no es conforme con lo pedido, tienes derecho a su reparación o
sustitución y, si esto no fuera posible o proporcionado, a una rebaja del precio o a resolver el
contrato.</p>

<h2>10. Desistimiento</h2>
<p>La regla general son ${COMERCIAL.diasDesistimiento} días naturales para desistir, pero los
productos personalizados están excluidos por ley. Lo explicamos en detalle, junto con el
formulario oficial, en <a href="/devoluciones/">Devoluciones y desistimiento</a>.</p>

<h2>11. Atención al cliente y reclamaciones</h2>
<p>Para cualquier incidencia escribe a <a href="mailto:${CONTACTO.email}">${CONTACTO.email}</a>
indicando tu referencia de pedido. Disponemos de hojas oficiales de reclamación a disposición
de los consumidores.</p>

<h2>12. Resolución de litigios en línea</h2>
<p>Conforme al Reglamento (UE) 524/2013, te informamos de que la Comisión Europea pone a tu
disposición una plataforma de resolución de litigios en línea:
<a href="https://ec.europa.eu/consumers/odr/" rel="nofollow noopener" target="_blank">ec.europa.eu/consumers/odr</a>.
En todo caso, preferimos que nos escribas primero: casi todo se arregla en un correo.</p>

<h2>13. Legislación y jurisdicción</h2>
<p>Estas condiciones se rigen por la legislación española. En los contratos con consumidores,
serán competentes los juzgados y tribunales del domicilio del consumidor.</p>

<h2>14. Nulidad parcial</h2>
<p>Si alguna de estas cláusulas fuera declarada nula, el resto seguirá siendo plenamente válido.</p>

${PIE_REVISION}`;
}

// ---------------------------------------------------------------------------
// Devoluciones
// ---------------------------------------------------------------------------

export function textoDevoluciones() {
  return `
<h1>Devoluciones y desistimiento</h1>
${avisoDatosPendientes()}

<div class="destacado-legal">
  <strong>Lo que hay que saber, en dos líneas:</strong> un producto personalizado con tu diseño no
  se puede devolver por arrepentimiento, porque no se lo podemos vender a nadie más. Un producto
  defectuoso o distinto de lo que pediste sí, siempre, y lo arreglamos nosotros.
</div>

<h2>1. Derecho de desistimiento</h2>
<p>Como consumidor tienes, con carácter general, ${COMERCIAL.diasDesistimiento} días naturales
desde que recibes el pedido para desistir de la compra sin tener que justificarlo
(artículos 68 y siguientes del Real Decreto Legislativo 1/2007).</p>

<h2>2. Cuándo no se aplica: productos personalizados</h2>
<p><strong>Los productos confeccionados conforme a tus especificaciones o claramente
personalizados quedan excluidos del derecho de desistimiento</strong>, según el
<strong>artículo 103.c) del RDL 1/2007</strong>. Esto abarca la mayor parte de nuestro catálogo:
una camiseta con tu logotipo, unas pegatinas con tus medidas o unas tarjetas con tus datos no
tienen ningún otro comprador posible.</p>
<p>Te lo recordamos siempre por escrito en el presupuesto, antes de que confirmes nada, para que
no haya sorpresas.</p>
<p>Sí puedes desistir de los productos que no lleven ninguna personalización, siempre que los
devuelvas sin usar y en su embalaje original.</p>

<h2>3. Cómo desistir cuando sí procede</h2>
<p>Basta con que nos comuniques tu decisión de forma inequívoca antes de que acaben los
${COMERCIAL.diasDesistimiento} días: un correo a
<a href="mailto:${CONTACTO.email}">${CONTACTO.email}</a> con tu referencia de pedido es
suficiente. También puedes usar el formulario del apartado 7, aunque no es obligatorio.</p>
<p>Los gastos directos de la devolución corren por tu cuenta. Te devolveremos todo lo pagado,
incluidos los gastos de envío estándar, <strong>en un plazo máximo de 14 días naturales</strong>
desde que nos comunicas el desistimiento, por el mismo medio de pago que usaste. Podemos retener
el reembolso hasta recibir el producto o hasta que nos acredites que lo has enviado.</p>

<h2>4. Producto defectuoso o equivocado</h2>
<p>Esto no es una devolución por arrepentimiento y aquí sí respondemos siempre. Si el pedido
llega dañado, con un defecto de fabricación, con la estampación mal colocada respecto a lo que
aprobaste o con un producto distinto del que pediste:</p>
<ol class="pasos-legales">
  <li>Escríbenos en cuanto lo veas, con tu referencia de pedido.</li>
  <li>Mándanos una foto del problema y, si es un fallo de embalaje, del paquete.</li>
  <li>Te decimos si hace falta que nos lo devuelvas. <strong>El envío de vuelta lo pagamos
      nosotros.</strong></li>
  <li>Repetimos el pedido sin coste o te devolvemos el importe, como prefieras.</li>
</ol>
<p>Este derecho está cubierto por la garantía legal de ${COMERCIAL.aniosGarantia} años.</p>

<h2>5. Errores al hacer el pedido</h2>
<p>Si te has equivocado de talla, de color o de archivo, dínoslo cuanto antes: mientras no
hayamos empezado a producir, lo cambiamos sin coste. Una vez estampada la prenda, ya no se puede
deshacer.</p>

<h2>6. Diferencias de color</h2>
<p>Una diferencia de tono entre lo que viste en pantalla y lo impreso no se considera un
defecto: cada pantalla y cada tejido reproducen el color de forma distinta. Si necesitas un
color exacto, pídenos una muestra física antes de producir y te la mandamos.</p>

<h2>7. Formulario de desistimiento</h2>
<p>Solo tienes que usar este formulario si deseas desistir del contrato en los casos en que
procede. Puedes copiarlo y mandárnoslo por correo electrónico.</p>

<div class="formulario-legal">
<p><em>(Cumplimente y envíe este formulario solo si desea desistir del contrato)</em></p>
<p>
A la atención de ${dato(EMPRESA.razonSocial)},<br>
${dato(EMPRESA.domicilio)},<br>
${CONTACTO.email}
</p>
<p>
Por la presente le comunico que desisto de mi contrato de venta del siguiente bien:<br>
_______________________________________________________________
</p>
<p>
Referencia del pedido: ______________________<br>
Pedido el: ____ / ____ / ________ &nbsp;·&nbsp; Recibido el: ____ / ____ / ________<br>
Nombre del consumidor: _______________________________________<br>
Domicilio del consumidor: ____________________________________<br>
Firma del consumidor <em>(solo si se presenta en papel)</em>: ______________<br>
Fecha: ____ / ____ / ________
</p>
</div>

<h2>8. Reclamaciones</h2>
<p>Si no quedas conforme con nuestra respuesta, disponemos de hojas oficiales de reclamación y
puedes acudir a la plataforma europea de resolución de litigios en línea:
<a href="https://ec.europa.eu/consumers/odr/" rel="nofollow noopener" target="_blank">ec.europa.eu/consumers/odr</a>.</p>

${PIE_REVISION}`;
}
