import { useRef } from 'react';
import { Check, Image, Monitor, Moon, RectangleHorizontal, RectangleVertical, Smartphone, Square, Sun, Upload, Video } from 'lucide-react';
import { prepareImage } from '../lib/files';
import type { AspectRatio, BackgroundKind, ChatMode, ChatTheme, SpeedPreset, Story, ViewportMode } from '../types';
import { SegmentedControl, SectionHeader, Toggle } from './Controls';
import { useToast } from './Toasts';

interface StylePanelProps {
  story: Story;
  onChange: (story: Story) => void;
}

const themes: Array<{ id: ChatTheme; name: string; detail: string }> = [
  { id: 'imessage', name: 'iMessage', detail: 'Blue bubbles and receipts' },
  { id: 'whatsapp', name: 'WhatsApp', detail: 'Doodles and read checks' },
  { id: 'instagram', name: 'Instagram DM', detail: 'Gradient pills and Seen' },
  { id: 'discord', name: 'Discord', detail: 'Avatars and colored names' },
  { id: 'messenger', name: 'Messenger', detail: 'Classic blue gradient' },
  { id: 'telegram', name: 'Telegram Glass', detail: 'Tinted glass and checks' },
];

const backgrounds: Array<{ id: BackgroundKind; name: string; className: string }> = [
  { id: 'highway', name: 'Neon Night Highway Run', className: 'highway' },
  { id: 'parkour', name: 'Voxel Sky Parkour Blocks', className: 'parkour' },
  { id: 'rain', name: 'Midnight Rainy Windshield', className: 'rain' },
  { id: 'aurora', name: 'Soft Dynamic Aurora Mesh', className: 'aurora' },
  { id: 'starlight', name: 'Cozy Starlight Drift', className: 'starlight' },
];

