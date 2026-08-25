# Qué pedirle al técnico

**Lo manda tu amigo, no tú.** Eso lo cambia todo: no puede defender preguntas técnicas ni interpretar las respuestas. Así que el email tiene que ser corto, sin jerga, y con **una sola cosa urgente** al principio.

Un email de 40 preguntas a alguien que está cerrando el negocio en agosto no se contesta. Se contesta a tres cosas y se pierde el resto.

---

## 1. La selección: qué necesitamos de verdad

He revisado las ~40 preguntas de la versión anterior. Quedan **5**. El resto sale de otro sitio.

### 🔴 Solo él puede darlo — irreemplazable

| # | Qué | Por qué no hay alternativa |
|---|---|---|
| 1 | **UN ACCESO**: panel de control, o FTP + phpMyAdmin, o el backoffice de PrestaShop | Con cualquiera de los tres **nos hacemos el backup nosotros**. La base de datos es imposible de obtener desde fuera, y sin ella no hay tienda. El backup, como plan B |
| 2 | **Listado de dominios + AuthCode de cada uno** + quitar el bloqueo de transferencia | ✅ Confirmado: `kamusino.com` tiene el bloqueo `clientTransferProhibited` puesto. Y él dijo "dominios" en plural: hay que saber cuáles son |
| 3 | **Contraseñas de los buzones de correo** | El correo no viaja en el backup de la web, y su servidor también se apaga |
| 4 | **¿El correo se apaga también el 10, o en otra fecha?** | Dijo "servidores" en plural. Son dos máquinas distintas y podrían caer en fechas distintas |
| 5 | **¿Es una cuenta de revendedor? ¿Se puede traspasar a nombre del cliente?** | Es la pregunta con más premio: si se puede traspasar, **no hay migración que hacer** |

> 💡 **Por qué "acceso" y no "backup":** el técnico dijo *"decidnos qué necesitáis y os lo facilito"* y *"llevaos lo vuestro"*. Se ofrece a **facilitar**, no a **trabajar**. Darte una contraseña son 30 segundos y entra en lo que ofrece. Hacerte un volcado de base de datos es un encargo — y en agosto, cerrando el negocio, ahí es donde se atasca. Pide lo que le resulte fácil decir que sí.
>
> Además, el acceso te sirve **después**: cuando abras el backup y falte algo (siempre falta algo), lo resuelves solo en vez de volver a escribirle en septiembre.

### ✅ Ya lo sé — no hace falta preguntarlo (verificado hoy, 15 ago)

| Pregunta vieja | Respuesta, ya obtenida |
|---|---|
| ¿Registrador del dominio? | **Acens Technologies, S.L.U.** (IANA 140, grupo Telefónica) |
| ¿Fecha de renovación? | **26 de noviembre de 2026** |
| ¿Bloqueo de transferencia? | **Sí, activo** (`clientTransferProhibited`) |
| Export de la zona DNS | Reconstruida entera. Ver tabla abajo |
| ¿Hay DKIM y DMARC? | **No hay DMARC. No hay DKIM** en el selector estándar |
| ¿Qué SSL tiene y cuándo caduca? | DigiCert DV, **caduca el 25 oct 2026**. Es de los que incluye el hosting |
| ¿Servidores de correo? | mx `217.116.0.227`, smtp `217.116.0.228`, webmail `217.116.0.155` |
| ¿Versión de PHP / MySQL? | Viene dentro del backup |
| ¿Hay overrides o módulos a medida? | Se ve en el backup (carpeta `/override`) |
| ¿Tamaño de la web? | Se ve al recibir el backup |
| ¿URL de la carpeta admin? | Se ve en el listado de carpetas del backup. La contraseña se resetea por base de datos |
| ¿Config de nginx? | Ya no hace falta: era para diagnosticar las fotos, y ya está diagnosticado. El hosting nuevo usa la suya |

**Zona DNS de kamusino.com, reconstruida:**

```
NS    ns10 / ns11 / ns12.servicio-online.net
A     kamusino.com        82.194.68.32
A     www                 82.194.68.32
A     ftp                 82.194.68.32
A     mx                  217.116.0.227
A     smtp                217.116.0.228
A     webmail             217.116.0.155
MX    10 mx.kamusino.com
TXT   v=spf1 redirect=spf.dominioabsoluto.net
TTL por defecto: 86400 (1 día)  ← hay que bajarlo a 300 antes de migrar
```

