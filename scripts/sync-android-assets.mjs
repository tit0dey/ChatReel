import { cp, mkdir, rm } from 'node:fs/promises';

const destination = new URL('../android/app/src/main/assets/www/', import.meta.url);
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(new URL('../dist/', import.meta.url), destination, { recursive: true });
console.log('Synced the production web build into the Android asset container.');
