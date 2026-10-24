import { readFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const logo = await readFile(new URL('../public/logo.svg', import.meta.url));
await Promise.all([
  sharp(logo, { density: 384 }).resize(512, 512).png().toFile('public/icon-512.png'),
  sharp(logo, { density: 384 }).resize(192, 192).png().toFile('public/icon-192.png'),
]);

const foregroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><path d="M30 29.5C30 25.358 33.358 22 37.5 22H72.5C76.642 22 80 25.358 80 29.5V65.5C80 69.642 76.642 73 72.5 73H55L38 84V73H37.5C33.358 73 30 69.642 30 65.5V29.5Z" fill="white"/><path d="M49 40L67 49L49 58V40Z" fill="#4F46E5"/><path d="M40 41V57" stroke="#0D9488" stroke-width="5" stroke-linecap="round"/></svg>`;
const densities = [
  ['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192],
];
for (const [density, size] of densities) {
  const directory = `android/app/src/main/res/mipmap-${density}`;
  await mkdir(directory, { recursive: true });
  await sharp(logo, { density: 384 }).resize(size, size).png().toFile(`${directory}/ic_launcher.png`);
  await sharp(logo, { density: 384 }).resize(size, size).png().toFile(`${directory}/ic_launcher_round.png`);
  const foregroundSize = Math.round(size * 2.25);
  await sharp(Buffer.from(foregroundSvg), { density: 384 }).resize(foregroundSize, foregroundSize).png().toFile(`${directory}/ic_launcher_foreground.png`);
}
console.log('Web and Android icons generated.');
