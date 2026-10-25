import { useCallback, useEffect, useState } from 'react';
import { verifyLicenseKey } from '../engine/licenseVerifier';

const LICENSE_STORAGE_KEY = 'chatreel-lifetime-license-v1';
const STATUS_STORAGE_KEY = 'chatreel-lifetime-status-v1';

type LicenseStatus = 'free' | 'checking' | 'pro';

function cachedLicenseKey(): string | null {
  try {
    const key = localStorage.getItem(LICENSE_STORAGE_KEY);
    const status = localStorage.getItem(STATUS_STORAGE_KEY);
    return status === 'active' && key?.startsWith('CRPRO-') ? key : null;
  } catch {
    return null;
  }
}

function clearCachedLicense() {
  try {
    localStorage.removeItem(LICENSE_STORAGE_KEY);
    localStorage.removeItem(STATUS_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private browsing; verification still works.
  }
}

export function useProLicense() {
  const [initialKey] = useState(cachedLicenseKey);
  const [status, setStatus] = useState<LicenseStatus>(initialKey ? 'checking' : 'free');

  useEffect(() => {
    if (!initialKey) return;
    let active = true;
    void verifyLicenseKey(initialKey).then((valid) => {
      if (!active) return;
      if (valid) setStatus('pro');
      else {
        clearCachedLicense();
        setStatus('free');
      }
    });
    return () => { active = false; };
  }, [initialKey]);

  const activate = useCallback(async (licenseKey: string): Promise<boolean> => {
    const normalized = licenseKey.trim();
    const valid = await verifyLicenseKey(normalized);
    if (!valid) return false;
    try {
      localStorage.setItem(LICENSE_STORAGE_KEY, normalized);
      localStorage.setItem(STATUS_STORAGE_KEY, 'active');
    } catch {
      // The current session remains activated when persistent storage is blocked.
    }
    setStatus('pro');
    return true;
  }, []);

  return {
    status,
    isPro: status !== 'free',
    activate,
  };
}
