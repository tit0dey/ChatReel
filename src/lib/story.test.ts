import { describe, expect, it } from 'vitest';
import { STORY_TEMPLATES } from '../data/templates';
import { buildTimeline, createEmptyStory, getOutputDimensions, parseQuickScript, splitStory } from './story';

describe('story timeline', () => {
  it('creates ordered typing and appearance events', () => {
    const story = createEmptyStory();
    const timeline = buildTimeline(story);
    expect(timeline.items).toHaveLength(story.messages.length);
    expect(timeline.duration).toBeGreaterThan(timeline.items.at(-1)!.end);
    timeline.items.forEach((item, index) => {
      expect(item.appearAt).toBeGreaterThanOrEqual(item.start);
      expect(item.end).toBeGreaterThan(item.appearAt);
      if (index > 0) expect(item.start).toBeGreaterThanOrEqual(timeline.items[index - 1].end);
    });
  });

  it('preserves Bangla, Banglish, Hindi, Arabic, and scene directions', () => {
    const story = createEmptyStory();
    const parsed = parseQuickScript([
      'রিয়া: তুই কি এখন বাড়িতে আছিস?',
      'Arjun: Haan, chhade dariye achi.',
      'मीरा: क्या तुम ठीक हो?',
      'ليلى: هل أنت بخير؟',
      '[Scene: ১ মিনিট পর]',
      'Arjun: [sting] Tell me the truth.',
    ].join('\n'), story);
    expect(parsed.messages.map((item) => item.text)).toContain('তুই কি এখন বাড়িতে আছিস?');
    expect(parsed.messages.map((item) => item.text)).toContain('هل أنت بخير؟');
    expect(parsed.messages.at(-1)?.sting).toBe(true);
    expect(parsed.messages.at(-1)?.text).toBe('Tell me the truth.');
    expect(parsed.messages.at(-2)?.type).toBe('divider');
  });

  it('splits long stories without losing messages', () => {
    const story = createEmptyStory();
    const parts = splitStory({ ...story, settings: { ...story.settings, speed: 'suspense' } }, 8);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.flatMap((part) => part.messages).map((item) => item.text)).toEqual(story.messages.map((item) => item.text));
    parts.forEach((part, index) => expect(part.name).toContain(`Part ${index + 1}`));
  });

  it('provides exact output dimensions for every aspect ratio', () => {
    expect(getOutputDimensions('9:16', '1080')).toEqual({ width: 1080, height: 1920 });
    expect(getOutputDimensions('16:9', '720')).toEqual({ width: 1280, height: 720 });
    expect(getOutputDimensions('1:1', '1080')).toEqual({ width: 1080, height: 1080 });
  });

  it('includes six complete editable templates', () => {
    expect(STORY_TEMPLATES).toHaveLength(6);
    STORY_TEMPLATES.forEach((template) => expect(template.messages.length).toBeGreaterThanOrEqual(8));
  });
});
