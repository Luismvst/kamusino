# BACKLOG — Migración Kamusino

**Actualizado:** sábado 15 de agosto de 2026
**🔴 Apagado del servidor viejo: 10 de septiembre de 2026** — confirmado por el técnico
**🎯 Fecha objetivo del cambio de DNS: 26 de agosto** — deja 15 días de solape antes del apagado
**Estado:** 0 / 58 tareas

Marca `[x]` según avances. Cada tarea dice **quién** la hace y **de qué depende**: si la dependencia no está hecha, esa tarea todavía no se puede tocar.

**Leyenda de prioridad:** 🔴 P0 = bloquea todo o es irrecuperable · 🟠 P1 = necesario para migrar · 🟡 P2 = calidad, puede esperar

---

## 📌 El camino crítico

Si todo lo demás se retrasa, da igual. Si **esto** se retrasa, no hay proyecto:

```
A1 (hablar con el amigo)
   ├─> A2 (email al técnico)
   │      ├─> B1 (ACCESO o backup) ──> B4 (verificar) ──> D (montar) ──> G (DNS 26 ago)
   │      └─> B6 (AuthCode + quitar bloqueo) ─────────────────────────> H (transferir dominio)
   └─> C3 (contratar hosting con su tarjeta) ────────────────────────> D
```

**Dos cosas son irrecuperables si fallan:** `B1` (sin base de datos no hay tienda, y no se puede sacar desde fuera) y `B6` (sin AuthCode el dominio se pierde al caducar el 26 de noviembre).

---

## BLOQUE A — Desbloquear · 15–17 ago · 🔴 P0

Nada del resto del backlog se puede empezar hasta que esto esté.

| ID | Tarea | Quién | Fecha | Depende |
|---|---|---|---|---|
| ☐ A1 | Llamada con el amigo: correo, factura del dominio, luz verde al hosting, teléfono del técnico | Luis | 15 ago | — |
| ☐ A2 | El amigo envía el email al técnico: acceso, AuthCodes, listado de dominios, ¿traspaso de cuenta? | Amigo | 15 ago | A1 |
| ☐ A3 | Entrar en `webmail.kamusino.com/appsuite/` y ver si hay correo histórico + cuántos buzones existen | Luis | 16 ago | A1 (contraseña) |
| ☐ A4 | Foto de la configuración de la cuenta en su Outlook: servidor entrante, puerto, IMAP o POP | Amigo | 16 ago | A1 |
| ☐ A5 | Buscar factura del dominio: ¿la manda Acens o el técnico? Define si el dominio es suyo | Amigo | 16 ago | A1 |
| ☐ A6 | Si el técnico no ha contestado el lunes por la mañana → llamada telefónica | Amigo | 17 ago | A2 |
| ☐ A7 | Negociar que el servidor viejo siga encendido hasta el 25 sept, aunque haya que pagar el mes | Amigo | 17 ago | A6 |
| ☐ A8 | Preguntar pedidos/mes y qué pasarelas de pago usan los clientes | Amigo | 17 ago | A1 |

---

## BLOQUE B — Asegurar lo irrecuperable · 17–20 ago · 🔴 P0

| ID | Tarea | Quién | Fecha | Depende |
|---|---|---|---|---|
| ☐ **B1** | **Conseguir UN ACCESO** (panel > FTP+phpMyAdmin > backoffice). Plan B: que mande el backup | Técnico | 17–19 ago | A2 |
| ☐ B2 | Descargar todos los ficheros: raíz completa, `.htaccess`, `app/config/parameters.php`, `img/` | Luis | 18–19 ago | B1 |
| ☐ B3 | Exportar el dump SQL completo de la base de datos | Luis | 18–19 ago | B1 |
| ☐ B4 | **Verificar el backup**: descomprimir, comprobar el peso de `img/`, abrir el `.sql` y ver tablas de producto y pedidos | Luis | 19 ago | B2, B3 |
| ☐ B5 | Guardar el backup en **dos sitios** (disco local + nube) | Luis | 19 ago | B4 |
| ☐ **B6** | **AuthCode de cada dominio + quitar el bloqueo de transferencia** (`clientTransferProhibited` está activo) | Técnico | 17–20 ago | A2 |
| ☐ B7 | Anotar la URL de la carpeta de administración + credenciales del backoffice | Luis | 19 ago | B1 |
| ☐ B8 | Exportar los PDF de facturas de PrestaShop (conservación fiscal obligatoria, 4 años) | Luis | 20 ago | B7 |
| ☐ B9 | Anotar la versión exacta de PHP y de MySQL/MariaDB del servidor viejo | Luis | 19 ago | B1 |

