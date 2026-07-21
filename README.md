# Bifröst Network — Landing Page

## Estructura del proyecto

```
bifrost-landing/
├── index.html
├── docker-compose.yml     → Stack completo para PRUEBAS LOCALES (nginx + backend LibreSpeed)
├── docker/nginx/
│   └── default.conf        → Config de nginx para las pruebas locales (sirve el sitio + proxy al backend)
├── css/
│   ├── variables.css      → Colores de marca, tipografía, reset base
│   ├── base.css            → Barra de progreso de scroll, reveal-on-scroll, contenedor de sección
│   ├── navigation.css      → Barra de navegación
│   ├── hero.css            → Sección Hero
│   ├── plans.css           → Sección Planes + banner Bifröst TV
│   ├── coverage.css        → Sección Cobertura + mapa Leaflet
│   ├── speedtest.css       → Sección Velocidad (medidor + toggle LibreSpeed/Ookla)
│   ├── about.css           → Sección Nosotros (layout sticky)
│   ├── testimonials.css    → Sección Testimonios (carrusel)
│   ├── contact.css         → Sección Contacto / formulario PQR
│   └── footer.css          → Footer
├── js/
│   ├── main.js              → Nav sólida al hacer scroll, menú móvil, animaciones reveal-on-scroll
│   ├── coverage-data.js      → Polígonos reales de cobertura (generado desde tus .geojson)
│   ├── map.js                → Inicialización de Leaflet + capa de cobertura (usa coverage-data.js)
│   ├── contact-form.js       → Envío del formulario PQR (demo, sin backend aún)
│   ├── speedtest.js          → Controlador del medidor de velocidad (toggle de motor + LibreSpeed)
│   ├── bifrost-tunnel.js     → Visualización propia: el "túnel Bifröst" en Canvas2D (reemplaza el velocímetro clásico)
│   └── vendor/librespeed/    → Librería OFICIAL de LibreSpeed (speedtest.js + speedtest_worker.js), LGPLv3
├── speedtest-backend/        → Backend de LibreSpeed (Docker recomendado + alternativa PHP manual) + guía de despliegue
└── assets/svg/
    ├── logo_bifrost_w.svg     → Logo horizontal completo (isotipo + wordmark "Bifröst" + "Network S.A.S."), versión blanca — usado en nav y footer
    ├── isotipo_w_animado.svg → Isotipo blanco con pulso azul/naranja (animación autocontenida) — usado en el Hero
    ├── isotipo_w.svg          → Isotipo blanco estático — usado en el banner Bifröst TV
    ├── haz-bifrost.svg       → Arco degradado del Hero (animación de "dibujado" — ver nota más abajo)
    ├── icono-fibra.svg       → Ícono sección Nosotros (estático)
    ├── icono-simetria.svg    → Ícono sección Nosotros (estático)
    ├── icono-soporte.svg     → Ícono sección Nosotros (estático)
    └── icono-cobertura.svg   → Ícono sección Nosotros (estático)
```

## Dónde va cada SVG y en qué tamaño

| Elemento | Dónde se usa | Tamaño | Cómo se incluye |
|---|---|---|---|
| `logo_bifrost_w.svg` | Nav | 36px de alto, ancho proporcional (~110px) | `<img>` importado |
| `logo_bifrost_w.svg` | Footer | 80px de alto, ancho proporcional (~245px) | `<img>` importado |
| `isotipo_w_animado.svg` | Hero | 128×128px | `<img>` importado |
| `isotipo_w.svg` | Banner "Bifröst TV" en Planes | 56×56px | `<img>` importado |
| Haz Bifröst (arco degradado, se dibuja al cargar) | Hero, debajo del headline | ancho `min(720px, 90vw)` | **Inline** en `index.html` |
| `icono-fibra.svg` | Nosotros, 1ra tarjeta | 24×24px (caja 52×52px) | `<img>` importado |
| `icono-simetria.svg` | Nosotros, 2da tarjeta | 24×24px (caja 52×52px) | `<img>` importado |
| `icono-soporte.svg` | Nosotros, 3ra tarjeta | 24×24px (caja 52×52px) | `<img>` importado |
| `icono-cobertura.svg` | Nosotros, 4ta tarjeta | 24×24px (caja 52×52px) | `<img>` importado |

