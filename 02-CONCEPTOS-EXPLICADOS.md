# Conceptos explicados en cristiano

Preguntaste *"lo del DNS, ¿no es lo de PrestaShop?"*. No, son cosas distintas. Aquí va todo explicado desde cero, con la analogía que mejor funciona: **una tienda física**.

---

## La analogía maestra: una tienda en la calle

Una web es exactamente igual que una tienda física. Tiene cuatro piezas separadas, y **cada una se contrata a un sitio distinto y se muda por separado**. Ese es el motivo de que las migraciones se líen: la gente cree que es una cosa, y son cuatro.

| En la calle | En internet | En Kamusino |
|---|---|---|
| 🏢 **El local** | **Hosting / servidor** | El servidor que van a apagar |
| 🏠 **La dirección postal** | **Dominio** | `kamusino.com` |
| 🗺️ **El listín / Google Maps** | **DNS** | `ns10.servicio-online.net` |
| 🛒 **Los muebles y el género** | **PrestaShop + la base de datos** | PrestaShop 1.7.7.8 |

Con esto en la cabeza, ya se entiende todo lo demás.

---

## 1. El dominio — la dirección

**`kamusino.com` es el dominio.** Es el nombre que la gente escribe en el navegador.

Cosas que hay que entender:

- **No se compra, se alquila.** Se paga cada año (unos 10–15 €/año un `.com`). Si dejas de pagar, lo pierdes y cualquiera puede quedárselo.
- **Es independiente del hosting.** Puedes tener el dominio en un sitio y la web en otro. Es como tener la dirección reservada en el ayuntamiento y el local alquilado a otra empresa.
- **Tiene un titular.** Una persona o empresa concreta figura como dueño. **Este es EL punto crítico de vuestro caso.** Si el dominio está a nombre del técnico y no del cliente, técnicamente el dominio es suyo.
- **Para mudarlo hace falta un `AuthCode`** (también llamado EPP code o código de transferencia). Es una contraseña de un solo uso que demuestra que puedes mover el dominio. Sin él, no hay transferencia posible.

### ⚠️ El caso `kamusino.es`

He comprobado que **`kamusino.es` ya no funciona**. No tiene DNS, no resuelve a ninguna parte. Está caducado, cancelado o vendido.

El problema: **media portada de `kamusino.com` sigue enlazando a `kamusino.es`**. Los banners de "COMPRAR AHORA", el botón de WhatsApp, los enlaces de camisetas... todos apuntan a un dominio que ya no existe. Por eso "hay cosas que no funcionan".

---

## 2. El hosting — el local

**El hosting es el ordenador donde viven los archivos de la web.** Está encendido 24/7 en un centro de datos.

- Se paga mensual o anualmente.
- Cuando alguien escribe `kamusino.com`, su navegador acaba pidiéndole los archivos a ese ordenador.
- **Es lo que os están cerrando.** Toca cambiar de local.

Tipos:

| Tipo | Qué es | Precio |
|---|---|---|
| **Compartido** | Tu web comparte un servidor con otras 200. Barato y suficiente para tráfico bajo. | 5–25 €/mes |
| **VPS** | Un trozo de servidor solo para ti. Más potencia y control, pero lo administras tú. | 5–40 €/mes |
| **Dedicado / Cloud** | Un servidor entero. Innecesario aquí. | 80 €+/mes |

**Gestionado vs. no gestionado** es la distinción que de verdad importa:
- **Gestionado:** el proveedor se encarga de actualizaciones, seguridad, backups y soporte. Pagas más, duermes.
- **No gestionado:** te dan una máquina vacía y suerte. Pagas menos, mantienes tú.

---

## 3. El DNS — el listín telefónico 📖

**Esto es lo que preguntabas. No tiene nada que ver con PrestaShop.**

Los ordenadores no entienden de nombres, entienden de números. `kamusino.com` no significa nada para la red; lo que significa algo es `82.194.68.32`, que es la **dirección IP** del servidor.

**El DNS es la agenda que traduce nombres en números.**

Cuando alguien escribe `kamusino.com` en el navegador:

```
1. Navegador: "Oye DNS, ¿dónde está kamusino.com?"
2. DNS:       "En la IP 82.194.68.32"
3. Navegador: "Gracias" → va a esa IP y pide la web
```

**Por qué importa en una migración:** cuando muevas la web a un servidor nuevo, ese servidor tendrá una **IP nueva**. Si no actualizas el DNS, todo el mundo seguirá yendo al local viejo, que estará vacío o apagado.

**Cambiar el DNS es literalmente el momento de la mudanza.** Es el instante en que rediriges a todos los clientes de la puerta vieja a la puerta nueva.

