// Orquestador del editor: conecta el almacén con el DOM de la página.
//
// Aquí no hay lógica de diseño; toda vive en los módulos que este importa.
// Lo único que ocurre en este fichero es leer eventos del DOM, llamar al
// almacén y volver a pintar. Cuando el estado cambia se repinta todo: con
// ocho capas como mucho, un repintado completo cuesta menos que cualquier
// mecanismo para averiguar qué ha cambiado.

import { tipoDePrenda, admiteEditor } from './prenda.mjs';
import {
  crearAlmacen, documentoInicial, agregarImagen, agregarTexto, actualizarCapa,
  transformarCapa, eliminarCapa, duplicarCapa, moverEnPila, seleccionar,
  cambiarCara, cambiarPrenda, capasDe, capaSeleccionada, bytesUsados,
  areaImprimible, FUENTES,
} from './estado.mjs';
import { encajar, centrar, medidasCm, pppEfectivo } from './geometria.mjs';
import { prepararContexto, escena, anchoDeTexto, tintaSobre, esClaro } from './lienzo.mjs';
import { conectarManipulacion } from './manipular.mjs';
import { importar, validar, formatoLegible } from './importar.mjs';
import { avisos, paquete, carasConDiseno } from './exportar.mjs';
import { guardar, restaurar, olvidar } from './persistencia.mjs';

const $ = (id) => document.getElementById(id);

const datos = JSON.parse($('datos-editor').textContent);
const PRODUCTOS = datos.productos.filter((p) => admiteEditor(p.nombre));
const LIMITES = datos.limites;

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

function productoPedido() {
  const pedido = Number(new URLSearchParams(location.search).get('producto'));
  return PRODUCTOS.find((p) => p.id === pedido) ?? null;
}

function productoDe(doc) {
  return PRODUCTOS.find((p) => p.id === doc.productoId) ?? null;
}

const almacen = crearAlmacen(documentoInicial(productoPedido()));
const lienzo = $('lienzo');
let ctx = prepararContexto(lienzo, lienzo.parentElement.clientWidth || 520);

// ---------------------------------------------------------------------------
// Pintado
// ---------------------------------------------------------------------------

let pintadoPedido = false;
function pedirPintado() {
  if (pintadoPedido) return;
  pintadoPedido = true;
  requestAnimationFrame(() => {
    pintadoPedido = false;
    escena(ctx, almacen.doc, { recursos: almacen.todosLosRecursos() });
  });
}

function redimensionar() {
  const ancho = $('lienzo-marco').clientWidth;
  if (ancho > 0) ctx = prepararContexto(lienzo, ancho);
  pedirPintado();
}

// ---------------------------------------------------------------------------
// Panel: prenda
// ---------------------------------------------------------------------------

function pintarProductos(doc) {
  const sel = $('sel-producto');
  if (sel.options.length !== PRODUCTOS.length + 1) {
    const vacia = document.createElement('option');
    vacia.value = '';
    vacia.textContent = 'Elige una prenda…';
    sel.replaceChildren(vacia, ...PRODUCTOS.map((p) => {
      const opcion = document.createElement('option');
      opcion.value = String(p.id);
      opcion.textContent = p.nombre;
      return opcion;
    }));
  }
  sel.value = doc.productoId == null ? '' : String(doc.productoId);
}

function pintarColores(doc) {
  const cont = $('muestras-color');
  cont.replaceChildren();

  for (const color of productoDe(doc)?.colores ?? []) {
    const elegido = color.hex === doc.color?.hex;
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'muestra' + (elegido ? ' elegida' : '') + (esClaro(color.hex) ? ' clara' : '');
    boton.style.background = color.hex;
    boton.title = color.nombre;
    boton.setAttribute('role', 'radio');
    boton.setAttribute('aria-checked', String(elegido));
    boton.setAttribute('aria-label', color.nombre);
    boton.addEventListener('click', () => {
      almacen.aplicar((d) => ({ ...d, color }));
      almacen.cerrarGesto();
    });
    cont.appendChild(boton);
  }
  $('nombre-color').textContent = doc.color?.nombre ?? '';
}

