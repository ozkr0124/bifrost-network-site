// Bifröst Network — speedtest.js
// Controla el toggle LibreSpeed/Ookla y la medición real con la librería oficial de LibreSpeed
// (js/vendor/librespeed/speedtest.js). Requiere que ese script se cargue ANTES que este archivo.

(function () {
  // ---------- Backend de LibreSpeed: local (Docker) vs producción ----------
  // Cambia esto a false para probar localmente con "docker compose up" (ver README.md
  // de la raíz del proyecto). En true, apunta a tu subdominio real en el Proxmox.
  const USE_PRODUCTION_BACKEND = false; // cámbialo a true cuando termines PRODUCCION.md
  const BACKEND_BASE = USE_PRODUCTION_BACKEND
    ? 'https://speedtest.bifrostinternet.com'
    : '/speedtest-backend';

  const MAX_SCALE = { dl: 1000, ul: 1000 }; // escala del túnel (Mbps) — coincide con el techo del Plan Cosmos

  // ---------- Toggle de motor ----------
  const engineButtons = document.querySelectorAll('.engine-toggle button');
  const panels = {
    librespeed: document.getElementById('panel-librespeed'),
    ookla: document.getElementById('panel-ookla'),
  };

  function selectEngine(engine, persist) {
    engineButtons.forEach((b) => b.classList.toggle('active', b.dataset.engine === engine));
    Object.entries(panels).forEach(([key, el]) => {
      if (el) el.classList.toggle('active', key === engine);
    });
    if (persist) {
      try { localStorage.setItem('bifrost-speedtest-engine', engine); } catch (e) {}
    }
  }

  engineButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectEngine(btn.dataset.engine, true);
      if (btn.dataset.engine === 'librespeed' && tunnel) {
        requestAnimationFrame(() => tunnel.refresh());
      }
    });
  });

  // Motor por defecto: LibreSpeed. Si el usuario ya había elegido Ookla antes, se recuerda.
  let savedEngine = null;
  try { savedEngine = localStorage.getItem('bifrost-speedtest-engine'); } catch (e) {}
  selectEngine(savedEngine === 'ookla' ? 'ookla' : 'librespeed', false);

  // ---------- Túnel Bifröst ----------
  // Importante: NO se llama tunnel.start() aquí. Al cargar la página solo se dibuja un
  // frame estático de reposo (sin loop de animación) — el túnel solo "cobra vida" cuando
  // el usuario da clic en "Iniciar prueba de velocidad" (ver runTest más abajo).
  const tunnelCanvas = document.getElementById('tunnelCanvas');
  const tunnel = tunnelCanvas ? new BifrostTunnel(tunnelCanvas) : null;
  if (tunnel) { tunnel.setIdle(); tunnel.drawStaticFrame(); }

  const els = {
    value: document.getElementById('gaugeValue'),
    unit: document.getElementById('gaugeUnit'),
    phase: document.getElementById('gaugePhase'),
    ping: document.getElementById('statPing'),
    jitter: document.getElementById('statJitter'),
    dl: document.getElementById('statDownload'),
    ul: document.getElementById('statUpload'),
    ip: document.getElementById('statIp'),
    startBtn: document.getElementById('startTestBtn'),
  };

  function resetStats() {
    [els.ping, els.jitter, els.dl, els.ul].forEach((el) => { if (el) el.textContent = '--'; });
    if (tunnel) tunnel.setIdle();
    if (els.value) els.value.textContent = '0';
    if (els.unit) els.unit.textContent = '';
    if (els.phase) els.phase.textContent = 'Listo para iniciar';
    if (els.ip) els.ip.textContent = '';
  }
  resetStats();

  // Estados del worker de LibreSpeed: -1 no iniciado, 0 preparando, 1 descarga,
  // 2 ping+jitter, 3 subida, 4 finalizado, 5 abortado.
  const PHASE_LABELS = {
    '-1': 'Listo para iniciar',
    0: 'Preparando…',
    1: 'Midiendo descarga…',
    2: 'Midiendo ping y jitter…',
    3: 'Midiendo subida…',
    4: 'Prueba finalizada',
    5: 'Prueba cancelada',
  };

  let speedtest = null;

  function ensureSpeedtestInstance() {
    if (speedtest) return speedtest;

    speedtest = new Speedtest();
    // Nota: telemetry_level se deja SIN configurar a propósito (queda desactivado por
    // defecto). Esa opción sirve para que LibreSpeed envíe cada resultado a una base de
    // datos propia vía un endpoint results/telemetry.php — útil si algún día quieres
    // guardar histórico de mediciones de tus clientes, pero hoy no existe ese endpoint,
    // así que activarlo solo generaba una petición fallida (404) sin ningún beneficio.

    // mpot:true agrega "?cors=true" a cada petición — necesario en producción porque
    // landing (GitHub Pages) y backend (tu Proxmox) son dominios distintos. En local, al
    // compartir origen vía el docker-compose de pruebas, no hace falta.
    //
    // NOTA: se usa setParameter (servidor único) y NO addTestPoint/addTestPoints.
    // addTestPoint es para modo multi-servidor y exige llamar selectServer() antes de
    // start() — si no, start() lanza un error silencioso y la prueba se queda colgada
    // en "Probando…" sin avanzar. Como solo tenemos un servidor, no lo necesitamos.
    speedtest.setParameter('mpot', USE_PRODUCTION_BACKEND);
    speedtest.setParameter('url_dl', BACKEND_BASE + '/garbage.php');
    speedtest.setParameter('url_ul', BACKEND_BASE + '/empty.php');
    speedtest.setParameter('url_ping', BACKEND_BASE + '/empty.php');
    speedtest.setParameter('url_getIp', BACKEND_BASE + '/getIP.php');

    speedtest.onupdate = function (data) {
      if (els.phase) els.phase.textContent = PHASE_LABELS[data.testState] || '';

      if (els.ping) els.ping.textContent = data.pingStatus ? Number(data.pingStatus).toFixed(0) : '--';
      if (els.jitter) els.jitter.textContent = data.jitterStatus ? Number(data.jitterStatus).toFixed(0) : '--';
      if (els.dl) els.dl.textContent = data.dlStatus ? Number(data.dlStatus).toFixed(1) : '--';
      if (els.ul) els.ul.textContent = data.ulStatus ? Number(data.ulStatus).toFixed(1) : '--';
      // Solo mostramos clientIp si de verdad parece una IP/host — si el backend no está
      // configurado bien (ej. responde una página de error HTML en vez de JSON), esto evita
      // volcar ese error crudo en pantalla.
      if (els.ip && data.clientIp && data.clientIp.length < 100 && !/[<>]/.test(data.clientIp)) {
        els.ip.textContent = data.clientIp;
      }

      // El túnel Bifröst sigue la fase activa: descarga = flujo hacia adentro,
      // subida = flujo hacia afuera, ping = ráfagas tipo sonar.
      if (data.testState === 2) {
        const v = Number(data.pingStatus) || 0;
        if (tunnel) tunnel.setPulse(Math.max(120, v * 4)); // ping más bajo = ráfagas más rápidas
        if (els.value) els.value.textContent = v.toFixed(0);
        if (els.unit) els.unit.textContent = 'ms · ping';
      } else if (data.testState === 1) {
        const v = Number(data.dlStatus) || 0;
        if (tunnel) tunnel.setFlow(1, v / MAX_SCALE.dl); // 1 = hacia afuera (descarga: los datos te alcanzan)
        if (els.value) els.value.textContent = v.toFixed(0);
        if (els.unit) els.unit.textContent = 'Mbps · descarga';
      } else if (data.testState === 3) {
        const v = Number(data.ulStatus) || 0;
        if (tunnel) tunnel.setFlow(-1, v / MAX_SCALE.ul); // -1 = hacia adentro (subida: los datos salen de ti)
        if (els.value) els.value.textContent = v.toFixed(0);
        if (els.unit) els.unit.textContent = 'Mbps · subida';
      }
    };

    speedtest.onend = function (aborted) {
      if (els.startBtn) {
        els.startBtn.disabled = false;
        els.startBtn.classList.remove('testing');
        els.startBtn.textContent = 'Volver a medir';
      }
      if (tunnel) { tunnel.setIdle(); tunnel.stop(); tunnel.drawStaticFrame(); }
      if (els.phase) els.phase.textContent = aborted ? 'Prueba cancelada' : 'Prueba finalizada';
    };

    return speedtest;
  }

  function runTest() {
    if (typeof Speedtest === 'undefined') {
      if (els.phase) els.phase.textContent = 'No se pudo cargar el motor de medición (revisa la consola).';
      return;
    }
    const st = ensureSpeedtestInstance();
    resetStats();
    if (tunnel) tunnel.start();
    if (els.startBtn) {
      els.startBtn.disabled = true;
      els.startBtn.classList.add('testing');
      els.startBtn.textContent = 'Probando…';
    }
    if (els.phase) els.phase.textContent = 'Preparando…';
    try {
      st.start();
    } catch (err) {
      console.error('Bifröst speedtest error:', err);
      if (els.phase) els.phase.textContent = 'Error al iniciar la prueba (ver consola).';
      if (els.startBtn) {
        els.startBtn.disabled = false;
        els.startBtn.classList.remove('testing');
        els.startBtn.textContent = 'Reintentar';
      }
      if (tunnel) tunnel.stop();
    }
  }

  if (els.startBtn) els.startBtn.addEventListener('click', runTest);
})();
