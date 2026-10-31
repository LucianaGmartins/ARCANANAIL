/* Arcana Nail — céu estrelado do fundo (canvas leve, ~30 quadros por segundo, pausa fora da tela). */
(function () {
  const canvas = document.querySelector('.ceu canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0, estrelas = [], quadro = 0, ultimo = 0, cadente = null, proximaCadente = 0;

  function medir() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(240, (w * h) / 6500));
    estrelas = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() < 0.08 ? Math.random() * 0.8 + 1.1 : Math.random() * 0.8 + 0.25,
      a: Math.random() * 0.55 + 0.2, v: Math.random() * 0.0016 + 0.0004, f: Math.random() * 6.28,
      ouro: Math.random() < 0.22
    }));
    desenhar(performance.now());
  }

  function desenhar(t) {
    ctx.clearRect(0, 0, w, h);
    for (const s of estrelas) {
      const a = reduzir ? s.a : s.a * (0.5 + 0.5 * Math.sin(t * s.v + s.f));
      ctx.globalAlpha = a;
      ctx.fillStyle = s.ouro ? '#f1d59c' : '#f5ede3';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
      if (s.r > 1.1 && a > 0.4) { // brilho em cruz das estrelas maiores, como na logo
        ctx.globalAlpha = a * 0.45;
        ctx.fillRect(s.x - s.r * 4, s.y - 0.3, s.r * 8, 0.6);
        ctx.fillRect(s.x - 0.3, s.y - s.r * 4, 0.6, s.r * 8);
      }
    }
    if (cadente) {
      const p = (t - cadente.t0) / cadente.dur;
      if (p >= 1) cadente = null;
      else {
        const x = cadente.x + cadente.dx * p, y = cadente.y + cadente.dy * p;
        const g = ctx.createLinearGradient(x, y, x - cadente.dx * 0.18, y - cadente.dy * 0.18);
        g.addColorStop(0, 'rgba(241,213,156,0.9)'); g.addColorStop(1, 'rgba(241,213,156,0)');
        ctx.globalAlpha = Math.sin(p * Math.PI);
        ctx.strokeStyle = g; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - cadente.dx * 0.18, y - cadente.dy * 0.18); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function laco(t) {
    quadro = requestAnimationFrame(laco);
    if (t - ultimo < 33) return;
    ultimo = t;
    if (!cadente && t > proximaCadente) {
      if (proximaCadente) cadente = { x: Math.random() * w * 0.7 + w * 0.2, y: Math.random() * h * 0.35, dx: -(220 + Math.random() * 200), dy: 120 + Math.random() * 90, t0: t, dur: 900 };
      proximaCadente = t + 9000 + Math.random() * 9000;
    }
    desenhar(t);
  }

  let espera;
  addEventListener('resize', () => {
    // No celular a barra de endereço muda a altura ao rolar: ignora para as estrelas não pularem.
    if (innerWidth === w && Math.abs(innerHeight - h) < 160) return;
    clearTimeout(espera); espera = setTimeout(medir, 150);
  });
  medir();
  if (reduzir) return;
  quadro = requestAnimationFrame(laco);
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(quadro);
    if (!document.hidden) quadro = requestAnimationFrame(laco);
  });
})();
