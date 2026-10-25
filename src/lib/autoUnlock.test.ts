import { describe, expect, it } from 'vitest';
import { androidUnlockDeepLink, licenseKeysFromUrl } from './autoUnlock';

describe('automatic post-purchase unlock URLs', () => {
  it('reads unlock and key query parameters', () => {
    expect(licenseKeysFromUrl('https://tit0dey.github.io/ChatReel/?unlock=CRPRO-query-unlock')).toEqual(['CRPRO-query-unlock']);
    expect(licenseKeysFromUrl('https://tit0dey.github.io/ChatReel/?key=CRPRO-query-key')).toEqual(['CRPRO-query-key']);
  });

  it('reads hash credentials and checks every source in priority order', () => {
    expect(licenseKeysFromUrl('https://tit0dey.github.io/ChatReel/#unlock=CRPRO-hash')).toEqual(['CRPRO-hash']);
    expect(licenseKeysFromUrl('https://tit0dey.github.io/ChatReel/?key=CRPRO-query#unlock=CRPRO-hash')).toEqual(['CRPRO-query', 'CRPRO-hash']);
  });

  it('decodes and deduplicates credentials', () => {
    expect(licenseKeysFromUrl('https://tit0dey.github.io/ChatReel/?unlock=CRPRO-one%5Ftwo#key=CRPRO-one_two')).toEqual(['CRPRO-one_two']);
  });

  it('builds an encoded Android return deep link', () => {
    expect(androidUnlockDeepLink('CRPRO-one_two')).toBe('chatreel://unlock?key=CRPRO-one_two');
    expect(androidUnlockDeepLink('CRPRO-a b&c')).toBe('chatreel://unlock?key=CRPRO-a%20b%26c');
  });
});
