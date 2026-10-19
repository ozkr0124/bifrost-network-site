// Bifröst Network — reviews.js
// Muestra las reseñas reales de la ficha de Google Business Profile en la sección "Clientes".
// - Las obtiene de tu backend propio (reviews-backend/), configurado en js/config.js → reviewsApiUrl.
// - Si no hay URL, el backend no responde o aún no hay reseñas con texto, la sección sigue oculta.
(function () {
  'use strict';

  const CFG = window.BIFROST_CONFIG || {};
  const API = (CFG.reviewsApiUrl || '').trim();
  const section = document.getElementById('testimonios');
  if (!section || !API) return;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function starsEl(rating) {
    const full = Math.max(0, Math.min(5, Math.round(rating || 0)));
    const s = el('div', 'stars', '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full));
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', (Math.round((rating || 0) * 10) / 10).toString().replace('.', ',') + ' de 5 estrellas');
    return s;
  }

  function relativeDate(iso) {
    if (!iso) return '';
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (isNaN(days)) return '';
    if (days < 1) return 'hoy';
    if (days < 30) return 'hace ' + days + (days === 1 ? ' día' : ' días');
    const months = Math.floor(days / 30);
    if (months < 12) return 'hace ' + months + (months === 1 ? ' mes' : ' meses');
    const years = Math.floor(months / 12);
    return 'hace ' + years + (years === 1 ? ' año' : ' años');
  }

  function link(text, href) {
    const a = el('a', '', text);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }

  async function run() {
    try {
      const res = await fetch(API, { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const data = await res.json();
      const reviews = (data.reviews || []).filter((r) => (r.text || '').trim());
      if (!reviews.length) return;

      const summary = document.getElementById('reviewsSummary');
      const track = document.getElementById('reviewsTrack');

      if (data.rating) {
        const meta = el('div', 'meta');
        meta.append((data.total || reviews.length) + ' reseñas en Google');
        if (data.mapsUri) meta.append(' · ', link('Ver todas en Google Maps', data.mapsUri));
        if (data.newReviewUri) meta.append(' · ', link('Escribe tu reseña', data.newReviewUri));
        summary.append(el('div', 'score', Number(data.rating).toFixed(1).replace('.', ',')), starsEl(data.rating), meta);
      }

      reviews.forEach((r) => {
        const card = el('article', 'review-card');
        card.append(starsEl(r.rating), el('p', '', r.text));
        if (r.reply) {
          const reply = el('div', 'review-reply');
          reply.append(el('b', '', 'Respuesta de Bifröst'), el('span', '', r.reply));
          card.append(reply);
        }
        const who = el('div', 'who');
        if (r.photo) {
          const img = el('img');
          img.src = r.photo;
          img.alt = '';
          img.loading = 'lazy';
          img.referrerPolicy = 'no-referrer';
          img.width = 38;
          img.height = 38;
          who.append(img);
        }
        const info = el('div');
        info.append(el('b', '', r.author || 'Usuario de Google'), el('span', '', relativeDate(r.createTime)));
        who.append(info);
        card.append(who);
        track.append(card);
      });

      section.hidden = false;
      if (window.bifrostMarkNewTab) window.bifrostMarkNewTab(section);
    } catch (e) {
      // Ante cualquier error la sección sigue oculta y el resto de la página funciona igual.
      if (window.console) console.warn('Reseñas no disponibles:', e.message);
    }
  }

  // Se consulta solo cuando el visitante se acerca a la sección.
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
