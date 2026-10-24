import { loadImage } from './assets';

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The selected file could not be read.'));
    reader.readAsDataURL(file);
  });
}

export async function prepareImage(file: File, maximumDimension = 1440): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose a valid image file.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose an image smaller than 25 MB.');
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const scale = Math.min(1, maximumDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) return source;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const keepPng = file.type === 'image/png' && maximumDimension <= 512;
  return canvas.toDataURL(keepPng ? 'image/png' : 'image/jpeg', 0.9);
}

export function prepareBackground(file: File): { src: string; type: 'image' | 'video' } {
  if (file.type.startsWith('video/')) {
    if (file.size > 250 * 1024 * 1024) throw new Error('Choose a background video smaller than 250 MB.');
    return { src: URL.createObjectURL(file), type: 'video' };
  }
  if (file.type.startsWith('image/')) return { src: '', type: 'image' };
  throw new Error('Choose an MP4, WebM, or image file.');
}
