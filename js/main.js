// Bifröst Network — main.js
// Compartido por todas las páginas: navegación, menú móvil, desplegable de Normatividad,
// animaciones reveal, enlaces de WhatsApp, selector de planes y verificador de cobertura.
(function () {
  'use strict';

  const CFG = window.BIFROST_CONFIG || {};
  const WA_NUMBER = CFG.whatsapp || '573018265125';
  const track = (name, params) => { if (window.bifrostTrack) window.bifrostTrack(name, params); };

  function waUrl(text) {
    return 'https://wa.me/' + WA_NUMBER + (text ? '?text=' + encodeURIComponent(text) : '');
  }
  window.bifrostWaUrl = waUrl;

  // ---------- Nav sólida al hacer scroll + barra de progreso ----------
  const nav = document.getElementById('nav');
  const beam = document.getElementById('beamProgress');
  const navAlwaysSolid = nav && nav.classList.contains('solid');
  function onScroll() {
    if (nav && !navAlwaysSolid) nav.classList.toggle('solid', window.scrollY > 40);
    if (beam) {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      beam.style.transform = 'scaleX(' + (max > 0 ? h.scrollTop / max : 0) + ')';
    }
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Menú móvil ----------
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');
  function setMenu(open) {
    if (!burger || !navLinks) return;
    burger.classList.toggle('open', open);
    navLinks.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }
  if (burger && navLinks) {
    burger.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
    navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  }

  // ---------- Desplegable Normatividad ----------
  const normToggle = document.getElementById('normToggle');
  const normMenu = document.getElementById('normMenu');
  function setNorm(open) {
    if (!normToggle || !normMenu) return;
    normMenu.classList.toggle('open', open);
    normToggle.setAttribute('aria-expanded', String(open));
  }
  if (normToggle && normMenu) {
    normToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setNorm(!normMenu.classList.contains('open'));
    });
    document.addEventListener('click', (e) => { if (!normMenu.contains(e.target)) setNorm(false); });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (normMenu && normMenu.classList.contains('open')) { setNorm(false); normToggle.focus(); }
    if (navLinks && navLinks.classList.contains('open')) { setMenu(false); burger.focus(); }
  });

  // ---------- Reveal on scroll ----------
  const revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  // ---------- Enlaces de WhatsApp ----------
  // Cualquier <a data-wa="texto"> recibe el enlace con el mensaje prellenado.
  document.querySelectorAll('[data-wa]').forEach((a) => {
    a.href = waUrl(a.getAttribute('data-wa'));
    a.target = '_blank';
    a.rel = 'noopener';
  });

  // Analítica de clics de contacto (WhatsApp, teléfono, correo)
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const source = a.getAttribute('data-source') || a.closest('[id]')?.id || 'pagina';
    if (href.indexOf('wa.me/') !== -1) {
      track('whatsapp_click', { source: source, plan: a.getAttribute('data-plan') || undefined, segment: a.getAttribute('data-segment') || undefined });
    } else if (href.indexOf('tel:') === 0) {
      track('phone_click', { source: source });
    } else if (href.indexOf('mailto:') === 0) {
      track('email_click', { source: source });
    }
  });

  // ---------- Selector de segmento de planes (tabs ARIA) ----------
  const tabs = Array.from(document.querySelectorAll('.plan-tab'));
  function selectTab(tab, focus) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      selectTab(tab, false);
      track('select_plan_segment', { segment: tab.dataset.segment });
    });
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });
  });
  // Abrir directamente un segmento con #planes-empresas, #planes-estratos-456, etc.
  const hashTab = tabs.find((t) => location.hash === '#' + t.getAttribute('aria-controls'));
  if (hashTab) selectTab(hashTab, false);

  // ---------- Verificador de cobertura ----------
  const zones = window.BIFROST_ZONES || [];
  const norm = (s) => (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/no\.\s*/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  function findZone(query) {
    const q = norm(query);
    if (q.length < 3) return null;
    let best = null;
    zones.forEach((z) => {
      const names = [z.name].concat(z.aliases || []).map(norm);
      names.forEach((n) => {
        if (n === q) best = z;
        else if (!best && (n.indexOf(q) !== -1 || q.indexOf(n) !== -1)) best = z;
      });
    });
    return best;
  }

  const datalist = document.getElementById('barriosList');
  if (datalist && zones.length) {
    zones.slice().sort((a, b) => a.name.localeCompare(b.name, 'es')).forEach((z) => {
      const opt = document.createElement('option');
      opt.value = z.name;
      datalist.appendChild(opt);
    });
  }

  function el(tag, attrs, text) {
    const n = document.createElement(tag);
    Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, attrs[k]));
    if (text) n.textContent = text;
    return n;
  }

  document.querySelectorAll('.js-coverage-form').forEach((form) => {
    const input = form.querySelector('input');
    const out = document.getElementById(form.getAttribute('data-result'));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = input.value.trim();
      if (!query) { input.focus(); return; }
      const zone = findZone(query);
      const box = el('div', { class: 'result-box' });
      const p = el('p');
      const actions = el('div', { class: 'result-actions' });
      let result;

      if (zone && zone.status === 'active') {
        result = 'activa';
        box.classList.add('ok');
        p.append('¡Sí! En ', el('b', {}, zone.name), ' ya tenemos fibra activa. Elige tu plan y agendamos la instalación gratis.');
        actions.append(el('a', { href: '#planes' }, 'Ver planes'));
        const wa = el('a', { class: 'wa', href: waUrl('Hola, vivo en ' + zone.name + ' y quiero contratar internet de fibra Bifröst.'), target: '_blank', rel: 'noopener', 'data-source': 'cobertura-ok' }, 'Contratar por WhatsApp');
        actions.append(wa);
      } else if (zone) {
        result = 'proximamente';
        box.classList.add('soon');
        p.append(el('b', {}, zone.name), ' está en nuestra próxima fase de despliegue. Únete a la lista de espera y te avisamos apenas llegue la fibra.');
        actions.append(el('a', { class: 'wa', href: waUrl('Hola, quiero entrar a la lista de espera de Bifröst para el barrio ' + zone.name + '. Mi dirección es: '), target: '_blank', rel: 'noopener', 'data-source': 'cobertura-espera' }, 'Unirme a la lista de espera'));
      } else {
        result = 'sin_cobertura';
        p.append('Aún no tenemos ', el('b', {}, query), ' en el mapa. Escríbenos con tu dirección y lo verificamos por ti.');
        actions.append(el('a', { class: 'wa', href: waUrl('Hola, quiero saber si Bifröst tiene cobertura en: ' + query), target: '_blank', rel: 'noopener', 'data-source': 'cobertura-consulta' }, 'Consultar por WhatsApp'));
      }
      box.append(p, actions);
      out.replaceChildren(box);
      track('coverage_check', { barrio: zone ? zone.name : query.slice(0, 60), result: result });
    });
  });

  // ---------- CTA de plan → preselecciona el plan en el formulario ----------
  const planSelect = document.getElementById('plan');
  document.querySelectorAll('[data-plan]').forEach((a) => {
    a.addEventListener('click', () => {
      if (!planSelect) return;
      const value = a.getAttribute('data-plan') + ' · ' + a.getAttribute('data-segment');
      const opt = Array.from(planSelect.options).find((o) => o.value === value);
      if (opt) planSelect.value = value;
    });
  });

  // ---------- FAQ: medir qué preguntas se abren ----------
  document.querySelectorAll('.faq-item').forEach((d) => {
    d.addEventListener('toggle', () => {
      if (d.open) track('faq_open', { question: d.querySelector('summary').textContent.trim().slice(0, 90) });
    });
  });
})();
