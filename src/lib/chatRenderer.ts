import { clamp, drawCover, drawInitials, easeOutCubic, fillRoundRect, hash, isRtlText, lerp, roundedRect, setFont, springScale, wrapCanvasText } from './canvas';
import type { AssetBundle, ChatMode, ChatTheme, Story, StoryMessage, StoryTimeline, TimelineItem } from '../types';

interface Palette {
  canvas: string;
  header: string;
  text: string;
  secondary: string;
  receiver: string;
  receiverText: string;
  senderText: string;
  input: string;
  line: string;
  accent: string;
}

interface Layout {
  item: TimelineItem;
  width: number;
  height: number;
  lines: string[];
  lineHeight: number;
  fontSize: number;
  receipt: boolean;
}

interface ChatFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  bodyY: number;
  bodyBottom: number;
  bodyWidth: number;
  unit: number;
  statusHeight: number;
  headerHeight: number;
}

const palettes: Record<ChatTheme, (mode: ChatMode) => Palette> = {
  imessage: (mode) => ({
    canvas: mode === 'light' ? '#FFFFFF' : '#000000',
    header: mode === 'light' ? '#F6F6F8' : '#1C1C1E',
    text: mode === 'light' ? '#111111' : '#F5F5F5',
    secondary: mode === 'light' ? '#8E8E93' : '#98989F',
    receiver: mode === 'light' ? '#E9E9EB' : '#262629',
    receiverText: mode === 'light' ? '#111111' : '#F5F5F5',
    senderText: '#FFFFFF', input: mode === 'light' ? '#F1F1F3' : '#1C1C1E',
    line: mode === 'light' ? '#D8D8DC' : '#343438', accent: '#007AFF',
  }),
  whatsapp: (mode) => ({
    canvas: mode === 'light' ? '#EFE7DD' : '#0B141A',
    header: mode === 'light' ? '#F0F2F5' : '#202C33',
    text: mode === 'light' ? '#111B21' : '#E9EDEF',
    secondary: mode === 'light' ? '#667781' : '#8696A0',
    receiver: mode === 'light' ? '#FFFFFF' : '#202C33',
    receiverText: mode === 'light' ? '#111B21' : '#E9EDEF',
    senderText: mode === 'light' ? '#111B21' : '#E9EDEF',
    input: mode === 'light' ? '#FFFFFF' : '#202C33',
    line: mode === 'light' ? '#D1D7DB' : '#2A3942', accent: '#00A884',
  }),
  instagram: (mode) => ({
    canvas: mode === 'light' ? '#FFFFFF' : '#000000',
    header: mode === 'light' ? '#FFFFFF' : '#000000',
    text: mode === 'light' ? '#111111' : '#F5F5F5',
    secondary: mode === 'light' ? '#8E8E8E' : '#A8A8A8',
    receiver: mode === 'light' ? '#EFEFEF' : '#262626',
    receiverText: mode === 'light' ? '#111111' : '#F5F5F5',
    senderText: '#FFFFFF', input: mode === 'light' ? '#EFEFEF' : '#1C1C1E',
    line: mode === 'light' ? '#DBDBDB' : '#262626', accent: '#7C3AED',
  }),
  discord: () => ({
    canvas: '#313338', header: '#1E1F22', text: '#F2F3F5', secondary: '#949BA4',
    receiver: '#383A40', receiverText: '#DBDEE1', senderText: '#FFFFFF',
    input: '#383A40', line: '#3F4147', accent: '#5865F2',
  }),
  messenger: (mode) => ({
    canvas: mode === 'light' ? '#FFFFFF' : '#0F1012',
    header: mode === 'light' ? '#FFFFFF' : '#1C1E21',
    text: mode === 'light' ? '#050505' : '#E4E6EB',
    secondary: mode === 'light' ? '#65676B' : '#B0B3B8',
    receiver: mode === 'light' ? '#E4E6EB' : '#3E4042',
    receiverText: mode === 'light' ? '#050505' : '#E4E6EB',
    senderText: '#FFFFFF', input: mode === 'light' ? '#F0F2F5' : '#3E4042',
    line: mode === 'light' ? '#E4E6EB' : '#3E4042', accent: '#0084FF',
  }),
  telegram: (mode) => ({
    canvas: mode === 'light' ? '#B8C9D1' : '#0E1621',
    header: mode === 'light' ? '#E7EEF2' : '#17212B',
    text: mode === 'light' ? '#17212B' : '#F1F5F9',
    secondary: mode === 'light' ? '#657B88' : '#7F91A4',
    receiver: mode === 'light' ? 'rgba(255,255,255,0.86)' : 'rgba(24,37,51,0.88)',
    receiverText: mode === 'light' ? '#17212B' : '#F1F5F9',
    senderText: '#FFFFFF', input: mode === 'light' ? 'rgba(255,255,255,0.82)' : 'rgba(23,33,43,0.9)',
    line: mode === 'light' ? 'rgba(101,123,136,0.25)' : '#2B3A49', accent: '#2AABEE',
  }),
};