> **Nota sobre el ancho del logo en el footer:** el alto quedó en 80px con el ancho **proporcional** (~245px) para no deformar el logo. Si lo prefieres exactamente en 256×80px (como se probó en una versión anterior), avísame y cambio `width:auto` por `width:256px` en `css/footer.css` — el logo se vería ligeramente más ancho de lo natural (~4%).

## Por qué el haz va inline y el logo/isotipo no

En general, los navegadores no ejecutan de forma confiable animaciones CSS dentro de un SVG cargado como `<img>`. Sin embargo, esto depende del tipo de animación:

- El **isotipo** (`isotipo_w_animado.svg`) sí anima correctamente como `<img>` — su animación (una simple transición de `opacity`) queda autocontenida en el propio archivo, dentro de su `<style>` interno. No requiere ningún cambio.
- El **Haz Bifröst** (arco que se "dibuja" con `stroke-dashoffset`) **no** animaba de forma confiable como `<img>`, así que va **inline dentro de `index.html`**, con su animación en `css/hero.css` (`.hero-beam path`). El archivo `assets/svg/haz-bifrost.svg` se conserva como fuente de referencia/edición, pero `index.html` ya no lo carga como `<img>`.
- El **logo horizontal** (`logo_bifrost_w.svg`) y los íconos **estáticos** (Nosotros) no necesitan animarse y van como `<img>` normales.

Si en el futuro un SVG animado no se ve bien como `<img>`, el mismo truco aplica: pégalo inline en el HTML y mueve su animación al CSS de la sección correspondiente.

## Cómo abrir el proyecto

Simplemente abre `index.html` en el navegador (doble clic), o súbelo completo (con las carpetas `css/`, `js/` y `assets/`) a cualquier hosting. No requiere build ni Node — es HTML/CSS/JS puro.

## Cobertura (mapa)

`js/coverage-data.js` contiene los 20 barrios reales que compartiste, con **Los Cerros - El Vergel** marcado como `"status": "active"` y el resto como `"planned"`. Para activar un nuevo barrio, cambia su `status` a `"active"` dentro de ese archivo.

**Zoom automático:** `js/map.js` encuadra el mapa sobre la **unión de todas** las zonas marcadas como `"active"` (no solo la primera), con 35% de margen alrededor y un tope de zoom de nivel 16 (para que no se acerque demasiado si el polígono es muy pequeño). Si quieres más o menos "aire" alrededor de las zonas activas, ajusta el `0.35` en `activeBounds.pad(0.35)` — más alto aleja la cámara, más bajo la acerca.

## Probar todo localmente (Mac + Docker Desktop)

En la raíz del proyecto hay un `docker-compose.yml` que levanta **todo el stack de una vez**:
nginx sirviendo la landing + el backend de LibreSpeed, ya conectados — así el túnel Bifröst
mide velocidad real desde tu Mac, sin tocar nada más.

```bash
docker compose up -d
```

Abre **http://localhost:8080** y dale "Iniciar prueba de velocidad". Como el backend corre en
tu propia Mac, vas a ver velocidades muy altas (es tráfico local, no está saliendo a internet)
— es normal, es solo para confirmar que todo el circuito funciona end-to-end antes de
desplegar en tu servidor real.

Para bajarlo: `docker compose down`.

> **Importante:** este `docker-compose.yml` de la raíz es solo para pruebas locales. Es
> distinto del que está en `speedtest-backend/docker-compose.yml`, que es el que usarías en tu
> servidor real de producción (ese despliega solo el backend, para ponerlo detrás de tu nginx
> real con tu dominio — ver `speedtest-backend/README.md`).

## Formulario de contacto

`js/contact-form.js` captura los datos del formulario PQR y los muestra en consola (`console.log`). Dentro del archivo hay un bloque comentado con el `fetch()` listo para que lo actives apuntando a tu endpoint cuando esté disponible.

## Medidor de velocidad (sección "Velocidad")

Selector con dos motores: **LibreSpeed** (por defecto) y **Ookla**.

### LibreSpeed — funciona con diseño 100% Bifröst

