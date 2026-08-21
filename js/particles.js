// Bifröst Network — Partículas Flotantes
// Animación de partículas para el screensaver

(function() {
  'use strict';

  // ========== Crear partículas flotantes ==========
  function createParticles() {
    const particlesContainer = document.getElementById('particles');
    
    if (!particlesContainer) {
      return;
    }

    const particleCount = window.innerWidth < 768 ? 15 : 30;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      // Posición aleatoria
      const leftPos = Math.random() * 100;
      const duration = 10 + Math.random() * 15; // 10-25 segundos
      const delay = Math.random() * 10; // 0-10 segundos
      const drift = (Math.random() - 0.5) * 100; // Deriva horizontal -50 a 50px
      const size = 2 + Math.random() * 2; // 2-4px
      
      particle.style.left = `${leftPos}%`;
      particle.style.bottom = `-20px`;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.animationDuration = `${duration}s`;
      particle.style.animationDelay = `${delay}s`;
      particle.style.setProperty('--drift', `${drift}px`);
      
      // Alternar colores azul/naranja aleatoriamente
      if (Math.random() > 0.5) {
        particle.style.background = 'rgba(0, 17, 255, 0.8)';
        particle.style.boxShadow = '0 0 8px rgba(0, 17, 255, 0.8)';
      } else {
        particle.style.background = 'rgba(254, 80, 0, 0.8)';
        particle.style.boxShadow = '0 0 8px rgba(254, 80, 0, 0.8)';
      }
      
      particlesContainer.appendChild(particle);
    }
  }

  // ========== Inicializar cuando el DOM esté listo ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createParticles);
  } else {
    createParticles();
  }
})();