function pintarTallas(doc) {
  const tallas = productoDe(doc)?.tallas ?? [];
  const cont = $('tallas');
  cont.replaceChildren();
  cont.hidden = tallas.length === 0;

  for (const talla of tallas) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'talla-elegible' + (talla === doc.talla ? ' elegida' : '');
    boton.textContent = talla;
    boton.setAttribute('role', 'radio');
    boton.setAttribute('aria-checked', String(talla === doc.talla));
    boton.addEventListener('click', () => {
      almacen.aplicar((d) => ({ ...d, talla }));
      almacen.cerrarGesto();
    });
    cont.appendChild(boton);
  }
}

// ---------------------------------------------------------------------------
// Panel: capas
// ---------------------------------------------------------------------------

function etiquetaCapa(capa) {
  if (capa.tipo === 'texto') return capa.texto || 'Texto';
  return capa.nombre ?? 'Diseño';
}

function pintarCapas(doc) {
  const lista = $('capas');
  const capas = capasDe(doc);
  lista.replaceChildren();
  $('capas-vacio').hidden = capas.length > 0;

  // Se recorren al revés para que lo de encima en el lienzo salga arriba en
  // la lista, que es como se lee un panel de capas.
  [...capas].reverse().forEach((capa, indiceInverso) => {
    const posicion = capas.length - 1 - indiceInverso;
    const fila = document.createElement('li');
    fila.className = 'capa' + (capa.id === doc.seleccion ? ' elegida' : '');

    const nombre = document.createElement('button');
    nombre.type = 'button';
    nombre.className = 'capa-nombre';
    // Se construye con nodos de texto, no con HTML: el nombre viene del
    // ordenador del cliente y no tiene por qué ser inofensivo.
    const tipo = document.createElement('span');
    tipo.className = 'capa-tipo';
    tipo.textContent = capa.tipo === 'texto' ? 'Aa' : (capa.formato ?? 'IMG');
    const texto = document.createElement('span');
    texto.className = 'capa-texto';
    texto.textContent = etiquetaCapa(capa);
    nombre.append(tipo, texto);
    if (capa.bytes) {
      const peso = document.createElement('span');
      peso.className = 'capa-peso';
      peso.textContent = formatoLegible(capa.bytes);
      nombre.appendChild(peso);
    }
    nombre.addEventListener('click', () => {
      almacen.aplicar((d) => seleccionar(d, capa.id));
      almacen.cerrarGesto();
    });

    const acciones = document.createElement('div');
    acciones.className = 'capa-acciones';
    const boton = (simbolo, titulo, activo, alPulsar) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = simbolo;
      b.title = titulo;
      b.setAttribute('aria-label', titulo);
      b.disabled = !activo;
      b.addEventListener('click', alPulsar);
      acciones.appendChild(b);
    };
    boton('↑', 'Subir una posición', posicion < capas.length - 1, () => {
      almacen.aplicar((d) => moverEnPila(d, capa.id, 1));
      almacen.cerrarGesto();
    });
    boton('↓', 'Bajar una posición', posicion > 0, () => {
      almacen.aplicar((d) => moverEnPila(d, capa.id, -1));
      almacen.cerrarGesto();
    });
    boton('✕', 'Quitar este diseño', true, () => {
      almacen.aplicar((d) => eliminarCapa(d, capa.id));
      almacen.olvidarRecurso(capa.id);
      almacen.cerrarGesto();
    });

    fila.append(nombre, acciones);
    lista.appendChild(fila);
  });
}

// ---------------------------------------------------------------------------
// Panel: propiedades de la capa seleccionada
// ---------------------------------------------------------------------------

function pintarFuentes() {
  $('texto-fuente').replaceChildren(...FUENTES.map((f) => {
    const opcion = document.createElement('option');
    opcion.value = f.id;
    opcion.textContent = f.etiqueta;
    return opcion;
  }));
}

