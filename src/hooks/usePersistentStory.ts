import { useEffect, useState } from 'react';
import { createEmptyStory, DEFAULT_SETTINGS } from '../lib/story';
import type { Story } from '../types';

const STORAGE_KEY = 'chatreel-project-v1';

function restoreStory(): Story {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyStory();
    const parsed = JSON.parse(raw) as Story;
    if (!parsed.id || !Array.isArray(parsed.messages)) return createEmptyStory();
    const settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
    if (settings.customBackgroundSrc?.startsWith('blob:')) {
      settings.customBackgroundSrc = undefined;
      settings.customBackgroundType = undefined;
      settings.background = 'highway';
    }
    return {
      ...parsed,
      settings,
      messages: parsed.messages.filter((item) => item && typeof item.text === 'string' && !item.src?.startsWith('blob:')),
    };
  } catch {
    return createEmptyStory();
  }
}

export function usePersistentStory() {
  const [story, setStory] = useState<Story>(restoreStory);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(story));
    } catch {
      // Large in-session media remains usable even when storage is full.
    }
  }, [story]);
  return [story, setStory] as const;
}