### Los registros DNS que te vas a encontrar

Una zona DNS es una lista de reglas. Estas son las que importan:

| Registro | Para qué sirve | El de Kamusino ahora |
|---|---|---|
| **A** | Apunta el dominio a la IP del servidor web | `kamusino.com → 82.194.68.32` |
| **MX** | Dice a dónde va el **correo** del dominio | `mx.kamusino.com → 217.116.0.227` |
| **CNAME** | Un alias. "`www` es lo mismo que el dominio" | |
| **TXT / SPF** | Demuestra qué servidores pueden mandar correo en tu nombre. Sin esto, tus emails van a spam | `v=spf1 redirect=spf.dominioabsoluto.net` |
| **NS** | Dice **quién manda** sobre todo lo anterior | `ns10/11/12.servicio-online.net` |

### 🔴 El detalle que salva o hunde una migración

**Fíjate en que el registro A (la web, `82.194.68.32`) y el MX (el correo, `217.116.0.227`) apuntan a IPs DISTINTAS.**

Traducción: **la web y el correo están en máquinas diferentes.** Son dos mudanzas, no una.

Esto es la causa número uno de desastres en migraciones: alguien cambia el DNS para apuntar la web al servidor nuevo, arrastra sin darse cuenta el registro MX, y **el correo de la empresa deja de llegar durante días** sin que nadie sepa por qué. Los emails no se quedan esperando: rebotan y se pierden.

**Regla:** cuando toques el DNS, mueve el registro A y **deja el MX exactamente como está**, hasta que muevas el correo aparte y conscientemente.

### El TTL — el retardo de la mudanza

Cada registro DNS tiene un **TTL** (Time To Live): cuánto tiempo se guarda esa respuesta en caché por todo internet antes de volver a preguntar.

Si el TTL es de 24 horas y cambias la IP, hay gente que seguirá yendo al servidor viejo **durante 24 horas más**.

**Truco profesional:** 48 horas *antes* de la migración, baja el TTL a 300 segundos (5 minutos). Así, el día del cambio, todo el mundo se entera en 5 minutos en vez de en un día. Cuando termine y esté todo estable, lo vuelves a subir.

---

## 4. PrestaShop — los muebles y el género

**PrestaShop es el programa de la tienda.** Es software de código abierto (gratis) que gestiona catálogo, carrito, pedidos, clientes, facturas e impuestos.

Es una alternativa a Shopify, WooCommerce o Magento. La diferencia con Shopify es importante: **PrestaShop lo instalas en tu propio servidor**. Por eso hay que migrarlo a mano. Con Shopify no habría este problema (pero pagas 30 €/mes y no controlas nada).

PrestaShop tiene **dos mitades**, y las dos hay que mudarlas:

1. **Los archivos** — el programa, las fotos, el tema, los módulos. Son carpetas y ficheros, se copian.
2. **La base de datos (MySQL)** — productos, precios, stock, pedidos, clientes, textos. Es un fichero `.sql` que se exporta e importa.

**Si copias solo los archivos, tienes una tienda vacía. Si copias solo la base de datos, no tienes tienda. Hacen falta las dos.**

### El backoffice

Es el panel de administración, donde el dueño gestiona la tienda. Detalle importante: **PrestaShop renombra la carpeta de administración a algo aleatorio** (tipo `/admin7x9k2/`) por seguridad. Si no sabes esa URL, no puedes entrar aunque tengas usuario y contraseña. Por eso está en la lista de cosas que pedir al técnico.

### Dónde se mira la versión de PHP

Preguntabas cómo se mira. Dos formas:

1. **Desde el backoffice de PrestaShop** (la fácil): entra y ve a **Parámetros Avanzados → Información**. Ahí sale la versión de PHP, la de MySQL, la de PrestaShop y el estado del servidor. Todo en una pantalla.
2. **Desde el panel del hosting**: cPanel o Plesk tienen una sección "Selector de PHP" o "PHP Version" donde se ve la actual y las disponibles.

*(Yo no he podido verla desde fuera porque el servidor oculta esa cabecera, que por cierto es lo correcto: publicar la versión de PHP es una pista gratis para un atacante.)*

---

## 5. PHP — el idioma

**PHP es el lenguaje de programación en el que está escrito PrestaShop.** El servidor necesita tener PHP instalado para poder ejecutarlo, igual que necesitas Word instalado para abrir un `.docx`.

**Aquí está la restricción que condiciona toda la migración:**

| Versión de PrestaShop | PHP que soporta |
|---|---|
| **1.7.7.x ← el vuestro** | **PHP 7.1 – 7.4** |
| 1.7.8.x | PHP 7.1 – 8.0 |
| 8.x | PHP 8.0 – 8.2 |