function pintarPropiedades(doc) {
  const capa = capaSeleccionada(doc);
  $('bloque-propiedades').hidden = !capa;
  for (const id of ['btn-centrar', 'btn-encajar', 'btn-duplicar', 'btn-borrar']) {
    $(id).disabled = !capa;
  }
  if (!capa) return;

  $('propiedades-texto').hidden = capa.tipo !== 'texto';
  if (capa.tipo === 'texto') {
    if ($('texto-contenido').value !== capa.texto) $('texto-contenido').value = capa.texto;
    $('texto-fuente').value = capa.fuente;
    $('texto-color').value = capa.color;
    $('texto-negrita').setAttribute('aria-pressed', String(capa.negrita));
    $('texto-cursiva').setAttribute('aria-pressed', String(capa.cursiva));
  }

  const opacidad = Math.round((capa.opacidad ?? 1) * 100);
  $('opacidad').value = String(opacidad);
  $('valor-opacidad').textContent = opacidad + '%';

  const m = medidasCm(capa);
  const partes = [`${m.ancho} × ${m.alto} cm`, `${Math.round(capa.rotacion)}°`];
  if (capa.tipo === 'imagen' && !capa.vectorial && capa.anchoOrigen) {
    partes.push(`${pppEfectivo(capa, capa.anchoOrigen)} ppp`);
  }
  if (capa.vectorial) partes.push('vectorial');
  $('medidas').textContent = partes.join(' · ');
}

// ---------------------------------------------------------------------------
// Panel: avisos
// ---------------------------------------------------------------------------

function pintarAvisos(doc) {
  const lista = avisos(doc);
  $('bloque-avisos').hidden = lista.length === 0;
  $('avisos').replaceChildren(...lista.map((a) => {
    const li = document.createElement('li');
    li.className = a.nivel;
    li.textContent = a.texto;
    return li;
  }));
}

// ---------------------------------------------------------------------------
// Total
// ---------------------------------------------------------------------------

function pintarTotal(doc) {
  const salida = $('total');
  if (!salida) return;
  const precio = productoDe(doc)?.precio ?? 0;
  const subtotal = precio * doc.cantidad;
  const envio = subtotal >= datos.comercial.envioGratisDesde ? 0 : datos.comercial.gastosEnvio;
  const euros = (n) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  salida.textContent = subtotal > 0
    ? `${doc.cantidad} × ${euros(precio)} + ${envio ? euros(envio) + ' de envío' : 'envío gratis'} = ${euros(subtotal + envio)} (IVA incluido)`
    : 'Presupuesto a medida.';
}

// ---------------------------------------------------------------------------
// Caras y pasos
// ---------------------------------------------------------------------------

function pintarCaras(doc) {
  for (const boton of document.querySelectorAll('.cara')) {
    const activa = boton.dataset.cara === doc.cara;
    boton.classList.toggle('activa', activa);
    boton.setAttribute('aria-selected', String(activa));
    const cuantas = capasDe(doc, boton.dataset.cara).length;
    boton.dataset.cuantas = cuantas > 0 ? String(cuantas) : '';
  }
}

function pintarPasos(doc) {
  const hayDisenos = capasDe(doc, 'delantera').length + capasDe(doc, 'trasera').length > 0;
  const hechos = [doc.productoId != null, hayDisenos, false];
  const siguiente = hechos.findIndex((h) => !h);
  document.querySelectorAll('.paso').forEach((paso, i) => {
    paso.classList.toggle('hecho', hechos[i]);
    paso.classList.toggle('activo', i === siguiente);
  });
}

function pintarTodo(doc) {
  // Hasta que no hay prenda no se enseña ni el lienzo ni el resto de pasos.
  const editor = $('editor');
  const sinPrenda = doc.productoId == null;
  if (editor.classList.contains('sin-prenda') !== sinPrenda) {
    editor.classList.toggle('sin-prenda', sinPrenda);
    if (!sinPrenda) redimensionar();
  }
  pintarProductos(doc);
  pintarColores(doc);
  pintarTallas(doc);
  pintarCapas(doc);
  pintarPropiedades(doc);
  pintarAvisos(doc);
  pintarCaras(doc);
  pintarPasos(doc);
  pintarTotal(doc);
  if ($('cantidad').value !== String(doc.cantidad)) $('cantidad').value = String(doc.cantidad);
  $('btn-deshacer').disabled = !almacen.puedeDeshacer;
  $('btn-rehacer').disabled = !almacen.puedeRehacer;
  pedirPintado();
}

// ---------------------------------------------------------------------------
// Importación de ficheros
// ---------------------------------------------------------------------------

