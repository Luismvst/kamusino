// Página del editor de diseño.
//
// Vive en su propio fichero porque es la única página con estructura
// interactiva: metida en `plantillas.mjs` doblaría el tamaño de un módulo que
// hoy solo produce páginas estáticas.
//
// El HTML es el esqueleto completo y semántico. Lo que cambia con el uso
// (lista de capas, muestras de color, avisos) lo rellena `editor.mjs`; lo que
// no cambia va escrito aquí, para que se vea algo antes de que cargue el
// JavaScript y para que los buscadores encuentren texto de verdad.

import { LIMITES, COMERCIAL, PAGO_ACTIVO } from './negocio.mjs';

const ACEPTA_FICHEROS = '.png,.jpg,.jpeg,.webp,.gif,.svg,.pdf,.ai,.eps,.psd,'
  + 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,application/pdf,application/postscript';

/**
 * Datos que necesita el editor en el navegador. Se incrustan como JSON en un
 * `<script type="application/json">`: no se ejecuta, así que ni siquiera un
 * nombre de producto con comillas puede romper la página. El `<` escapado
 * evita además que un texto cierre la etiqueta antes de tiempo.
 */
function datosIncrustados(productos) {
  const carga = {
    limites: LIMITES,
    comercial: {
      ivaPorcentaje: COMERCIAL.ivaPorcentaje,
      gastosEnvio: COMERCIAL.gastosEnvio,
      envioGratisDesde: COMERCIAL.envioGratisDesde,
    },
    pagoActivo: PAGO_ACTIVO,
    productos: productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      precio: p.precio,
      tallas: p.tallas ?? [],
      colores: p.colores ?? [],
      imagen: p.imagenes?.[0]?.ruta ?? null,
    })),
  };
  return JSON.stringify(carga).replace(/</g, '\\u003c');
}

function pasos() {
  return `
<ol class="pasos" aria-label="Pasos del pedido">
  <li class="paso"><span>1</span> Elige la prenda</li>
  <li class="paso"><span>2</span> Sube tu diseño</li>
  <li class="paso"><span>3</span> Envíanoslo</li>
</ol>`;
}

function panelPrenda() {
  return `
<section class="bloque" aria-labelledby="t-prenda">
  <h2 id="t-prenda"><span class="numero">1</span> Tu prenda</h2>

  <label class="campo">
    <span>Producto</span>
    <select id="sel-producto"></select>
  </label>

  <div class="campo">
    <span id="et-color">Color</span>
    <div class="muestras" id="muestras-color" role="radiogroup" aria-labelledby="et-color"></div>
    <p class="nota-campo" id="nombre-color"></p>
  </div>

  <div class="campo">
    <span id="et-talla">Talla</span>
    <div class="tallas-elegibles" id="tallas" role="radiogroup" aria-labelledby="et-talla"></div>
  </div>

  <label class="campo estrecho">
    <span>Cantidad</span>
    <input type="number" id="cantidad" min="1" max="999" step="1" value="1" inputmode="numeric">
  </label>
</section>`;
}

function panelDisenos() {
  const mbFichero = Math.round(LIMITES.maxBytesPorFichero / (1024 * 1024));
  return `
<section class="bloque" aria-labelledby="t-disenos">
  <h2 id="t-disenos"><span class="numero">2</span> Tus diseños</h2>

  <div class="soltar" id="soltar" tabindex="0" role="button" aria-describedby="ayuda-formatos">
    <strong>Arrastra aquí tu diseño</strong>
    <span>o pulsa para elegir un archivo</span>
  </div>
  <p class="nota-campo" id="ayuda-formatos">
    PNG, JPG, WEBP, GIF y SVG se ven al momento. PDF, AI, EPS y PSD también valen:
    no se previsualizan, pero llegan enteros al taller. Máximo ${mbFichero} MB por archivo
    y ${LIMITES.maxCapas} diseños por pedido.
  </p>
  <input type="file" id="fichero" accept="${ACEPTA_FICHEROS}" multiple hidden>

  <div class="botonera">
    <button type="button" class="boton-secundario" id="btn-subir">Subir archivo</button>
    <button type="button" class="boton-secundario" id="btn-texto">Añadir texto</button>
  </div>

  <ul class="capas" id="capas" aria-label="Diseños añadidos"></ul>
  <p class="vacio-capas" id="capas-vacio">Todavía no has añadido ningún diseño.</p>
</section>

<section class="bloque" id="bloque-propiedades" hidden aria-labelledby="t-propiedades">
  <h2 id="t-propiedades">Ajustes del diseño</h2>
  <div id="propiedades-texto" hidden>
    <label class="campo"><span>Texto</span><input type="text" id="texto-contenido" maxlength="60"></label>
    <label class="campo"><span>Tipo de letra</span><select id="texto-fuente"></select></label>
    <div class="campo-doble">
      <label class="campo"><span>Color</span><input type="color" id="texto-color"></label>
      <div class="campo">
        <span>Estilo</span>
        <div class="botonera">
          <button type="button" class="boton-alternar" id="texto-negrita" aria-pressed="false" title="Negrita"><b>B</b></button>
          <button type="button" class="boton-alternar" id="texto-cursiva" aria-pressed="false" title="Cursiva"><i>I</i></button>
        </div>
      </div>
    </div>
  </div>
  <label class="campo">
    <span>Opacidad <output id="valor-opacidad">100%</output></span>
    <input type="range" id="opacidad" min="10" max="100" value="100">
  </label>
  <p class="medidas" id="medidas"></p>
</section>

<section class="bloque avisos" id="bloque-avisos" hidden aria-labelledby="t-avisos">
  <h2 id="t-avisos">Antes de enviar</h2>
  <ul id="avisos" aria-live="polite"></ul>
</section>`;
}

