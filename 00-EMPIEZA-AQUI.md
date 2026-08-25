# Migración Kamusino — Empieza aquí

**Fecha del análisis:** 11 de agosto de 2026
**Web:** https://kamusino.com
**Deadline del técnico:** antes de septiembre 2026 → **quedan ~20 días, y agosto**

---

## 1. Resumen en 30 segundos

La tienda está en un servidor que van a apagar. Hay que mudarla a otro sitio antes de septiembre.

Mientras la analizaba he encontrado el motivo real de que "haya cosas que no funcionan", y son dos:

1. **No se ve NINGUNA foto de producto.** Todas dan error 404.
2. **Desde la portada no se puede llegar a ningún producto.** Todos los enlaces apuntan a `kamusino.es`, un dominio que ya no existe.

Es decir: **la tienda, hoy, es prácticamente incomprable.** Un cliente que entra ve una portada con banners bonitos, pincha en cualquier sitio y le sale una página de error. Y si por casualidad llega al catálogo, ve cuadros grises sin fotos.

**La buena noticia:** el problema nº1 (las fotos) es un fallo de configuración del servidor actual, no de la tienda. Las fotos **sí están** en el servidor. Al mudarla a un servidor bien configurado, **se arregla solo, gratis**. El problema nº2 son 6 enlaces que hay que reescribir, 15 minutos de trabajo.

O sea: la migración que "toca hacer por obligación" va a dejar la tienda funcionando mejor de lo que ha estado en años.

---

## 2. Lo que he confirmado técnicamente

| Dato | Valor | Qué significa |
|---|---|---|
| IP del servidor web | `82.194.68.32` (`plw118.dns-servicio.com`) | Servidor compartido |
| Servidores DNS | `ns10/11/12.servicio-online.net` | |
| SPF del correo | `redirect=spf.dominioabsoluto.net` | |
| Registrador del dominio | **Acens Technologies, S.L.U.** (grupo Telefónica) | ✅ Confirmado el 15 ago por RDAP. *Se suponía Arsys; era Acens* |
| Caducidad del dominio | **26 nov 2026**, con bloqueo de transferencia activo | ✅ Confirmado el 15 ago |
| Servidor web | nginx | |
| PrestaShop | 1.7.7.8 | Versión de 2022, sin soporte |
| Tema | Warehouse (IQIT Commerce) | Tema de pago, ~80 € |
| Módulos de pago | Creative Elements, MegaMenu, Wishlist, Compare, Reviews (todos de IQIT) | Todos de pago, con licencia |
| Correo (MX) | `mx.kamusino.com` → `217.116.0.227` | **En un servidor DISTINTO al de la web** ✅ |
| `kamusino.es` | **Sin DNS. Caducado o cancelado.** | Y media web enlaza ahí |
| Idiomas / monedas | Solo español / solo euros | Migración simple |

### Detalle importante: el "técnico" probablemente no es el hosting

El dominio está registrado en **Acens Technologies, S.L.U.** (grupo Telefónica) — confirmado el 15 de agosto. **Acens no está cerrando**. Lo más probable es que el técnico sea un autónomo o pequeña agencia con una cuenta de revendedor de Acens, y sea *él* quien cierra su negocio.

Eso importa porque cambia las opciones: quizá no haga falta migrar a otro proveedor, quizá baste con **pasar la cuenta a nombre del cliente**. Es la primera pregunta del documento `01`.

### Detalle importante nº2: el correo está en otro servidor

El correo (`217.116.0.227`) y la web (`82.194.68.32`) están en máquinas distintas. Eso baja el riesgo, pero **no lo elimina**: si el técnico cancela toda la cuenta de golpe, se va también el correo. Hay que tratarlos como dos mudanzas separadas.

---

## 3. Qué servidor coger — opciones y precios

Restricción que manda sobre todo lo demás: **PrestaShop 1.7.7.8 solo funciona con PHP 7.1–7.4.** PHP 7.4 está muerto desde 2022. Muchos hostings modernos ya solo ofrecen PHP 8.1+. **Antes de contratar nada, hay que confirmar que ofrecen PHP 7.4 seleccionable.**

### Opción A — Hosting gestionado español ⭐ RECOMENDADA

| Proveedor | Precio orientativo | Qué incluye |
|---|---|---|
| **Raiola Networks** (plan SSD Business o similar) | ~12–18 €/mes (~150–220 €/año) | **Migración gratis hecha por ellos**, PHP 7.4 seleccionable, backups diarios, soporte en español, correo incluido |
| **Webempresa** (plan M) | ~15–20 €/mes | Igual, migración incluida, soporte español muy bueno |

