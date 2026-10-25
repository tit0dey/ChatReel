import { drawBackground } from './backgrounds';
import { clamp, fillRoundRect, setFont } from './canvas';
import { drawChat } from './chatRenderer';
import type { RenderOptions } from '../types';

export function renderFrame(ctx: CanvasRenderingContext2D, options: RenderOptions) {
  const { width, height, time, story, timeline, assets, isPro, partLabel } = options;
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, story, time, width, height, assets);

  const activeSting = timeline.items.find((entry) => entry.message.sting && time >= entry.appearAt && time < entry.appearAt + 0.65);
  if (activeSting) {
    const strength = 1 - clamp((time - activeSting.appearAt) / 0.65);
    const unit = Math.min(width, height) / 1080;
    ctx.translate(Math.sin(time * 83) * strength * 5 * unit, Math.cos(time * 71) * strength * 3 * unit);
  }
  drawChat(ctx, story, timeline, time, width, height, assets, isPro);
  ctx.restore();

  if (activeSting) {
    const progress = clamp((time - activeSting.appearAt) / 0.65);
    const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.2, width / 2, height / 2, Math.max(width, height) * 0.72);
    vignette.addColorStop(0, 'rgba(76,5,20,0)');
    vignette.addColorStop(1, `rgba(76,5,20,${(1 - progress) * 0.42})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  if (partLabel) {
    const unit = Math.min(width, height) / 1080;
    setFont(ctx, 22 * unit, 650);
    const labelWidth = ctx.measureText(partLabel).width + 44 * unit;
    const x = width - labelWidth - 28 * unit;
    const y = 28 * unit;
    fillRoundRect(ctx, x, y, labelWidth, 42 * unit, 21 * unit, 'rgba(10,15,26,0.62)');
    ctx.fillStyle = '#F8FAFC';
    ctx.textAlign = 'center';
    ctx.fillText(partLabel, x + labelWidth / 2, y + 29 * unit);
    ctx.textAlign = 'left';
  }
}
