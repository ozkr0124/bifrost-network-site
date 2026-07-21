# Backend en producción: landing externa (GitHub Pages) + backend en tu Proxmox

Esta guía cubre el escenario real: la landing vive en GitHub Pages con tu dominio propio,
y el backend de LibreSpeed vive en un LXC de tu Proxmox (`10.128.0.13`), expuesto por
port-forwarding en tu MikroTik — con un plus: tus propios suscriptores miden **dentro de tu
red**, sin salir a internet y volver a entrar, gracias a un override de DNS en tus resolutores
Unbound.

Dominio usado en esta guía: `speedtest.bifrostinternet.com` (ajusta si usas otro).

---

## 1. El LXC (10.128.0.13): nginx + certificado + backend

Instala el backend (Docker recomendado, ver `docker-compose.yml` de esta misma carpeta) y
ponle nginx delante con TLS real (necesario: la landing está en HTTPS y el navegador bloquea
por "mixed content" cualquier petición a un backend sin HTTPS).

```bash
# En el LXC (10.128.0.13)
cd speedtest-backend/
docker compose up -d   # backend de LibreSpeed en el puerto 8880 (host:contenedor 8880:8080)

# nginx + certbot (Ubuntu/Debian)
sudo apt install nginx certbot python3-certbot-nginx -y
```

Config de nginx para el dominio público (`/etc/nginx/sites-available/speedtest-bifrost`):

```nginx
server {
    listen 80;
    server_name speedtest.bifrostinternet.com;

    location / {
        proxy_pass http://127.0.0.1:8880/;

        # Streaming real (descarga/subida) — si nginx bufferea, los resultados salen mal.
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        client_max_body_size 100M;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/speedtest-bifrost /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Certificado real (certbot reescribe el server{} de arriba para agregar el bloque 443 solo):
sudo certbot --nginx -d speedtest.bifrostinternet.com
```

Con el certificado emitido, el bloque `80` queda como una simple redirección a HTTPS (el
bloque `443` se queda con la config real, sirviendo los archivos):

```nginx
server {
    listen 80;
    server_name speedtest.bifrostinternet.com;
    return 301 https://$host$request_uri;
}
```

No hace falta agregar cabeceras CORS en nginx — `garbage.php`/`empty.php`/`getIP.php` ya las
agregan ellos mismos cuando reciben `?cors=true` (que es justo lo que la landing les manda
automáticamente en modo producción — ver `js/speedtest.js`, variable `USE_PRODUCTION_BACKEND`).

---

## 2. MikroTik: port-forwarding (para que el mundo exterior llegue al LXC)

```routeros
/ip firewall nat
add chain=dstnat action=dst-nat to-addresses=10.128.0.13 to-ports=80 \
    protocol=tcp dst-address=<TU_IP_PUBLICA> dst-port=80 \
    comment="Bifrost speedtest - HTTP (solo para el reto ACME de certbot)"
add chain=dstnat action=dst-nat to-addresses=10.128.0.13 to-ports=443 \
    protocol=tcp dst-address=<TU_IP_PUBLICA> dst-port=443 \
    comment="Bifrost speedtest - HTTPS"
```

Y el DNS público del dominio (en tu proveedor de DNS, ej. donde tengas `bifrostinternet.com`):
un registro `A` de `speedtest.bifrostinternet.com` → tu IP pública.

---

## 3. Split-horizon DNS en Unbound (para que TUS suscriptores midan sin salir a internet)

Como me confirmaste: tus resolutores son `10.128.0.200` y `10.128.0.201`, corriendo Unbound,
y son los que reciben tus suscriptores vía DHCP/IPoE. Se agrega el mismo override en **ambos**
(si solo lo pones en uno, la mitad de tus clientes seguiría saliendo a internet
inconsistentemente).

En cada uno de los dos servidores, crea (o edita) este archivo:

`/etc/unbound/unbound.conf.d/bifrost-speedtest-override.conf`
```
# Bifröst Network — hace que speedtest.bifrostinternet.com resuelva a la IP INTERNA
# del backend para cualquier cliente que use este resolutor (nuestros suscriptores),
# en vez de salir a internet y volver a entrar por el port-forward público.
#
# "transparent" = solo responde de forma distinta para el/los registro(s) definidos en
# local-data; cualquier otra consulta (incluido cualquier otro subdominio de
# bifrostinternet.com) sigue resolviendo normal, por internet, como siempre.
local-zone: "speedtest.bifrostinternet.com." transparent
local-data: "speedtest.bifrostinternet.com. 300 IN A 10.128.0.13"
```

Verifica que `unbound.conf` incluya esa carpeta (suele venir así por defecto en Ubuntu/Debian):
```bash
grep -r "include.*unbound.conf.d" /etc/unbound/unbound.conf
```

Aplica el cambio sin caer el servicio:
```bash
sudo unbound-checkconf                 # valida sintaxis antes de aplicar
sudo unbound-control reload            # recarga en caliente (si unbound-control está habilitado)
# alternativa si no tienes unbound-control:
sudo systemctl restart unbound
```

Repite estos 3 comandos en el segundo resolutor (`10.128.0.201`).

### Verificar que funciona

Desde un equipo **dentro de tu red** (usando tus DNS):
```bash
dig @10.128.0.200 speedtest.bifrostinternet.com +short
dig @10.128.0.201 speedtest.bifrostinternet.com +short
# Ambos deben responder: 10.128.0.13
```

