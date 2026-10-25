import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck, Clapperboard, Crown, Download, HardDrive, MessageSquareText, Moon, SlidersHorizontal, Sun } from 'lucide-react';
import { ExportPanel } from './components/ExportPanel';
import { PaymentConfirmationModal } from './components/PaymentConfirmationModal';
import { PlanModal } from './components/PlanModal';
import { Stage } from './components/Stage';
import { StoryPanel } from './components/StoryPanel';
import { StylePanel } from './components/StylePanel';
import { useToast } from './components/Toasts';
import { useMediaQuery } from './hooks/useMediaQuery';
import { usePersistentStory } from './hooks/usePersistentStory';
import { useProLicense } from './hooks/useProLicense';
import { loadAssets } from './lib/assets';
import { buildTimeline } from './lib/story';
import type { AssetBundle, Story } from './types';

type StudioTab = 'story' | 'style' | 'export';

const tabs = [
  { id: 'story' as const, label: 'Story', icon: MessageSquareText },
  { id: 'style' as const, label: 'Style', icon: SlidersHorizontal },
  { id: 'export' as const, label: 'Preview & Export', icon: Clapperboard },
];

function mediaSignature(story: Story): string {
  const sources = [story.settings.contactAvatar, story.settings.senderAvatar, story.settings.customBackgroundSrc, ...story.messages.map((item) => item.src)];
  let hash = 0;
  const value = [story.settings.background, story.settings.customBackgroundType, ...sources].join('|');
  for (let index = 0; index < value.length; index++) hash = (Math.imul(hash, 31) + value.charCodeAt(index)) | 0;
  return `${hash}-${value.length}`;
}

interface AppProps {
  automaticUnlockKeys?: readonly string[];
}

const NO_AUTOMATIC_UNLOCK_KEYS: readonly string[] = [];

