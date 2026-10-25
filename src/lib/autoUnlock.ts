const UNLOCK_PARAMETERS = ['unlock', 'key'] as const;

function hashParameters(hash: string): URLSearchParams {
  return new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
}

/** Read every supported post-purchase key location without exposing it to the renderer. */
export function licenseKeysFromUrl(value: string | URL): string[] {
  const url = typeof value === 'string' ? new URL(value) : value;
  const sources = [url.searchParams, hashParameters(url.hash)];
  const keys: string[] = [];
  for (const source of sources) {
    for (const parameter of UNLOCK_PARAMETERS) {
      const key = source.get(parameter)?.trim();
      if (key && !keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}

/**
 * Consume post-purchase credentials before React starts. The pathname-only
 * replacement removes both the query and hash, including the license secret.
 */
export function consumeAutomaticUnlockKeys(): string[] {
  const url = new URL(window.location.href);
  const keys = licenseKeysFromUrl(url);
  const hash = hashParameters(url.hash);
  const hasCredential = UNLOCK_PARAMETERS.some((parameter) => url.searchParams.has(parameter) || hash.has(parameter));
  if (hasCredential) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  return keys;
}

export function androidUnlockDeepLink(verifiedKey: string): string {
  return `chatreel://unlock?key=${encodeURIComponent(verifiedKey)}`;
}