Desde **fuera de tu red** (celular con datos móviles, por ejemplo):
```bash
dig speedtest.bifrostinternet.com +short
# Debe responder tu IP PÚBLICA (la del port-forward), no la interna
```

Si ambos casos responden lo esperado, tus suscriptores miden 100% dentro de tu red, y
cualquier visitante externo mide correctamente contra tu IP pública — mismo dominio, dos
rutas distintas, todo transparente para el usuario.

---

## 4. NAT hairpin (opcional, red de seguridad)

Cubre el caso borde de un suscriptor que, por algún motivo, no usa tus DNS (DNS-over-HTTPS en
el navegador, DNS manual a 8.8.8.8, etc.) y termina resolviendo tu IP pública estando adentro
de tu red. Sin esta regla, ese caso específico podría no funcionar bien (problema clásico de
"hairpin NAT").

```routeros
/ip firewall nat
add chain=dstnat action=dst-nat to-addresses=10.128.0.13 to-ports=443 \
    protocol=tcp dst-address=<TU_IP_PUBLICA> dst-port=443 \
    src-address=<TU_RANGO_DE_SUSCRIPTORES> \
    comment="Bifrost speedtest - hairpin HTTPS"
add chain=srcnat action=masquerade \
    dst-address=10.128.0.13 src-address=<TU_RANGO_DE_SUSCRIPTORES> \
    comment="Bifrost speedtest - hairpin masquerade"
```

Ajusta `<TU_RANGO_DE_SUSCRIPTORES>` a tu(s) rango(s) real(es) de IP de clientes (o pools de
IPoE). Esta regla es un complemento, no un reemplazo del paso 3 — el DNS split-horizon ya
resuelve el caso normal; esto solo blinda el caso excepcional.

---

## 5. Aislar VLAN200 (suscriptores) de VLAN100 (gestión) — excepto lo estrictamente necesario

Si tus suscriptores (VLAN200, `100.64.0.0/10`) y tu red de gestión (VLAN100, `10.128.0.0/10`)
están en el mismo router con rutas conectadas entre sí (caso típico), por defecto **no hay
ningún aislamiento** entre ellas — cualquier suscriptor podría intentar llegar a tus OLT,
switches o servidores de gestión. Hay que bloquear eso explícitamente, dejando pasar solo lo
que el propio medidor de velocidad necesita.

**Importante:** la excepción no es solo el backend (`10.128.0.13`) — tus dos resolutores DNS
(`10.128.0.200` y `10.128.0.201`) también viven en `10.128.0.0/10`. Si los bloqueas junto con
el resto de la gestión, tus suscriptores dejan de poder resolver DNS por completo (incluyendo
el propio `speedtest.bifrostinternet.com`), rompiendo todo lo que armamos en la sección 3.

| IP | Puerto permitido | Para qué |
|---|---|---|
| `10.128.0.200` | 53 (UDP+TCP) | DNS |
| `10.128.0.201` | 53 (UDP+TCP) | DNS |
| `10.128.0.13` | 80, 443 (TCP) | Medidor de velocidad |

```routeros
# El orden importa: las excepciones (accept) deben ir ANTES del bloqueo general (drop).
/ip firewall filter
add chain=forward action=accept protocol=udp dst-port=53 src-address=100.64.0.0/10 dst-address=10.128.0.200 comment="Bifrost: VLAN200 -> DNS .200 (UDP)"
add chain=forward action=accept protocol=tcp dst-port=53 src-address=100.64.0.0/10 dst-address=10.128.0.200 comment="Bifrost: VLAN200 -> DNS .200 (TCP)"
add chain=forward action=accept protocol=udp dst-port=53 src-address=100.64.0.0/10 dst-address=10.128.0.201 comment="Bifrost: VLAN200 -> DNS .201 (UDP)"
add chain=forward action=accept protocol=tcp dst-port=53 src-address=100.64.0.0/10 dst-address=10.128.0.201 comment="Bifrost: VLAN200 -> DNS .201 (TCP)"
add chain=forward action=accept protocol=tcp dst-port=80,443 src-address=100.64.0.0/10 dst-address=10.128.0.13 comment="Bifrost: VLAN200 -> backend speedtest (80/443)"
add chain=forward action=drop src-address=100.64.0.0/10 dst-address=10.128.0.0/10 comment="Bifrost: bloquear VLAN200 -> resto de VLAN100 (gestion)"
```

### Verificar

```bash
# Desde un cliente en VLAN200 — esto debe seguir funcionando:
nslookup speedtest.bifrostinternet.com
curl -I https://speedtest.bifrostinternet.com/empty.php

# Y esto debe fallar por timeout (confirma que el bloqueo sí quedó activo):
curl -m 5 -I http://10.128.0.12
```

---

## Resumen del flujo final

| Quién pregunta | DNS que usa | Resuelve a | Camino que sigue el tráfico |
|---|---|---|---|
| Tu suscriptor | Unbound `.200`/`.201` (tuyo) | `10.128.0.13` (interna) | Directo dentro de tu red — nunca sale a internet |
| Visitante externo | Su propio DNS (Google, ISP, etc.) | Tu IP pública | Internet → tu MikroTik (port-forward) → LXC |
| Suscriptor con DNS externo (caso borde) | DNS externo | Tu IP pública, pero está adentro | Hairpin NAT (paso 4) lo redirige internamente |

El código de la landing (`js/speedtest.js`) no necesita saber nada de esto — siempre pide el
mismo `https://speedtest.bifrostinternet.com/...`, es la red la que decide el camino.