export function StylePanel({ story, onChange }: StylePanelProps) {
  const { toast } = useToast();
  const backgroundInput = useRef<HTMLInputElement>(null);
  const update = (patch: Partial<Story['settings']>) => onChange({ ...story, settings: { ...story.settings, ...patch } });
  const settings = story.settings;

  return (
    <div className="panel-content style-panel">
      <section className="panel-section">
        <SectionHeader title="Chat application" description="Six authentic visual systems, each rendered on canvas." />
        <div className="theme-grid">
          {themes.map((theme) => (
            <button key={theme.id} className={`theme-card theme-${theme.id} ${settings.theme === theme.id ? 'selected' : ''}`} onClick={() => update({ theme: theme.id })}>
              <span className="theme-preview" aria-hidden="true">
                <i className="mini-bubble left" />
                <i className="mini-bubble right" />
              </span>
              <span className="theme-card-copy"><strong>{theme.name}</strong><span>{theme.detail}</span></span>
              <span className="selection-check">{settings.theme === theme.id && <Check size={13} />}</span>
            </button>
          ))}
        </div>
        <div className="field-block">
          <span className="field-label">Chat appearance</span>
          <SegmentedControl<ChatMode>
            label="Chat appearance"
            value={settings.chatMode}
            onChange={(chatMode) => update({ chatMode })}
            options={[{ value: 'light', label: 'Light', icon: <Sun size={15} /> }, { value: 'dark', label: 'Dark', icon: <Moon size={15} /> }]}
          />
        </div>
        <div className="field-block">
          <span className="field-label">Phone viewport</span>
          <SegmentedControl<ViewportMode>
            label="Phone viewport"
            value={settings.viewport}
            onChange={(viewport) => update({ viewport })}
            options={[{ value: 'floating', label: 'Floating card', icon: <Monitor size={15} /> }, { value: 'fullscreen', label: 'Full-screen phone', icon: <Smartphone size={15} /> }]}
          />
        </div>
      </section>

      <section className="panel-section">
        <SectionHeader title="Motion background" description="Procedural scenes animate smoothly without external media." />
        <div className="background-grid">
          {backgrounds.map((background) => (
            <button key={background.id} className={`background-card ${settings.background === background.id ? 'selected' : ''}`} onClick={() => update({ background: background.id })}>
              <span className={`background-art ${background.className}`} aria-hidden="true"><i /><i /><i /></span>
              <span>{background.name}</span>
              {settings.background === background.id && <span className="background-check"><Check size={12} /></span>}
            </button>
          ))}
          <button className={`background-card ${settings.background === 'custom' ? 'selected' : ''}`} onClick={() => backgroundInput.current?.click()}>
            <span className={`background-art custom ${settings.customBackgroundSrc && settings.customBackgroundType === 'image' ? 'has-image' : ''}`}>
              {settings.customBackgroundSrc && settings.customBackgroundType === 'image' ? <img src={settings.customBackgroundSrc} alt="" /> : settings.customBackgroundType === 'video' && settings.customBackgroundSrc ? <Video size={23} /> : <Upload size={22} />}
            </span>
            <span>Custom photo or MP4</span>
            {settings.background === 'custom' && <span className="background-check"><Check size={12} /></span>}
          </button>
        </div>
        <input ref={backgroundInput} className="visually-hidden" type="file" accept="image/*,video/mp4,video/webm" onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            if (file.type.startsWith('video/')) {
              if (file.size > 250 * 1024 * 1024) throw new Error('Choose a background video smaller than 250 MB.');
              if (settings.customBackgroundSrc?.startsWith('blob:')) URL.revokeObjectURL(settings.customBackgroundSrc);
              update({ background: 'custom', customBackgroundSrc: URL.createObjectURL(file), customBackgroundType: 'video' });
            } else if (file.type.startsWith('image/')) {
              const src = await prepareImage(file, 1920);
              update({ background: 'custom', customBackgroundSrc: src, customBackgroundType: 'image' });
            } else throw new Error('Choose an MP4, WebM, or image file.');
            toast('Custom background applied');
          } catch (error) {
            toast('Could not use that background', { detail: error instanceof Error ? error.message : undefined, tone: 'error' });
          }
          event.target.value = '';
        }} />
        <div className="dual-range-grid">
          <label className="range-field">
            <span>Background dim <strong>{settings.backgroundDim}%</strong></span>
            <input type="range" min="0" max="80" value={settings.backgroundDim} onChange={(event) => update({ backgroundDim: Number(event.target.value) })} />
          </label>
          <label className="range-field">
            <span>Background blur <strong>{settings.backgroundBlur}px</strong></span>
            <input type="range" min="0" max="24" value={settings.backgroundBlur} onChange={(event) => update({ backgroundBlur: Number(event.target.value) })} />
          </label>
        </div>
      </section>

      <section className="panel-section">
        <SectionHeader title="Frame and pacing" description="Tune the canvas and story rhythm for your platform." />
        <div className="field-block">
          <span className="field-label">Aspect ratio</span>
          <SegmentedControl<AspectRatio>
            label="Aspect ratio"
            value={settings.aspect}
            onChange={(aspect) => update({ aspect })}
            options={[
              { value: '9:16', label: '9:16 Vertical', icon: <RectangleVertical size={15} /> },
              { value: '16:9', label: '16:9 Landscape', icon: <RectangleHorizontal size={15} /> },
              { value: '1:1', label: '1:1 Square', icon: <Square size={14} /> },
            ]}
          />
        </div>
        <div className="field-block">
          <span className="field-label">Story speed</span>
          <SegmentedControl<SpeedPreset>
            label="Story speed"
            value={settings.speed}
            onChange={(speed) => update({ speed })}
            options={[{ value: 'fast', label: 'Fast Reels' }, { value: 'natural', label: 'Natural' }, { value: 'suspense', label: 'Suspense' }]}
          />
        </div>
      </section>

      <section className="panel-section">
        <SectionHeader title="Sound and identity" description="Every sound layer is synthesized locally on your device." />
        <label className="field-block">
          <span className="field-label">Ambient audio bed</span>
          <select className="select-input" value={settings.ambient} onChange={(event) => update({ ambient: event.target.value as Story['settings']['ambient'] })}>
            <option value="none">None</option>
            <option value="lofi">Calm Lo-Fi Pad</option>
            <option value="suspense">Midnight Suspense Drone</option>
            <option value="rain">Soft Rain</option>
          </select>
        </label>
        <div className="toggle-group">
          <Toggle checked={settings.sound} onChange={(sound) => update({ sound })} label="Chat sound effects" description="Keyboard taps, send whooshes, receive pops, and stings." />
          <Toggle checked={settings.voiceover} onChange={(voiceover) => update({ voiceover })} label="Dual-character voice preview" description="Uses distinct device voices. Export remains offline-safe if speech is unavailable." />
          <Toggle checked={settings.watermark} onChange={(watermark) => update({ watermark })} label="Channel watermark" description="A clean badge placed above the floating chat card." />
        </div>
        {settings.watermark && (
          <label className="field-block watermark-field">
            <span className="field-label">Watermark text</span>
            <span className="input-with-icon"><Image size={16} /><input className="text-input" value={settings.watermarkText} maxLength={40} onChange={(event) => update({ watermarkText: event.target.value })} placeholder="@yourchannel" /></span>
          </label>
        )}
      </section>
    </div>
  );
}
