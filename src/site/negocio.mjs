// Configuración única del negocio.
//
// Todo lo que hay que tocar para poner la web en producción está en este
// fichero. Si algo aparece marcado como PENDIENTE, la web no debe publicarse
// hasta rellenarlo: son datos que la ley exige mostrar.

/** Dominio canónico, sin barra final. Cambiar aquí al mover de dominio. */
export const DOMINIO = 'https://kamusino.es';

/**
 * Dominios que redirigen al canónico con un 301. Se usan para generar
 * `_redirects`, y así el historial de posiciones en Google no se pierde.
 */
export const DOMINIOS_ALTERNATIVOS = ['kamusino.com', 'www.kamusino.com', 'www.kamusino.es'];

/**
 * Interruptor de indexación. En `false` toda la web sale con `noindex` y el
 * `robots.txt` bloquea a los buscadores: es el estado correcto mientras vive
 * en un dominio de previsualización. Ponerlo en `true` **el mismo día** que
 * el dominio real apunte aquí, no antes.
 */
export const SITIO_INDEXABLE = false;

/**
 * Datos fiscales. La LSSI-CE (art. 10) obliga a mostrarlos de forma
 * "permanente, fácil, directa y gratuita". Publicar sin ellos es una
 * infracción leve sancionable con hasta 30.000 €.
 */
export const EMPRESA = {
  razonSocial: 'PENDIENTE: razón social completa',
  nombreComercial: 'Kamusino',
  nif: 'PENDIENTE: NIF/CIF',
  domicilio: 'PENDIENTE: calle, número, código postal y municipio',
  provincia: 'PENDIENTE: provincia',
  pais: 'España',
  // Solo si es sociedad mercantil (S.L., S.A.). Si es autónomo, dejar vacío:
  // la ley solo lo exige a las inscritas en el Registro Mercantil.
  registroMercantil: '',
};

export const CONTACTO = {
  whatsapp: '34747413526',
  email: 'tucamisetaonline@outlook.es',
  /** Buzón que recibe los pedidos del editor. Puede ser el mismo que `email`. */
  emailPedidos: 'tucamisetaonline@outlook.es',
  /** Remitente de los correos automáticos. Debe estar en un dominio verificado en Resend. */
  emailRemitente: 'pedidos@kamusino.es',
  telefono: '+34 747 41 35 26',
};

/** Condiciones comerciales que aparecen en las condiciones de contratación y en el pago. */
export const COMERCIAL = {
  ivaPorcentaje: 21,
  /** Los precios del catálogo ya llevan el IVA incluido. */
  preciosConIva: true,
  gastosEnvio: 4.95,
  envioGratisDesde: 60,
  plazoProduccionDias: '3 a 5 días laborables',
  plazoEntregaDias: '24 a 72 horas tras la producción',
  /** Días naturales de desistimiento. 14 es el mínimo legal (RDL 1/2007, art. 71). */
  diasDesistimiento: 14,
  /** Años de garantía legal de conformidad (RDL 7/2021, en vigor desde 2022). */
  aniosGarantia: 3,
};

/**
 * Límites del editor. Se aplican **también** en el servidor: un límite que
 * solo vive en el navegador no es un límite, es una sugerencia.
 */
export const LIMITES = {
  maxCapas: 8,
  maxBytesPorFichero: 10 * 1024 * 1024,
  maxBytesTotales: 20 * 1024 * 1024,
  /** Resolución de estampación. 300 ppp es el estándar de imprenta. */
  ppp: 300,
};

/** Nombre de la variable de entorno, no la clave. Las claves nunca van en el repo. */
export const CLAVES_ENTORNO = {
  resend: 'RESEND_API_KEY',
  stripeSecreta: 'STRIPE_SECRET_KEY',
  stripeWebhook: 'STRIPE_WEBHOOK_SECRET',
};

/** Clave pública de Stripe: es pública por diseño, puede ir en el HTML. */
export const STRIPE_CLAVE_PUBLICA = '';

/** `true` cuando Stripe esté configurado y se pueda cobrar en la web. */
export const PAGO_ACTIVO = false;

/** Devuelve una URL absoluta a partir de una ruta del sitio. */
export function url(ruta = '/') {
  return `${DOMINIO}${ruta}`;
}

/** Los datos fiscales sin rellenar se detectan por este prefijo. */
export function datosFiscalesPendientes() {
  return Object.entries(EMPRESA)
    .filter(([, v]) => typeof v === 'string' && v.startsWith('PENDIENTE'))
    .map(([k]) => k);
}
