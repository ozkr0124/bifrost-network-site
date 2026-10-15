// Bifröst Network — analytics.js
// Google Analytics 4 con Consent Mode v2 y banner de cookies.
// - Solo se activa si hay un ID en js/config.js (gaMeasurementId).
// - Hasta que el visitante acepta, GA no guarda cookies (analytics_storage = denied).
// - Expone window.bifrostTrack(nombre, parámetros) para los eventos del sitio.
(function () {
  'use strict';

  const CFG = window.BIFROST_CONFIG || {};
  const GA_ID = (CFG.gaMeasurementId || '').trim();
  const KEY = 'bifrost-consent';

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}

  window.bifrostTrack = function (name, params) {
    if (!GA_ID) return;
    const clean = {};
    Object.keys(params || {}).forEach((k) => { if (params[k] !== undefined) clean[k] = params[k]; });
    window.gtag('event', name, clean);
  };

  if (!GA_ID) return;

  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: stored === 'granted' ? 'granted' : 'denied',
    wait_for_update: 500,
  });

  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
  document.head.appendChild(s);
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);

  function save(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
    window.gtag('consent', 'update', { analytics_storage: value });
  }

  function showBanner() {
    if (document.getElementById('cookieBanner')) return;
    const box = document.createElement('div');
    box.className = 'cookie-banner';
    box.id = 'cookieBanner';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Preferencias de cookies');

    const p = document.createElement('p');
    p.append('Usamos cookies de analítica (Google Analytics) para entender cómo se usa el sitio y mejorarlo. No las usamos para publicidad. ');
    const link = document.createElement('a');
    link.href = 'politica-de-cookies.html';
    link.textContent = 'Política de cookies';
    p.append(link, '.');

    const actions = document.createElement('div');
    actions.className = 'actions';
    const accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'accept';
    accept.textContent = 'Aceptar analítica';
    const reject = document.createElement('button');
    reject.type = 'button';
    reject.className = 'reject';
    reject.textContent = 'Solo necesarias';
    accept.addEventListener('click', () => { save('granted'); box.remove(); });
    reject.addEventListener('click', () => { save('denied'); box.remove(); });
    actions.append(accept, reject);

    box.append(p, actions);
    document.body.appendChild(box);
  }

  // Botón "Configurar cookies" del footer
  window.bifrostCookieSettings = showBanner;

  function init() {
    document.querySelectorAll('.js-cookie-settings').forEach((b) => {
      b.hidden = false;
      b.addEventListener('click', showBanner);
    });
    if (stored !== 'granted' && stored !== 'denied') showBanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
