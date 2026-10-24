import type { AssetBundle, Story } from '../types';

const imageCache = new Map<string, Promise<HTMLImageElement>>();
const videoCache = new Map<string, Promise<HTMLVideoElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The selected image could not be decoded.'));
    image.src = src;
  });
  imageCache.set(src, promise);
  promise.catch(() => imageCache.delete(src));
  return promise;
}

function loadVideo(src: string): Promise<HTMLVideoElement> {
  const cached = videoCache.get(src);
  if (cached) return cached;
  const promise = new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.onloadeddata = () => resolve(video);
    video.onerror = () => reject(new Error('The selected background video could not be decoded.'));
    video.src = src;
    video.load();
  });
  videoCache.set(src, promise);
  promise.catch(() => videoCache.delete(src));
  return promise;
}

export async function loadAssets(story: Story): Promise<AssetBundle> {
  const sources = new Set<string>();
  if (story.settings.contactAvatar) sources.add(story.settings.contactAvatar);
  if (story.settings.senderAvatar) sources.add(story.settings.senderAvatar);
  story.messages.forEach((item) => {
    if (item.type === 'image' && item.src) sources.add(item.src);
  });
  if (story.settings.background === 'custom' && story.settings.customBackgroundType === 'image' && story.settings.customBackgroundSrc) {
    sources.add(story.settings.customBackgroundSrc);
  }

  const entries = await Promise.all([...sources].map(async (src) => [src, await loadImage(src)] as const));
  const bundle: AssetBundle = { images: new Map(entries) };
  if (story.settings.background === 'custom' && story.settings.customBackgroundSrc) {
    if (story.settings.customBackgroundType === 'video') bundle.backgroundVideo = await loadVideo(story.settings.customBackgroundSrc);
    else bundle.backgroundImage = await loadImage(story.settings.customBackgroundSrc);
  }
  return bundle;
}

export function seekBackgroundVideo(bundle: AssetBundle, time: number): Promise<void> {
  const video = bundle.backgroundVideo;
  if (!video || video.readyState < 1 || !Number.isFinite(video.duration)) return Promise.resolve();
  const target = video.duration > 0 ? time % video.duration : 0;
  if (video.readyState >= 2 && Math.abs(video.currentTime - target) < 0.025) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', finish);
      video.removeEventListener('error', finish);
      resolve();
    };
    video.addEventListener('seeked', finish, { once: true });
    video.addEventListener('error', finish, { once: true });
    try { video.currentTime = target; } catch { finish(); }
    window.setTimeout(finish, 900);
  });
}

export function syncBackgroundPlayback(bundle: AssetBundle, time: number, playing: boolean) {
  const video = bundle.backgroundVideo;
  if (!video) return;
  if (playing) {
    if (video.duration && Math.abs(video.currentTime - (time % video.duration)) > 0.35) {
      try { video.currentTime = time % video.duration; } catch { /* Seek when metadata is ready. */ }
    }
    void video.play().catch(() => undefined);
  } else {
    video.pause();
    if (video.duration) {
      try { video.currentTime = time % video.duration; } catch { /* no-op */ }
    }
  }
}
