// Bifröst Network — JS compartido para páginas de normatividad
  const nav = document.getElementById('nav');
  const beam = document.getElementById('beamProgress');

  function onScroll() {
    nav.classList.toggle('solid', window.scrollY > 40);
    const h = document.documentElement;
    const pct = h.scrollTop / (h.scrollHeight - h.clientHeight);
    beam.style.transform = `scaleX(${pct})`;
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    burger.classList.remove('open');
    navLinks.classList.remove('open');
  }));

  // Dropdown Normatividad
  const normToggle = document.getElementById('normToggle');
  const normMenu = document.getElementById('normMenu');
  if (normToggle && normMenu) {
    normToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = normMenu.classList.toggle('open');
      normToggle.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', () => {
      normMenu.classList.remove('open');
      normToggle.setAttribute('aria-expanded', 'false');
    });
  }
