import { clamp, drawCover, fillRoundRect, hash, lerp } from './canvas';
import type { AssetBundle, Story } from '../types';

function gradient(ctx: CanvasRenderingContext2D, width: number, height: number, stops: Array<[number, string]>) {
  const value = ctx.createLinearGradient(0, 0, 0, height);
  stops.forEach(([offset, color]) => value.addColorStop(offset, color));
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, width, height);
}

function highway(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  gradient(ctx, w, h, [[0, '#070A1B'], [0.46, '#171336'], [0.72, '#151327'], [1, '#05060D']]);
  const horizon = h * 0.39;
  const glow = ctx.createRadialGradient(w * 0.5, horizon, 0, w * 0.5, horizon, w * 0.7);
  glow.addColorStop(0, 'rgba(244,63,94,0.24)');
  glow.addColorStop(0.42, 'rgba(79,70,229,0.12)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h * 0.75);

  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < 19; i++) {
      const bw = w * (0.025 + hash(i, side) * 0.055);
      const bh = h * (0.035 + hash(i, side + 4) * 0.19);
      const x = side === 0 ? i * w * 0.029 - w * 0.03 : w - i * w * 0.029 - bw + w * 0.03;
      ctx.fillStyle = i % 3 === 0 ? '#0E1025' : '#090C1D';
      ctx.fillRect(x, horizon - bh, bw, bh);
      ctx.fillStyle = i % 2 ? 'rgba(45,212,191,0.32)' : 'rgba(129,140,248,0.3)';
      for (let row = 0; row < 4; row++) {
        if (hash(i * 5 + row, side) > 0.4) ctx.fillRect(x + bw * 0.22, horizon - bh + row * bh * 0.2 + bh * 0.1, bw * 0.12, Math.max(1, h * 0.002));
      }
    }
  }

  ctx.fillStyle = '#080A13';
  ctx.beginPath();
  ctx.moveTo(w * 0.41, horizon);
  ctx.lineTo(w * 0.59, horizon);
  ctx.lineTo(w * 1.06, h);
  ctx.lineTo(-w * 0.06, h);
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = Math.max(1, w * 0.002);
  for (let side = -1; side <= 1; side += 2) {
    ctx.strokeStyle = side < 0 ? 'rgba(34,211,238,0.65)' : 'rgba(251,113,133,0.65)';
    ctx.beginPath();
    ctx.moveTo(w * (0.5 + side * 0.1), horizon);
    ctx.lineTo(w * (0.5 + side * 0.53), h);
    ctx.stroke();
  }

  for (let i = 0; i < 20; i++) {
    const phase = (i / 20 + time * 0.7) % 1;
    const depth = phase * phase;
    const y = lerp(horizon, h * 1.03, depth);
    const len = lerp(h * 0.005, h * 0.075, depth);
    ctx.strokeStyle = `rgba(226,232,240,${0.12 + depth * 0.65})`;
    ctx.lineWidth = lerp(1, w * 0.007, depth);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, y);
    ctx.lineTo(w * 0.5, y + len);
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 8; i++) {
    const phase = (hash(i, 14) + time * (0.08 + hash(i, 4) * 0.08)) % 1;
    const depth = phase * phase;
    const y = lerp(horizon, h * 1.05, depth);
    const x = w * (0.5 + (i % 2 ? 1 : -1) * lerp(0.035, 0.34, depth));
    ctx.strokeStyle = i % 2 ? `rgba(244,63,94,${0.15 + depth * 0.65})` : `rgba(34,211,238,${0.12 + depth * 0.55})`;
    ctx.lineWidth = lerp(1, w * 0.009, depth);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (i % 2 ? 1 : -1) * w * 0.025 * depth, y + h * 0.08 * depth);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

