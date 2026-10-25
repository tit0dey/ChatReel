import { useState } from 'react';
import { BadgeCheck, BadgeDollarSign, Check, ChevronDown, Crown, ExternalLink, KeyRound, LoaderCircle, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { CHECKOUT_URL } from '../lib/plans';
import { Modal } from './Modal';
import { useToast } from './Toasts';

interface PlanModalProps {
  onClose: () => void;
  onActivate: (key: string) => Promise<boolean>;
  reason?: string | null;
}

const comparison = [
  { feature: 'Video Watermark', free: 'Moving center preview watermark', pro: '100% No Watermark + Custom @Channel Badge', freeIcon: 'lock' },
  { feature: 'Export Quality', free: '720p HD • 30fps', pro: '1080p Full HD • 60fps Ultra-Smooth', freeIcon: 'check' },
  { feature: 'Chat Themes', free: 'iMessage & WhatsApp', pro: 'All Themes (Instagram DM, Discord, Telegram, Messenger + Dark/Light)', freeIcon: 'check' },
  { feature: 'Story Length', free: 'Up to 10 messages per video', pro: 'Unlimited messages + Auto Multi-Part Series Splitter', freeIcon: 'check' },
  { feature: 'Backgrounds', free: 'Built-in motion backgrounds', pro: 'Upload Custom Gameplay/Video (.mp4) & Custom Photos', freeIcon: 'check' },
] as const;

export function PlanModal({ onClose, onActivate, reason }: PlanModalProps) {
  const { toast } = useToast();
  const [activationOpen, setActivationOpen] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [checking, setChecking] = useState(false);
  const [activationError, setActivationError] = useState(false);

  const activate = async () => {
    if (!licenseKey.trim() || checking) {
      if (!licenseKey.trim()) setActivationError(true);
      return;
    }
    setChecking(true);
    setActivationError(false);
    const valid = await onActivate(licenseKey);
    setChecking(false);
    if (!valid) {
      setActivationError(true);
      return;
    }
    setLicenseKey('');
    toast('Lifetime Pro activated', { detail: 'Your moving watermark is gone and every studio feature is unlocked.' });
    onClose();
  };

  return (
    <Modal title="Choose how far your stories can go." description="Test the studio for free, or own every feature with one lifetime payment." onClose={onClose} wide>
      <div className="plan-modal-body">
        {reason && <div className="pro-reason"><LockKeyhole size={16} /><span>Unlock Lifetime Pro to use {reason}.</span></div>}
        <div className="plan-comparison" role="table" aria-label="Free Starter and Lifetime Pro comparison">
          <div className="plan-row plan-heading" role="row">
            <div role="columnheader">Studio features</div>
            <div role="columnheader"><span className="plan-name">Free Starter</span><small>Start creating</small></div>
            <div role="columnheader" className="pro-column"><span className="plan-name"><Crown size={15} />Lifetime Pro</span><small>$9 Once, Forever</small></div>
          </div>
          {comparison.map((row) => (
            <div className="plan-row" role="row" key={row.feature}>
              <strong role="rowheader">{row.feature}</strong>
              <div role="cell" className="free-feature">
                {row.freeIcon === 'check' ? <Check size={15} /> : <LockKeyhole size={14} />}
                <span>{row.free}</span>
              </div>
              <div role="cell" className="pro-feature"><Check size={15} /><span>{row.pro}</span></div>
            </div>
          ))}
        </div>

        <div className="pricing-anchor"><BadgeDollarSign size={21} /><span>Competitors (Crayo / Vsub) charge $19–$29 every month. <strong>Pay $9 once — own it for life.</strong></span></div>

        <div className="plan-actions">
          <a
            className="button lifetime-cta"
            href={CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              const bridge = window.ChatReelAndroid;
              if (bridge?.openExternal) {
                event.preventDefault();
                if (!bridge.openExternal(CHECKOUT_URL)) toast('Could not open the secure checkout', { tone: 'error' });
              }
            }}
          ><Crown size={18} />Unlock Lifetime Pro — $9 Once<ExternalLink size={15} /></a>
          <button className="button free-continue" onClick={onClose}>Continue with Free Plan</button>
        </div>

        <div className={`license-activation ${activationOpen ? 'open' : ''}`}>
          <button className="activation-trigger" onClick={() => { setActivationOpen((value) => !value); setActivationError(false); }} aria-expanded={activationOpen}>
            <KeyRound size={16} /><span>Already purchased? Enter License Key</span><ChevronDown size={16} />
          </button>
          {activationOpen && (
            <div className="activation-form">
              <label htmlFor="license-key">Lifetime license key</label>
              <div className="license-input-row">
                <input
                  id="license-key"
                  value={licenseKey}
                  onChange={(event) => { setLicenseKey(event.target.value); setActivationError(false); }}
                  placeholder="CRPRO-..."
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  className={activationError ? 'invalid' : ''}
                  onKeyDown={(event) => { if (event.key === 'Enter') void activate(); }}
                />
                <button className="button activate-button" disabled={checking} onClick={() => void activate()}>
                  {checking ? <LoaderCircle size={16} className="spin" /> : <ShieldCheck size={16} />}{checking ? 'Verifying' : 'Activate Pro'}
                </button>
              </div>
              {activationError ? <span className="activation-error"><X size={13} />This license key is invalid or incomplete. Check the characters and try again.</span> : <span className="activation-help"><ShieldCheck size={13} />Offline ECDSA verification. No key is sent to a server.</span>}
            </div>
          )}
        </div>
        <div className="checkout-note"><BadgeCheck size={14} />Secure Whop checkout. Card, Google Pay, and Apple Pay availability depends on device and region.</div>
      </div>
    </Modal>
  );
}