function messageClock(index: number): string {
  const total = 21 * 60 + 41 + index;
  const hour24 = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  const hour = hour24 % 12 || 12;
  return `${hour}:${minutes.toString().padStart(2, '0')} ${hour24 >= 12 ? 'PM' : 'AM'}`;
}

function senderColor(ctx: CanvasRenderingContext2D, theme: ChatTheme, x: number, y: number, width: number, height: number): string | CanvasGradient {
  if (theme === 'imessage') return '#007AFF';
  if (theme === 'whatsapp') return '#DCF8C6';
  if (theme === 'telegram') {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, 'rgba(42,171,238,0.86)');
    gradient.addColorStop(1, 'rgba(43,82,120,0.9)');
    return gradient;
  }
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  if (theme === 'instagram') {
    gradient.addColorStop(0, '#7C3AED');
    gradient.addColorStop(0.52, '#4F46E5');
    gradient.addColorStop(1, '#2563EB');
  } else {
    gradient.addColorStop(0, '#0084FF');
    gradient.addColorStop(0.55, '#3578F6');
    gradient.addColorStop(1, '#7C3AED');
  }
  return gradient;
}

function sentColor(theme: ChatTheme, mode: ChatMode): string | null {
  if (theme === 'whatsapp') return mode === 'light' ? '#DCF8C6' : '#005C4B';
  if (theme === 'telegram') return null;
  if (theme === 'imessage') return '#007AFF';
  return null;
}

function inlineTimestamp(theme: ChatTheme): boolean {
  return theme === 'whatsapp' || theme === 'telegram';
}

function layoutMessage(ctx: CanvasRenderingContext2D, item: TimelineItem, bodyWidth: number, unit: number, story: Story, receipt: boolean): Layout {
  const { message } = item;
  const theme = story.settings.theme;
  const maxBubble = theme === 'discord' ? bodyWidth - 20 * unit : bodyWidth * 0.77;
  const fontSize = (theme === 'discord' ? 28 : 29) * unit;
  const lineHeight = (theme === 'discord' ? 38 : 40) * unit;
  setFont(ctx, fontSize, 400);

  if (message.type === 'divider') {
    const dividerFont = 23 * unit;
    setFont(ctx, dividerFont, 500);
    return { item, width: Math.min(bodyWidth * 0.9, ctx.measureText(message.text).width + 40 * unit), height: 48 * unit, lines: [], lineHeight, fontSize: dividerFont, receipt: false };
  }
  if (message.type === 'image') {
    const width = Math.min(maxBubble, 390 * unit);
    setFont(ctx, 26 * unit, 400);
    const lines = message.text ? wrapCanvasText(ctx, message.text, width - 32 * unit) : [];
    return { item, width, height: 282 * unit + (lines.length ? lines.length * 35 * unit + 44 * unit : 12 * unit), lines, lineHeight: 35 * unit, fontSize: 26 * unit, receipt };
  }
  if (message.type === 'voice') {
    return { item, width: Math.min(maxBubble, 380 * unit), height: 92 * unit, lines: [], lineHeight, fontSize, receipt };
  }

  const discord = theme === 'discord';
  const timestampSpace = inlineTimestamp(theme) ? 78 * unit : 0;
  const horizontalPadding = discord ? 106 * unit : 44 * unit;
  const maxText = maxBubble - horizontalPadding - timestampSpace;
  const lines = wrapCanvasText(ctx, message.text || ' ', maxText);
  let width = maxBubble;
  if (!discord) {
    const longest = Math.max(...lines.map((line) => ctx.measureText(line).width), 24 * unit);
    width = Math.min(maxBubble, Math.max(72 * unit, longest + horizontalPadding + timestampSpace));
  }
  const height = discord
    ? Math.max(76 * unit, 42 * unit + lines.length * lineHeight)
    : lines.length * lineHeight + 30 * unit + (inlineTimestamp(theme) ? 7 * unit : 0);
  return { item, width, height, lines, lineHeight, fontSize, receipt };
}

function typingLayout(item: TimelineItem, unit: number): Layout {
  return { item, width: 106 * unit, height: 60 * unit, lines: [], lineHeight: 0, fontSize: 0, receipt: false };
}

function contentHeight(layouts: Layout[], unit: number): number {
  return layouts.reduce((sum, layout) => sum + layout.height + (layout.receipt ? 26 * unit : 0), 0) + Math.max(0, layouts.length - 1) * 14 * unit;
}

