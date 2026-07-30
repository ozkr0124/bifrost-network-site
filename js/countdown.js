// Bifröst Network — Countdown Timer
// Cuenta regresiva hasta el 1 de septiembre 2026 00:00:00 (Colombia UTC-5)

(function() {
  'use strict';

  // ========== Configuración ==========
  const TARGET_DATE = new Date('2026-09-01T00:00:00-05:00').getTime();
  const REDIRECT_URL = 'main.html';

  // ========== Elementos del DOM ==========
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');
  const countdownEl = document.getElementById('countdown');
  const particlesContainer = document.getElementById('particles');

  // ========== Estado anterior para detectar cambios ==========
  let previousValues = {
    days: null,
    hours: null,
    minutes: null,
    seconds: null
  };

  // ========== Función para añadir cero a la izquierda ==========
  function padZero(num) {
    return num.toString().padStart(2, '0');
  }

  // ========== Función para actualizar el contador ==========
  function updateCountdown() {
    const now = new Date().getTime();
    const distance = TARGET_DATE - now;

    // Si ya pasó la fecha objetivo, redirigir
    if (distance < 0) {
      redirectToMain();
      return;
    }

    // Calcular tiempo restante
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Actualizar valores con animación flip si cambiaron
    updateValue(daysEl, days, 'days');
    updateValue(hoursEl, hours, 'hours');
    updateValue(minutesEl, minutes, 'minutes');
    updateValue(secondsEl, seconds, 'seconds');

    // Guardar en localStorage para persistencia
    saveToLocalStorage({ days, hours, minutes, seconds });
  }

  // ========== Actualizar valor individual ==========
  function updateValue(element, value, key) {
    const formattedValue = padZero(value);
    
    if (previousValues[key] !== formattedValue) {
      // Actualizar valor directamente sin animación flip
      element.textContent = formattedValue;
      previousValues[key] = formattedValue;
    }
  }

  // ========== Guardar en localStorage ==========
  function saveToLocalStorage(values) {
    try {
      localStorage.setItem('bifrost_countdown', JSON.stringify({
        values,
        timestamp: new Date().getTime()
      }));
    } catch (e) {
      // Silently fail if localStorage is not available
    }
  }

  // ========== Cargar desde localStorage ==========
  function loadFromLocalStorage() {
    try {
      const data = localStorage.getItem('bifrost_countdown');
      if (data) {
        const parsed = JSON.parse(data);
        const age = new Date().getTime() - parsed.timestamp;
        
        // Solo usar si tiene menos de 2 segundos
        if (age < 2000) {
          daysEl.textContent = padZero(parsed.values.days);
          hoursEl.textContent = padZero(parsed.values.hours);
          minutesEl.textContent = padZero(parsed.values.minutes);
          secondsEl.textContent = padZero(parsed.values.seconds);
          
          previousValues = {
            days: padZero(parsed.values.days),
            hours: padZero(parsed.values.hours),
            minutes: padZero(parsed.values.minutes),
            seconds: padZero(parsed.values.seconds)
          };
          
          return true;
        }
      }
    } catch (e) {
      // Silently fail
    }
    return false;
  }

  // ========== Redirigir a la página principal ==========
  function redirectToMain() {
    // Limpiar localStorage
    try {
      localStorage.removeItem('bifrost_countdown');
    } catch (e) {
      // Silently fail
    }

    // Mostrar mensaje final antes de redirigir
    if (countdownEl) {
      countdownEl.innerHTML = `
        <div style="font-size: clamp(24px, 4vw, 36px); font-weight: 700; color: var(--white); margin: 40px 0;">
          ¡El puente está listo!
        </div>
      `;
    }

    // Redirigir después de 2 segundos
    setTimeout(() => {
      window.location.href = REDIRECT_URL;
    }, 2000);
  }

  // ========== Crear partículas flotantes ==========
  function createParticles() {
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
      
      // Alternnar colores azul/naranja aleatoriamente
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

  // ========== Inicializar ==========
  function init() {
    // Verificar si ya pasó la fecha (por si acaso)
    const now = new Date().getTime();
    if (now >= TARGET_DATE) {
      redirectToMain();
      return;
    }

    // Cargar valores iniciales desde localStorage
    const loaded = loadFromLocalStorage();
    
    // Si no se cargó desde localStorage, actualizar inmediatamente
    if (!loaded) {
      updateCountdown();
    }

    // Crear partículas
    createParticles();

    // Iniciar actualización cada segundo
    setInterval(updateCountdown, 1000);

    // Agregar atributo aria-live para accesibilidad
    if (countdownEl) {
      countdownEl.setAttribute('aria-live', 'polite');
      countdownEl.setAttribute('aria-atomic', 'true');
    }
  }

  // ========== Ejecutar cuando el DOM esté listo ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
