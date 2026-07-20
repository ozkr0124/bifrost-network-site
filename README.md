# Bifröst Network — Landing Page

## Estructura del proyecto

```
bifrost-landing/
├── index.html
├── css/
│   ├── variables.css      → Colores de marca, tipografía, reset base
│   ├── base.css            → Barra de progreso de scroll, reveal-on-scroll, contenedor de sección
│   ├── navigation.css      → Barra de navegación
│   ├── hero.css            → Sección Hero
│   ├── plans.css           → Sección Planes + banner Bifröst TV
│   ├── coverage.css        → Sección Cobertura + mapa Leaflet
│   ├── about.css           → Sección Nosotros (layout sticky)
│   ├── testimonials.css    → Sección Testimonios (carrusel)
│   ├── contact.css         → Sección Contacto / formulario PQR
│   └── footer.css          → Footer
├── js/
│   ├── main.js              → Nav sólida al hacer scroll, menú móvil, animaciones reveal-on-scroll
│   ├── coverage-data.js      → Polígonos reales de cobertura (generado desde tus .geojson)
│   ├── map.js                → Inicialización de Leaflet + capa de cobertura (usa coverage-data.js)
│   └── contact-form.js       → Envío del formulario PQR (demo, sin backend aún)
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

## Formulario de contacto

`js/contact-form.js` captura los datos del formulario PQR y los muestra en consola (`console.log`). Dentro del archivo hay un bloque comentado con el `fetch()` listo para que lo actives apuntando a tu endpoint cuando esté disponible.
