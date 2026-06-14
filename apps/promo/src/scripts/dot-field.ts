// ReactBits "Dot Field" background, ported to vanilla TS for Astro.
// https://reactbits.dev/backgrounds/dot-field — plain canvas 2D (no WebGL).
// A grid of dots that bulge away from the cursor, with a soft cursor glow.

const TWO_PI = Math.PI * 2;

export interface DotFieldOptions {
  dotRadius?: number;
  dotSpacing?: number;
  cursorRadius?: number;
  bulgeStrength?: number;
  glowRadius?: number;
  gradientFrom?: string;
  gradientTo?: string;
  glowColor?: string;
  waveAmplitude?: number;
}

interface Dot { ax: number; ay: number; sx: number; sy: number; }

export function initDotField(container: HTMLElement, opts: DotFieldOptions = {}): () => void {
  const dotRadius = opts.dotRadius ?? 1.6;
  const dotSpacing = opts.dotSpacing ?? 16;
  const cursorRadius = opts.cursorRadius ?? 480;
  const bulgeStrength = opts.bulgeStrength ?? 60;
  const glowRadius = opts.glowRadius ?? 160;
  const gradientFrom = opts.gradientFrom ?? 'rgba(16, 185, 129, 0.5)';
  const gradientTo = opts.gradientTo ?? 'rgba(45, 212, 191, 0.3)';
  const glowColor = opts.glowColor ?? 'rgba(52, 211, 153, 0.22)';
  const waveAmplitude = opts.waveAmplitude ?? 0;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: true })!;

  // Cursor glow — an SVG radial gradient circle that follows the pointer.
  const svgNS = 'http://www.w3.org/2000/svg';
  const glowId = `df-glow-${Math.random().toString(36).slice(2, 9)}`;
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;');
  svg.innerHTML =
    `<defs><radialGradient id="${glowId}">` +
    `<stop offset="0%" stop-color="${glowColor}"/>` +
    `<stop offset="100%" stop-color="transparent"/></radialGradient></defs>`;
  const glow = document.createElementNS(svgNS, 'circle');
  glow.setAttribute('cx', '-9999');
  glow.setAttribute('cy', '-9999');
  glow.setAttribute('r', String(glowRadius));
  glow.setAttribute('fill', `url(#${glowId})`);
  glow.style.opacity = '0';
  svg.appendChild(glow);
  container.appendChild(svg);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let dots: Dot[] = [];
  let size = { w: 0, h: 0, offsetX: 0, offsetY: 0 };
  const mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 };
  let engagement = 0;
  let glowOpacity = 0;
  let frame = 0;
  let raf = 0;
  let resizeTimer = 0;

  function buildDots(w: number, h: number) {
    const step = dotRadius + dotSpacing;
    const cols = Math.floor(w / step);
    const rows = Math.floor(h / step);
    const padX = (w % step) / 2;
    const padY = (h % step) / 2;
    const arr: Dot[] = new Array(rows * cols);
    let idx = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const ax = padX + col * step + step / 2;
        const ay = padY + row * step + step / 2;
        arr[idx++] = { ax, ay, sx: ax, sy: ay };
      }
    }
    dots = arr;
  }

  function paint(interactive: boolean) {
    const { w, h } = size;
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, gradientFrom);
    grad.addColorStop(1, gradientTo);
    ctx.fillStyle = grad;

    const rad = dotRadius / 2;
    const crSq = cursorRadius * cursorRadius;
    const t = frame * 0.02;
    const eng = engagement;

    ctx.beginPath();
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];

      if (interactive) {
        const dx = mouse.x - d.ax;
        const dy = mouse.y - d.ay;
        const distSq = dx * dx + dy * dy;
        if (distSq < crSq && eng > 0.01) {
          const dist = Math.sqrt(distSq);
          const tt = 1 - dist / cursorRadius;
          const push = tt * tt * bulgeStrength * eng;
          const angle = Math.atan2(dy, dx);
          d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
          d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
        } else {
          d.sx += (d.ax - d.sx) * 0.1;
          d.sy += (d.ay - d.sy) * 0.1;
        }
      }

      let drawX = d.sx;
      let drawY = d.sy;
      if (waveAmplitude > 0) {
        drawY += Math.sin(d.ax * 0.03 + t) * waveAmplitude;
        drawX += Math.cos(d.ay * 0.03 + t * 0.7) * waveAmplitude * 0.5;
      }
      ctx.moveTo(drawX + rad, drawY);
      ctx.arc(drawX, drawY, rad, 0, TWO_PI);
    }
    ctx.fill();
  }

  function doResize() {
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    size = { w, h, offsetX: rect.left + window.scrollX, offsetY: rect.top + window.scrollY };
    buildDots(w, h);
    if (prefersReduced) paint(false);
  }

  function resize() {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(doResize, 100);
  }

  function onMouseMove(e: MouseEvent) {
    mouse.x = e.pageX - size.offsetX;
    mouse.y = e.pageY - size.offsetY;
  }

  const speedInterval = window.setInterval(() => {
    const dx = mouse.prevX - mouse.x;
    const dy = mouse.prevY - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    mouse.speed += (dist - mouse.speed) * 0.5;
    if (mouse.speed < 0.001) mouse.speed = 0;
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;
  }, 20);

  function tick() {
    frame++;
    const targetEngagement = Math.min(mouse.speed / 5, 1);
    engagement += (targetEngagement - engagement) * 0.06;
    if (engagement < 0.001) engagement = 0;

    glowOpacity += (engagement - glowOpacity) * 0.08;
    glow.setAttribute('cx', String(mouse.x));
    glow.setAttribute('cy', String(mouse.y));
    glow.style.opacity = String(glowOpacity);

    paint(true);
    raf = requestAnimationFrame(tick);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  doResize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  if (!prefersReduced) raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    clearInterval(speedInterval);
    clearTimeout(resizeTimer);
    ro.disconnect();
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onMouseMove);
    canvas.remove();
    svg.remove();
  };
}