function parkour(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  gradient(ctx, w, h, [[0, '#79BDE8'], [0.52, '#B9DDF0'], [1, '#F4C9B3']]);
  const sun = ctx.createRadialGradient(w * 0.78, h * 0.2, 0, w * 0.78, h * 0.2, w * 0.3);
  sun.addColorStop(0, 'rgba(255,248,218,0.9)');
  sun.addColorStop(1, 'rgba(255,248,218,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h * 0.55);

  for (let i = 0; i < 6; i++) {
    const x = ((hash(i, 3) * w * 1.4 + time * (5 + i * 2)) % (w * 1.5)) - w * 0.25;
    const y = h * (0.12 + hash(i, 9) * 0.28);
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    fillRoundRect(ctx, x, y, w * 0.15, h * 0.018, h * 0.01, 'rgba(255,255,255,0.42)');
    fillRoundRect(ctx, x + w * 0.035, y - h * 0.013, w * 0.08, h * 0.022, h * 0.012, 'rgba(255,255,255,0.42)');
  }

  for (let i = 0; i < 15; i++) {
    const travel = (i / 15 + time * 0.075) % 1;
    const scale = 0.24 + travel * 1.18;
    const x = ((hash(i, 1) * 1.3 - 0.15) * w + Math.sin(time * 0.24 + i) * w * 0.035) % (w * 1.15);
    const y = h * (0.28 + travel * 0.72);
    const size = w * 0.13 * scale;
    const depth = size * 0.42;
    ctx.globalAlpha = clamp(travel * 3, 0, 1);
    ctx.fillStyle = i % 3 === 0 ? '#6D9C75' : '#7BA17B';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y - depth * 0.45);
    ctx.lineTo(x + size * 1.55, y);
    ctx.lineTo(x + size * 0.55, y + depth * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = i % 3 === 0 ? '#8A604B' : '#637684';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.55, y + depth * 0.45);
    ctx.lineTo(x + size * 1.55, y);
    ctx.lineTo(x + size * 1.55, y + depth * 1.25);
    ctx.lineTo(x + size * 0.55, y + depth * 1.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = i % 3 === 0 ? '#66483D' : '#4B5E6D';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size * 0.55, y + depth * 0.45);
    ctx.lineTo(x + size * 0.55, y + depth * 1.7);
    ctx.lineTo(x, y + depth * 1.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function rainy(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  gradient(ctx, w, h, [[0, '#07111D'], [0.55, '#0C1823'], [1, '#080B12']]);
  for (let i = 0; i < 12; i++) {
    const x = hash(i, 5) * w;
    const y = h * (0.18 + hash(i, 8) * 0.55);
    const radius = w * (0.018 + hash(i, 3) * 0.065);
    const light = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const color = i % 3 === 0 ? '244,114,182' : i % 3 === 1 ? '251,191,36' : '45,212,191';
    light.addColorStop(0, `rgba(${color},${0.18 + Math.sin(time + i) * 0.04})`);
    light.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = light;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 74; i++) {
    const speed = 0.07 + hash(i, 4) * 0.16;
    const phase = (hash(i, 2) + time * speed) % 1;
    const x = (hash(i, 9) * w + Math.sin(time * 0.3 + i) * w * 0.008) % w;
    const y = phase * (h + h * 0.08) - h * 0.04;
    const radius = Math.max(1.2, w * (0.0015 + hash(i, 7) * 0.004));
    ctx.strokeStyle = `rgba(184,214,231,${0.12 + hash(i, 6) * 0.32})`;
    ctx.lineWidth = radius;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + radius * 1.8, y + radius * 4, x + radius * 0.8, y + radius * (7 + hash(i, 11) * 14));
    ctx.stroke();
    ctx.fillStyle = 'rgba(222,239,248,0.2)';
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.4, y, radius * 0.7, radius * 1.3, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineCap = 'butt';
}

function aurora(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  gradient(ctx, w, h, [[0, '#071523'], [0.48, '#10243A'], [1, '#160F2D']]);
  ctx.globalCompositeOperation = 'screen';
  for (let band = 0; band < 4; band++) {
    const hue = band % 2 === 0 ? '45,212,191' : '129,140,248';
    for (let slice = 0; slice < 15; slice++) {
      const x = (slice / 14) * w;
      const wave = Math.sin(slice * 0.54 + time * (0.16 + band * 0.035) + band * 1.8);
      const y = h * (0.2 + band * 0.12) + wave * h * 0.09;
      const radius = w * 0.19;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, `rgba(${hue},${0.095 - band * 0.009})`);
      glow.addColorStop(1, `rgba(${hue},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 42; i++) {
    const alpha = 0.18 + (Math.sin(time * 0.7 + i * 2.1) + 1) * 0.2;
    ctx.fillStyle = `rgba(226,245,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(hash(i, 1) * w, hash(i, 2) * h * 0.75, Math.max(0.7, w * 0.0014), 0, Math.PI * 2);
    ctx.fill();
  }
}

function starlight(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  gradient(ctx, w, h, [[0, '#10152E'], [0.5, '#302342'], [0.78, '#7C4650'], [1, '#181725']]);
  for (let i = 0; i < 70; i++) {
    const x = (hash(i, 8) * w + time * (i % 3) * 0.7) % w;
    const y = hash(i, 2) * h * 0.68;
    const twinkle = 0.2 + (Math.sin(time * (0.6 + hash(i, 4)) + i) + 1) * 0.28;
    ctx.fillStyle = `rgba(255,244,214,${twinkle})`;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.8, w * (0.0007 + hash(i, 5) * 0.0015)), 0, Math.PI * 2);
    ctx.fill();
  }
  const moonX = w * 0.78;
  const moonY = h * 0.18;
  const moonR = w * 0.055;
  const glow = ctx.createRadialGradient(moonX, moonY, moonR * 0.2, moonX, moonY, moonR * 3.4);
  glow.addColorStop(0, 'rgba(255,238,196,0.24)');
  glow.addColorStop(1, 'rgba(255,238,196,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(moonX - moonR * 3.4, moonY - moonR * 3.4, moonR * 6.8, moonR * 6.8);
  ctx.fillStyle = '#FFF0CB';
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#171A2B';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.72);
  for (let i = 0; i <= 12; i++) ctx.lineTo(i * w / 12, h * (0.67 + hash(i, 13) * 0.1));
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  ctx.fillStyle = '#0D111C';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.82);
  for (let i = 0; i <= 10; i++) ctx.lineTo(i * w / 10, h * (0.77 + hash(i, 17) * 0.08));
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();

  for (let i = 0; i < 14; i++) {
    const x = (hash(i, 6) * w + Math.sin(time * 0.32 + i) * w * 0.025 + w) % w;
    const y = h * (0.64 + hash(i, 9) * 0.28) + Math.cos(time * 0.5 + i) * h * 0.014;
    ctx.fillStyle = `rgba(252,211,77,${0.25 + (Math.sin(time * 1.8 + i) + 1) * 0.25})`;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, w * 0.0023), 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawBackground(ctx: CanvasRenderingContext2D, story: Story, time: number, w: number, h: number, assets: AssetBundle) {
  const settings = story.settings;
  ctx.save();
  if (settings.background === 'custom') {
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);
    const source = settings.customBackgroundType === 'video' ? assets.backgroundVideo : assets.backgroundImage;
    const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source?.naturalWidth;
    const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source?.naturalHeight;
    if (source && sourceWidth && sourceHeight) {
      const blur = settings.backgroundBlur * Math.min(w, h) / 1080;
      try { ctx.filter = blur > 0 ? `blur(${blur}px)` : 'none'; } catch { /* Older WebViews simply skip blur. */ }
      const overscan = blur * 2.5;
      drawCover(ctx, source, sourceWidth, sourceHeight, -overscan, -overscan, w + overscan * 2, h + overscan * 2);
      try { ctx.filter = 'none'; } catch { /* no-op */ }
    } else {
      aurora(ctx, w, h, time);
    }
  } else {
    const renderers = { highway, parkour, rain: rainy, aurora, starlight };
    renderers[settings.background](ctx, w, h, time);
  }
  ctx.fillStyle = `rgba(3,7,18,${clamp(settings.backgroundDim / 100, 0, 0.85)})`;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
