/*
  Bifröst Network — bifrost-tunnel.js

  Visualización propia del medidor de velocidad: franjas de luz radiando desde un punto
  de fuga central, con estela de movimiento — estilo "salto a hiperespacio" cinematográfico,
  en la paleta de marca. Reemplaza un velocímetro/anillos clásicos, que además resultaban
  incómodos a la vista por el parpadeo circular constante.

  Cómo leerlo:
  - Descarga → las franjas viajan HACIA AFUERA, desde el centro hacia el borde (los datos
               te alcanzan, como avanzar hacia adelante).
  - Subida   → las franjas viajan HACIA ADENTRO, desde el borde hacia el centro (los datos
               salen de ti, como retroceder).
  - Ping     → ráfaga radial corta tipo sonar, en vez de flujo continuo (más rápida cuanto
               menor el ping).
  - Solo anima mientras el motor está en marcha (start()) — en reposo se dibuja un único
    frame estático (drawStaticFrame()), sin loop, para no consumir CPU ni marear a nadie
    que no haya pedido la prueba.

  Sin dependencias externas — Canvas2D puro.
*/

class BifrostTunnel {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.count = options.count || 140;

    // Mismo degradado que el haz del Hero: azul → violeta → rosa → naranja
    this.colorStops = [
      { stop: 0, color: [0, 17, 255] },
      { stop: 0.35, color: [139, 63, 255] },
      { stop: 0.65, color: [255, 63, 139] },
      { stop: 1, color: [254, 80, 0] },
    ];

    this.direction = 1; // 1 = hacia afuera (descarga) | -1 = hacia adentro (subida)
    this.speed = 0; // velocidad base (fracción de z por frame) — 0 en reposo
    this.pulseMode = false;
    this.pulseInterval = 550;
    this._pulseElapsed = 0;

    this.stars = [];
    for (let i = 0; i < 50; i++) {
      this.stars.push({ angle: Math.random() * Math.PI * 2, z: Math.random(), tw: Math.random() * Math.PI * 2 });
    }

    this.particles = [];
    for (let i = 0; i < this.count; i++) this.particles.push(this._spawnParticle(Math.random()));

    this._running = false;
    this._raf = null;
    this._last = 0;
    this._time = 0;
    this._tick = this._tick.bind(this);
    this._onResize = this._resize.bind(this);