export default function App({ automaticUnlockKeys = NO_AUTOMATIC_UNLOCK_KEYS }: AppProps) {
  const { toast } = useToast();
  const { isPro, status: licenseStatus, activate } = useProLicense();
  const [story, setStory] = usePersistentStory();
  const [activeTab, setActiveTab] = useState<StudioTab>('story');
  const [planOpen, setPlanOpen] = useState(false);
  const [planReason, setPlanReason] = useState<string | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [autoUnlockPending, setAutoUnlockPending] = useState(automaticUnlockKeys.length > 0);
  const [paymentConfirmationKey, setPaymentConfirmationKey] = useState<string | null>(null);
  const startupUnlockAttempted = useRef(false);
  const [appearance, setAppearance] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('chatreel-appearance');
    return saved === 'dark' || saved === 'light' ? saved : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [assets, setAssets] = useState<AssetBundle>({ images: new Map() });
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const isMobile = useMediaQuery('(max-width: 900px)');
  const timeline = useMemo(() => buildTimeline(story), [story]);
  const signature = mediaSignature(story);

  const activateAutomatically = useCallback(async (licenseKey: string): Promise<boolean> => {
    const normalized = licenseKey.trim();
    setAutoUnlockPending(true);
    const valid = await activate(normalized);
    setAutoUnlockPending(false);
    if (!valid) {
      toast('Automatic unlock failed', { detail: 'The URL license key is invalid. You can use the optional manual activation field instead.', tone: 'error' });
      return false;
    }
    setPaymentConfirmationKey(normalized);
    setPlanOpen(false);
    setPlanReason(null);
    setOnboardingDismissed(true);
    return true;
  }, [activate, toast]);

  useEffect(() => {
    window.ChatReelAutoUnlock = activateAutomatically;
    return () => {
      if (window.ChatReelAutoUnlock === activateAutomatically) delete window.ChatReelAutoUnlock;
    };
  }, [activateAutomatically]);

  useEffect(() => {
    if (startupUnlockAttempted.current || automaticUnlockKeys.length === 0) return;
    startupUnlockAttempted.current = true;
    void (async () => {
      for (const key of automaticUnlockKeys) {
        if (await activateAutomatically(key)) break;
      }
    })();
  }, [activateAutomatically, automaticUnlockKeys]);

  useEffect(() => {
    document.documentElement.dataset.theme = appearance;
    localStorage.setItem('chatreel-appearance', appearance);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', appearance === 'dark' ? '#0B0E14' : '#F8FAFC');
  }, [appearance]);

  useEffect(() => {
    if (licenseStatus === 'free' && !onboardingDismissed && !autoUnlockPending && !paymentConfirmationKey) {
      setPlanReason(null);
      setPlanOpen(true);
    }
  }, [licenseStatus, onboardingDismissed, autoUnlockPending, paymentConfirmationKey]);

  useEffect(() => {
    if (isPro) {
      setPlanOpen(false);
      setPlanReason(null);
    }
  }, [isPro]);

  useEffect(() => {
    let active = true;
    setAssetsLoading(true);
    loadAssets(story).then((bundle) => {
      if (active) setAssets(bundle);
    }).catch((error) => {
      if (active) toast('Some media could not be loaded', { detail: error instanceof Error ? error.message : undefined, tone: 'error' });
    }).finally(() => {
      if (active) setAssetsLoading(false);
    });
    return () => { active = false; };
    // The signature changes only when a media source changes, not while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const onChange = (next: Story) => setStory({ ...next, updatedAt: Date.now() });
  const requestPro = (reason: string | null = null) => {
    setPlanReason(reason);
    setPlanOpen(true);
  };
  const closePlan = () => {
    setPlanOpen(false);
    setPlanReason(null);
    setOnboardingDismissed(true);
  };
  const selectTab = (tab: StudioTab) => {
    if (exporting) {
      toast('Export in progress', { detail: 'Cancel or finish the current render before leaving this view.', tone: 'info' });
      return;
    }
    setActiveTab(tab);
  };
  const panel = activeTab === 'story'
    ? <StoryPanel story={story} onChange={onChange} isPro={isPro} onRequestPro={requestPro} />
    : activeTab === 'style'
      ? <StylePanel story={story} onChange={onChange} isPro={isPro} onRequestPro={requestPro} />
      : <ExportPanel story={story} timeline={timeline} assets={assets} onChange={onChange} onExportingChange={setExporting} isPro={isPro} onRequestPro={requestPro} />;
  const apkHref = window.location.hostname.endsWith('github.io')
    ? 'https://github.com/tit0dey/ChatReel/raw/main/apk/ChatReel-Studio.apk'
    : './apk';

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => selectTab('story')} aria-label="ChatReel Studio home">
          <img src="./logo.svg" alt="" />
          <span className="brand-copy"><strong>ChatReel <span>Studio</span></strong><small>v1.0.0</small></span>
        </button>
        <div className="topbar-actions">
          <span className="local-status"><HardDrive size={15} />Saved locally</span>
          {isPro ? (
            <span className="pro-active-badge"><BadgeCheck size={16} />Pro Lifetime Active</span>
          ) : (
            <button className="button unlock-pro-button" onClick={() => requestPro()}><Crown size={16} /><span>Unlock Pro — $9</span></button>
          )}
          {!window.ChatReelAndroid && <a className="button android-link" href={apkHref} download><Download size={16} /><span>Android app</span></a>}
          <button className="theme-toggle" onClick={() => setAppearance((value) => value === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${appearance === 'light' ? 'dark' : 'light'} mode`} title={`Switch to ${appearance === 'light' ? 'dark' : 'light'} mode`}>
            <span className={appearance === 'light' ? 'active' : ''}><Sun size={16} /></span>
            <span className={appearance === 'dark' ? 'active' : ''}><Moon size={16} /></span>
          </button>
        </div>
      </header>

      {!isMobile ? (
        <main className="desktop-studio">
          <aside className="control-panel">
            <nav className="studio-tabs desktop-tabs" aria-label="Studio sections">
              {tabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => selectTab(tab.id)}>{tab.label}</button>)}
            </nav>
            <div className="panel-scroll">{panel}</div>
          </aside>
          <div className="stage-workspace">
            <Stage story={story} timeline={timeline} assets={assets} assetsLoading={assetsLoading} suspended={exporting} isPro={isPro} />
          </div>
        </main>
      ) : (
        <main className={`mobile-studio mobile-${activeTab}`}>
          {activeTab === 'export' ? (
            <div className="mobile-export-layout">
              <Stage story={story} timeline={timeline} assets={assets} assetsLoading={assetsLoading} suspended={exporting} isPro={isPro} />
              {panel}
            </div>
          ) : panel}
        </main>
      )}

      {isMobile && (
        <nav className="studio-tabs mobile-tabs" aria-label="Studio sections">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => selectTab(tab.id)}><Icon size={19} /><span>{tab.label}</span></button>;
          })}
        </nav>
      )}

      {paymentConfirmationKey && (
        <PaymentConfirmationModal
          verifiedKey={paymentConfirmationKey}
          onActivate={activate}
          onClose={() => setPaymentConfirmationKey(null)}
        />
      )}
      {planOpen && !isPro && !paymentConfirmationKey && <PlanModal onClose={closePlan} onActivate={activate} reason={planReason} />}
    </div>
  );
}
