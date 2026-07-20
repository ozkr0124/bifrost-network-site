// Bifröst Network — main.js
// Navegación (barra sólida + barra de progreso de scroll), menú móvil y animaciones reveal-on-scroll.
  // ---------- Nav solid on scroll + progress beam ----------
  const nav = document.getElementById('nav');
  const beam = document.getElementById('beamProgress');
  function onScroll(){
    nav.classList.toggle('solid', window.scrollY > 40);
    const h = document.documentElement;
    const pct = h.scrollTop / (h.scrollHeight - h.clientHeight);
    beam.style.transform = `scaleX(${pct})`;
  }
  document.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  // ---------- Mobile menu ----------
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

  // ---------- Scroll reveal ----------
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => io.observe(el));

