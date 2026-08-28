// Contenido que puede posicionar por sí solo.
//
// Un dominio recién registrado no tiene historial: lo único que lo hace
// aparecer en Google es responder mejor que nadie a lo que la gente escribe en
// el buscador. Las fichas de producto no sirven para eso —todas las tiendas
// tienen la misma camiseta Gildan—, así que estas páginas cubren las búsquedas
// que traen a alguien que ya quiere comprar:
//
//   «camisetas para despedida de soltera», «ropa de trabajo personalizada»,
//   «cuánto cuesta personalizar una camiseta», «vinilo o serigrafía»,
//   «qué resolución necesita un diseño para imprimir»…
//
// Cada una está escrita para resolver de verdad la duda, no para meter la
// palabra clave. Lo que se afirma sobre el taller sale de `CAPACIDADES` en
// `negocio.mjs`, para no inventarse plazos ni técnicas.

import { CAPACIDADES, COMERCIAL, CONTACTO, LIMITES } from './negocio.mjs';

const euros = (n) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const tecnicas = () => CAPACIDADES.tecnicas.filter((t) => t.activa);
const minimoDe = (id) => tecnicas().find((t) => t.id === id)?.minimo ?? 1;

const CTA = `
<div class="cta-guia">
  <div>
    <strong>Pruébalo tú mismo</strong>
    <span>Sube tu diseño, colócalo sobre la prenda y mira cómo queda. No hace falta registrarse.</span>
  </div>
  <a class="boton-primario" href="/personalizar/">Abrir el editor</a>
</div>`;

function tablaTecnicas() {
  const filas = tecnicas().map((t) => `<tr>
    <th scope="row">${t.nombre}</th>
    <td>${t.minimo === 1 ? '1 unidad' : `desde ${t.minimo}`}</td>
    <td>${t.colores}</td>
    <td>${t.ideal}</td>
    <td>${t.durabilidad}</td>
  </tr>`).join('');

  return `<div class="envoltura-tabla"><table class="tabla-guia">
    <thead><tr>
      <th scope="col">Técnica</th><th scope="col">Cantidad mínima</th>
      <th scope="col">Colores</th><th scope="col">Para qué va bien</th>
      <th scope="col">Aguante</th>
    </tr></thead>
    <tbody>${filas}</tbody>
  </table></div>`;
}

// ---------------------------------------------------------------------------

