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
 * Lo que el taller sabe hacer.
 *
 * Alimenta las guías y las páginas de uso. Está aquí y no escrito dentro de
 * los textos porque son afirmaciones sobre el negocio: si mañana se deja de
 * hacer serigrafía, hay que poder quitarla de la web en un sitio, no ir
 * buscándola por seis páginas.
 *
 * **Verificar antes de publicar.** Los valores de partida son los habituales
 * en un taller de personalización español, pero no están confirmados con el
 * negocio.
 */
export const CAPACIDADES = {
  tecnicas: [
    {
      id: 'vinilo',
      nombre: 'Vinilo textil',
      minimo: 1,
      colores: 'Colores planos, sin degradados',
      ideal: 'Nombres, dorsales, textos y logos de pocos colores',
      tacto: 'Se nota al pasar la mano',
      durabilidad: 'Muy alta si se lava del revés',
      activa: true,
    },
    {
      id: 'dtg',
      nombre: 'Impresión directa (DTG)',
      minimo: 1,
      colores: 'Fotografías y degradados, sin límite de colores',
      ideal: 'Diseños con muchos colores o fotos, en pocas unidades',
      tacto: 'Casi imperceptible sobre algodón',
      durabilidad: 'Alta; pierde algo de intensidad con los años',
      activa: true,
    },
    {
      id: 'serigrafia',
      nombre: 'Serigrafía',
      minimo: 25,
      colores: 'Colores planos; cada color es una pantalla',
      ideal: 'Tiradas grandes del mismo diseño',
      tacto: 'Ligero, muy resistente',
      durabilidad: 'La que más aguanta lavados',
      activa: true,
    },
    {
      id: 'sublimacion',
      nombre: 'Sublimación',
      minimo: 1,
      colores: 'Fotografías y degradados a todo color',
      ideal: 'Poliéster claro: deportiva, tazas, banderas',
      tacto: 'Ninguno: la tinta se mete en la fibra',
      durabilidad: 'No se cuartea ni se despega',
      activa: true,
    },
    {
      id: 'bordado',
      nombre: 'Bordado',
      minimo: 10,
      colores: 'Hilos planos, sin degradados finos',
      ideal: 'Ropa de trabajo, polos y gorras; da imagen de acabado caro',
      tacto: 'En relieve',
      durabilidad: 'La prenda se rompe antes que el bordado',
      activa: true,
    },
  ],

  /** Unidades a partir de las cuales el precio por prenda empieza a bajar. */
  tramosCantidad: [1, 10, 25, 50, 100],

  /** Si se admite mezclar tallas y colores dentro de un mismo pedido. */
  mezclarTallas: true,

  /** Plazo mínimo que conviene pedir para un evento con fecha. */
  avisoEventos: '2 semanas',
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

/**
 * Analítica.
 *
 * Mientras `activa` sea `false` la web no carga absolutamente nada de
 * terceros, y por eso no aparece ningún cartel de cookies: no habría nada que
 * consentir, y pedir permiso para nada es peor que no pedirlo.
 *
 * En cuanto se pone en `true`, el aviso de cookies se enciende solo, el script
 * de medición no se carga hasta que el visitante acepta, y la política de
 * cookies pasa a describir lo que se mide. No hay que tocar nada más.
 *
 * `proveedor` admite:
 *   'cloudflare'  Web Analytics. Sin cookies y sin huella del visitante; es la
 *                 opción que menos molesta y la que ya está en la misma cuenta.
 *   'plausible'   De pago, también sin cookies, con informes más completos.
 *
 * Los dos son cookieless, así que técnicamente estarían exentos del
 * consentimiento. Se pide igual: el aviso está escrito y probado, y pedirlo
 * cuando no hace falta no cuesta nada, mientras que no pedirlo cuando sí hace
 * falta cuesta una sanción.
 */
export const ANALITICA = {
  activa: false,
  proveedor: 'cloudflare',
  /** Cloudflare: el token del fragmento que da el panel de Web Analytics. */
  token: '',
  /** Plausible: el dominio dado de alta en la cuenta. */
  dominio: '',
};

/**
 * Meses que vale un consentimiento antes de volver a preguntar. La guía de
 * cookies de la AEPD fija 24 como máximo.
 */
export const MESES_CONSENTIMIENTO = 24;

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