- `js/vendor/librespeed/` contiene la librería **oficial** de LibreSpeed (`speedtest.js` +
  `speedtest_worker.js`), descargada directo de su repositorio, LGPLv3 (ver `LICENSE` en esa
  carpeta). La única modificación hecha fue una línea en `speedtest.js` para que el worker se
  cargue desde `js/vendor/librespeed/` en vez de la raíz — está marcada con un comentario
  `MODIFICADO POR BIFRÖST NETWORK` en el propio archivo.
- `js/bifrost-tunnel.js` es la visualización propia: en vez del velocímetro circular clásico
  (y luego de un rediseño, en vez de anillos concéntricos que resultaban incómodos a la
  vista), un **túnel de luz Bifröst** cinematográfico en Canvas2D — franjas de luz con estela
  radiando desde un punto de fuga central, sobre fondo tipo nebulosa con estrellas. Durante
  la descarga viajan hacia afuera (los datos te alcanzan), durante la subida hacia adentro
  (los datos salen de ti), y en ping/jitter hacen ráfagas cortas tipo sonar. Solo anima
  mientras la prueba está corriendo — en reposo se dibuja un único frame estático, sin loop
  de animación (para no consumir CPU ni ser una distracción visual innecesaria).
- `js/speedtest.js` es el controlador: conecta los datos en vivo de LibreSpeed con el túnel
  (dirección + velocidad del flujo) y con las 4 tarjetas de estadísticas (ping, jitter,
  descarga, subida).
- **Necesita un backend real para funcionar.** Todo lo necesario para desplegarlo está en
  `speedtest-backend/` — ver su `README.md` (Docker recomendado, con la imagen oficial de
  LibreSpeed en modo `backend`; alternativa PHP manual incluida también).

  **Local vs producción:** en `js/speedtest.js`, la constante `USE_PRODUCTION_BACKEND`
  controla a qué backend apunta la landing:
  - `false` → `/speedtest-backend/` (mismo origen, para probar con el `docker compose up`
    de la raíz de este proyecto, como ya hicimos)
  - `true` → `https://speedtest.bifrostinternet.com` (tu backend real en el Proxmox, cross-origin)

  Si vas a desplegar con landing externa (ej. GitHub Pages) + backend en tu propio servidor
  (como en tu caso), la guía completa de red — port-forwarding, nginx + certificado, y el
  split-DNS en Unbound para que tus propios suscriptores midan sin salir a internet — está en
  **[`speedtest-backend/PRODUCCION.md`](./speedtest-backend/PRODUCCION.md)**.

  > **Nota técnica (bug ya corregido):** la primera versión usaba `addTestPoint()` de
  > LibreSpeed (modo multi-servidor), que exige llamar `selectServer()` antes de `start()`.
  > Como solo hay un servidor, eso hacía que `start()` lanzara un error silencioso y la
  > prueba se quedara colgada en "Probando…" aunque el backend respondiera bien. Se cambió a
  > `setParameter('url_dl', ...)` (modo servidor único), que es el uso recomendado por la
  > propia documentación de LibreSpeed para este caso.

### Ookla — pendiente de tu OoklaServer propio

No existe forma gratuita de embeber una prueba **en vivo** de Ookla con diseño propio: el iframe
oficial de `speedtest.net` bloquea ser incrustado en otras páginas (cabecera
`X-Frame-Options`), y la única opción con interfaz personalizable ("Speedtest Custom") requiere
una cuenta de partner de pago con Ookla.

Como me confirmaste que vas a desplegar tu propio **OoklaServer** (autohospedado) más adelante,
el panel de Ookla por ahora muestra una tarjeta con un botón que abre `speedtest.net` en una
pestaña nueva. El código en `index.html` (sección `<!-- Panel Ookla -->`) trae un comentario
explicando exactamente qué reemplazar por el `<iframe>` una vez tengas la URL de tu propio
servidor — en ese punto sí vas a poder controlarle el diseño, porque el dominio y las cabeceras
serán tuyas.

### Recordar el motor elegido

La preferencia de motor (LibreSpeed/Ookla) se guarda en `localStorage` del navegador del
visitante, así que si vuelve a entrar más tarde, la página abre directo en el motor que usó la
vez anterior.