function avisar(mensaje, tipo = 'error') {
  const salida = $('estado-envio');
  salida.textContent = mensaje;
  salida.className = 'estado-envio ' + (mensaje ? tipo : '');
}

async function anadirFicheros(ficheros) {
  for (const fichero of ficheros) {
    const doc = almacen.doc;
    const problema = validar(fichero, LIMITES, {
      bytes: bytesUsados(doc),
      capas: capasDe(doc, 'delantera').length + capasDe(doc, 'trasera').length,
    });
    if (problema) {
      avisar(problema);
      continue;
    }
    try {
      const recurso = await importar(fichero);
      almacen.aplicar((d) => agregarImagen(d, recurso));
      almacen.cerrarGesto();
      almacen.guardarRecurso(almacen.doc.seleccion, recurso);
      pedirPintado();
      avisar('');
    } catch (error) {
      avisar(`No hemos podido abrir «${fichero.name}»: ${error.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Envío
// ---------------------------------------------------------------------------

function validarFormulario(doc) {
  if (doc.productoId == null) return 'Elige primero la prenda.';
  if (carasConDiseno(doc).length === 0) return 'Añade al menos un diseño antes de enviarlo.';
  if (!$('f-nombre').value.trim()) return 'Dinos tu nombre para poder responderte.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test($('f-email').value.trim())) return 'Revisa el email: no parece una dirección válida.';
  if (!$('f-acepta').checked) return 'Para poder enviarlo necesitamos que aceptes las condiciones y la política de privacidad.';
  return null;
}

/**
 * Lleva a la pasarela de pago. El importe no se manda: lo calcula el servidor
 * desde su propio catálogo, para que nadie pueda comprar por un céntimo.
 */
async function irAPagar(referencia, doc, contacto, boton) {
  boton.disabled = true;
  boton.textContent = 'Abriendo la pasarela…';
  try {
    const respuesta = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        referencia,
        productoId: doc.productoId,
        cantidad: doc.cantidad,
        email: contacto.email,
      }),
    });
    const json = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || !json.url) throw new Error(json.error ?? 'No se ha podido abrir la pasarela.');
    location.href = json.url;
  } catch (error) {
    boton.disabled = false;
    boton.textContent = 'Pagar ahora con tarjeta';
    const aviso = document.createElement('p');
    aviso.className = 'estado-envio error';
    aviso.textContent = error.message + ' Tranquilo: tu diseño ya nos ha llegado y te escribiremos.';
    boton.after(aviso);
  }
}

function pantallaDeGracias(referencia, email, doc, contacto) {
  const caja = document.createElement('div');
  caja.className = 'enviado';

  const titulo = document.createElement('h2');
  titulo.textContent = 'Diseño enviado';

  const ref = document.createElement('p');
  ref.append('Tu referencia es ');
  const fuerte = document.createElement('strong');
  fuerte.textContent = referencia;
  ref.append(fuerte, '. Te hemos mandado una copia a ' + email + '.');

  const siguiente = document.createElement('p');
  siguiente.textContent = 'Te respondemos con el presupuesto y el plazo. Si no ves nuestro correo, mira en la carpeta de spam.';

  caja.append(titulo, ref, siguiente);

  // El pago solo se ofrece cuando está configurado y el producto tiene precio
  // publicado. Los de presupuesto a medida se cierran por email.
  const precio = productoDe(doc)?.precio ?? 0;
  if (datos.pagoActivo && precio > 0) {
    siguiente.textContent = 'Si lo prefieres, puedes pagarlo ya y nos ponemos con él enseguida. '
      + 'Si no, te mandamos el presupuesto por email y decides luego.';
    const pagar = document.createElement('button');
    pagar.type = 'button';
    pagar.className = 'boton-primario grande';
    pagar.textContent = 'Pagar ahora con tarjeta';
    pagar.addEventListener('click', () => irAPagar(referencia, doc, contacto, pagar));
    caja.append(pagar);
  }

  const volver = document.createElement('a');
  volver.className = 'boton-secundario';
  volver.href = '/';
  volver.textContent = 'Volver al inicio';
  caja.append(volver);

  return caja;
}

async function enviar(evento) {
  evento.preventDefault();
  const problema = validarFormulario(almacen.doc);
  if (problema) {
    avisar(problema);
    return;
  }

  const boton = $('btn-enviar');
  boton.disabled = true;
  boton.textContent = 'Preparando tu diseño…';
  avisar('Estamos generando los archivos de impresión. No cierres la página.', 'trabajando');

  try {
    const contacto = {
      nombre: $('f-nombre').value.trim(),
      email: $('f-email').value.trim(),
      telefono: $('f-telefono').value.trim(),
      notas: $('f-notas').value.trim(),
      empresa: document.querySelector('[name="empresa"]').value,
      acepta: true,
    };
    const cuerpo = await paquete(
      { ...almacen.doc, notas: contacto.notas },
      almacen.todosLosRecursos(),
      contacto,
    );

    boton.textContent = 'Enviando…';
    const respuesta = await fetch('/api/pedido', { method: 'POST', body: cuerpo });
    const json = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      throw new Error(json.error ?? 'El envío no ha llegado. Inténtalo otra vez en un momento.');
    }

    await olvidar();
    document.querySelector('.editor').replaceChildren(
      pantallaDeGracias(String(json.referencia ?? ''), contacto.email, almacen.doc, contacto),
    );
    globalThis.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    avisar(error.message);
    boton.disabled = false;
    boton.textContent = 'Enviar diseño';
  }
}

// ---------------------------------------------------------------------------
// Conexiones
// ---------------------------------------------------------------------------

/** La caja de una capa de texto tiene que medir lo que miden sus letras. */
function ajustarAnchoDeTexto() {
  const capa = capaSeleccionada(almacen.doc);
  if (capa?.tipo !== 'texto') return;
  const ancho = anchoDeTexto(ctx, capa);
  if (Math.abs(ancho - capa.ancho) < 0.5) return;
  almacen.aplicar((d) => actualizarCapa(d, capa.id, { ancho }), { etiqueta: 'ancho-texto' });
}

function conectar() {
  pintarFuentes();

  $('sel-producto').addEventListener('change', (e) => {
    const producto = PRODUCTOS.find((p) => p.id === Number(e.target.value));
    if (!producto) return;
    almacen.aplicar((d) => ({
      ...cambiarPrenda(d, tipoDePrenda(producto.nombre)),
      productoId: producto.id,
      productoNombre: producto.nombre,
      // El color y la talla elegidos pueden no existir en el producto nuevo.
      color: producto.colores?.find((c) => c.hex === d.color?.hex) ?? producto.colores?.[0] ?? d.color,
      talla: producto.tallas?.includes(d.talla) ? d.talla : (producto.tallas?.[0] ?? ''),
    }));
    almacen.cerrarGesto();
  });

  $('cantidad').addEventListener('input', (e) => {
    const n = Math.min(999, Math.max(1, Math.round(Number(e.target.value) || 1)));
    almacen.aplicar((d) => ({ ...d, cantidad: n }), { etiqueta: 'cantidad' });
  });

  for (const boton of document.querySelectorAll('.cara')) {
    boton.addEventListener('click', () => {
      almacen.aplicar((d) => cambiarCara(d, boton.dataset.cara));
      almacen.cerrarGesto();
    });
  }

  $('btn-subir').addEventListener('click', () => $('fichero').click());
  $('soltar').addEventListener('click', () => $('fichero').click());
  $('soltar').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      $('fichero').click();
    }
  });

  $('fichero').addEventListener('change', async (e) => {
    await anadirFicheros([...e.target.files]);
    e.target.value = '';
  });

  const zona = $('soltar');
  for (const nombre of ['dragenter', 'dragover']) {
    zona.addEventListener(nombre, (e) => { e.preventDefault(); zona.classList.add('encima'); });
  }
  for (const nombre of ['dragleave', 'drop']) {
    zona.addEventListener(nombre, (e) => { e.preventDefault(); zona.classList.remove('encima'); });
  }
  zona.addEventListener('drop', (e) => anadirFicheros([...e.dataTransfer.files]));

  // Soltar sobre el propio lienzo es lo que la gente intenta primero.
  for (const nombre of ['dragenter', 'dragover', 'drop']) {
    lienzo.addEventListener(nombre, (e) => e.preventDefault());
  }
  lienzo.addEventListener('drop', (e) => anadirFicheros([...e.dataTransfer.files]));

  $('btn-texto').addEventListener('click', () => {
    almacen.aplicar((d) => agregarTexto(d));
    ajustarAnchoDeTexto();
    almacen.cerrarGesto();
    $('texto-contenido').focus();
    $('texto-contenido').select();
  });

  $('btn-deshacer').addEventListener('click', () => almacen.deshacer());
  $('btn-rehacer').addEventListener('click', () => almacen.rehacer());

  $('btn-centrar').addEventListener('click', () => {
    almacen.aplicar((d) => transformarCapa(d, d.seleccion, (c) => centrar(c, areaImprimible(d))));
    almacen.cerrarGesto();
  });
  $('btn-encajar').addEventListener('click', () => {
    almacen.aplicar((d) => transformarCapa(d, d.seleccion,
      (c) => encajar({ ...c, rotacion: 0 }, areaImprimible(d), { margen: 6 })));
    almacen.cerrarGesto();
  });
  $('btn-duplicar').addEventListener('click', () => {
    const origen = almacen.doc.seleccion;
    almacen.aplicar((d) => duplicarCapa(d, d.seleccion));
    const recurso = almacen.recurso(origen);
    if (recurso) almacen.guardarRecurso(almacen.doc.seleccion, recurso);
    almacen.cerrarGesto();
  });
  $('btn-borrar').addEventListener('click', () => {
    const id = almacen.doc.seleccion;
    almacen.aplicar((d) => eliminarCapa(d, id));
    almacen.olvidarRecurso(id);
    almacen.cerrarGesto();
  });

  $('opacidad').addEventListener('input', (e) => {
    almacen.aplicar((d) => actualizarCapa(d, d.seleccion, { opacidad: Number(e.target.value) / 100 }), { etiqueta: 'opacidad' });
  });

  $('texto-contenido').addEventListener('input', (e) => {
    almacen.aplicar((d) => actualizarCapa(d, d.seleccion, { texto: e.target.value }), { etiqueta: 'texto' });
    ajustarAnchoDeTexto();
  });
  $('texto-fuente').addEventListener('change', (e) => {
    almacen.aplicar((d) => actualizarCapa(d, d.seleccion, { fuente: e.target.value }));
    ajustarAnchoDeTexto();
    almacen.cerrarGesto();
  });
  $('texto-color').addEventListener('input', (e) => {
    almacen.aplicar((d) => actualizarCapa(d, d.seleccion, { color: e.target.value }), { etiqueta: 'color-texto' });
  });
  for (const [id, campo] of [['texto-negrita', 'negrita'], ['texto-cursiva', 'cursiva']]) {
    $(id).addEventListener('click', () => {
      almacen.aplicar((d) => {
        const capa = capaSeleccionada(d);
        return capa ? actualizarCapa(d, capa.id, { [campo]: !capa[campo] }) : d;
      });
      ajustarAnchoDeTexto();
      almacen.cerrarGesto();
    });
  }

  $('form-envio').addEventListener('submit', enviar);
  globalThis.addEventListener('resize', redimensionar);
}

conectar();
conectarManipulacion(lienzo, almacen);
almacen.suscribir(pintarTodo);
// Solo se recuerda una sesión con diseños. Así una visita de paso no deja la
// prenda preelegida, y si se borran todos los diseños tampoco vuelven al recargar.
let habiaDisenos = false;
almacen.suscribir((doc) => {
  const hay = carasConDiseno(doc).length > 0;
  if (hay) guardar(doc, almacen.todosLosRecursos());
  else if (habiaDisenos) olvidar();
  habiaDisenos = hay;
});
redimensionar();

// Se restaura al final, cuando ya está todo conectado y escuchando.
restaurar(PRODUCTOS).then((recuperado) => {
  if (!recuperado) return;
  for (const [id, recurso] of recuperado.recursos) almacen.guardarRecurso(id, recurso);
  almacen.reemplazar(recuperado.doc);
}).catch(() => { /* si no se puede restaurar, se empieza de cero */ });

// Se expone solo para que las pruebas de navegador puedan mirar el estado.
globalThis.__editor = { almacen, tintaSobre };
