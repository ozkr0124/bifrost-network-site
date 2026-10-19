// Bifröst Network — map.js
// Carga diferida del mapa de cobertura: Leaflet (CDN) y js/coverage-data.js (134 KB de polígonos)
// solo se descargan cuando la sección #cobertura se acerca a la pantalla.
(function () {
  'use strict';

  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  const LEAFLET_CSS = { href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', integrity: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=' };
  const LEAFLET_JS = { src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', integrity: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=' };

  function loadScript(src, integrity) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      if (integrity) { s.integrity = integrity; s.crossOrigin = 'anonymous'; }
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  function initMap() {
    /* global L, coverageData */
    // keyboard:false — el mapa es solo visual; la alternativa accesible es el verificador y la lista de barrios.
    const map = L.map('map', { scrollWheelZoom: false, keyboard: false }).setView([6.2442, -75.5812], 12.3);

    // Mosaicos de OpenStreetMap (sin API key). El tono oscuro se logra con un filtro CSS
    // sobre .leaflet-tile-pane (ver css/coverage.css). CARTO dejó de servir sin API key.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const coverageLayer = L.geoJSON(coverageData, {
      style: (feature) => {
        const active = feature.properties.status === 'active';
        return active
          ? { color: '#4D63FF', weight: 2, fillColor: '#0011FF', fillOpacity: 0.35, dashArray: null }
          : { color: '#8E92A0', weight: 1.2, fillColor: '#8E92A0', fillOpacity: 0.06, dashArray: '4,5' };
      },
      onEachFeature: (feature, layer) => {
        const active = feature.properties.status === 'active';
        const wrap = document.createElement('div');
        wrap.className = 'barrio-popup';
        const b = document.createElement('b');
        b.textContent = feature.properties.name;
        const tag = document.createElement('span');
        tag.className = 'tag ' + (active ? 'active' : 'planned');
        tag.textContent = active ? 'Cobertura activa' : 'Próximamente';
        wrap.append(b, tag);
        layer.bindPopup(wrap);
        layer.bindTooltip(feature.properties.name, { sticky: true, direction: 'top' });
        layer.on('mouseover', () => layer.setStyle({ fillOpacity: active ? 0.5 : 0.14 }));
        layer.on('mouseout', () => coverageLayer.resetStyle(layer));
      },
    }).addTo(map);

    // Encuadra el mapa sobre la unión de las zonas activas.
    const activeLayers = coverageLayer.getLayers().filter((l) => l.feature.properties.status === 'active');
    if (activeLayers.length) {
      const bounds = activeLayers.reduce((acc, l) => acc.extend(l.getBounds()), L.latLngBounds(activeLayers[0].getBounds()));
      map.fitBounds(bounds.pad(0.35), { maxZoom: 16 });
    }

    // Fuera del orden de tabulación: el mapa está oculto para lectores de pantalla (aria-hidden)
    // y su contenido está disponible en texto en la lista de barrios.
    mapEl.setAttribute('tabindex', '-1');
    mapEl.querySelectorAll('a, button, [tabindex]').forEach((el) => el.setAttribute('tabindex', '-1'));
  }

  let started = false;
  function start() {
    if (started) return;
    started = true;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = LEAFLET_CSS.href;
    css.integrity = LEAFLET_CSS.integrity;
    css.crossOrigin = 'anonymous';
    document.head.appendChild(css);
    loadScript(LEAFLET_JS.src, LEAFLET_JS.integrity)
      .then(() => loadScript('js/coverage-data.js'))
      .then(initMap)
      .catch(() => { mapEl.textContent = 'No pudimos cargar el mapa. Usa el verificador de barrio.'; });
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); start(); }
    }, { rootMargin: '600px 0px' });
    io.observe(mapEl);
  } else {
    start();
  }
})();