**Por qué es la recomendada:** la migración la hacen ellos. Tú solo les das los accesos y ellos mueven ficheros, base de datos y correo. Soporte en castellano por teléfono cuando algo pete a las 8 de la tarde. Con el tráfico que tiene esta tienda va sobradísimo.

### Opción B — Gestionado internacional

| Proveedor | Precio | Notas |
|---|---|---|
| SiteGround (GrowBig) | ~20–25 €/mes tras el 1er año | Muy bueno, pero soporte en inglés y el correo no es su fuerte |
| Cloudways | ~15–30 €/mes | VPS gestionado, más potente. Verificar que sigan ofreciendo PHP 7.4 |

### Opción C — VPS que gestionas tú

| Proveedor | Precio | Notas |
|---|---|---|
| **Hetzner CX22** (2 vCPU, 4 GB RAM, 40 GB) | ~4,50 €/mes | + CloudPanel (gratis) para tener panel de control |

Es lo más barato y lo más potente con diferencia. Pero:

- El correo **no viene incluido**. Habría que contratarlo aparte (Zoho Mail ~1 €/buzón/mes, o Google Workspace ~6 €/buzón/mes).
- Las actualizaciones de seguridad, los backups, los certificados SSL y los sustos a las 3 de la mañana pasan a ser tuyos, para siempre.
- Si un día tú no estás disponible, el cliente se queda tirado.

**Mi opinión honesta:** dijiste "si lo puedo gestionar yo mejor, ¿no?". Para aprender, sí, es una escuela buenísima. Para una tienda de un amigo que factura y que tú no vas a monitorizar 24/7, **no**. Estás firmando un contrato de mantenimiento gratis y vitalicio contigo mismo. La Opción A cuesta 10 € más al mes y ese problema desaparece.

Si aun así quieres VPS: hazlo, pero **cóbrale al cliente un mantenimiento mensual** (30–50 €/mes) para que la responsabilidad esté pagada y sea sostenible.

### 🔑 Antes de contratar, pregunta SIEMPRE estas 3 cosas

1. ¿Ofrecéis **PHP 7.4** seleccionable? (si no → descartado)
2. ¿La **migración está incluida** y la hacéis vosotros? ¿También el correo?
3. ¿Puedo tener el **correo del dominio** en vuestro servidor?

---

## 4. Qué cuesta esto

### Coste de servidor (anual, recurrente)

- Opción A: **150–220 €/año**
- Opción C: ~55 €/año de VPS + ~25 €/año de correo = **~80 €/año** + tu tiempo

### Coste del trabajo de migración

| Vía | Precio | Tiempo |
|---|---|---|
| Migración incluida en el hosting nuevo | **0 €** | 24–72 h, no haces nada |
| Freelance en España, migración limpia | **150–400 €** | 3–8 h reales (35–70 €/h) |
| Agencia | **400–900 €** | Igual, con proceso y garantía |
| Migración + actualizar a PrestaShop 8 | **1.200–3.000 €** | Semanas |
| **Nosotros con Claude** | Tokens (~5–25 € por API; ~0 si vas por suscripción) + **tu tiempo: 4–8 h** | 2 tardes |

*Cifras orientativas del mercado español 2026.*

### Qué cobrarle a tu amigo

El trabajo real que hay aquí no es solo "mover la web". Es:

1. Migración de web + base de datos + correo
2. Transferencia del dominio
3. **Arreglar las fotos rotas** (se arregla con la migración, pero hay que verificarlo)
4. **Arreglar los 6 enlaces al dominio muerto** (esto no es migración, es reparación)
5. Contenido caducado (banners de Halloween y San Valentín, en agosto)
6. Un mínimo de páginas legales, que hoy no cumple (ver punto 5)

**Precio lógico: 250–350 € de trabajo**, más el hosting aparte (que lo paga él directamente con su tarjeta, a su nombre — importante).

Si quieres hacerle precio de amigo: **200 €**. Está por debajo de mercado y aun así no es regalar el trabajo. Por debajo de eso, no lo hagas por dinero: hazlo gratis y que quede claro que es un favor, porque cobrar 80 € por esto genera una expectativa de soporte eterno que no vas a querer.

**Lo que sí o sí debe pagar él, con su tarjeta y a su nombre:** el hosting y el dominio. Nunca los pongas a tu nombre. Es exactamente el lío en el que está metido ahora con el técnico que se va.

---

## 5. ⚠️ Problemas legales que he encontrado

Esto no es opinión, es normativa española y europea. La tienda hoy **no cumple**:

1. **Banner de cookies solo con botón "Accept".** Sin opción de rechazar ni de configurar. La guía de la AEPD lo prohíbe expresamente desde 2021: rechazar tiene que ser tan fácil como aceptar. Es la infracción más fácil de detectar y la más sancionada.
2. **Faltan páginas legales obligatorias.** Solo hay "Aviso legal" y "Contacto". Faltan como mínimo:
   - Política de privacidad (RGPD)
   - Condiciones generales de contratación (Ley de consumidores)
   - Política de cookies
   - Política de devoluciones y derecho de desistimiento (14 días)

No es urgente como la migración, pero **díselo a tu amigo por escrito**. Que quede constancia de que se lo has avisado. Si le llega una reclamación y tú "le llevas la web", no quieres estar en esa conversación sin haberlo avisado.

---

## 6. ¿Podemos dejar PrestaShop como está?

**Sí. Y es lo que recomiendo.** Migra primero, tal cual, sin tocar nada.

Motivos:
- Actualizar de PrestaShop 1.7 a 8.x rompe el tema (Warehouse) y todos los módulos IQIT. Es un proyecto de semanas, no de días, y cuesta 1.200–3.000 €.
- No tenéis tiempo. Quedan 20 días.
- Mezclar "mudanza" con "reforma" es la receta clásica del desastre: cuando algo falla no sabes si es por la mudanza o por la reforma.

**El plan correcto:** mudanza limpia ahora → verificar que todo funciona → y en octubre, con calma, decidir si actualizar.

⚠️ **Pero que quede claro y por escrito:** PrestaShop 1.7.7.8 y PHP 7.4 **ya no reciben parches de seguridad**. Es deuda técnica real. La tienda funcionará, pero cada mes que pasa es más vulnerable. Es una decisión consciente de aplazar, no un "ya está arreglado".

---

## 7. Plan de trabajo

### Fase 0 — Esta semana (11–15 agosto) 🔴 URGENTE
- [ ] Mandar al técnico el email del documento `01`
- [ ] Averiguar quién es el titular real del dominio y del hosting
- [ ] Conseguir un **backup completo** (ficheros + base de datos) — esto es lo primero de todo
- [ ] Preguntar al cliente qué paga ahora al año

### Fase 1 — Decidir (15–18 agosto)
- [ ] Con los datos en mano, elegir hosting
- [ ] Contratarlo **a nombre del cliente, con su tarjeta**
- [ ] Confirmar con el hosting nuevo: PHP 7.4 ✅, migración incluida ✅, correo ✅

### Fase 2 — Migrar (18–25 agosto)
- [ ] Mover web + base de datos al servidor nuevo
- [ ] Probarla en el servidor nuevo **antes de tocar el DNS** (con un dominio de pruebas o el fichero `hosts`)
- [ ] Recrear las cuentas de correo y **descargar el correo viejo antes de apagar nada**
- [ ] Cambiar el DNS una noche (poca actividad)
- [ ] Volver a pasar el UAT del documento `03` y verificar que las fotos ya se ven

### Fase 3 — Reparar (25–31 agosto)
- [ ] Reescribir los 6 enlaces a `kamusino.es`
- [ ] Quitar los banners caducados
- [ ] Arreglar el `sitemap.xml`
- [ ] Poner un `title` y una `description` de verdad
- [ ] Avisar por escrito de los temas legales

### ⚠️ Regla de oro

**NO canceléis nada del servidor viejo hasta que la web nueva lleve 15 días funcionando bien.** Pagar un mes de más del hosting viejo cuesta 15 €. Perder la tienda cuesta el negocio. Pídele al técnico por escrito una fecha exacta de apagado, y negocia margen.

---

## 8. Índice de documentos

| Archivo | Qué es |
|---|---|
| **`ESTADO.md`** | 👈 **Empieza por aquí.** Fichero vivo: etapas con fechas, bloqueos y qué toca hoy |
| `00-EMPIEZA-AQUI.md` | Este documento. Resumen, precios, plan |
| `01-QUE-PEDIR-AL-TECNICO.md` | Email listo para copiar y pegar + checklist |
| `02-CONCEPTOS-EXPLICADOS.md` | Qué es un dominio, un DNS, un hosting, PHP... en cristiano |
| `03-INFORME-WEB.md` | El UAT completo con todo lo que falla y por qué |
| `04-MENSAJE-AL-CLIENTE.md` | Mensajes de WhatsApp listos para tu amigo + guion de la llamada |

> El plan del punto 7 de este documento tiene las fechas del 11 de agosto, ya vencidas. **El plan vigente está en `ESTADO.md`.**