function panelEnvio() {
  const precio = PAGO_ACTIVO
    ? '<p class="total" id="total"></p>'
    : '<p class="nota-campo">Te confirmamos el precio final y la forma de pago al responderte, siempre antes de producir nada.</p>';

  return `
<section class="bloque" aria-labelledby="t-envio">
  <h2 id="t-envio"><span class="numero">3</span> Envíanos el diseño</h2>
  <form id="form-envio" novalidate>
    <label class="campo">
      <span>Nombre y apellidos</span>
      <input type="text" name="nombre" id="f-nombre" required autocomplete="name" maxlength="80">
    </label>
    <label class="campo">
      <span>Email</span>
      <input type="email" name="email" id="f-email" required autocomplete="email" maxlength="120"
             placeholder="para mandarte el presupuesto">
    </label>
    <label class="campo">
      <span>Teléfono <em>(opcional)</em></span>
      <input type="tel" name="telefono" id="f-telefono" autocomplete="tel" maxlength="20">
    </label>
    <label class="campo">
      <span>¿Algo que debamos saber? <em>(opcional)</em></span>
      <textarea name="notas" id="f-notas" rows="3" maxlength="600"
                placeholder="Fecha de entrega, colores exactos, dudas…"></textarea>
    </label>

    <!-- Trampa antispam: es invisible para las personas y los robots la
         rellenan. Si llega con contenido, el servidor descarta el envío. -->
    <div class="trampa" aria-hidden="true">
      <label>No rellenes este campo<input type="text" name="empresa" tabindex="-1" autocomplete="off"></label>
    </div>

    <label class="casilla">
      <input type="checkbox" name="acepta" id="f-acepta" required>
      <span>He leído y acepto las <a href="/condiciones-de-contratacion/" target="_blank" rel="noopener">condiciones de contratación</a>
      y la <a href="/privacidad/" target="_blank" rel="noopener">política de privacidad</a>, y confirmo que tengo derecho a usar los diseños que envío.</span>
    </label>

    ${precio}

    <button type="submit" class="boton-primario grande" id="btn-enviar">Enviar diseño</button>
    <p class="estado-envio" id="estado-envio" role="status" aria-live="polite"></p>
  </form>
</section>`;
}

export function cuerpoEditor() {
  return `
<div class="envoltorio">
  <p class="migas"><a href="/">Inicio</a> / <a href="/categoria/ropa-personalizada/">Ropa personalizada</a> / Diseñar</p>
  <div class="cabecera-editor">
    <h1>Diseña tu prenda</h1>
    <p>Sube tu diseño, colócalo donde quieras y mándanoslo. Sin programas raros ni cuentas de usuario.</p>
  </div>
  ${pasos()}
</div>

<div class="envoltorio editor" id="editor">
  <div class="editor-lienzo">
    <div class="caras" role="tablist" aria-label="Cara de la prenda">
      <button type="button" role="tab" class="cara activa" data-cara="delantera" aria-selected="true">Delantera</button>
      <button type="button" role="tab" class="cara" data-cara="trasera" aria-selected="false">Trasera</button>
    </div>

    <div class="lienzo-marco" id="lienzo-marco">
      <canvas id="lienzo" role="img" aria-label="Vista previa de la prenda con tu diseño"></canvas>
    </div>

    <div class="herramientas">
      <button type="button" class="boton-icono" id="btn-deshacer" title="Deshacer (Ctrl+Z)" disabled>↶ Deshacer</button>
      <button type="button" class="boton-icono" id="btn-rehacer" title="Rehacer (Ctrl+Y)" disabled>↷ Rehacer</button>
      <span class="separador" aria-hidden="true"></span>
      <button type="button" class="boton-icono" id="btn-centrar" disabled>Centrar</button>
      <button type="button" class="boton-icono" id="btn-encajar" disabled>Encajar</button>
      <button type="button" class="boton-icono" id="btn-duplicar" disabled>Duplicar</button>
      <button type="button" class="boton-icono peligro" id="btn-borrar" disabled>Borrar</button>
    </div>

    <p class="pista">
      Arrastra el diseño para moverlo · tira de las esquinas para cambiar el tamaño ·
      usa el círculo de arriba para girarlo. En el móvil, pellizca con dos dedos.
    </p>
  </div>

  <aside class="editor-panel">
    ${panelPrenda()}
    ${panelDisenos()}
    ${panelEnvio()}
  </aside>
</div>

<noscript>
  <div class="envoltorio">
    <div class="aviso-plantilla">
      El editor necesita JavaScript. Si prefieres no activarlo, mándanos tu diseño
      por <a href="/contacto/">email o WhatsApp</a> y lo montamos nosotros.
    </div>
  </div>
</noscript>`;
}

export function datosEditor(productos) {
  return `<script type="application/json" id="datos-editor">${datosIncrustados(productos)}</script>
<script type="module" src="/js/editor/editor.mjs"></script>`;
}
