import { useEffect, useState } from 'react';
import { BadgeCheck, ChevronDown, KeyRound, LoaderCircle, ShieldCheck, Smartphone, X } from 'lucide-react';
import { androidUnlockDeepLink } from '../lib/autoUnlock';
import { Modal } from './Modal';
import { useToast } from './Toasts';

interface PaymentConfirmationModalProps {
  verifiedKey: string;
  onActivate: (key: string) => Promise<boolean>;
  onClose: () => void;
}

export function PaymentConfirmationModal({ verifiedKey, onActivate, onClose }: PaymentConfirmationModalProps) {
  const { toast } = useToast();
  const [backupOpen, setBackupOpen] = useState(false);
  const [backupKey, setBackupKey] = useState('');
  const [checking, setChecking] = useState(false);
  const [activationError, setActivationError] = useState(false);
  const androidBrowser = !window.ChatReelAndroid && /Android/i.test(window.navigator.userAgent);
  const deepLink = androidUnlockDeepLink(verifiedKey);

  useEffect(() => {
    if (!androidBrowser) return;
    const timer = window.setTimeout(() => {
      window.location.assign(deepLink);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [androidBrowser, deepLink]);

  const activateBackup = async () => {
    if (!backupKey.trim() || checking) {
      if (!backupKey.trim()) setActivationError(true);
      return;
    }
    setChecking(true);
    setActivationError(false);
    const valid = await onActivate(backupKey);
    setChecking(false);
    if (!valid) {
      setActivationError(true);
      return;
    }
    setBackupKey('');
    toast('Lifetime Pro activated', { detail: 'The backup license key was verified successfully.' });
  };

  return (
    <Modal
      title="Payment Confirmed — Lifetime Pro Unlocked Automatically!"
      description="Your license was verified automatically. No copying or pasting was needed."
      onClose={onClose}
    >
      <div className="payment-confirmation-body">
        <div className="payment-success-icon"><BadgeCheck size={34} strokeWidth={1.8} /></div>
        <div className="payment-verification" role="status">
          <ShieldCheck size={20} />
          <div><strong>Zero-touch activation complete</strong><span>Lifetime Pro is active on this device, and your verified status is saved locally.</span></div>
        </div>

        {androidBrowser && (
          <div className="android-return-panel">
            <a className="button android-return-button" href={deepLink}>
              <Smartphone size={19} />Open in ChatReel Android App (Auto-Activate Pro)
            </a>
            <p>We are opening the installed app automatically. If nothing happens, tap the button above.</p>
          </div>
        )}

        <button className="button payment-continue" onClick={onClose}>Continue to Studio</button>

        <div className={`license-activation payment-backup ${backupOpen ? 'open' : ''}`}>
          <button
            className="activation-trigger"
            onClick={() => { setBackupOpen((value) => !value); setActivationError(false); }}
            aria-expanded={backupOpen}
          >
            <KeyRound size={16} /><span>Enter License Key (Optional Backup)</span><ChevronDown size={16} />
          </button>
          {backupOpen && (
            <div className="activation-form">
              <label htmlFor="backup-license-key">Manual lifetime license key</label>
              <div className="license-input-row">
                <input
                  id="backup-license-key"
                  value={backupKey}
                  onChange={(event) => { setBackupKey(event.target.value); setActivationError(false); }}
                  placeholder="CRPRO-..."
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  className={activationError ? 'invalid' : ''}
                  onKeyDown={(event) => { if (event.key === 'Enter') void activateBackup(); }}
                />
                <button className="button activate-button" disabled={checking} onClick={() => void activateBackup()}>
                  {checking ? <LoaderCircle size={16} className="spin" /> : <ShieldCheck size={16} />}{checking ? 'Verifying' : 'Activate Pro'}
                </button>
              </div>
              {activationError ? (
                <span className="activation-error"><X size={13} />This license key is invalid or incomplete. Check the characters and try again.</span>
              ) : (
                <span className="activation-help"><ShieldCheck size={13} />Manual entry is optional. Automatic activation is already complete.</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