PrestaShop 1.7.7.8 **no arranca con PHP 8**. Y **PHP 7.4 dejó de recibir parches de seguridad en noviembre de 2022**.

Consecuencia práctica: **hay que contratar un hosting que todavía ofrezca PHP 7.4**. Muchos hostings modernos ya solo dan 8.1 en adelante. Es la primera pregunta que hay que hacer antes de contratar nada.

---

## 6. El correo — la parte que nadie recuerda hasta que la rompe

El correo `@kamusino.com` va con el dominio, pero **lo sirve un servidor de correo**, que puede ser (y aquí lo es) distinto del de la web.

Dos formas de leer el correo, y la diferencia es crítica en una migración:

| | Dónde vive el correo | Riesgo al migrar |
|---|---|---|
| **IMAP** | En el servidor. El programa solo muestra una copia sincronizada. | Si apagan el servidor, **se pierde todo el histórico** |
| **POP3** | Se descarga al ordenador y (normalmente) se borra del servidor. | El histórico está en el portátil del cliente. Si se le muere el portátil, se acabó |

**Por eso hay que preguntar si es IMAP o POP3.** Si es IMAP, hay que **descargar todos los buzones antes del apagado**, porque el correo no se recupera. No hay papelera de reciclaje.

**Cómo se hace:** se configura cada cuenta en un cliente de correo (Thunderbird va perfecto y es gratis), se deja que se descargue todo, y se exporta. Luego se sube al servidor nuevo. Es tedioso pero no difícil.

---

## 7. SSL / HTTPS — el candado

El **certificado SSL** es lo que hace que salga `https://` y el candadito. Cifra la conexión.

- **Es obligatorio en una tienda online.** Sin él, Chrome marca la web como "No segura" y nadie compra.
- Hoy es gratis: **Let's Encrypt** lo da sin coste y todos los hostings decentes lo incluyen y lo renuevan solos.
- Se emite para un dominio concreto, así que **se pide de nuevo en el servidor nuevo**. No se muda.
- **Ojo con el orden:** hay hostings que no pueden emitir el certificado hasta que el DNS ya apunte a ellos. Eso significa que puede haber unos minutos entre el cambio de DNS y el candado. Se resuelve pidiendo el certificado inmediatamente después del cambio, de noche.

---

## 8. Glosario rápido

| Término | En cristiano |
|---|---|
| **Registrador** | La empresa donde alquilas el dominio |
| **AuthCode / EPP** | Contraseña de un solo uso para mudar un dominio |
| **Zona DNS** | El conjunto de reglas de un dominio |
| **TTL** | Cuánto tarda internet en enterarse de un cambio de DNS |
| **Propagación** | El rato (minutos u horas) en que unos ven la web nueva y otros la vieja |
| **FTP / SFTP** | Protocolo para subir y bajar archivos del servidor |
| **SSH** | Consola remota. Da acceso total. Con SSH una migración tarda minutos; sin él, horas |
| **cPanel / Plesk** | Paneles de control del hosting. La versión con botones de lo que SSH hace por consola |
| **Dump SQL** | El fichero `.sql` con toda la base de datos exportada |
| **phpMyAdmin** | Herramienta web para manejar la base de datos sin consola |
| **nginx / Apache** | Los dos programas servidores web más usados. Kamusino usa nginx |
| **Rewrite rules** | Reglas que traducen URLs bonitas a rutas reales. **Las que faltan en Kamusino y por eso no se ven las fotos** |
| **Backoffice** | El panel de administración de PrestaShop |
| **Módulo** | Un complemento de PrestaShop (métodos de pago, menús, valoraciones...) |
| **Override** | Código a medida que modifica el comportamiento estándar de PrestaShop |
| **Propagación DNS** | Ver *TTL*. Es lo mismo dicho de otra forma |

---

## 9. Resumen: qué se muda y qué no

| Pieza | ¿Se muda? | Cómo |
|---|---|---|
| 🏠 Dominio `kamusino.com` | Sí | Transferencia con AuthCode |
| 🗺️ DNS | Sí | Se apunta a los servidores nuevos |
| 🏢 Archivos de la web | Sí | Copia por FTP/SSH |
| 🛒 Base de datos | Sí | Export + import de un `.sql` |
| ✉️ Cuentas de correo | Sí | Se recrean + se copian los buzones |
| 🔒 Certificado SSL | **No** | Se emite uno nuevo, gratis |
| 📧 Correo antiguo | **Solo si lo descargas antes** | ⚠️ Si no, se pierde |
| ⚙️ Configuración del servidor | **No** | Se reconfigura. *Y aquí es donde se arreglan las fotos rotas* |