    this._resize();
    window.addEventListener('resize', this._onResize);
  }

  _spawnParticle(z) {
    const t = Math.random();
    return {
      angle: Math.random() * Math.PI * 2,
      z: z, // 0 = centro (lejos) .. 1 = borde (cerca)
      speedVar: 0.7 + Math.random() * 0.6,
      colorT: t,
    };
  }

  _resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w;
    this.h = h;
    this.cx = w / 2;
    this.cy = h / 2;
    this.halfW = w / 2;
    this.halfH = h / 2;

    // Redimensionar el canvas SIEMPRE borra su contenido. Si el loop de animación no está
    // corriendo (reposo o prueba finalizada), nadie más va a volver a pintar — por eso
    // redibujamos aquí mismo para no dejar el panel en blanco hasta el próximo "Iniciar".
    if (!this._running) this._draw();
  }

  /** Distancia del centro al borde del rectángulo en la dirección de "angle" (para que las franjas lleguen justo al borde del panel, sin importar su proporción). */
  _maxRadiusForAngle(angle) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const tx = cos !== 0 ? this.halfW / Math.abs(cos) : Infinity;
    const ty = sin !== 0 ? this.halfH / Math.abs(sin) : Infinity;
    return Math.min(tx, ty);
  }

  _colorAt(t) {
    const stops = this.colorStops;
    let a = stops[0], b = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (t >= stops[i].stop && t <= stops[i + 1].stop) { a = stops[i]; b = stops[i + 1]; break; }
    }
    const span = (b.stop - a.stop) || 1;
    const localT = (t - a.stop) / span;
    const c = a.color.map((v, i) => Math.round(v + (b.color[i] - v) * localT));
    return c;
  }

  /** Flujo continuo (descarga/subida). direction: 1 = hacia afuera, -1 = hacia adentro. intensity: 0..1 */
  setFlow(direction, intensity) {
    this.pulseMode = false;
    this.direction = direction;
    this.speed = 0.006 + Math.max(0, Math.min(1, intensity)) * 0.034;
  }

  /** Modo ping: ráfagas radiales cortas. intervalMs más bajo = ping más bajo = ráfagas más rápidas. */
  setPulse(intervalMs) {
    this.pulseMode = true;
    this.pulseInterval = Math.max(140, Math.min(1200, intervalMs));
  }

  setIdle() {
    this.pulseMode = false;
    this.direction = 1;
    this.speed = 0.0015; // deriva casi imperceptible, sin loop activo salvo drawStaticFrame
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._tick);
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
  }

  /** Recalcula tamaño y redibuja — útil cuando el panel pasa de oculto a visible (el canvas no tiene tamaño real mientras está en display:none). */
  refresh() {
    this._resize();
    if (!this._running) this._draw();
  }

  /** Dibuja un único frame en reposo, sin arrancar el loop de animación. */
  drawStaticFrame() {
    this._time = 0;
    this._draw();
  }

  _tick(now) {
    if (!this._running) return;
    const dt = Math.min(48, now - this._last) / 16.67; // normalizado a ~60fps
    this._last = now;
    this._time += dt;

    if (this.pulseMode) {
      this._pulseElapsed += dt * 16.67;
      if (this._pulseElapsed > this.pulseInterval) {
        this._pulseElapsed = 0;
        this.particles.forEach((p) => { p.z = 0.001; p.angle = Math.random() * Math.PI * 2; });
      }
      this.particles.forEach((p) => { p.z = Math.min(1.15, p.z + 0.05 * dt * p.speedVar); });
    } else {
      this.particles.forEach((p) => {
        p.z += this.direction * this.speed * dt * p.speedVar;
        if (p.z > 1) { p.z = 0; p.angle = Math.random() * Math.PI * 2; }
        if (p.z < 0) { p.z = 1; p.angle = Math.random() * Math.PI * 2; }
      });
    }

    this._draw();
    this._raf = requestAnimationFrame(this._tick);
  }

  _draw() {
    const { ctx, w, h, cx, cy } = this;
    if (!w || !h) return;

    // Fondo nebulosa oscura
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
    bg.addColorStop(0, '#141225');
    bg.addColorStop(0.55, '#0b0a17');
    bg.addColorStop(1, '#050509');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Nebulosa sutil (un par de manchas suaves de color de marca)
    const neb1 = ctx.createRadialGradient(cx - w * 0.2, cy + h * 0.15, 0, cx - w * 0.2, cy + h * 0.15, w * 0.35);
    neb1.addColorStop(0, 'rgba(139,63,255,0.10)');
    neb1.addColorStop(1, 'rgba(139,63,255,0)');
    ctx.fillStyle = neb1;
    ctx.fillRect(0, 0, w, h);
    const neb2 = ctx.createRadialGradient(cx + w * 0.25, cy - h * 0.1, 0, cx + w * 0.25, cy - h * 0.1, w * 0.3);
    neb2.addColorStop(0, 'rgba(255,63,139,0.08)');
    neb2.addColorStop(1, 'rgba(255,63,139,0)');
    ctx.fillStyle = neb2;
    ctx.fillRect(0, 0, w, h);

    // Estrellas estáticas con leve titileo
    this.stars.forEach((s) => {
      const r = this._maxRadiusForAngle(s.angle) * s.z;
      const x = cx + Math.cos(s.angle) * r;
      const y = cy + Math.sin(s.angle) * r;
      const tw = 0.5 + 0.5 * Math.sin(this._time * 0.05 + s.tw);
      ctx.beginPath();
      ctx.arc(x, y, 0.9, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.15 + tw * 0.35})`;
      ctx.fill();
    });

    // Franjas de luz con estela
    ctx.lineCap = 'round';
    this.particles.forEach((p) => {
      const z = Math.max(0, Math.min(1, p.z));
      const maxR = this._maxRadiusForAngle(p.angle);
      const trailZ = Math.max(0, z - 0.09 - z * 0.05);

      const r1 = trailZ * maxR;
      const r2 = z * maxR;
      const x1 = cx + Math.cos(p.angle) * r1;
      const y1 = cy + Math.sin(p.angle) * r1;
      const x2 = cx + Math.cos(p.angle) * r2;
      const y2 = cy + Math.sin(p.angle) * r2;

      const alpha = Math.max(0, Math.min(1, z * 1.3)) * (0.75 + 0.25 * Math.sin(z * 6 + this._time * 0.02));
      const [cr, cg, cb] = this._colorAt(p.colorT);

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},0)`);
      grad.addColorStop(1, `rgba(${cr},${cg},${cb},${alpha})`);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(0.6, 0.5 + z * 2.6);
      ctx.stroke();
    });

    // Resplandor central (punto de fuga)
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.16);
    glow.addColorStop(0, 'rgba(255,255,255,0.55)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(w, h) * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
}
