export const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const lerp = (a: number, b: number, amount: number) => a + (b - a) * amount;
export const easeOutCubic = (value: number) => 1 - Math.pow(1 - clamp(value), 3);
export const easeInOut = (value: number) => {
  const t = clamp(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2));
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, color: string | CanvasGradient) {
  roundedRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = color;
  ctx.fill();
}

export function hash(index: number, salt = 0): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

export function drawCover(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sourceWidth: number, sourceHeight: number, x: number, y: number, width: number, height: number) {
  if (!sourceWidth || !sourceHeight) return;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const sw = width / scale;
  const sh = height / scale;
  const sx = (sourceWidth - sw) / 2;
  const sy = (sourceHeight - sh) / 2;
  ctx.drawImage(source, sx, sy, sw, sh, x, y, width, height);
}

function graphemes(text: string): string[] {
  try {
    const SegmenterClass = Intl.Segmenter;
    if (SegmenterClass) {
      return Array.from(new SegmenterClass(undefined, { granularity: 'grapheme' }).segment(text), (part) => part.segment);
    }
  } catch {
    // Array.from is a safe fallback for older WebViews.
  }
  return Array.from(text);
}

export function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const output: string[] = [];
  const paragraphs = (text || ' ').split('\n');
  for (const paragraph of paragraphs) {
    if (!paragraph) {
      output.push('');
      continue;
    }
    const words = paragraph.split(/(\s+)/).filter((word) => word.length > 0);
    let line = '';
    for (const word of words) {
      const candidate = line + word;
      if (line.trim() && ctx.measureText(candidate).width > maxWidth) {
        output.push(line.trimEnd());
        line = word.trimStart();
      } else {
        line = candidate;
      }
      if (ctx.measureText(line).width <= maxWidth) continue;
      const letters = graphemes(line);
      let chunk = '';
      for (const letter of letters) {
        if (chunk && ctx.measureText(chunk + letter).width > maxWidth) {
          output.push(chunk.trimEnd());
          chunk = letter.trimStart();
        } else {
          chunk += letter;
        }
      }
      line = chunk;
    }
    if (line || !words.length) output.push(line.trimEnd());
  }
  return output.length ? output : [''];
}

export function isRtlText(text: string): boolean {
  return /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(text);
}

export function drawInitials(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, radius: number, color: string, image?: HTMLImageElement) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  if (image?.complete && image.naturalWidth) {
    drawCover(ctx, image, image.naturalWidth, image.naturalHeight, x - radius, y - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0] ?? '').join('').toUpperCase() || 'C';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 ${radius * 0.78}px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, x, y + radius * 0.04);
  }
  ctx.restore();
}

export function springScale(progress: number): number {
  const p = clamp(progress);
  if (p < 0.58) return lerp(0.88, 1.02, easeOutCubic(p / 0.58));
  return lerp(1.02, 1, easeInOut((p - 0.58) / 0.42));
}

export function setFont(ctx: CanvasRenderingContext2D, size: number, weight = 400) {
  ctx.font = `${weight} ${size}px ${FONT_STACK}`;
  ctx.textBaseline = 'alphabetic';
}
