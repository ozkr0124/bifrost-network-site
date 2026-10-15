// Bifröst Network — reviews.js
// Muestra las reseñas reales de tu ficha de Google Business Profile en la sección "Clientes".
// - Necesita googleMapsApiKey y googlePlaceId en js/config.js (ver README → Reseñas de Google).
// - Si falta configuración, hay un error o la ficha aún no tiene reseñas, la sección sigue oculta.
// - Google devuelve como máximo 5 reseñas por consulta; se muestran tal cual (sin filtrar),
//   con el nombre del autor y el enlace a la ficha, como exigen las políticas de Google.
(function () {
  'use strict';

  const CFG = window.BIFROST_CONFIG || {};
  const KEY = (CFG.googleMapsApiKey || '').trim();
  const PLACE_ID = (CFG.googlePlaceId || '').trim();
  const section = document.getElementById('testimonios');
  if (!section || !KEY || !PLACE_ID) return;

  function loadMaps() {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps && window.google.maps.importLibrary) return resolve();
      window.__bifrostMapsReady = resolve;
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(KEY) +
        '&v=weekly&language=es&region=CO&loading=async&callback=__bifrostMapsReady';
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function stars(n) {
    const full = Math.round(n || 0);
    return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function starsEl(rating) {
    const s = el('div', 'stars', stars(rating));
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', (Math.round(rating * 10) / 10) + ' de 5 estrellas');
    return s;
  }

  function textOf(t) {
    if (!t) return '';
    return typeof t === 'string' ? t : (t.text || '');
  }

  async function run() {
    try {
      await loadMaps();
      const { Place } = await google.maps.importLibrary('places');
      const place = new Place({ id: PLACE_ID, requestedLanguage: 'es' });
      await place.fetchFields({ fields: ['displayName', 'rating', 'userRatingCount', 'reviews', 'googleMapsURI'] });
      const reviews = (place.reviews || []).filter((r) => textOf(r.text).trim());
      if (!reviews.length) return;

      const summary = document.getElementById('reviewsSummary');
      const track = document.getElementById('reviewsTrack');

      if (place.rating) {
        const meta = el('div', 'meta');
        meta.append((place.userRatingCount || reviews.length) + ' reseñas en Google · ');
        const link = el('a', '', 'Ver todas en Google Maps');
        link.href = place.googleMapsURI;
        link.target = '_blank';
        link.rel = 'noopener';
        meta.append(link);
        summary.append(el('div', 'score', place.rating.toFixed(1)), starsEl(place.rating), meta);
      }

      reviews.forEach((r) => {
        const card = el('article', 'review-card');
        card.append(starsEl(r.rating || 0));
        card.append(el('p', '', textOf(r.text)));
        const who = el('div', 'who');
        const author = r.authorAttribution || {};
        if (author.photoURI) {
          const img = el('img');
          img.src = author.photoURI;
          img.alt = '';
          img.loading = 'lazy';
          img.referrerPolicy = 'no-referrer';
          who.append(img);
        }
        const info = el('div');
        const name = el('b');
        if (author.uri) {
          const a = el('a', '', author.displayName || 'Usuario de Google');
          a.href = author.uri;
          a.target = '_blank';
          a.rel = 'noopener';
          name.append(a);
        } else {
          name.textContent = author.displayName || 'Usuario de Google';
        }
        info.append(name, el('span', '', r.relativePublishTimeDescription || ''));
        who.append(info);
        card.append(who);
        track.append(card);
      });

      section.hidden = false;
      document.querySelectorAll('.js-reviews-link').forEach((a) => { a.hidden = false; });
    } catch (e) {
      // Sin reseñas visibles ante cualquier error: la página sigue funcionando igual.
      if (window.console) console.warn('Reseñas de Google no disponibles:', e);
    }
  }

  // Se consulta solo cuando el visitante se acerca a la sección (ahorra cuota de la API).
  const trigger = document.getElementById('reviewsTrigger') || section;
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); run(); }
    }, { rootMargin: '800px 0px' });
    io.observe(trigger);
  } else {
    run();
  }
})();