export const GUIAS = [
  {
    slug: 'camisetas-despedida-soltera',
    titulo: 'Camisetas para despedidas',
    tituloPagina: 'Camisetas para despedidas de soltero y soltera',
    descripcion: 'Cuántas pedir, con cuánta antelación, qué colores salen bien en las fotos y cuánto cuesta un grupo de diez o quince camisetas personalizadas.',
    resumen: 'El grupo con la misma camiseta y la novia o el novio con la suya distinta. Lo típico, hecho bien.',
    preguntas: [
      {
        pregunta: '¿Con cuánta antelación hay que pedir las camisetas de una despedida?',
        respuesta: `Con ${CAPACIDADES.avisoEventos} de margen vas sobrado. La producción tarda ${COMERCIAL.plazoProduccionDias} y el transporte ${COMERCIAL.plazoEntregaDias}; el resto es colchón para poder ver el diseño antes de que se imprima.`,
      },
      {
        pregunta: '¿Puedo pedir tallas distintas en el mismo pedido?',
        respuesta: 'Sí. Se mezclan tallas y colores sin coste añadido; lo único que tiene que ser igual es el diseño que se estampa.',
      },
      {
        pregunta: '¿Podéis hacer una camiseta distinta para la novia?',
        respuesta: 'Sí, y es lo más pedido: el grupo con un diseño y la protagonista con otro texto o con otro color de prenda. Se indica en las notas del pedido.',
      },
    ],
    cuerpo: () => `
<p class="entradilla-guia">La camiseta de la despedida se hace una vez, se lleva un día y sale en
todas las fotos del fin de semana. Vale la pena dedicarle diez minutos.</p>

<h2>Cuántas pedir</h2>
<p>Cuenta las confirmaciones y añade una. Siempre aparece alguien de última hora, y una camiseta de
más cuesta mucho menos que un pedido urgente de una sola unidad tres días antes.</p>
<p>Si hay dudas con alguna talla, tira hacia arriba: una camiseta grande se ata o se anuda para la
foto, y una pequeña no hay manera de arreglarla.</p>

<h2>Cuándo pedirlas</h2>
<p>Con <strong>${CAPACIDADES.avisoEventos}</strong> vas de sobra. La cuenta es esta:</p>
<ul>
  <li>Nos mandas el diseño y te respondemos con el presupuesto.</li>
  <li>Producción: ${COMERCIAL.plazoProduccionDias}.</li>
  <li>Transporte: ${COMERCIAL.plazoEntregaDias}.</li>
</ul>
<p>El resto del margen es para que puedas mirar el diseño con calma y cambiar lo que no te convenza
<em>antes</em> de que se estampe. Después ya no se puede deshacer.</p>

<h2>Qué funciona y qué no</h2>
<h3>El color de la prenda</h3>
<p>En fotos de exterior, con sol, las camisetas de color plano —negro, azul marino, rojo, verde
botella— destacan mucho más que las blancas, que tienden a quemarse. Si la despedida es de noche o
en interior, al revés: los colores claros se ven y los oscuros se comen.</p>
<p>El truco de siempre: <strong>una camiseta de otro color para la protagonista</strong>. Se
distingue en cualquier foto, incluso de lejos, y cuesta lo mismo.</p>

<h3>El diseño</h3>
<p>Los que mejor envejecen son los más simples: un texto grande delante y el mote de cada uno
detrás. Los diseños recargados se leen fatal en una foto de grupo y encarecen el pedido sin que se
note.</p>
<p>Si vas a poner una foto, que sea la original del móvil, no una descargada de un chat: por
WhatsApp la imagen pierde resolución y al ampliarla a 30 cm se ve pixelada.
<a href="/preparar-tu-diseno/">Te lo explicamos en detalle aquí</a>, y el editor te avisa si la que
has subido no da.</p>

<h3>El texto de detrás</h3>
<p>Los motes funcionan mejor que los nombres, y una sola línea grande mejor que tres pequeñas. Si
cada camiseta lleva un texto distinto, mándanos la lista en las notas del pedido: no hace falta que
hagas un diseño por persona.</p>

${CTA}

<h2>Cuánto cuesta</h2>
<p>Una camiseta de nuestro catálogo parte de ${euros(12)} con IVA, y el precio por unidad baja a
partir de ${CAPACIDADES.tramosCantidad[1]} prendas. Un grupo de doce con estampación delante y
detrás está en el rango habitual de una despedida; te pasamos el número exacto antes de que
confirmes nada. <a href="/precios/">Aquí desglosamos de qué depende el precio</a>.</p>
<p>El envío cuesta ${euros(COMERCIAL.gastosEnvio)} y es gratis a partir de
${euros(COMERCIAL.envioGratisDesde)}, así que en un pedido de grupo no lo vas a pagar.</p>

<h2>Antes de cerrar el pedido</h2>
<ul class="repaso">
  <li>Repasa los nombres y los motes. Una errata estampada ya no se quita.</li>
  <li>Confirma la lista de tallas con el grupo, no de memoria.</li>
  <li>Si la fecha es innegociable, dínoslo: lo tenemos en cuenta al darte el plazo.</li>
</ul>
<p>Ten en cuenta que una prenda personalizada <a href="/devoluciones/">no se puede devolver</a> por
arrepentimiento —no tiene otro comprador posible—, así que el rato que dediques a revisar el diseño
es el que de verdad ahorra disgustos.</p>`,
  },

  {
    slug: 'ropa-de-trabajo-personalizada',
    titulo: 'Ropa de trabajo y uniformes',
    tituloPagina: 'Ropa de trabajo y uniformes personalizados',
    descripcion: 'Bordado o estampado para ropa de uso diario, dónde colocar el logo, cómo reponer prendas sueltas meses después y qué necesitas para facturar con IVA.',
    resumen: 'Ropa que se lava dos veces por semana durante años. Los criterios cambian bastante respecto a una camiseta de evento.',
    preguntas: [
      {
        pregunta: '¿Bordado o estampado para ropa de trabajo?',
        respuesta: 'Bordado si la prenda se lava mucho y quieres que aguante años: es lo que más dura y da mejor imagen en polos y chaquetas. Estampado si el logo tiene degradados o muchos colores, que el hilo no reproduce bien.',
      },
      {
        pregunta: '¿Puedo pedir más prendas sueltas meses después?',
        respuesta: 'Sí. Guardamos el diseño hasta 24 meses desde la entrega, así que para reponer basta con indicar la referencia del pedido y cuántas prendas hacen falta.',
      },
      {
        pregunta: '¿Emitís factura con IVA?',
        respuesta: 'Sí, con todos los datos fiscales para que se pueda deducir. Hay que indicar la razón social y el CIF al confirmar el pedido.',
      },
    ],
    cuerpo: () => `
<p class="entradilla-guia">Una camiseta de evento se pone un día. Un uniforme se lava dos veces por
semana durante tres años. Casi todas las decisiones cambian.</p>

<h2>Bordado o estampado</h2>
<p>Es la primera decisión y la que más se nota con el tiempo.</p>
<div class="comparativa">
  <div>
    <h3>Bordado</h3>
    <p>Es lo que aguanta. La prenda se rompe antes que el bordado, y da un acabado que se lee como
    caro en polos, chaquetas y gorras. A cambio, el hilo no hace degradados finos: un logo con
    muchos tonos hay que simplificarlo.</p>
    <p class="dato">Desde ${minimoDe('bordado')} prendas</p>
  </div>
  <div>
    <h3>Estampado</h3>
    <p>Reproduce cualquier color y cualquier degradado, y sale a cuenta en pocas unidades. Aguanta
    bien si se lava del revés y en frío, pero en una prenda de uso diario se nota antes que el
    bordado.</p>
    <p class="dato">Desde 1 prenda</p>
  </div>
</div>
<p>La combinación que mejor resultado da: <strong>bordado pequeño en el pecho y estampado grande en
la espalda</strong>. El pecho es lo que se ve en el trato con el cliente y lo que más se roza; la
espalda es donde cabe el nombre del negocio y el teléfono.
<a href="/tecnicas-de-estampacion/">Comparamos las cinco técnicas aquí</a>.</p>

<h2>Dónde poner el logo</h2>
<ul>
  <li><strong>Pecho izquierdo</strong>, de 8 a 10 cm de ancho. Es el sitio de siempre y el que
  mejor queda con cualquier talla.</li>
  <li><strong>Espalda completa</strong>, de 25 a 30 cm. Para el nombre del negocio y el teléfono:
  se lee a distancia, que es de lo que se trata.</li>
  <li><strong>Manga</strong>, de 6 a 8 cm. Bien para un segundo elemento, no para el principal.</li>
</ul>
<p>Un consejo que ahorra dinero: pon el teléfono <em>o</em> la web, no los dos. Dos líneas de texto
pequeño a distancia no las lee nadie.</p>

${CTA}

<h2>Reponer prendas sueltas</h2>
<p>Es lo que más se agradece meses después. Guardamos el diseño <strong>24 meses desde la
entrega</strong>, así que para pedir tres camisetas más porque ha entrado gente nueva basta con
darnos la referencia del pedido. No hay que volver a mandar el logo ni a repetir la prueba, y la
estampación sale idéntica a la primera.</p>
<p>Si quieres que lo guardemos más tiempo, dínoslo. Y si prefieres que lo borremos, también: basta
con escribir a <a href="mailto:${CONTACTO.email}">${CONTACTO.email}</a>.</p>

<h2>Tallaje de un equipo</h2>
<p>Pide las tallas por escrito, nunca de memoria ni «a ojo». Lo que funciona es una lista con el
nombre de cada persona al lado de su talla, y guardarla: cuando entre alguien nuevo tendrás la
referencia de qué le va bien a quién.</p>
<p>${CAPACIDADES.mezclarTallas
    ? 'Se pueden mezclar tallas y colores en el mismo pedido sin coste añadido.'
    : 'Consúltanos si necesitas mezclar tallas y colores en el mismo pedido.'}</p>

<h2>Facturación</h2>
<p>Emitimos factura con IVA (${COMERCIAL.ivaPorcentaje}%) y todos los datos fiscales, para que la
puedas deducir. Indícanos la razón social y el CIF al confirmar el presupuesto, no después: cambiar
los datos de una factura ya emitida es más lío del que parece.</p>
<p>Los productos personalizados tienen la misma <a href="/condiciones-de-contratacion/">garantía
legal de ${COMERCIAL.aniosGarantia} años</a> que cualquier otra compra. Si una costura se abre o la
estampación se despega antes de tiempo, lo cubrimos.</p>`,
  },

  {
    slug: 'camisetas-para-eventos-y-equipos',
    titulo: 'Camisetas para eventos y equipos',
    tituloPagina: 'Camisetas para eventos, ferias y equipos deportivos',
    descripcion: 'Plazos cuando hay una fecha que no se mueve, cómo repartir tallas en un grupo grande y qué prenda elegir para una feria de tres días o para jugar.',
    resumen: 'Cuando hay una fecha fija en el calendario, el plazo deja de ser una estimación y pasa a ser el dato más importante del pedido.',
    preguntas: [
      {
        pregunta: '¿Cuánto tardan unas camisetas para una feria o un evento?',
        respuesta: `La producción tarda ${COMERCIAL.plazoProduccionDias} desde la confirmación, más ${COMERCIAL.plazoEntregaDias} de transporte. Con ${CAPACIDADES.avisoEventos} de antelación se llega con margen incluso si hay que cambiar algo del diseño.`,
      },
      {
        pregunta: '¿Qué camiseta va mejor para hacer deporte?',
        respuesta: 'Una técnica de poliéster, no de algodón: seca antes y pesa menos mojada. Para poliéster claro la sublimación es la mejor opción, porque la tinta se mete en la fibra y no se nota al tacto ni se cuartea.',
      },
    ],
    cuerpo: () => `
<p class="entradilla-guia">La diferencia entre un pedido de evento y cualquier otro es que la fecha
no se negocia. Todo lo demás se organiza alrededor de eso.</p>

<h2>El plazo, primero</h2>
<p>Cuenta hacia atrás desde el día del evento:</p>
<ol class="pasos-guia">
  <li><strong>Transporte:</strong> ${COMERCIAL.plazoEntregaDias}.</li>
  <li><strong>Producción:</strong> ${COMERCIAL.plazoProduccionDias}.</li>
  <li><strong>Revisión del diseño:</strong> un par de días, para poder cambiar algo sin agobios.</li>
</ol>
<p>Total recomendado: <strong>${CAPACIDADES.avisoEventos}</strong>. Si vas más justo, dínoslo al
mandar el diseño y te decimos en el momento si llegamos. Preferimos decirte que no llegamos a
decirte que sí y fallarte.</p>

<h2>Qué prenda elegir</h2>
<h3>Feria o stand</h3>
<p>Polo o camiseta de algodón en el color corporativo. Se lleva ocho horas de pie hablando con
gente: prima que sea cómoda y que el logo se lea de frente desde tres metros.</p>
<p>Si son varios días, calcula <strong>una prenda por persona y día</strong>. Nadie quiere repetir
camiseta en una feria.</p>

<h3>Equipo deportivo</h3>
<p>Camiseta técnica de poliéster, no de algodón: seca antes y no pesa cuando se moja. Sobre
poliéster claro, la sublimación es la mejor opción —la tinta se mete en la fibra, así que no se
nota al tacto ni se cuartea con el roce.</p>
<p>Los dorsales van en vinilo, que permite un número distinto en cada prenda sin encarecer el
pedido.</p>

<h3>Carrera, quedada o asociación</h3>
<p>Camiseta de algodón en color plano. Es la que la gente se acaba quedando de recuerdo, así que
gana el diseño bonito sobre el diseño informativo: el año y el nombre del evento envejecen bien,
un patrocinador gigante en el pecho no.</p>

${CTA}

<h2>Repartir las tallas en un grupo grande</h2>
<p>El reparto que funciona en un grupo mixto, cuando no puedes preguntar una por una:</p>
<div class="envoltura-tabla"><table class="tabla-guia">
  <thead><tr><th scope="col">Talla</th><th scope="col">Proporción orientativa</th></tr></thead>
  <tbody>
    <tr><th scope="row">S</th><td>15%</td></tr>
    <tr><th scope="row">M</th><td>30%</td></tr>
    <tr><th scope="row">L</th><td>30%</td></tr>
    <tr><th scope="row">XL</th><td>18%</td></tr>
    <tr><th scope="row">2XL y superiores</th><td>7%</td></tr>
  </tbody>
</table></div>
<p>Es un punto de partida, no una ley: si conoces al grupo, pregunta. Y si sobra alguna, que sobren
de las grandes.</p>

<h2>Un solo diseño para todo el pedido</h2>
<p>Lo que abarata un pedido de evento no es la cantidad de prendas, es que todas lleven
<strong>la misma estampación</strong>. Cambiar el nombre en cada una se puede hacer, pero es otro
trabajo y otro precio. Si necesitas nombres individuales, mándanos la lista y te decimos cuánto
suma.</p>`,
  },

  {
    slug: 'ropa-personalizada-colegios',
    titulo: 'Colegios, AMPA y fin de curso',
    tituloPagina: 'Ropa personalizada para colegios, AMPA y fin de curso',
    descripcion: 'Camisetas de fin de curso para firmar, tallaje infantil, pedidos agrupados de un AMPA y qué tener en cuenta cuando la ropa la va a llevar un niño.',
    resumen: 'Tallaje infantil, pedidos agrupados y la camiseta blanca de fin de curso que se firma entre todos.',
    preguntas: [
      {
        pregunta: '¿Qué camiseta va bien para firmar en fin de curso?',
        respuesta: 'Una blanca de algodón, que es sobre la que mejor agarra el rotulador permanente. Conviene dejar la espalda libre de estampación: es donde se firma.',
      },
      {
        pregunta: '¿Cómo se organiza un pedido de un AMPA?',
        respuesta: 'Una sola persona recoge la lista de nombres y tallas y hace un único pedido. Sale más barato que pedidos sueltos, se envía a una dirección y se reparte allí.',
      },
    ],
    cuerpo: () => `
<p class="entradilla-guia">Hay dos encargos muy distintos que llegan de un colegio: la camiseta de
fin de curso, que se firma y se guarda, y la ropa del día a día, que tiene que aguantar el patio.</p>

<h2>Camisetas de fin de curso</h2>
<p>La que se firma entre todos y acaba en un cajón durante veinte años. Tres cosas que marcan la
diferencia:</p>
<ul>
  <li><strong>Blanca y de algodón.</strong> Es sobre lo que mejor agarra el rotulador permanente. En
  poliéster la tinta se corre, y en color oscuro no se lee.</li>
  <li><strong>Deja la espalda libre.</strong> Estampa delante —el curso, el año, la mascota de la
  clase— y guarda la espalda entera para las firmas. Es el error más habitual.</li>
  <li><strong>Una talla más.</strong> Se la ponen encima de la ropa el último día y muchos la
  quieren guardar. Que quede holgada no es un problema.</li>
</ul>

<h2>Tallaje infantil</h2>
<p>Las tallas de niño van por edad, pero un niño de ocho años puede llevar cómodamente una 8 o una
10 según cómo esté. La recomendación es sencilla: <strong>ante la duda, la siguiente</strong>. Una
camiseta grande se lleva igual; una pequeña no se puede usar.</p>
<p>Si el pedido es de un curso entero, pide la talla a cada familia por escrito. Es más trabajo una
vez y ahorra veinte conversaciones después.</p>

${CTA}

<h2>Pedidos de un AMPA</h2>
<p>Lo que mejor funciona, con diferencia, es que <strong>una sola persona centralice</strong>:</p>
<ol class="pasos-guia">
  <li>Recoge nombres y tallas en una lista, con una fecha de cierre clara.</li>
  <li>Haz un único pedido con todas las prendas. El precio por unidad baja a partir de
  ${CAPACIDADES.tramosCantidad[1]}, y el envío es gratis desde ${euros(COMERCIAL.envioGratisDesde)}.</li>
  <li>Recíbelo en una dirección y repártelo allí.</li>
</ol>
<p>Veinte pedidos sueltos de una camiseta cada uno cuestan bastante más y llegan en veinte paquetes
distintos.</p>

<h2>Ropa para el día a día</h2>
<p>Si la prenda es para llevar al colegio a diario, cambia el criterio: manda el aguante. Bordado en
el pecho antes que estampado, y colores que disimulen. Una sudadera con el escudo bordado sobrevive
al curso entero; la misma con una estampación grande, en el patio, dura bastante menos.</p>

<h2>Sobre los diseños de los niños</h2>
<p>Un dibujo hecho a mano queda muy bien estampado, pero hay que escanearlo o fotografiarlo con luz
y sin sombras, no con el móvil a contraluz. El editor dice si la imagen tiene resolución suficiente
antes de mandarla; si avisa, hazle caso.
<a href="/preparar-tu-diseno/">Aquí está explicado</a>.</p>`,
  },

  {
    slug: 'preparar-tu-diseno',
    titulo: 'Preparar tu diseño',
    tituloPagina: 'Cómo preparar un diseño para estampar en camisetas',
    descripcion: 'Qué resolución hace falta, por qué un PNG con fondo transparente evita el recuadro blanco, y por qué el color de la pantalla nunca es exactamente el de la tinta.',
    resumen: 'Las cuatro cosas que hacen que un diseño salga bien o salga borroso. Cinco minutos que ahorran una reimpresión.',
    preguntas: [
      {
        pregunta: '¿Qué resolución necesita una imagen para estampar en una camiseta?',
        respuesta: 'Unos 300 puntos por pulgada al tamaño real de la estampación. Para un diseño de 30 cm de ancho eso son unos 3.500 píxeles. El editor calcula la resolución mientras se coloca el diseño y avisa si baja de 150 ppp.',
      },
      {
        pregunta: '¿Por qué mi diseño sale con un recuadro blanco alrededor?',
        respuesta: 'Porque el archivo es un JPG, que no admite transparencia y rellena el fondo de blanco. Sobre una camiseta de color se ve el recuadro. La solución es exportarlo en PNG o en SVG con el fondo transparente.',
      },
      {
        pregunta: '¿El color impreso será igual que el de mi pantalla?',
        respuesta: 'Parecido, nunca idéntico. Una pantalla emite luz y una tinta la refleja, y además cada tejido la absorbe distinto. Si el color tiene que ser exacto, lo suyo es pedir una muestra física antes de producir.',
      },
    ],
    cuerpo: () => `
<p class="entradilla-guia">Casi todos los problemas de una estampación se deciden en el archivo, no
en la máquina. Cuatro cosas, y ya está.</p>

<h2>1. Resolución: el tamaño real manda</h2>
<p>Lo que importa no son los píxeles del archivo, sino <strong>cuántos píxeles hay por centímetro
una vez estampado</strong>. La referencia de imprenta son 300 puntos por pulgada al tamaño final.</p>
<div class="envoltura-tabla"><table class="tabla-guia">
  <thead><tr><th scope="col">Tamaño estampado</th><th scope="col">Píxeles de ancho recomendables</th><th scope="col">Mínimo aceptable</th></tr></thead>
  <tbody>
    <tr><th scope="row">10 cm (bolsillo)</th><td>1.200 px</td><td>600 px</td></tr>
    <tr><th scope="row">20 cm (pecho medio)</th><td>2.400 px</td><td>1.200 px</td></tr>
    <tr><th scope="row">30 cm (pecho completo)</th><td>3.500 px</td><td>1.800 px</td></tr>
  </tbody>
</table></div>
<p>El editor hace esta cuenta solo mientras arrastras el diseño y enseña la resolución real. Si baja
de 150 ppp avisa, porque a partir de ahí el pixelado se ve a simple vista en la prenda.</p>
<div class="aviso-guia">
  <strong>Una imagen pequeña no se puede agrandar.</strong> Ampliar un logo de 400 px al doble no
  añade detalle: solo hace los píxeles más grandes. Si no tienes el original, búscalo antes de
  pedir; suele estar en el ordenador de quien hizo la web o las tarjetas.
</div>

<h2>2. Fondo transparente</h2>
<p>Un JPG no admite transparencia: si el diseño tenía fondo, al guardarlo en JPG ese fondo se
convierte en blanco. Sobre una camiseta negra eso es un recuadro blanco alrededor del logo.</p>
<p>Guarda siempre en <strong>PNG</strong> o en <strong>SVG</strong> si el diseño tiene que ir
recortado. Los dos conservan la transparencia. En el editor se ve al momento: si aparece el
recuadro, el archivo es el problema.</p>

<h2>3. Vectorial siempre que puedas</h2>
<p>Un archivo vectorial —SVG, PDF, AI, EPS— no guarda píxeles, guarda instrucciones de dibujo. Se
puede estampar del tamaño de un bolsillo o de una valla publicitaria y sale igual de nítido.</p>
<p>Si el logo lo hizo un diseñador, pídele el vectorial: casi seguro que lo tiene. Aceptamos los
cuatro formatos, y aunque el PDF y el AI no se previsualizan en el navegador, llegan enteros al
taller y son los que mejor imprimen.</p>

${CTA}

<h2>4. El color de la pantalla no es el de la tinta</h2>
<p>Tu pantalla emite luz; la tinta la refleja. Son dos cosas físicamente distintas, así que un rojo
encendido en el monitor sale siempre algo más apagado en tela. Además, el mismo color no queda
igual sobre algodón que sobre poliéster, ni sobre blanco que sobre gris.</p>
<p>Si el color tiene que ser exacto —un corporativo, por ejemplo— dinos la referencia Pantone o
pídenos una muestra física antes de lanzar el pedido completo. Es la única forma de estar seguro, y
sale mucho más barato que reimprimir cincuenta prendas.</p>

<h2>Lista de repaso</h2>
<ul class="repaso">
  <li>El archivo es PNG, SVG, PDF o AI, no una captura de pantalla.</li>
  <li>Si tiene que ir recortado, el fondo es transparente.</li>
  <li>Al tamaño real, el editor no avisa de resolución baja.</li>
  <li>El texto está revisado. Una errata estampada no se quita.</li>
  <li>Si el color es crítico, lo has dicho en las notas del pedido.</li>
</ul>
<p>Puedes subir hasta ${LIMITES.maxCapas} diseños en un mismo pedido, repartidos entre el delante y
el detrás de la prenda.</p>`,
  },

  {
    slug: 'tecnicas-de-estampacion',
    titulo: 'Qué técnica elegir',
    tituloPagina: 'Vinilo, DTG, serigrafía o bordado: qué técnica elegir',
    descripcion: 'Comparativa de las cinco técnicas: desde cuántas unidades sale a cuenta cada una, qué colores admite, cómo queda al tacto y cuál aguanta más lavados.',
    resumen: 'Cuál conviene según cuántas prendas necesites, cuántos colores tenga el diseño y cuánto vaya a lavarse.',
    preguntas: [
      {
        pregunta: '¿Qué diferencia hay entre vinilo y serigrafía?',
        respuesta: `El vinilo se corta y se pega con calor, y sale a cuenta desde una unidad; es lo que se usa para nombres y dorsales. La serigrafía necesita una pantalla por color, así que compensa a partir de unas ${minimoDe('serigrafia')} prendas, pero en tiradas grandes es más barata y aguanta más.`,
      },
      {
        pregunta: '¿Cuál es la técnica que más aguanta los lavados?',
        respuesta: 'El bordado, porque no es tinta sino hilo cosido a la prenda. Entre las de tinta, la serigrafía es la que mejor envejece. En todas ayuda mucho lavar del revés y en frío.',
      },
    ],
    cuerpo: () => `
<p class="entradilla-guia">No hay una técnica mejor que las otras: hay una que encaja con
<em>tu</em> pedido. Tres preguntas la eligen casi siempre.</p>

<h2>Las tres preguntas</h2>
<ol class="pasos-guia">
  <li><strong>¿Cuántas prendas?</strong> Por debajo de veinte quedan fuera las técnicas con
  preparación cara. Por encima de cincuenta, esas son justo las que salen a cuenta.</li>
  <li><strong>¿Cuántos colores tiene el diseño?</strong> Una foto o un degradado descartan las
  técnicas de color plano.</li>
  <li><strong>¿Cuánto se va a lavar?</strong> Una camiseta de un día admite cualquier cosa. Un
  uniforme de uso diario, no.</li>
</ol>

<h2>Comparativa</h2>
${tablaTecnicas()}

<h2>Cuál elegir, en corto</h2>
<div class="comparativa">
  <div>
    <h3>Pocas prendas, diseño con muchos colores</h3>
    <p><strong>Impresión directa (DTG).</strong> Imprime la foto tal cual sobre el algodón, sin
    preparación previa, así que una sola unidad ya sale a cuenta.</p>
  </div>
  <div>
    <h3>Pocas prendas, texto o logo simple</h3>
    <p><strong>Vinilo.</strong> Colores planos muy vivos y muy resistentes, y permite que cada
    prenda lleve un nombre distinto sin encarecer nada.</p>
  </div>
  <div>
    <h3>Muchas prendas, mismo diseño</h3>
    <p><strong>Serigrafía.</strong> Preparar las pantallas cuesta, pero a partir de ahí cada prenda
    sale muy barata y es lo que mejor envejece.</p>
  </div>
  <div>
    <h3>Ropa deportiva de poliéster</h3>
    <p><strong>Sublimación.</strong> La tinta se mete en la fibra: no se nota al tacto, no se
    cuartea y no se despega. Solo funciona sobre poliéster claro.</p>
  </div>
  <div>
    <h3>Ropa de trabajo, polos, gorras</h3>
    <p><strong>Bordado.</strong> Es lo que más dura y lo que mejor imagen da. A cambio, el hilo no
    reproduce degradados finos.</p>
  </div>
</div>

${CTA}

<h2>Cómo hacer que dure</h2>
<p>Da igual la técnica: estas tres cosas alargan la vida de cualquier estampación.</p>
<ul class="repaso">
  <li><strong>Del revés y en frío.</strong> A 30 grados como mucho, con la prenda vuelta.</li>
  <li><strong>Sin secadora.</strong> El calor es lo que más rápido cuartea la tinta.</li>
  <li><strong>La plancha, nunca encima.</strong> Del revés, o con un paño de por medio.</li>
</ul>
<p>No hace falta acordarse: va en la etiqueta de cuidado del pedido.</p>`,
  },

  {
    slug: 'precios',
    titulo: 'Cuánto cuesta',
    tituloPagina: 'Cuánto cuesta personalizar una camiseta',
    descripcion: 'De qué depende el precio, por qué baja tanto con la cantidad, qué está incluido y qué va aparte, y cómo pedir presupuesto en dos minutos sin compromiso.',
    resumen: 'De qué depende el precio de verdad, y por qué nadie serio da una cifra cerrada sin ver el diseño.',
    preguntas: [
      {
        pregunta: '¿Cuánto cuesta personalizar una camiseta?',
        respuesta: `El precio parte de la prenda —desde ${euros(12)} con IVA en nuestro catálogo— y se le suma la estampación, que depende del tamaño, del número de colores y sobre todo de cuántas unidades se pidan. En cantidad, el precio por prenda baja bastante.`,
      },
      {
        pregunta: '¿Hay pedido mínimo?',
        respuesta: `No. Se puede pedir una sola unidad. Lo que sí cambia es el precio por prenda, que baja a partir de ${CAPACIDADES.tramosCantidad[1]} y bastante más a partir de ${CAPACIDADES.tramosCantidad[2]}.`,
      },
      {
        pregunta: '¿El precio incluye el IVA?',
        respuesta: `Sí, todos los precios de la web incluyen el ${COMERCIAL.ivaPorcentaje}% de IVA. El envío cuesta ${euros(COMERCIAL.gastosEnvio)} y es gratuito a partir de ${euros(COMERCIAL.envioGratisDesde)}.`,
      },
    ],
    cuerpo: () => `
<p class="entradilla-guia">Si alguien te da un precio cerrado sin ver el diseño, o te está cobrando
de más por si acaso, o te va a llamar luego para subirlo.</p>

<h2>De qué depende</h2>
<ol class="pasos-guia">
  <li><strong>La prenda.</strong> Es la base y lo único que puedes ver de antemano: en nuestro
  catálogo, desde ${euros(12)} con IVA una camiseta.</li>
  <li><strong>El tamaño de la estampación.</strong> Un logo de bolsillo y una espalda completa no
  cuestan lo mismo.</li>
  <li><strong>El número de colores</strong>, y sobre todo si el diseño lleva degradados o fotos.</li>
  <li><strong>Cuántas unidades.</strong> Es lo que más mueve el precio, con diferencia.</li>
  <li><strong>Cuántas caras.</strong> Delante y detrás son dos estampaciones, no una.</li>
</ol>

<h2>Por qué la cantidad cambia tanto el precio</h2>
<p>Porque casi todo el trabajo de una estampación se hace <strong>una sola vez</strong>: preparar el
archivo, ajustar el color, montar la máquina. Ese trabajo cuesta lo mismo para una prenda que para
cien, así que repartido entre cien apenas se nota.</p>
<p>Por eso el precio por unidad baja en escalones, alrededor de las ${CAPACIDADES.tramosCantidad[1]},
${CAPACIDADES.tramosCantidad[2]} y ${CAPACIDADES.tramosCantidad[3]} prendas. Si estás cerca de un
escalón, pregunta: a veces pedir dos más sale más barato en total.</p>

<h2>Qué está incluido</h2>
<div class="comparativa">
  <div>
    <h3>Va incluido</h3>
    <ul class="repaso">
      <li>La prenda</li>
      <li>La estampación de lo que has colocado en el editor</li>
      <li>La preparación y el ajuste del archivo</li>
      <li>El presupuesto y el asesoramiento previos</li>
      <li>Mezclar tallas y colores en el mismo pedido</li>
      <li>El IVA (${COMERCIAL.ivaPorcentaje}%)</li>
    </ul>
  </div>
  <div>
    <h3>Va aparte</h3>
    <ul class="repaso">
      <li>El envío: ${euros(COMERCIAL.gastosEnvio)}, gratis desde ${euros(COMERCIAL.envioGratisDesde)}</li>
      <li>Un texto distinto en cada prenda</li>
      <li>Estampar en una segunda cara</li>
      <li>Muestras físicas antes de producir</li>
      <li>Rediseñar o vectorizar un logo desde cero</li>
    </ul>
  </div>
</div>

${CTA}

<h2>Cómo pedir presupuesto</h2>
<p>Dos minutos y sin compromiso: eliges la prenda, colocas el diseño en el editor y lo mandas.
Recibes al momento un correo con tu referencia, y te respondemos con el precio final y el plazo.</p>
<p><strong>No se produce nada ni se cobra nada</strong> hasta que respondes que sí. Mandar el diseño
no es una compra: es pedir un precio.</p>

<h2>Formas de pago</h2>
<p>Se acuerdan al confirmar el presupuesto: transferencia, Bizum o tarjeta. En pedidos grandes
podemos pedir un anticipo antes de empezar, y siempre se dice en el presupuesto, nunca después.</p>
<p>Los datos de tu tarjeta no pasan por nuestro servidor en ningún momento: se introducen
directamente en la pasarela de pago.</p>`,
  },
];

export function guia(slug) {
  return GUIAS.find((g) => g.slug === slug) ?? null;
}

/** Ruta pública de una guía. */
export function rutaGuia(g) {
  return `/${g.slug}/`;
}
