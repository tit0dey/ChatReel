import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Cpu, Download, FileVideo2, Film, LoaderCircle, PackageOpen, Square, Trash2, X } from 'lucide-react';
import { exportEngineLabel, exportStoryVideo, saveVideoBlob } from '../lib/exporter';
import { loadAssets } from '../lib/assets';
import { getStoryProRestriction } from '../lib/plans';
import { buildTimeline, formatTime, splitStory, uid } from '../lib/story';
import { addVaultEntry, deleteVaultEntry, getVaultEntry, listVaultEntries, type VaultMetadata } from '../lib/vault';
import type { AssetBundle, ExportProgress, FrameRate, Resolution, Story, StoryTimeline } from '../types';
import { SegmentedControl, SectionHeader } from './Controls';
import { useToast } from './Toasts';

interface ExportPanelProps {
  story: Story;
  timeline: StoryTimeline;
  assets: AssetBundle;
  onChange: (story: Story) => void;
  onExportingChange: (exporting: boolean) => void;
  isPro: boolean;
  onRequestPro: (reason: string) => void;
}

const initialProgress: ExportProgress = { phase: 'audio', progress: 0, detail: 'Ready to render on this device' };

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ExportPanel({ story, timeline, assets, onChange, onExportingChange, isPro, onRequestPro }: ExportPanelProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress>(initialProgress);
  const [partProgress, setPartProgress] = useState({ current: 0, total: 0 });
  const [vault, setVault] = useState<VaultMetadata[]>([]);
  const [vaultBusy, setVaultBusy] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refreshVault = useCallback(() => {
    void listVaultEntries().then(setVault).catch(() => setVault([]));
  }, []);
  useEffect(refreshVault, [refreshVault]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const update = (patch: Partial<Story['settings']>) => onChange({ ...story, settings: { ...story.settings, ...patch } });

  const startExport = async () => {
    if (exporting || !story.messages.length) return;
    if (!isPro) {
      const restriction = getStoryProRestriction(story);
      if (restriction) {
        onRequestPro(restriction);
        return;
      }
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setExporting(true);
    onExportingChange(true);
    setProgress({ phase: 'audio', progress: 0, detail: 'Preparing your story' });
    const parts = story.settings.exportMode === 'series' ? splitStory(story, story.settings.partDuration) : [story];
    setPartProgress({ current: 1, total: parts.length });
    let vaultWarning = false;
    let usedCompatibilityFormat = false;
    let savedToNative = false;

    try {
      for (let index = 0; index < parts.length; index++) {
        const part = parts[index];
        const partTimeline = parts.length === 1 ? timeline : buildTimeline(part);
        const partAssets = parts.length === 1 ? assets : await loadAssets(part);
        setPartProgress({ current: index + 1, total: parts.length });
        const blob = await exportStoryVideo({
          story: part,
          timeline: partTimeline,
          assets: partAssets,
          isPro,
          partLabel: parts.length > 1 ? `Part ${index + 1}` : undefined,
          signal: controller.signal,
          onProgress: setProgress,
        });
        if (controller.signal.aborted) throw new DOMException('Export cancelled.', 'AbortError');
        if (!blob.type.includes('mp4')) usedCompatibilityFormat = true;
        try {
          await addVaultEntry({
            id: uid(), name: part.name, createdAt: Date.now(), duration: partTimeline.duration,
            size: blob.size, mimeType: blob.type, blob,
          });
        } catch {
          vaultWarning = true;
        }
        const destination = await saveVideoBlob(blob, part.name);
        savedToNative = destination === 'native';
        refreshVault();
      }
      setProgress({ phase: 'complete', progress: 1, detail: parts.length > 1 ? `${parts.length} parts exported successfully` : 'Your video exported successfully' });
      toast(parts.length > 1 ? 'Series export complete' : 'Video export complete', {
        detail: savedToNative ? 'Saved in Downloads/ChatReelStudio.' : usedCompatibilityFormat ? 'Saved with the browser’s compatibility video format.' : 'Your download is ready and a copy is in the Vault.',
        tone: 'success',
      });
      if (vaultWarning) toast('Vault storage is full', { detail: 'The video was still saved to your device.', tone: 'info' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setProgress({ ...initialProgress, detail: 'Export cancelled. Your story is unchanged.' });
        toast('Export cancelled', { tone: 'info' });
      } else {
        setProgress({ ...initialProgress, detail: 'Export could not be completed.' });
        toast('Export could not be completed', { detail: error instanceof Error ? error.message : 'Try the compatibility resolution or a shorter series part.', tone: 'error' });
      }
    } finally {
      setExporting(false);
      onExportingChange(false);
      abortRef.current = null;
    }
  };

  const overallProgress = exporting
    ? Math.min(1, ((partProgress.current - 1) + (progress.phase === 'audio' ? progress.progress * 0.14 : progress.phase === 'video' ? 0.14 + progress.progress * 0.8 : progress.phase === 'finalizing' || progress.phase === 'complete' ? 1 : 0)) / Math.max(1, partProgress.total))
    : progress.phase === 'complete' ? 1 : 0;

  return (
    <div className="panel-content export-panel">
      <section className="panel-section export-hero">
        <span className="eyebrow">On-device video renderer</span>
        <h2>Ready for your audience.</h2>
        <p>Real video, synchronized procedural audio, and no media uploads.</p>
        <div className="engine-badge"><Cpu size={15} /><span>{exportEngineLabel()}</span><i />Offline processing</div>
      </section>

      <section className="panel-section">
        <SectionHeader title="Output quality" description="Free includes 720p30. Lifetime Pro includes 1080p60." />
        <div className="field-block">
          <span className="field-label">Resolution</span>
          <SegmentedControl<Resolution>
            label="Export resolution"
            value={story.settings.resolution}
            onChange={(resolution) => {
              if (!isPro && resolution === '1080') onRequestPro('1080p Full HD and 60fps export');
              else update({ resolution, fps: resolution === '720' ? 30 : story.settings.fps });
            }}
            options={[{ value: '720', label: '720p HD' }, { value: '1080', label: '1080p Full HD' }]}
          />
        </div>
        <div className="field-block">
          <span className="field-label">Frame rate</span>
          <SegmentedControl<FrameRate>
            label="Export frame rate"
            value={story.settings.fps}
            onChange={(fps) => {
              if (!isPro && fps === 60) onRequestPro('1080p Full HD and 60fps export');
              else update({ fps });
            }}
            options={story.settings.resolution === '720' ? [{ value: 30, label: '30 fps · Fast mobile' }] : [{ value: 30, label: '30 fps' }, { value: 60, label: '60 fps · Smooth' }]}
          />
        </div>
        <div className="export-summary">
          <span><Film size={16} />{story.settings.aspect} canvas</span>
          <span>{formatTime(timeline.duration, true)} duration</span>
          <span>{story.messages.length} story beats</span>
        </div>
      </section>

      <section className="panel-section">
        <SectionHeader title="Export structure" description="Keep the full story or split it for episodic retention." />
        <SegmentedControl
          label="Export structure"
          value={story.settings.exportMode}
          onChange={(exportMode: Story['settings']['exportMode']) => {
            if (!isPro && exportMode === 'series') onRequestPro('the Multi-Part Series Splitter');
            else update({ exportMode });
          }}
          options={[{ value: 'single' as const, label: 'Single complete video' }, { value: 'series' as const, label: 'Multi-part series' }]}
        />
        {story.settings.exportMode === 'series' && (
          <label className="field-block series-duration">
            <span className="field-label">Maximum duration per part</span>
            <select className="select-input" value={story.settings.partDuration} onChange={(event) => update({ partDuration: Number(event.target.value) })}>
              <option value="30">30 seconds</option>
              <option value="45">45 seconds</option>
              <option value="60">60 seconds</option>
              <option value="90">90 seconds</option>
            </select>
            <span className="field-help">Scene boundaries stay intact. Each part is rendered and saved separately.</span>
          </label>
        )}
      </section>

      <section className="panel-section export-action-section">
        {exporting && (
          <div className="export-progress" role="status">
            <div className="progress-copy"><span>{progress.detail}</span><strong>{Math.round(overallProgress * 100)}%</strong></div>
            <div className="progress-track"><i style={{ width: `${overallProgress * 100}%` }} /></div>
            {partProgress.total > 1 && <span className="field-help">Part {partProgress.current} of {partProgress.total}</span>}
          </div>
        )}
        {!exporting && progress.phase === 'complete' && <div className="export-complete"><CheckCircle2 size={18} /><span>{progress.detail}</span></div>}
        {exporting ? (
          <button className="button export-button cancel" onClick={() => abortRef.current?.abort()}><X size={18} />Cancel export</button>
        ) : (
          <button className="button export-button" disabled={!story.messages.length} onClick={() => void startExport()}>
            <Download size={19} />{story.settings.exportMode === 'series' ? 'Export video series' : 'Export MP4 video'}
          </button>
        )}
        {!story.messages.length && <span className="field-help centered">Add at least one message to render a video.</span>}
        <p className="export-footnote">Device speech is preview-only when unavailable offline. Synthesized ambience and chat effects are always rendered into the file.</p>
      </section>

      <section className="panel-section vault-section">
        <SectionHeader title="Export Vault" description="Your rendered files, stored locally in this browser." action={<PackageOpen size={18} />} />
        <div className="vault-list">
          {vault.map((entry) => (
            <article className="vault-item" key={entry.id}>
              <span className="vault-file-icon"><FileVideo2 size={19} /></span>
              <div className="vault-copy">
                <strong>{entry.name}</strong>
                <span>{formatBytes(entry.size)} · {formatTime(entry.duration)} · {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(entry.createdAt)}</span>
              </div>
              <button className="icon-button quiet" disabled={vaultBusy === entry.id} onClick={async () => {
                setVaultBusy(entry.id);
                try {
                  const file = await getVaultEntry(entry.id);
                  if (!file) throw new Error('The local file is no longer available.');
                  await saveVideoBlob(file.blob, file.name);
                  toast('Vault download started');
                } catch (error) {
                  toast('Could not download this file', { detail: error instanceof Error ? error.message : undefined, tone: 'error' });
                } finally { setVaultBusy(null); }
              }} aria-label={`Download ${entry.name}`}>{vaultBusy === entry.id ? <LoaderCircle size={17} className="spin" /> : <Download size={17} />}</button>
              <button className="icon-button quiet danger" onClick={() => {
                void deleteVaultEntry(entry.id).then(refreshVault);
                toast('Removed from the Vault', { tone: 'info' });
              }} aria-label={`Delete ${entry.name}`}><Trash2 size={16} /></button>
            </article>
          ))}
          {!vault.length && <div className="empty-state vault-empty"><Square size={24} /><strong>No exports yet</strong><span>Your finished videos will appear here.</span></div>}
        </div>
      </section>
    </div>
  );
}