⚠️ **Corrección al documento `00`:** ahí ponía "todo apunta a Arsys, a confirmar". Ya está confirmado y **no es Arsys, es Acens** (Telefónica). Importa si hay que escalar por encima del técnico.

### 👤 Se lo preguntas a tu amigo, no al técnico

Cuánto paga al año · pasarelas de pago activas · qué cuentas de correo usa de verdad · pedidos al mes · si tiene Google Analytics o Search Console · transportistas o ERP · a nombre de quién está el dominio *(lo dice su factura)*.

Están en `04-MENSAJE-AL-CLIENTE.md`.

---

## 2. ✉️ El email — para que lo mande tu amigo

Escrito en su voz. Sin tecnicismos. Que lo copie y lo pegue tal cual.

> **Asunto: kamusino — accesos para llevarnos todo antes del 10 de septiembre**
>
> Hola,
>
> Gracias por avisar con tiempo. Nos llevamos la web, el correo y los dominios antes del 10 de septiembre.
>
> **Lo que más me ayudaría, y es lo más rápido para ti: dame un acceso y me lo descargo yo todo, sin molestarte más.** Con cualquiera de estos tres me vale:
>
> - el panel de control del hosting, o
> - FTP + phpMyAdmin, o
> - el backoffice de PrestaShop (con la dirección de la carpeta de administración, que no la tengo)
>
> Si prefieres mandarme tú una copia de seguridad completa (archivos + base de datos) por WeTransfer, también me vale.
>
> Y una pregunta que nos puede ahorrar el trabajo a los dos: veo que los dominios están en Acens. **¿Tienes cuenta de revendedor con ellos? ¿Se podría pasar la cuenta a mi nombre** en lugar de mudarlo todo?
>
> Aparte de eso, cuatro cosas:
>
> 1. **¿Qué dominios tenéis exactamente a mi nombre?** Me interesa saber sobre todo si **kamusino.es sigue registrado**, porque muchos enlaces de la web todavía apuntan ahí y por eso no funcionan.
>
> 2. De cada dominio necesito el **código de autorización (AuthCode)** y que **quites el bloqueo de transferencia**. kamusino.com lo tiene puesto y sin quitarlo no lo puedo mover a otro sitio.
>
> 3. Las **contraseñas de los buzones de correo** de kamusino.com.
>
> 4. **¿El servidor de correo se apaga también el 10 de septiembre?** Veo que está en una máquina distinta a la de la web y quiero asegurarme de las fechas.
>
> Si te va mejor por teléfono, dime cuándo te llamo.
>
> Gracias,
> [nombre]

## ✉️ Fin del email

---

## 3. Ronda 2 — solo si contesta

No mandes esto ahora. Va después, y solo si respondió a la primera. Si contestó, ya sabes que colabora y puedes pedir con más detalle:

- Accesos: FTP/SSH y panel de control
- Usuario del backoffice de PrestaShop y la dirección exacta de la carpeta de administración
- ¿Hay tareas programadas (cron)?
- ¿Hay algo más en ese servidor aparte de la tienda?
- Licencias del tema Warehouse y de los módulos IQIT: ¿en qué cuenta se compraron?
- ¿Alguna pasarela de pago tiene la IP del servidor dada de alta en el banco?

Casi todo esto se puede sacar del backup o reconstruir. Por eso va en la ronda 2 y no en la 1.

---

## 4. Si no contesta

Es agosto y está cerrando. Cuenta con ello.

| Cuándo | Qué hacer |
|---|---|
| No contesta en 24 h | **Llamar por teléfono.** Pedirle a tu amigo el móvil del técnico ya |
| No contesta en 48 h | Tu amigo llama a **Acens directamente** como titular. El registrador es Acens Technologies, grupo Telefónica. Si el dominio está a su nombre, Acens puede darle el control sin pasar por el técnico |
| Sigue sin haber backup | Con acceso FTP o al panel se puede bajar todo sin él. Es la vía alternativa: **prioriza conseguir un acceso**, no solo el fichero |

🚩 **Aviso:** el dominio caduca el **26 de noviembre de 2026**. Si nadie lo renueva porque el técnico ya cerró, se pierde. No es urgente esta semana, pero no se puede olvidar.