> ⚠️ **B4 no es opcional.** Un backup sin verificar no es un backup. Es el error que hunde migraciones: descubrir el 8 de septiembre que el `.sql` estaba truncado.

---

## BLOQUE C — Hosting nuevo · 18–21 ago · 🟠 P1 · en paralelo con B

| ID | Tarea | Quién | Fecha | Depende |
|---|---|---|---|---|
| ☐ C1 | Llamar a Raiola y Dinahosting/Webempresa. Las 4 preguntas: **PHP 7.4 seleccionable**, migración incluida, correo incluido, **precio de renovación del 2º año** | Luis | 18 ago | — |
| ☐ C2 | Decidir proveedor y plan (entrada, 6–9 €/mes) | Luis | 19 ago | C1 |
| ☐ C3 | **Contratar a nombre del amigo, con su tarjeta y sus datos** | Amigo | 20 ago | C2, A1 |
| ☐ C4 | Verificar en el panel nuevo: PHP 7.4 activo y versión de MySQL compatible con B9 | Luis | 20 ago | C3, B9 |
| ☐ C5 | Abrir la solicitud de migración asistida y entregarles los accesos | Luis | 21 ago | C3, B1 |

---

## BLOQUE D — Montar y probar en oscuro · 21–25 ago · 🟠 P1

Todo esto ocurre **sin tocar el DNS**. El mundo sigue viendo la web vieja.

| ID | Tarea | Quién | Fecha | Depende |
|---|---|---|---|---|
| ☐ D1 | Subir los ficheros al servidor nuevo | Luis/Hosting | 21 ago | B2, C3 |
| ☐ D2 | Importar la base de datos | Luis/Hosting | 21 ago | B3, C3 |
| ☐ D3 | Ajustar `app/config/parameters.php` con las credenciales nuevas de BD | Luis | 22 ago | D2 |
| ☐ D4 | Revisar `ps_shop_url` en la BD (dominio y ruta física) | Luis | 22 ago | D2 |
| ☐ D5 | Vaciar la caché de PrestaShop (`var/cache/`) | Luis | 22 ago | D3 |
| ☐ D6 | Apuntar el fichero `hosts` local al servidor nuevo y abrir la web | Luis | 22 ago | D5 |
| ☐ **D7** | **🔥 Verificar que SE VEN LAS FOTOS de producto.** Es la prueba de fuego de toda la migración | Luis | 22 ago | D6 |
| ☐ D8 | Probar el recorrido completo: portada → categoría → ficha → carrito → checkout hasta la pantalla de pago | Luis | 23 ago | D6 |
| ☐ D9 | Revisar los logs en busca de errores 500 y 404 | Luis | 23 ago | D6 |
| ☐ D10 | Verificar que el SSL funciona en el servidor nuevo | Luis | 23 ago | D6 |
| ☐ D11 | Comprobar permisos de carpetas y que se pueden subir imágenes desde el backoffice | Luis | 24 ago | D6 |

---

## BLOQUE E — Correo · 21–26 ago · 🟠 P1

**La estrategia depende de A3.** Si el histórico no está en el servidor, este bloque se reduce a E2 + E4 y te ahorras días de trabajo.

| ID | Tarea | Quién | Fecha | Depende |
|---|---|---|---|---|
| ☐ E1 | **Decidir**: ¿migrar el histórico, o solo crear un buzón redirigido al Outlook? | Luis | 18 ago | A3, A4 |
| ☐ E2 | Crear los buzones @kamusino.com en el hosting nuevo | Luis | 21 ago | C3, A3 |
| ☐ E3 | Si hay histórico: descargarlo con Thunderbird o imapsync **antes del 10 sept** | Luis | 22–25 ago | E1, A4 |
| ☐ E4 | Configurar la redirección al Outlook del amigo | Luis | 22 ago | E2 |
| ☐ E5 | Configurar el SPF nuevo. Añadir DKIM y DMARC, que hoy **no existen** | Luis | 25 ago | E2 |
| ☐ E6 | Revisar desde qué dirección envía PrestaShop y corregirla si apunta a algo que va a morir | Luis | 23 ago | D2, A1 |
| ☐ E7 | Probar envío y recepción reales en el servidor nuevo | Luis | 25 ago | E2, E5 |

