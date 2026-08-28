// Consentimiento de cookies.
//
// Escrito contra la guía de cookies de la Agencia Española de Protección de
// Datos, que es más exigente que la lectura habitual del RGPD. En concreto:
//
//   · Nada que no sea estrictamente necesario se carga antes de que la persona
//     acepte. El script de medición no existe en la página hasta entonces.
//   · «Rechazar» tiene exactamente el mismo tamaño, color y peso que
//     «Aceptar», y está en la primera capa. Un rechazar escondido detrás de
//     «más opciones», o en gris claro, es justo lo que la guía prohíbe.
//   · Seguir navegando no es aceptar. El aviso no se cierra solo ni al hacer
//     scroll.
//   · Retirar el consentimiento es tan fácil como darlo: hay un enlace fijo en
//     el pie de todas las páginas.
//   · El consentimiento caduca y se vuelve a preguntar.
//
// La configuración vive en `src/site/negocio.mjs` y llega incrustada en la
// página. Mientras no haya analítica activa, este módulo no enseña nada: pedir
// permiso para no hacer nada es peor que no pedirlo.

const CLAVE = 'kamusino-consentimiento';
const VERSION = 1;

const configuracion = (() => {
  try {
    return JSON.parse(document.getElementById('config-cookies')?.textContent ?? '{}');
  } catch {
    return {};
  }
})();

const ANALITICA = configuracion.analitica ?? { activa: false };
const MESES = configuracion.meses ?? 24;

/** `true` si hay algo que consentir. Si no, este módulo se queda quieto. */
const HAY_ALGO_QUE_CONSENTIR = Boolean(ANALITICA.activa);

// ---------------------------------------------------------------------------
// Registro del consentimiento
// ---------------------------------------------------------------------------

function leer() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    if (!guardado || guardado.version !== VERSION) return null;

    // Caducado: se vuelve a preguntar en vez de dar por bueno un permiso de
    // hace dos años que la persona ya no recuerda haber dado.
    const caduca = new Date(guardado.fecha);
    caduca.setMonth(caduca.getMonth() + MESES);
    if (Number.isNaN(caduca.getTime()) || caduca < new Date()) return null;

    return guardado;
  } catch {
    return null;
  }
}

function guardar(analitica) {
  const decision = { version: VERSION, analitica, fecha: new Date().toISOString() };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(decision));
  } catch {
    // En una ventana privada no se puede guardar. Se respeta la decisión
    // durante esta visita y se vuelve a preguntar en la siguiente, que es lo
    // correcto: sin poder guardar el «no», dar por hecho el «sí» sería peor.
  }
  return decision;
}

// ---------------------------------------------------------------------------
// Carga de la analítica
// ---------------------------------------------------------------------------

let cargada = false;

/** Solo se llama con un consentimiento afirmativo y vigente. */
function cargarAnalitica() {
  if (cargada || !ANALITICA.activa) return;

  const script = document.createElement('script');
  script.defer = true;

  if (ANALITICA.proveedor === 'plausible' && ANALITICA.dominio) {
    script.src = 'https://plausible.io/js/script.js';
    script.dataset.domain = ANALITICA.dominio;
  } else if (ANALITICA.proveedor === 'cloudflare' && ANALITICA.token) {
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.dataset.cfBeacon = JSON.stringify({ token: ANALITICA.token });
  } else {
    // Analítica marcada como activa pero sin configurar. Mejor no cargar nada
    // que cargar un script roto.
    return;
  }

  cargada = true;
  document.head.appendChild(script);
}

// ---------------------------------------------------------------------------
// Interfaz
// ---------------------------------------------------------------------------

const aviso = document.getElementById('aviso-cookies');
const panel = document.getElementById('panel-cookies');

function mostrarAviso() {
  if (!aviso) return;
  aviso.hidden = false;
  // El foco entra en el aviso para que quien navega con teclado o con lector
  // de pantalla se entere de que hay una decisión que tomar.
  aviso.querySelector('h2')?.focus();
}

function ocultarTodo() {
  if (aviso) aviso.hidden = true;
  if (panel) panel.hidden = true;
}

function decidir(analitica) {
  guardar(analitica);
  ocultarTodo();
  if (analitica) {
    cargarAnalitica();
  } else if (cargada) {
    // Si se retira el permiso, el script ya cargado seguiría midiendo hasta la
    // siguiente carga. Se recarga para que se vaya de verdad, en vez de decir
    // que se ha ido.
    location.reload();
  }
}

function abrirPreferencias() {
  if (!panel) return;
  const guardado = leer();
  const casilla = document.getElementById('cookies-analitica');
  if (casilla) casilla.checked = Boolean(guardado?.analitica);

  // El bloque de analítica solo tiene sentido si hay analítica configurada.
  const bloque = document.getElementById('cookies-bloque-analitica');
  if (bloque) bloque.hidden = !HAY_ALGO_QUE_CONSENTIR;
  const nada = document.getElementById('cookies-nada');
  if (nada) nada.hidden = HAY_ALGO_QUE_CONSENTIR;

  if (aviso) aviso.hidden = true;
  panel.hidden = false;
  panel.querySelector('h2')?.focus();
}

function conectar() {
  document.getElementById('cookies-aceptar')?.addEventListener('click', () => decidir(true));
  document.getElementById('cookies-rechazar')?.addEventListener('click', () => decidir(false));
  document.getElementById('cookies-configurar')?.addEventListener('click', abrirPreferencias);

  document.getElementById('cookies-guardar')?.addEventListener('click', () => {
    decidir(Boolean(document.getElementById('cookies-analitica')?.checked));
  });
  document.getElementById('cookies-cerrar')?.addEventListener('click', ocultarTodo);

  // El enlace del pie es lo que hace que retirar el permiso sea tan fácil como
  // darlo, que es lo que exige la norma.
  for (const enlace of document.querySelectorAll('[data-abrir-cookies]')) {
    enlace.addEventListener('click', (evento) => {
      evento.preventDefault();
      abrirPreferencias();
    });
  }

  // Escape cierra el panel, pero nunca el aviso: cerrarlo sin decidir sería
  // colar un consentimiento tácito.
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && panel && !panel.hidden) ocultarTodo();
  });
}

conectar();

if (HAY_ALGO_QUE_CONSENTIR) {
  const guardado = leer();
  if (!guardado) mostrarAviso();
  else if (guardado.analitica) cargarAnalitica();
}

// Se expone para el enlace del pie y para las pruebas.
globalThis.__cookies = { abrirPreferencias, leer, HAY_ALGO_QUE_CONSENTIR };
