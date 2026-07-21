# Backend de medición de velocidad (LibreSpeed) — Guía de despliegue

Esta carpeta contiene todo lo necesario para levantar tu propio servidor de pruebas
de velocidad, contra el cual corre el medidor de la landing (`js/speedtest.js`).

> **¿Landing en un hosting externo (ej. GitHub Pages) y backend en tu Proxmox?**
> Ese es un escenario con más partes (CORS, port-forwarding, y opcionalmente split-DNS
> para que tus propios suscriptores midan sin salir a internet) — está cubierto
> completo en **[`PRODUCCION.md`](./PRODUCCION.md)**. Esta guía de aquí abajo es para
> el backend en sí (Docker vs PHP manual); `PRODUCCION.md` es la capa de red alrededor.

Hay dos formas de hacerlo. **Recomendada: Docker** (más simple, es la imagen oficial
mantenida por el proyecto LibreSpeed). La alternativa manual con PHP queda documentada
por si prefieres no usar Docker en ese servidor.

---

## Opción recomendada: Docker

Requiere Docker instalado en el servidor donde lo vayas a correr (puede ser el mismo
Dell R610, el Proxmox, o cualquier VM tuya con salida a internet).

```bash
cd speedtest-backend/
docker compose up -d
```

Esto descarga la imagen oficial `ghcr.io/librespeed/speedtest` en **modo `backend`**
(sin interfaz — solo expone los 3 endpoints que necesita nuestro medidor) y la deja
escuchando en el puerto **8880** del servidor.

Verifica que responde:
```bash
curl -I http://localhost:8880/empty.php
curl -I "http://localhost:8880/garbage.php?ckSize=4"
```
Ambos deben responder `HTTP/1.1 200 OK`.

### Exponerlo detrás de nginx (recomendado, evita problemas de CORS)

Lo ideal es que el backend quede **bajo el mismo dominio** que la landing
(`https://bifrostinternet.com/speedtest-backend/...`), así el navegador nunca cruza
de dominio y no hay que preocuparse por CORS. Agrega este bloque a tu configuración
de nginx del sitio (mismo `server{}` donde sirves la landing):

```nginx
location /speedtest-backend/ {
    proxy_pass http://127.0.0.1:8880/;

    # Necesario: el test de descarga/subida transmite datos en streaming.
    # Si nginx bufferea, los resultados salen mal calculados.
    proxy_buffering off;
    proxy_request_buffering off;

    # El test puede tardar varios segundos con conexiones rápidas — sube el timeout.
    proxy_read_timeout 60s;
    proxy_send_timeout 60s;

    # Necesario para que el test de subida acepte el tamaño de los paquetes que envía.
    client_max_body_size 100M;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Recarga nginx (`sudo nginx -t && sudo systemctl reload nginx`) y prueba:
```bash
curl -I https://bifrostinternet.com/speedtest-backend/empty.php
```

### Conectar la landing a tu backend

Abre `js/speedtest.js` en el proyecto de la landing y edita estas 3 líneas (ya están
marcadas con un comentario `// TODO BACKEND`):

```js
s.addTestPoint({
  name: "Bifröst Network",
  server: "/speedtest-backend/",   // ← cambia esto por tu ruta real si es distinta
  dlURL: "garbage.php",
  ulURL: "empty.php",
  pingURL: "empty.php",
  getIpURL: "getIP.php",
});
```

Si el backend queda en otro dominio/subdominio (en vez de bajo el mismo dominio vía
nginx), usa la URL completa en `server` y agrega `?cors` al final de `dlURL`/`ulURL`
para que el backend mande las cabeceras CORS necesarias (ya vienen soportadas en
`garbage.php`/`empty.php`, ver más abajo).

---

## Opción alternativa: PHP manual (sin Docker)

Dentro de `php-manual/` están los 3 archivos oficiales de LibreSpeed
(`garbage.php`, `empty.php`, `getIP.php`) tal cual los mantiene el proyecto, más su
licencia (LGPLv3).

Requisitos en el servidor: nginx o Apache + PHP-FPM (cualquier versión reciente de PHP
sirve, no usan nada exótico).

1. Copia la carpeta `php-manual/` a algo como `/var/www/speedtest-backend/` en tu servidor.
2. Configura un `location` (nginx) o `Directory` (Apache) que sirva esa carpeta con PHP-FPM,
   con los mismos ajustes de `proxy_buffering off` / `client_max_body_size` de la sección
   anterior si vas a poner un proxy nginx delante.
3. Prueba igual que arriba: `curl -I https://tu-dominio/speedtest-backend/empty.php`

### CORS en el modo PHP manual

Si sirves estos archivos en un dominio distinto al de la landing, agrega `?cors` a la
URL de descarga/subida (ej. `garbage.php?cors&ckSize=4`) — ya está soportado en el código:
activa las cabeceras `Access-Control-Allow-Origin: *` automáticamente. Si están bajo el
mismo dominio (recomendado, vía el proxy de nginx) no necesitas esto.

---

## ¿Cuál elegir?

- **Docker**: más simple de mantener, actualizar (`docker compose pull && docker compose up -d`)
  y aislado del resto del sistema. Recomendado.
- **PHP manual**: útil si ese servidor específico ya tiene nginx+PHP corriendo para otra cosa
  y prefieres no meter Docker ahí.

Cualquiera de las dos opciones expone exactamente los mismos 3 endpoints
(`garbage.php`, `empty.php`, `getIP.php`) con el mismo comportamiento — la landing no
necesita saber cuál elegiste, solo la URL final.