---

## BLOQUE F — Pagos y terceros · antes del DNS · 🔴 P0 parcial

| ID | Tarea | Quién | Fecha | Depende |
|---|---|---|---|---|
| ☐ F1 | Identificar las pasarelas de pago activas en el backoffice | Luis | 20 ago | B7 |
| ☐ **F2** | **Si el TPV del banco tiene la IP dada de alta: avisar al banco del cambio con antelación.** Si no, los cobros fallan el día del cambio | Amigo | 21 ago | F1, C3 |
| ☐ F3 | Comprobar si las licencias del tema Warehouse y los módulos IQIT están atadas a dominio o IP, y reactivarlas | Luis | 23 ago | B7 |
| ☐ F4 | Revisar integraciones de transportistas y cualquier conexión con contabilidad o ERP | Luis | 23 ago | B7, A8 |
| ☐ F5 | Comprobar si hay tareas programadas (cron) que haya que recrear | Luis | 23 ago | B1 |

---

## BLOQUE G — Cambio de DNS · 24–28 ago · 🔴 P0

| ID | Tarea | Quién | Fecha | Depende |
|---|---|---|---|---|
| ☐ G1 | **Bajar el TTL del DNS a 300 s.** Hoy está a 86400 (1 día): sin esto, revertir un fallo tarda 24 h | Luis | 24 ago | B1 |
| ☐ G2 | Todo el bloque D verificado y en verde | Luis | 25 ago | D7, D8 |
| ☐ G3 | **Cambiar los registros A (dominio y www) al servidor nuevo.** De noche | Luis | 26 ago | G1, G2 |
| ☐ G4 | Cambiar los MX si el correo también se mueve | Luis | 26 ago | G3, E7 |
| ☐ G5 | Verificar la propagación del DNS | Luis | 26–27 ago | G3 |
| ☐ G6 | Emitir el SSL definitivo (Let's Encrypt) sobre el dominio real | Luis | 27 ago | G5 |
| ☐ G7 | **UAT completo** con el DNS ya cambiado: fotos, carrito, checkout, correo entrante y saliente | Luis | 27 ago | G6 |
| ☐ G8 | Vigilar logs y pedidos durante 48 h | Luis | 27–29 ago | G7 |

---

## BLOQUE H — Transferencia del dominio · 27 ago – 5 sept · 🔴 P0

| ID | Tarea | Quién | Fecha | Depende |
|---|---|---|---|---|
| ☐ H1 | Iniciar la transferencia con el AuthCode al registrador nuevo | Luis | 27 ago | B6, G5 |
| ☐ H2 | Aprobar el email de confirmación de transferencia (llega al contacto administrativo) | Amigo | 28 ago | H1 |
| ☐ H3 | Verificar que el dominio ha quedado **a nombre del amigo** | Luis | 3 sept | H2 |
| ☐ **H4** | **Activar la renovación automática. El dominio caduca el 26 de noviembre de 2026** | Amigo | 3 sept | H3 |
| ☐ H5 | Actualizar el email de contacto administrativo a uno que funcione de verdad | Luis | 3 sept | H3, E2 |
| ☐ H6 | Decidir qué hacer con `kamusino.es` según lo que conteste el técnico: recuperarlo o dejarlo | Luis | 3 sept | A2 |

> ⚠️ **H4 es la tarea más fácil de olvidar y la más cara.** Todo el trabajo de agosto se pierde en noviembre si nadie renueva el dominio.

---

## BLOQUE I — Reparaciones · 28 ago – 5 sept · 🟡 P2

Esto ya no es mudanza. Es lo que deja la tienda mejor de como estaba.

| ID | Tarea | Quién | Fecha | Depende |
|---|---|---|---|---|
| ☐ I1 | Reescribir los **6 enlaces a `kamusino.es`** de la portada | Luis | 28 ago | G7 |
| ☐ I2 | Quitar los banners caducados (Halloween, San Valentín) | Luis | 28 ago | G7 |
| ☐ I3 | Regenerar el `sitemap.xml` | Luis | 29 ago | G7 |
| ☐ I4 | Poner `title` y `meta description` de verdad | Luis | 29 ago | G7 |
| ☐ I5 | Revisar el `robots.txt` | Luis | 29 ago | G7 |
| ☐ I6 | Dar de alta en Google Search Console y enviar el sitemap | Luis | 1 sept | I3 |
| ☐ I7 | Comprobar que las redirecciones y las URLs amigables siguen funcionando | Luis | 1 sept | G7 |

---

## BLOQUE J — Cierre y entrega · 5–25 sept · 🟡 P2

| ID | Tarea | Quién | Fecha | Depende |
|---|---|---|---|---|
| ☐ J1 | **Aviso por escrito** de los temas legales: cookies sin botón de rechazo (AEPD) + faltan privacidad, condiciones de contratación, cookies y devoluciones | Luis | 5 sept | — |
| ☐ J2 | **Aviso por escrito** de la deuda técnica: PrestaShop 1.7.7.8 y PHP 7.4 sin parches de seguridad | Luis | 5 sept | — |
| ☐ J3 | Comprobar que el backup automático del hosting nuevo está activo y funciona | Luis | 5 sept | C3 |
| ☐ **J4** | **8 de septiembre: última comprobación de que no queda NADA por rescatar del servidor viejo** | Luis | 8 sept | todo |
| ☐ J5 | 10 sept: apagan el viejo. Verificar que la tienda y el correo siguen funcionando | Luis | 10 sept | J4 |
| ☐ J6 | Entregar todas las credenciales documentadas al amigo | Luis | 15 sept | J5 |
| ☐ J7 | Revisión a los 15 días: pedidos, correo, logs | Luis | 25 sept | J5 |

---

## ⚠️ Riesgos abiertos

| Riesgo | Impacto | Mitigación | Tarea |
|---|---|---|---|
| El técnico no contesta en agosto | Sin backup ni AuthCode → no hay migración | Llamada telefónica el 17. Si falla, ir a Acens directamente como titular | A6, A5 |
| El dominio está a nombre del técnico | Se puede perder el negocio entero | Confirmar por factura antes que nada | A5 |
| El correo histórico está en el servidor | Se pierde para siempre el 10 sept | Comprobar el webmail el 16 ago | A3, E3 |
| El TPV tiene la IP dada de alta en el banco | Dejan de entrar cobros el día del cambio | Avisar al banco antes del 26 ago | F2 |
| PrestaShop envía desde una @kamusino.com que se muere | Los clientes dejan de recibir confirmaciones de pedido | Revisar la configuración de envío | E6 |
| Nadie renueva el dominio en noviembre | Se cae todo tres meses después | Renovación automática | H4 |
| El hosting nuevo no tiene PHP 7.4 | La tienda no arranca | Preguntarlo **antes** de contratar | C1 |

---

## Datos verificados (15 ago)

- Web viva: HTTP 200, IP `82.194.68.32` · PrestaShop 1.7.7.8 · nginx
- Registrador: **Acens Technologies, S.L.U.** (grupo Telefónica), *no Arsys*
- Dominio: caduca **26 nov 2026**, con **bloqueo de transferencia activo**
- Titular: **oculto por RGPD**, no es consultable públicamente
- SSL: DigiCert DV hasta el 25 oct 2026
- DNS: TTL 86400 · SPF `redirect=spf.dominioabsoluto.net` · **sin DKIM ni DMARC**
- Correo: webmail en **Open-Xchange App Suite**, `http://webmail.kamusino.com/appsuite/`. Puertos IMAP y POP3 cerrados desde fuera en `mx` y en el host del webmail → el servidor real es otro, y su nombre está en el Outlook del amigo
- Único email en toda la web pública: `tucamisetaonline@outlook.es`. **Ninguna @kamusino.com**
- `kamusino.es`: sin DNS. Si sigue registrado o no, no se puede saber sin whois de `.es`
- `kamusino.com` se registró el **26 nov 2024** → hipótesis: la tienda se mudó del `.es` al `.com` y los enlaces se quedaron a medias

## Registro

| Fecha | Qué pasó |
|---|---|
| 11 ago | Análisis técnico completo (docs `00`–`03`) |
| 15 ago | El técnico confirma apagado el **10 de septiembre**. `01` reescrito de ~40 preguntas a 5, y reorientado a pedir **acceso** en vez de backup. Creado `04`. Este fichero pasa de lista de etapas a backlog con dependencias. |
