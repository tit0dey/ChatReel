import type { AspectRatio, OutputDimensions, Story, StoryMessage, StorySettings, StoryTimeline, TimelineItem } from '../types';

export const DEFAULT_SETTINGS: StorySettings = {
  contactName: 'Riya',
  senderName: 'Arjun',
  contactAvatarColor: '#0D9488',
  senderAvatarColor: '#4F46E5',
  theme: 'imessage',
  chatMode: 'dark',
  viewport: 'floating',
  background: 'highway',
  backgroundDim: 28,
  backgroundBlur: 0,
  aspect: '9:16',
  watermark: true,
  watermarkText: '@chatreel.studio',
  speed: 'natural',
  ambient: 'lofi',
  sound: true,
  voiceover: false,
  resolution: '1080',
  fps: 30,
  exportMode: 'single',
  partDuration: 45,
};

export const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export const message = (side: StoryMessage['side'], text: string, extra: Partial<StoryMessage> = {}): StoryMessage => ({
  id: uid(),
  type: 'text',
  side,
  text,
  ...extra,
});

export const divider = (text: string): StoryMessage => message('receiver', text, { type: 'divider' });

export function createEmptyStory(): Story {
  const now = Date.now();
  return {
    id: uid(),
    name: 'Untitled chat story',
    createdAt: now,
    updatedAt: now,
    settings: { ...DEFAULT_SETTINGS },
    messages: [
      divider('Today 11:48 PM'),
      message('receiver', 'Are you still awake?'),
      message('sender', 'Yes. Why are you texting so late?'),
      message('receiver', 'Because someone is standing outside your door.'),
      message('sender', 'That is not funny.', { sting: true }),
    ],
  };
}

const speedMultiplier = { fast: 0.72, natural: 1, suspense: 1.34 };

export function buildTimeline(story: Story): StoryTimeline {
  const items: TimelineItem[] = [];
  const speed = speedMultiplier[story.settings.speed];
  let cursor = 0.65;

  story.messages.forEach((item, index) => {
    const isDivider = item.type === 'divider';
    const length = Array.from(item.text).length;
    const typingDuration = isDivider ? 0 : Math.min(2.8, (0.48 + length * 0.022) * speed);
    const baseHold = item.type === 'voice'
      ? Math.max(2.4, item.duration ?? 4)
      : item.type === 'image'
        ? 2.6
        : isDivider
          ? 1.5
          : 1.05 + Math.min(2.6, length * 0.028);
    const holdDuration = baseHold * (isDivider ? 1 : speed);
    const start = cursor;
    const appearAt = start + typingDuration;
    const end = appearAt + holdDuration + (item.sting ? 0.35 : 0);
    items.push({ message: item, index, start, appearAt, end, typingDuration, holdDuration });
    cursor = end;
  });

  return { items, duration: Math.max(2, cursor + 1.15) };
}

export function getOutputDimensions(aspect: AspectRatio, resolution: StorySettings['resolution']): OutputDimensions {
  const shortEdge = resolution === '1080' ? 1080 : 720;
  if (aspect === '9:16') return { width: shortEdge, height: Math.round(shortEdge * 16 / 9) };
  if (aspect === '16:9') return { width: Math.round(shortEdge * 16 / 9), height: shortEdge };
  return { width: shortEdge, height: shortEdge };
}

export function parseQuickScript(script: string, current: Story): Story {
  const lines = script.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const speakers: string[] = [];
  const parsed: Array<{ speaker?: string; text: string; divider: boolean; sting: boolean }> = [];

  for (const line of lines) {
    const scene = line.match(/^\[(?:scene|divider|time)\s*:\s*(.+)\]$/i);
    if (scene) {
      parsed.push({ text: scene[1].trim(), divider: true, sting: false });
      continue;
    }
    const dialogue = line.match(/^([^:\n]{1,48})\s*:\s*(.+)$/s);
    if (dialogue) {
      const speaker = dialogue[1].trim();
      if (!speakers.includes(speaker)) speakers.push(speaker);
      parsed.push({ speaker, text: dialogue[2].trim(), divider: false, sting: /^\[sting\]\s*/i.test(dialogue[2].trim()) });
    } else {
      parsed.push({ text: line.replace(/^\[|\]$/g, ''), divider: true, sting: false });
    }
  }

  if (!parsed.length) return current;
  const contactName = speakers[0] ?? current.settings.contactName;
  const senderName = speakers[1] ?? current.settings.senderName;
  const messages = parsed.map((entry) => entry.divider
    ? divider(entry.text)
    : message(entry.speaker === senderName && speakers.length > 1 ? 'sender' : 'receiver', entry.text.replace(/^\[sting\]\s*/i, ''), { sting: entry.sting }));

  return {
    ...current,
    updatedAt: Date.now(),
    settings: { ...current.settings, contactName, senderName },
    messages,
  };
}

export function splitStory(story: Story, maximumDuration = 45): Story[] {
  if (!story.messages.length) return [story];
  const parts: StoryMessage[][] = [];
  let current: StoryMessage[] = [];

  for (const item of story.messages) {
    const candidate = [...current, item];
    const candidateStory = { ...story, messages: candidate };
    if (current.length > 0 && buildTimeline(candidateStory).duration > maximumDuration) {
      parts.push(current);
      current = [item];
    } else {
      current = candidate;
    }
  }
  if (current.length) parts.push(current);
  if (parts.length <= 1) return [story];

  return parts.map((messages, index) => ({
    ...story,
    id: `${story.id}-part-${index + 1}`,
    name: `${story.name} — Part ${index + 1}`,
    messages,
  }));
}

export function formatTime(seconds: number, precise = false): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const base = `${minutes}:${secs.toString().padStart(2, '0')}`;
  return precise ? `${base}.${Math.floor((safe % 1) * 10)}` : base;
}

export function sanitizeFileName(name: string): string {
  return name.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'ChatReel-Story';
}
