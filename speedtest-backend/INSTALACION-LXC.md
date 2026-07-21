# Instalación del backend en el LXC (10.128.0.13) — nginx + PHP-FPM, sin Docker

Guía paso a paso para este LXC específico. Asume Ubuntu 22.04 (igual que tus otros
servidores). Los 3 archivos PHP ya los tienes en `speedtest-backend/php-manual/` de este
mismo proyecto — solo hay que subirlos al servidor.

---

## 0. Antes de empezar (en Proxmox, no dentro del LXC)

Si el LXC ya existe y NO habilitaste `nesting`/`keyctl` porque decidiste ir por PHP-FPM en
vez de Docker: no los necesitas. Esas dos casillas son solo para poder correr Docker
anidado — con PHP-FPM nativo no aplica, puedes dejarlas apagadas (más seguro, menos superficie
de ataque).

---

## 1. Paquetes base

Conéctate por SSH al LXC (10.128.0.13) y actualiza:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx php-fpm php-cli curl
```

Verifica qué versión de PHP-FPM quedó instalada (Ubuntu 22.04 trae 8.1 por defecto) y anota
la ruta de su socket — la vas a necesitar en la config de nginx:

```bash
php -v
ls /run/php/
# Deberías ver algo como: php8.1-fpm.sock
```

---

## 2. Subir los archivos del backend

Desde tu máquina (donde tienes el proyecto de la landing), copia la carpeta php-manual/:

```bash
# Desde tu máquina local, dentro de la carpeta del proyecto:
scp -r speedtest-backend/php-manual/ usuario@10.128.0.13:/tmp/speedtest-backend
```

Ya en el LXC:

```bash
sudo mkdir -p /var/www/speedtest-backend
sudo cp /tmp/speedtest-backend/*.php /var/www/speedtest-backend/
sudo rm -rf /tmp/speedtest-backend

sudo chown -R www-data:www-data /var/www/speedtest-backend
sudo chmod -R 755 /var/www/speedtest-backend

ls -la /var/www/speedtest-backend/
# Deberías ver: garbage.php, empty.php, getIP.php, LICENSE
```

---

## 3. Afinar el pool de PHP-FPM (paso importante, no te lo saltes)

El pool por defecto de Ubuntu (www.conf) viene pensado para una app web normal, con muy
pocos procesos hijos (pm.max_children suele ser 5). Para un medidor de velocidad, eso es
un cuello de botella invisible: cada prueba abre ~6 conexiones paralelas, así que con solo
5 workers disponibles, una sola persona probando ya satura el pool y las siguientes pruebas
se quedan esperando.

Edita el pool (ajusta 8.1 a tu versión real de PHP si es distinta):

```bash
sudo nano /etc/php/8.1/fpm/pool.d/www.conf
```

Busca y cambia estos valores (con 4 vCPU / 2 GB RAM que ya configuramos en el LXC, esto es
holgado sin sobre-asignar memoria — cada worker de estos scripts tan simples consume muy poco):

```ini
pm = dynamic
pm.max_children = 200
pm.start_servers = 20
pm.min_spare_servers = 10
pm.max_spare_servers = 40
pm.max_requests = 1000
```

Reinicia PHP-FPM para aplicar:

```bash
sudo systemctl restart php8.1-fpm
```

---

## 4. Certificado HTTPS (DNS-01, sin necesitar el puerto 80 abierto)

Como en tu caso el port-forwarding aún no estaba listo, el certificado se emite por
**DNS-01** (crear un TXT en tu DNS público) en vez del método HTTP-01 normal — así Let's
Encrypt valida el dominio sin necesitar conectarse a tu servidor para nada.

```bash
sudo apt install -y certbot
sudo certbot certonly --manual --preferred-challenges dns -d speedtest.bifrostinternet.com
```

Certbot te va a mostrar un texto para crear como registro TXT
(`_acme-challenge.speedtest.bifrostinternet.com`) en el panel DNS donde administras el
dominio (en tu caso, GoDaddy). Créalo, confirma que ya propagó con
`dig TXT _acme-challenge.speedtest.bifrostinternet.com +short`, y ahí sí presiona Enter en
certbot para que termine de emitir el certificado.

> **Importante — renovación:** con `--manual`, el certificado **no se renueva solo**. Dura 90
> días — repite este mismo proceso antes de que venza (revisa la fecha con
> `sudo certbot certificates`). Si GoDaddy termina de estabilizar su API de "Personal Access
> Tokens", vale la pena revisar en su momento si el plugin `certbot-dns-godaddy` ya automatiza
> esto por completo (evitando el proceso manual cada 90 días).

Confirma dónde quedaron los archivos del certificado:

```bash
sudo certbot certificates
# Certificate Path: /etc/letsencrypt/live/speedtest.bifrostinternet.com/fullchain.pem
# Private Key Path: /etc/letsencrypt/live/speedtest.bifrostinternet.com/privkey.pem
```

---

## 5. Configurar nginx (los dos bloques: HTTPS + redirección desde HTTP)

```bash
sudo nano /etc/nginx/sites-available/speedtest-bifrost
```

```nginx
# Bloque 1: todo lo que llegue por HTTP se redirige a HTTPS
server {
    listen 80;
    server_name speedtest.bifrostinternet.com;
    return 301 https://$host$request_uri;
}

# Bloque 2: el sitio real, con el certificado
server {
    listen 443 ssl;
    server_name speedtest.bifrostinternet.com;

    ssl_certificate     /etc/letsencrypt/live/speedtest.bifrostinternet.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/speedtest.bifrostinternet.com/privkey.pem;

    root /var/www/speedtest-backend;
    client_max_body_size 100M;

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;

        fastcgi_buffering off;
        fastcgi_request_buffering off;
        fastcgi_read_timeout 60s;
        fastcgi_send_timeout 60s;
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Nota: ajusta la ruta del socket (`php8.3-fpm.sock`) a tu versión real de PHP si es distinta
(verifica con `ls /run/php/` como en el paso 1).

Actívalo:

```bash
sudo ln -s /etc/nginx/sites-available/speedtest-bifrost /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### IMPORTANTE: quita el sitio "default" de Ubuntu

nginx en Ubuntu viene con un sitio `default` habilitado (`listen 80 default_server;`,
sirviendo `/var/www/html`). Como tu bloque nuevo usa `server_name speedtest.bifrostinternet.com`
específico, cualquier petición con un `Host` distinto (por ejemplo `curl http://localhost/...`,
o pegarle directo por IP) cae en ese sitio `default` en vez del tuyo — y como `/var/www/html`
no tiene tus archivos PHP, responde 404. Esto es justo lo que pasa si pruebas con
`curl http://localhost/empty.php` sin especificar el Host correcto.

Como este LXC está dedicado 100% a este backend, lo más simple es quitar el sitio default
por completo, para que cualquier petición caiga en tu bloque sin importar el Host:

```bash
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. Firewall (si usas UFW en este LXC)

```bash
sudo ufw allow 'Nginx Full'
sudo ufw status
```

(El filtrado real de quién llega hasta aquí ya lo controla tu MikroTik con el port-forward —
esto es solo el firewall local del propio LXC, como capa adicional.)

---

## 7. Verificar que todo responde

Con el sitio default ya eliminado (paso 5), esto debería funcionar directo, sin necesidad de
especificar el Host manualmente:

```bash
curl -I http://localhost/empty.php
curl -I "http://localhost/garbage.php?ckSize=4"
curl http://localhost/getIP.php

# La redirección HTTP -> HTTPS:
curl -I http://speedtest.bifrostinternet.com/empty.php
# Debe responder 301 Moved Permanently con Location: https://...

# Y ya con HTTPS real:
curl -I https://speedtest.bifrostinternet.com/empty.php
curl -I "https://speedtest.bifrostinternet.com/garbage.php?ckSize=4"
curl https://speedtest.bifrostinternet.com/getIP.php
```

Todos deben responder 200 OK (excepto la redirección, que es 301 — eso es lo correcto).

Si por algún motivo sigues viendo 404 después de quitar el default, verifica:
```bash
sudo nginx -T | grep -A2 "server_name speedtest"
```
para confirmar que tu bloque realmente está cargado y sin errores de sintaxis por encima.

---

## 8. Aislar VLAN200 (suscriptores) de VLAN100 (gestión) en el MikroTik

Con el backend ya funcionando, el paso de seguridad final: bloquear que tus suscriptores
(VLAN200, `100.64.0.0/10`) lleguen a cualquier cosa de tu red de gestión (VLAN100,
`10.128.0.0/10` — tus OLT, switches, servidores) **excepto** lo estrictamente necesario para
que el medidor de velocidad funcione: los dos resolutores DNS y el backend mismo.

```routeros
/ip firewall filter
add chain=forward action=accept protocol=udp dst-port=53 src-address=100.64.0.0/10 dst-address=10.128.0.200 comment="Bifrost: VLAN200 -> DNS .200 (UDP)"
add chain=forward action=accept protocol=tcp dst-port=53 src-address=100.64.0.0/10 dst-address=10.128.0.200 comment="Bifrost: VLAN200 -> DNS .200 (TCP)"
add chain=forward action=accept protocol=udp dst-port=53 src-address=100.64.0.0/10 dst-address=10.128.0.201 comment="Bifrost: VLAN200 -> DNS .201 (UDP)"
add chain=forward action=accept protocol=tcp dst-port=53 src-address=100.64.0.0/10 dst-address=10.128.0.201 comment="Bifrost: VLAN200 -> DNS .201 (TCP)"
add chain=forward action=accept protocol=tcp dst-port=80,443 src-address=100.64.0.0/10 dst-address=10.128.0.13 comment="Bifrost: VLAN200 -> backend speedtest (80/443)"
add chain=forward action=drop src-address=100.64.0.0/10 dst-address=10.128.0.0/10 comment="Bifrost: bloquear VLAN200 -> resto de VLAN100 (gestion)"
```

**El orden importa:** las 5 reglas de `accept` (excepciones) tienen que quedar **antes** que
la de `drop` (bloqueo general) — RouterOS evalúa de arriba hacia abajo y aplica la primera
que coincida. Si el `drop` quedara primero, ni siquiera las excepciones funcionarían.

Nota importante: la excepción no es solo el backend (`10.128.0.13`) — también hay que dejar
pasar los dos resolutores DNS (`10.128.0.200`/`10.128.0.201`, solo puerto 53), porque también
viven dentro de `10.128.0.0/10`. Sin esa excepción, el bloqueo general habría cortado el DNS
de tus suscriptores por completo, rompiendo no solo el medidor de velocidad sino la resolución
de nombres para toda la red.

Verificación:

```bash
# Desde un cliente en VLAN200 — esto debe seguir funcionando:
nslookup speedtest.bifrostinternet.com
curl -I https://speedtest.bifrostinternet.com/empty.php

# Y esto debe fallar por timeout (prueba con cualquier otra IP de gestión):
curl -m 5 -I http://10.128.0.12
```

---

## 9. Estado final

Con los pasos 1-8 completos, el flujo entero quedó verificado de punta a punta:
suscriptor entra a la landing → resuelve por tu Unbound → mide contra tu propio backend en
`10.128.0.13`, con HTTPS válido, sin salir a internet, y sin poder alcanzar el resto de tu
red de gestión. `USE_PRODUCTION_BACKEND` ya está en `true` en `js/speedtest.js`.

Lo único que queda pendiente es la renovación del certificado antes de que venza (ver nota
en el paso 4) — márcalo en tu calendario.

---

## Mantenimiento

- Actualizar los archivos PHP: repite el paso 2 con los archivos actualizados, no hay
  que reconstruir ninguna imagen.
- Logs de nginx: /var/log/nginx/access.log y error.log.
- Reiniciar todo: sudo systemctl restart php8.1-fpm nginx.
