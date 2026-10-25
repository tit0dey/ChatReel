import { describe, expect, it } from 'vitest';
import { createEmptyStory } from './story';
import { getStoryProRestriction, isProTheme } from './plans';

describe('Lifetime plan restrictions', () => {
  it('allows the complete Free Starter export path', () => {
    const story = createEmptyStory();
    story.settings.theme = 'whatsapp';
    expect(getStoryProRestriction(story)).toBeNull();
  });

  it('identifies every restricted export category', () => {
    const story = createEmptyStory();
    story.settings.resolution = '1080';
    expect(getStoryProRestriction(story)).toContain('1080p');
    story.settings.resolution = '720';
    story.settings.theme = 'discord';
    expect(getStoryProRestriction(story)).toContain('Discord');
    story.settings.theme = 'imessage';
    story.settings.exportMode = 'series';
    expect(getStoryProRestriction(story)).toContain('Series');
    story.settings.exportMode = 'single';
    story.settings.background = 'custom';
    story.settings.customBackgroundSrc = 'data:image/png;base64,AA==';
    expect(getStoryProRestriction(story)).toContain('custom');
  });

  it('limits Free Starter stories to ten story beats', () => {
    const story = createEmptyStory();
    story.messages = Array.from({ length: 11 }, (_, index) => ({ ...story.messages[0], id: String(index) }));
    expect(getStoryProRestriction(story)).toContain('10 messages');
  });

  it('keeps only iMessage and WhatsApp in the Free export set', () => {
    expect(isProTheme('imessage')).toBe(false);
    expect(isProTheme('whatsapp')).toBe(false);
    expect(isProTheme('instagram')).toBe(true);
    expect(isProTheme('discord')).toBe(true);
    expect(isProTheme('messenger')).toBe(true);
    expect(isProTheme('telegram')).toBe(true);
  });
});
