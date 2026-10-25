import type { ChatTheme, Story } from '../types';

export const CHECKOUT_URL = 'https://whop.com/checkout/plan_zSJ2SM66mF5gY';
export const FREE_MESSAGE_LIMIT = 10;

export function isProTheme(theme: ChatTheme): boolean {
  return theme !== 'imessage' && theme !== 'whatsapp';
}

export function getStoryProRestriction(story: Story): string | null {
  if (story.settings.resolution === '1080' || story.settings.fps === 60) return '1080p Full HD and 60fps export';
  if (isProTheme(story.settings.theme)) return `${story.settings.theme === 'instagram' ? 'Instagram DM' : story.settings.theme[0].toUpperCase() + story.settings.theme.slice(1)} export`;
  if (story.messages.length > FREE_MESSAGE_LIMIT) return 'stories longer than 10 messages';
  if (story.settings.exportMode === 'series') return 'the Multi-Part Series Splitter';
  if (story.settings.background === 'custom' && story.settings.customBackgroundSrc) return 'custom photo and video backgrounds';
  return null;
}
