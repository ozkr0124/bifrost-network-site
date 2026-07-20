// Bifröst Network — map.js
// Requiere que se carguen antes, en este orden:
//   1. leaflet.js (CDN, ver index.html)
//   2. coverage-data.js  (define la variable global coverageData con los polígonos reales)
// Este archivo inicializa el mapa y pinta los polígonos de cobertura sobre Medellín.

  // ---------- Leaflet map (Medellín) ----------
  const map = L.map('map', { scrollWheelZoom: false }).setView([6.2442, -75.5812], 12.3);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19
  }).addTo(map);


  const coverageLayer = L.geoJSON(coverageData, {
    style: (feature) => {
      const active = feature.properties.status === 'active';
      return active
        ? { color: '#0011FF', weight: 2, fillColor: '#0011FF', fillOpacity: 0.28, dashArray: null }
        : { color: '#8a8f9c', weight: 1.2, fillColor: '#8a8f9c', fillOpacity: 0.06, dashArray: '4,5' };
    },
    onEachFeature: (feature, layer) => {
      const active = feature.properties.status === 'active';
      const name = feature.properties.name;
      layer.bindPopup(
        `<div class="barrio-popup"><b>${name}</b>` +
        `<span class="tag ${active ? 'active' : 'planned'}">${active ? 'Cobertura activa' : 'Próximamente'}</span></div>`
      );
      layer.on('mouseover', () => layer.setStyle({ fillOpacity: active ? 0.4 : 0.14 }));
      layer.on('mouseout', () => coverageLayer.resetStyle(layer));
    }
  }).addTo(map);

  // Encuadra el mapa sobre la UNIÓN de todas las zonas activas (no solo la primera) al cargar.
  // pad(0.35) = 35% de margen alrededor del/los polígono(s) — antes era pad(3) = 300%, por eso
  // terminaba mostrando todo Medellín en vez de acercarse al barrio con cobertura.
  const activeLayers = coverageLayer.getLayers().filter(l => l.feature.properties.status === 'active');
  if (activeLayers.length) {
    const activeBounds = activeLayers.reduce(
      (bounds, layer) => bounds.extend(layer.getBounds()),
      L.latLngBounds(activeLayers[0].getBounds())
    );
    map.fitBounds(activeBounds.pad(0.35), { maxZoom: 16 });
  }