function drawChecks(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, size * 0.12);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 2; i++) {
    const offset = i * size * 0.45;
    ctx.beginPath();
    ctx.moveTo(x + offset, y);
    ctx.lineTo(x + offset + size * 0.24, y + size * 0.24);
    ctx.lineTo(x + offset + size * 0.67, y - size * 0.28);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

function drawTail(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, side: string, color: string | CanvasGradient) {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (side === 'sender') {
    ctx.moveTo(x + width - 18, y + height - 22);
    ctx.quadraticCurveTo(x + width + 5, y + height - 13, x + width + 9, y + height - 2);
    ctx.quadraticCurveTo(x + width - 3, y + height - 5, x + width - 15, y + height - 4);
  } else {
    ctx.moveTo(x + 18, y + height - 22);
    ctx.quadraticCurveTo(x - 5, y + height - 13, x - 9, y + height - 2);
    ctx.quadraticCurveTo(x + 3, y + height - 5, x + 15, y + height - 4);
  }
  ctx.closePath();
  ctx.fill();
}

function drawTextLines(ctx: CanvasRenderingContext2D, layout: Layout, text: string, x: number, y: number, width: number, color: string) {
  const rtl = isRtlText(text);
  ctx.fillStyle = color;
  ctx.textAlign = rtl ? 'right' : 'left';
  try { ctx.direction = rtl ? 'rtl' : 'ltr'; } catch { /* Canvas direction fallback. */ }
  setFont(ctx, layout.fontSize, 400);
  layout.lines.forEach((line, index) => {
    ctx.fillText(line, rtl ? x + width : x, y + layout.fontSize + index * layout.lineHeight);
  });
  ctx.textAlign = 'left';
  try { ctx.direction = 'ltr'; } catch { /* no-op */ }
}

function drawWaveform(ctx: CanvasRenderingContext2D, message: StoryMessage, x: number, y: number, width: number, height: number, color: string, progress: number, unit: number) {
  const bars = 28;
  const gap = width / bars;
  for (let i = 0; i < bars; i++) {
    const barHeight = height * (0.24 + hash(i, message.id.length) * 0.76);
    ctx.fillStyle = i / bars <= progress ? color : `${color}66`;
    fillRoundRect(ctx, x + i * gap, y + (height - barHeight) / 2, Math.max(unit * 2, gap * 0.45), barHeight, unit * 2, ctx.fillStyle);
  }
}

function drawMessage(ctx: CanvasRenderingContext2D, layout: Layout, x: number, y: number, time: number, story: Story, assets: AssetBundle, frame: ChatFrame, animate: boolean) {
  const { item } = layout;
  const { message } = item;
  const { unit } = frame;
  const settings = story.settings;
  const palette = palettes[settings.theme](settings.chatMode);
  const sender = message.side === 'sender';
  const progress = animate ? clamp((time - item.appearAt) / 0.34) : 1;
  const scale = springScale(progress);
  ctx.save();
  ctx.globalAlpha = animate ? clamp(progress * 2.4) : 1;
  ctx.translate(x + layout.width / 2, y + layout.height / 2);
  ctx.scale(scale, scale);
  ctx.translate(-(x + layout.width / 2), -(y + layout.height / 2));

  if (message.type === 'divider') {
    const color = settings.chatMode === 'dark' || settings.theme === 'discord' ? 'rgba(15,23,42,0.68)' : 'rgba(255,255,255,0.72)';
    fillRoundRect(ctx, x, y, layout.width, layout.height, layout.height / 2, color);
    ctx.fillStyle = settings.chatMode === 'dark' || settings.theme === 'discord' ? '#CBD5E1' : '#64748B';
    setFont(ctx, layout.fontSize, 500);
    ctx.textAlign = 'center';
    ctx.fillText(message.text, x + layout.width / 2, y + layout.height * 0.66);
    ctx.textAlign = 'left';
    ctx.restore();
    return;
  }

  if (settings.theme === 'discord' && message.type === 'text') {
    const avatarSrc = sender ? settings.senderAvatar : settings.contactAvatar;
    const avatarName = sender ? settings.senderName : settings.contactName;
    drawInitials(ctx, avatarName, x + 36 * unit, y + 34 * unit, 24 * unit, sender ? settings.senderAvatarColor : settings.contactAvatarColor, avatarSrc ? assets.images.get(avatarSrc) : undefined);
    setFont(ctx, 25 * unit, 600);
    ctx.fillStyle = sender ? '#A5B4FC' : '#5EEAD4';
    ctx.fillText(avatarName, x + 76 * unit, y + 28 * unit);
    setFont(ctx, 18 * unit, 400);
    ctx.fillStyle = palette.secondary;
    const nameWidth = ctx.measureText(avatarName).width;
    ctx.fillText(`Today at ${messageClock(item.index)}`, x + 88 * unit + Math.max(90 * unit, nameWidth), y + 27 * unit);
    drawTextLines(ctx, layout, message.text, x + 76 * unit, y + 38 * unit, layout.width - 96 * unit, palette.receiverText);
    ctx.restore();
    return;
  }

  let fill: string | CanvasGradient;
  if (sender) fill = sentColor(settings.theme, settings.chatMode) ?? senderColor(ctx, settings.theme, x, y, layout.width, layout.height);
  else fill = palette.receiver;
  const textColor = sender ? palette.senderText : palette.receiverText;
  const radius = settings.theme === 'instagram' || settings.theme === 'messenger' ? 25 * unit : 20 * unit;

  if (message.type === 'image') {
    fillRoundRect(ctx, x, y, layout.width, layout.height, radius, fill);
    const padding = 7 * unit;
    const imageHeight = 270 * unit;
    roundedRect(ctx, x + padding, y + padding, layout.width - padding * 2, imageHeight, radius - padding);
    ctx.save();
    ctx.clip();
    const image = message.src ? assets.images.get(message.src) : undefined;
    if (image?.naturalWidth) drawCover(ctx, image, image.naturalWidth, image.naturalHeight, x + padding, y + padding, layout.width - padding * 2, imageHeight);
    else {
      ctx.fillStyle = sender ? 'rgba(255,255,255,0.18)' : 'rgba(100,116,139,0.2)';
      ctx.fillRect(x + padding, y + padding, layout.width - padding * 2, imageHeight);
    }
    ctx.restore();
    if (layout.lines.length) drawTextLines(ctx, layout, message.text, x + 18 * unit, y + imageHeight + 15 * unit, layout.width - 36 * unit, textColor);
  } else if (message.type === 'voice') {
    fillRoundRect(ctx, x, y, layout.width, layout.height, radius, fill);
    ctx.fillStyle = sender ? 'rgba(255,255,255,0.22)' : 'rgba(100,116,139,0.16)';
    ctx.beginPath();
    ctx.arc(x + 43 * unit, y + 40 * unit, 23 * unit, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.beginPath();
    ctx.moveTo(x + 38 * unit, y + 30 * unit);
    ctx.lineTo(x + 51 * unit, y + 40 * unit);
    ctx.lineTo(x + 38 * unit, y + 50 * unit);
    ctx.closePath();
    ctx.fill();
    const duration = Math.max(1, message.duration ?? 4);
    const voiceProgress = clamp((time - item.appearAt) / duration);
    drawWaveform(ctx, message, x + 82 * unit, y + 20 * unit, layout.width - 112 * unit, 35 * unit, textColor, voiceProgress, unit);
    setFont(ctx, 18 * unit, 500);
    ctx.fillStyle = textColor;
    const elapsed = Math.min(duration, Math.max(0, time - item.appearAt));
    ctx.fillText(`0:${Math.floor(elapsed).toString().padStart(2, '0')} / 0:${Math.floor(duration).toString().padStart(2, '0')}`, x + 82 * unit, y + 76 * unit);
  } else {
    if (settings.theme === 'imessage' || settings.theme === 'whatsapp') drawTail(ctx, x, y, layout.width, layout.height, message.side, fill);
    if (settings.theme === 'telegram') {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.14)';
      ctx.shadowBlur = 10 * unit;
      fillRoundRect(ctx, x, y, layout.width, layout.height, radius, fill);
      ctx.restore();
      roundedRect(ctx, x, y, layout.width, layout.height, radius);
      ctx.strokeStyle = 'rgba(255,255,255,0.09)';
      ctx.lineWidth = unit;
      ctx.stroke();
    } else {
      fillRoundRect(ctx, x, y, layout.width, layout.height, radius, fill);
    }
    drawTextLines(ctx, layout, message.text, x + 22 * unit, y + 13 * unit, layout.width - 44 * unit - (inlineTimestamp(settings.theme) ? 60 * unit : 0), textColor);
  }

  if (inlineTimestamp(settings.theme) && message.type !== 'image') {
    setFont(ctx, 17 * unit, 400);
    ctx.fillStyle = sender && settings.theme === 'whatsapp' && settings.chatMode === 'light' ? '#667781' : sender ? 'rgba(255,255,255,0.72)' : palette.secondary;
    const stamp = messageClock(item.index);
    const stampWidth = ctx.measureText(stamp).width;
    const stampX = x + layout.width - stampWidth - (sender ? 34 * unit : 15 * unit);
    ctx.fillText(stamp, stampX, y + layout.height - 12 * unit);
    if (sender) drawChecks(ctx, x + layout.width - 29 * unit, y + layout.height - 17 * unit, 13 * unit, settings.theme === 'whatsapp' ? '#53BDEB' : 'rgba(255,255,255,0.82)');
  }

  ctx.restore();

  if (layout.receipt && progress > 0.7) {
    ctx.globalAlpha = clamp((progress - 0.7) / 0.3);
    const receiptY = y + layout.height + 19 * unit;
    if (settings.theme === 'messenger') {
      drawInitials(ctx, settings.contactName, x + layout.width - 9 * unit, receiptY - 4 * unit, 8 * unit, settings.contactAvatarColor, settings.contactAvatar ? assets.images.get(settings.contactAvatar) : undefined);
    } else {
      setFont(ctx, 19 * unit, 400);
      ctx.fillStyle = palette.secondary;
      ctx.textAlign = 'right';
      const hasLaterReply = story.messages.slice(item.index + 1).some((entry) => entry.side === 'receiver');
      const label = settings.theme === 'instagram' ? 'Seen' : hasLaterReply ? 'Read' : 'Delivered';
      ctx.fillText(label, x + layout.width, receiptY);
      ctx.textAlign = 'left';
    }
    ctx.globalAlpha = 1;
  }
}

function drawTyping(ctx: CanvasRenderingContext2D, layout: Layout, x: number, y: number, time: number, story: Story, frame: ChatFrame) {
  const { unit } = frame;
  const settings = story.settings;
  const palette = palettes[settings.theme](settings.chatMode);
  const sender = layout.item.message.side === 'sender';
  const fill = sender ? sentColor(settings.theme, settings.chatMode) ?? senderColor(ctx, settings.theme, x, y, layout.width, layout.height) : palette.receiver;
  fillRoundRect(ctx, x, y, layout.width, layout.height, 24 * unit, fill);
  for (let i = 0; i < 3; i++) {
    const bounce = Math.max(0, Math.sin(time * 8.2 - i * 0.85)) * 7 * unit;
    ctx.fillStyle = sender ? 'rgba(255,255,255,0.82)' : palette.secondary;
    ctx.beginPath();
    ctx.arc(x + (29 + i * 24) * unit, y + 31 * unit - bounce, 5 * unit, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDoodles(ctx: CanvasRenderingContext2D, frame: ChatFrame, dark: boolean) {
  ctx.save();
  roundedRect(ctx, frame.x, frame.bodyY, frame.width, frame.bodyBottom - frame.bodyY, 0);
  ctx.clip();
  ctx.strokeStyle = dark ? 'rgba(134,150,160,0.055)' : 'rgba(102,119,129,0.075)';
  ctx.lineWidth = Math.max(1, frame.unit * 1.4);
  const step = 120 * frame.unit;
  for (let row = 0; row < Math.ceil(frame.height / step); row++) {
    for (let col = 0; col < Math.ceil(frame.width / step); col++) {
      const x = frame.x + col * step + (row % 2) * step * 0.45;
      const y = frame.bodyY + row * step;
      const kind = (row + col) % 4;
      ctx.beginPath();
      if (kind === 0) ctx.arc(x + step * 0.3, y + step * 0.4, step * 0.08, 0, Math.PI * 1.5);
      else if (kind === 1) {
        ctx.moveTo(x + step * 0.2, y + step * 0.3);
        ctx.lineTo(x + step * 0.35, y + step * 0.18);
        ctx.lineTo(x + step * 0.48, y + step * 0.34);
      } else if (kind === 2) ctx.rect(x + step * 0.22, y + step * 0.26, step * 0.13, step * 0.1);
      else {
        ctx.moveTo(x + step * 0.2, y + step * 0.2);
        ctx.quadraticCurveTo(x + step * 0.45, y + step * 0.45, x + step * 0.23, y + step * 0.52);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawHeaderIcon(ctx: CanvasRenderingContext2D, type: 'phone' | 'video' | 'chevron' | 'more', x: number, y: number, size: number, color: string) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.4, size * 0.09);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (type === 'chevron') {
    ctx.moveTo(x + size * 0.62, y + size * 0.15);
    ctx.lineTo(x + size * 0.3, y + size * 0.5);
    ctx.lineTo(x + size * 0.62, y + size * 0.85);
    ctx.stroke();
  } else if (type === 'phone') {
    ctx.moveTo(x + size * 0.24, y + size * 0.15);
    ctx.quadraticCurveTo(x + size * 0.06, y + size * 0.45, x + size * 0.45, y + size * 0.79);
    ctx.quadraticCurveTo(x + size * 0.63, y + size * 0.94, x + size * 0.83, y + size * 0.72);
    ctx.lineTo(x + size * 0.65, y + size * 0.58);
    ctx.lineTo(x + size * 0.48, y + size * 0.64);
    ctx.quadraticCurveTo(x + size * 0.36, y + size * 0.52, x + size * 0.34, y + size * 0.39);
    ctx.lineTo(x + size * 0.42, y + size * 0.23);
    ctx.closePath();
    ctx.stroke();
  } else if (type === 'video') {
    roundedRect(ctx, x + size * 0.08, y + size * 0.25, size * 0.58, size * 0.5, size * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + size * 0.68, y + size * 0.4);
    ctx.lineTo(x + size * 0.91, y + size * 0.28);
    ctx.lineTo(x + size * 0.91, y + size * 0.72);
    ctx.lineTo(x + size * 0.68, y + size * 0.6);
    ctx.stroke();
  } else {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x + size * (0.2 + i * 0.3), y + size * 0.5, size * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.lineCap = 'butt';
}

function drawHeader(ctx: CanvasRenderingContext2D, story: Story, frame: ChatFrame, assets: AssetBundle, typingContact: boolean) {
  const { unit, x, y, width, statusHeight, headerHeight } = frame;
  const settings = story.settings;
  const palette = palettes[settings.theme](settings.chatMode);
  const top = y + statusHeight;
  ctx.fillStyle = palette.header;
  ctx.fillRect(x, top, width, headerHeight);
  ctx.fillStyle = palette.line;
  ctx.fillRect(x, top + headerHeight - unit, width, unit);
  const centerY = top + headerHeight * (settings.theme === 'imessage' ? 0.42 : 0.5);
  drawHeaderIcon(ctx, 'chevron', x + 20 * unit, centerY - 18 * unit, 36 * unit, palette.accent);

  if (settings.theme === 'imessage') {
    drawInitials(ctx, settings.contactName, x + width / 2, top + 45 * unit, 29 * unit, settings.contactAvatarColor, settings.contactAvatar ? assets.images.get(settings.contactAvatar) : undefined);
    setFont(ctx, 22 * unit, 500);
    ctx.fillStyle = palette.text;
    ctx.textAlign = 'center';
    ctx.fillText(settings.contactName, x + width / 2, top + 103 * unit);
    ctx.textAlign = 'left';
  } else {
    drawInitials(ctx, settings.contactName, x + 83 * unit, centerY, 31 * unit, settings.contactAvatarColor, settings.contactAvatar ? assets.images.get(settings.contactAvatar) : undefined);
    setFont(ctx, 28 * unit, 600);
    ctx.fillStyle = palette.text;
    ctx.fillText(settings.contactName, x + 130 * unit, centerY - 3 * unit);
    setFont(ctx, 19 * unit, 400);
    ctx.fillStyle = typingContact ? palette.accent : palette.secondary;
    const status = settings.theme === 'whatsapp' || settings.theme === 'telegram'
      ? typingContact ? 'typing...' : 'online'
      : settings.theme === 'discord' ? 'Direct message' : settings.theme === 'instagram' ? 'Active now' : 'Active recently';
    ctx.fillText(status, x + 130 * unit, centerY + 27 * unit);
  }
  drawHeaderIcon(ctx, 'video', x + width - 139 * unit, centerY - 18 * unit, 36 * unit, palette.accent);
  drawHeaderIcon(ctx, settings.theme === 'whatsapp' ? 'more' : 'phone', x + width - 72 * unit, centerY - 18 * unit, 36 * unit, palette.accent);
}

function drawStatusBar(ctx: CanvasRenderingContext2D, story: Story, frame: ChatFrame) {
  if (!frame.statusHeight) return;
  const { unit, x, y, width } = frame;
  const palette = palettes[story.settings.theme](story.settings.chatMode);
  ctx.fillStyle = palette.header;
  ctx.fillRect(x, y, width, frame.statusHeight);
  setFont(ctx, 21 * unit, 600);
  ctx.fillStyle = palette.text;
  ctx.fillText('9:41', x + 34 * unit, y + 35 * unit);
  const right = x + width - 33 * unit;
  ctx.strokeStyle = palette.text;
  ctx.lineWidth = 2.2 * unit;
  roundedRect(ctx, right - 47 * unit, y + 17 * unit, 31 * unit, 17 * unit, 4 * unit);
  ctx.stroke();
  ctx.fillStyle = palette.text;
  fillRoundRect(ctx, right - 44 * unit, y + 20 * unit, 21 * unit, 11 * unit, 2 * unit, palette.text);
  ctx.fillRect(right - 14 * unit, y + 22 * unit, 3 * unit, 7 * unit);
  for (let i = 0; i < 4; i++) ctx.fillRect(right - (82 - i * 7) * unit, y + (30 - i * 4) * unit, 4 * unit, (5 + i * 4) * unit);
  setFont(ctx, 18 * unit, 600);
  ctx.fillText('5G', right - 126 * unit, y + 34 * unit);
  ctx.beginPath();
  ctx.arc(right - 155 * unit, y + 26 * unit, 13 * unit, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(right - 155 * unit, y + 29 * unit, 7 * unit, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

function drawInputBar(ctx: CanvasRenderingContext2D, story: Story, frame: ChatFrame) {
  const { unit, x, width, bodyBottom } = frame;
  const settings = story.settings;
  const palette = palettes[settings.theme](settings.chatMode);
  const height = frame.height - (bodyBottom - frame.y);
  ctx.fillStyle = palette.header;
  ctx.fillRect(x, bodyBottom, width, height);
  const inputX = x + 60 * unit;
  const inputY = bodyBottom + 16 * unit;
  const inputW = width - 92 * unit;
  fillRoundRect(ctx, inputX, inputY, inputW, 50 * unit, 25 * unit, palette.input);
  if (settings.theme === 'imessage' || settings.theme === 'instagram') {
    roundedRect(ctx, inputX, inputY, inputW, 50 * unit, 25 * unit);
    ctx.strokeStyle = palette.line;
    ctx.lineWidth = unit;
    ctx.stroke();
  }
  setFont(ctx, 22 * unit, 400);
  ctx.fillStyle = palette.secondary;
  ctx.fillText(settings.theme === 'discord' ? 'Message @' + settings.contactName : 'Message', inputX + 22 * unit, inputY + 33 * unit);
  ctx.strokeStyle = palette.secondary;
  ctx.lineWidth = 2 * unit;
  ctx.beginPath();
  ctx.arc(x + 32 * unit, bodyBottom + 41 * unit, 13 * unit, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 32 * unit, bodyBottom + 33 * unit);
  ctx.lineTo(x + 32 * unit, bodyBottom + 49 * unit);
  ctx.moveTo(x + 24 * unit, bodyBottom + 41 * unit);
  ctx.lineTo(x + 40 * unit, bodyBottom + 41 * unit);
  ctx.stroke();
}

function drawFreePreviewWatermark(ctx: CanvasRenderingContext2D, time: number, frame: ChatFrame) {
  const { unit } = frame;
  const text = 'ChatReel Studio • Free Preview — Unlock Pro ($9)';
  setFont(ctx, 20 * unit, 650);
  const bannerWidth = Math.min(frame.width - 36 * unit, ctx.measureText(text).width + 48 * unit);
  const bannerHeight = 43 * unit;
  const horizontalTravel = Math.max(0, frame.width - bannerWidth - 40 * unit);
  const x = frame.x + 20 * unit + (Math.sin(time * 0.42) + 1) * 0.5 * horizontalTravel;
  const bodyHeight = frame.bodyBottom - frame.bodyY;
  const verticalTravel = Math.max(0, bodyHeight * 0.25);
  const centerY = frame.bodyY + bodyHeight * 0.5;
  const y = clamp(centerY + Math.sin(time * 0.63 + 1.1) * verticalTravel - bannerHeight / 2, frame.bodyY + 20 * unit, frame.bodyBottom - bannerHeight - 20 * unit);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 16 * unit;
  ctx.shadowOffsetY = 5 * unit;
  fillRoundRect(ctx, x, y, bannerWidth, bannerHeight, bannerHeight / 2, 'rgba(10,15,26,0.76)');
  ctx.shadowColor = 'transparent';
  roundedRect(ctx, x, y, bannerWidth, bannerHeight, bannerHeight / 2);
  ctx.strokeStyle = 'rgba(45,212,191,0.52)';
  ctx.lineWidth = 1.2 * unit;
  ctx.stroke();
  ctx.fillStyle = 'rgba(248,250,252,0.96)';
  ctx.textAlign = 'center';
  ctx.fillText(text, x + bannerWidth / 2, y + 28 * unit, bannerWidth - 28 * unit);
  ctx.textAlign = 'left';
  ctx.restore();
}

export function drawChat(ctx: CanvasRenderingContext2D, story: Story, timeline: StoryTimeline, time: number, w: number, h: number, assets: AssetBundle, isPro: boolean) {
  const settings = story.settings;
  const unit = Math.min(w, h) / 1080;
  const full = settings.viewport === 'fullscreen';
  let cardW = w;
  let cardH = h;
  if (!full) {
    if (settings.aspect === '9:16') { cardW = w * 0.9; cardH = h * 0.755; }
    else if (settings.aspect === '16:9') { cardW = Math.min(w * 0.52, 930 * unit); cardH = h * 0.9; }
    else { cardW = w * 0.86; cardH = h * 0.84; }
  }
  const x = (w - cardW) / 2;
  const y = (h - cardH) / 2;
  const statusHeight = full ? 54 * unit : 0;
  const headerHeight = (settings.theme === 'imessage' ? 140 : 112) * unit;
  const inputHeight = 84 * unit;
  const frame: ChatFrame = {
    x, y, width: cardW, height: cardH, unit, statusHeight, headerHeight,
    bodyY: y + statusHeight + headerHeight,
    bodyBottom: y + cardH - inputHeight,
    bodyWidth: cardW - 40 * unit,
  };
  const palette = palettes[settings.theme](settings.chatMode);

  ctx.save();
  if (!full) {
    ctx.shadowColor = 'rgba(0,0,0,0.38)';
    ctx.shadowBlur = 44 * unit;
    ctx.shadowOffsetY = 20 * unit;
    fillRoundRect(ctx, x, y, cardW, cardH, 36 * unit, palette.canvas);
    ctx.shadowColor = 'transparent';
  }
  roundedRect(ctx, x, y, cardW, cardH, full ? 0 : 36 * unit);
  ctx.clip();
  ctx.fillStyle = palette.canvas;
  ctx.fillRect(x, y, cardW, cardH);
  if (settings.theme === 'whatsapp') drawDoodles(ctx, frame, settings.chatMode === 'dark');
  if (settings.theme === 'telegram') {
    const glow = ctx.createRadialGradient(x + cardW * 0.2, frame.bodyY, 0, x + cardW * 0.2, frame.bodyY, cardW * 0.8);
    glow.addColorStop(0, 'rgba(42,171,238,0.1)');
    glow.addColorStop(1, 'rgba(42,171,238,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x, frame.bodyY, cardW, frame.bodyBottom - frame.bodyY);
  }

  const active = [...timeline.items].reverse().find((entry) => time >= entry.start);
  const visible = timeline.items.filter((entry) => time >= entry.appearAt);
  const isTyping = !!active && time < active.appearAt && active.message.type !== 'divider';
  const makeLayouts = (items: TimelineItem[], typing: TimelineItem | null) => {
    const lastSender = [...items].reverse().find((entry) => entry.message.side === 'sender' && entry.message.type !== 'divider');
    const layouts = items.map((entry) => layoutMessage(ctx, entry, frame.bodyWidth, unit, story, entry === lastSender && ['imessage', 'instagram', 'messenger'].includes(settings.theme)));
    if (typing) layouts.push(typingLayout(typing, unit));
    return layouts;
  };
  const layouts = makeLayouts(visible, isTyping ? active : null);
  let targetScroll = Math.max(0, contentHeight(layouts, unit) - (frame.bodyBottom - frame.bodyY - 38 * unit));
  let scroll = targetScroll;

  if (active && (isTyping || time < active.appearAt + 0.44)) {
    const previous = visible.filter((entry) => entry.index < active.index);
    const baseLayouts = makeLayouts(previous, isTyping ? null : active.message.type === 'divider' ? null : active);
    const baseScroll = Math.max(0, contentHeight(baseLayouts, unit) - (frame.bodyBottom - frame.bodyY - 38 * unit));
    const animationStart = isTyping ? active.start : active.appearAt;
    const amount = easeOutCubic((time - animationStart) / 0.44);
    scroll = lerp(baseScroll, targetScroll, amount);
  } else {
    scroll = targetScroll;
  }

  ctx.save();
  roundedRect(ctx, x, frame.bodyY, cardW, frame.bodyBottom - frame.bodyY, 0);
  ctx.clip();
  const horizontalPadding = 20 * unit;
  let cursorY = frame.bodyY + 20 * unit - scroll;
  for (const layout of layouts) {
    const isTypingLayout = isTyping && layout.item === active && layout === layouts[layouts.length - 1];
    const sender = layout.item.message.side === 'sender';
    let bubbleX = sender ? x + cardW - horizontalPadding - layout.width : x + horizontalPadding;
    if (layout.item.message.type === 'divider') bubbleX = x + (cardW - layout.width) / 2;
    if (settings.theme === 'discord') bubbleX = x + 10 * unit;
    const newest = layout.item === visible[visible.length - 1] && !isTypingLayout;
    if (cursorY + layout.height > frame.bodyY - 60 * unit && cursorY < frame.bodyBottom + 60 * unit) {
      if (isTypingLayout) drawTyping(ctx, layout, bubbleX, cursorY, time, story, frame);
      else drawMessage(ctx, layout, bubbleX, cursorY, time, story, assets, frame, newest);
    }
    cursorY += layout.height + (layout.receipt ? 26 * unit : 0) + 14 * unit;
  }
  ctx.restore();

  drawHeader(ctx, story, frame, assets, isTyping && active?.message.side === 'receiver');
  drawStatusBar(ctx, story, frame);
  drawInputBar(ctx, story, frame);
  if (!isPro) drawFreePreviewWatermark(ctx, time, frame);
  ctx.restore();

  if (isPro && settings.watermark && settings.watermarkText.trim()) {
    setFont(ctx, 20 * unit, 600);
    const text = settings.watermarkText.trim();
    const width = ctx.measureText(text).width + 36 * unit;
    const watermarkY = full ? h - 49 * unit : Math.max(22 * unit, y - 54 * unit);
    fillRoundRect(ctx, (w - width) / 2, watermarkY, width, 36 * unit, 18 * unit, 'rgba(5,10,20,0.52)');
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.textAlign = 'center';
    ctx.fillText(text, w / 2, watermarkY + 25 * unit);
    ctx.textAlign = 'left';
  }
}
