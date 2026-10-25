import { useRef, useState } from 'react';
import {
  AlignLeft, AlignRight, ArrowDown, ArrowUp, Check, ChevronRight, Copy, FileWarning,
  Heart, Image as ImageIcon, Languages, MessageSquareText, Mic2, Moon, Plus, RefreshCw,
  SeparatorHorizontal, Shuffle, Sparkles, Trash2, Upload, Users, WandSparkles, Zap,
} from 'lucide-react';
import { instantiateTemplate, STORY_TEMPLATES, type StoryTemplate } from '../data/templates';
import { prepareImage } from '../lib/files';
import { createEmptyStory, divider, message, parseQuickScript, uid } from '../lib/story';
import type { Story, StoryMessage } from '../types';
import { Modal } from './Modal';
import { SectionHeader } from './Controls';
import { useToast } from './Toasts';

interface StoryPanelProps {
  story: Story;
  onChange: (story: Story) => void;
  isPro: boolean;
  onRequestPro: (reason: string) => void;
}

const avatarColors = ['#0D9488', '#4F46E5', '#E11D48', '#D97706'];
const templateIcons = [Moon, Shuffle, Users, FileWarning, Heart, Languages];

function CharacterEditor({ story, side, onChange }: { story: Story; onChange: (story: Story) => void; side: 'sender' | 'receiver' }) {
  const { toast } = useToast();
  const sender = side === 'sender';
  const name = sender ? story.settings.senderName : story.settings.contactName;
  const avatar = sender ? story.settings.senderAvatar : story.settings.contactAvatar;
  const color = sender ? story.settings.senderAvatarColor : story.settings.contactAvatarColor;
  const inputRef = useRef<HTMLInputElement>(null);

  const update = (patch: Record<string, unknown>) => onChange({ ...story, settings: { ...story.settings, ...patch } });
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0] ?? '').join('').toUpperCase() || 'C';

  return (
    <div className="character-editor">
      <button className="avatar-upload" style={{ '--avatar-color': color } as React.CSSProperties} onClick={() => inputRef.current?.click()} aria-label={`Upload ${sender ? 'sender' : 'contact'} avatar`}>
        {avatar ? <img src={avatar} alt="" /> : <span>{initials}</span>}
        <span className="avatar-upload-badge"><Upload size={12} /></span>
      </button>
      <input ref={inputRef} className="visually-hidden" type="file" accept="image/*" onChange={async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const src = await prepareImage(file, 256);
          update(sender ? { senderAvatar: src } : { contactAvatar: src });
        } catch (error) {
          toast('Could not use that image', { detail: error instanceof Error ? error.message : undefined, tone: 'error' });
        }
        event.target.value = '';
      }} />
      <div className="character-fields">
        <label className="field-label" htmlFor={`${side}-name`}>{sender ? 'Sender name' : 'Contact name'}</label>
        <input id={`${side}-name`} className="text-input compact" value={name} maxLength={48} onChange={(event) => update(sender ? { senderName: event.target.value } : { contactName: event.target.value })} />
        <div className="avatar-options">
          <div className="color-swatches" aria-label={`${sender ? 'Sender' : 'Contact'} avatar color`}>
            {avatarColors.map((swatch) => (
              <button key={swatch} className={color === swatch ? 'selected' : ''} style={{ background: swatch }} onClick={() => update(sender ? { senderAvatarColor: swatch } : { contactAvatarColor: swatch })} aria-label={`Use avatar color ${swatch}`}>{color === swatch && <Check size={10} />}</button>
            ))}
          </div>
          {avatar && <button className="text-button tiny" onClick={() => update(sender ? { senderAvatar: undefined } : { contactAvatar: undefined })}>Use initials</button>}
        </div>
      </div>
    </div>
  );
}

export function StoryPanel({ story, onChange, isPro, onRequestPro }: StoryPanelProps) {
  const { toast } = useToast();
  const [quickOpen, setQuickOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [script, setScript] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);

  const updateMessage = (id: string, patch: Partial<StoryMessage>) => onChange({
    ...story,
    messages: story.messages.map((item) => item.id === id ? { ...item, ...patch } : item),
  });
  const removeMessage = (id: string) => onChange({ ...story, messages: story.messages.filter((item) => item.id !== id) });
  const duplicateMessage = (index: number) => {
    if (!isPro && story.messages.length >= 10) {
      onRequestPro('more than 10 messages in one video');
      return;
    }
    const messages = [...story.messages];
    messages.splice(index + 1, 0, { ...messages[index], id: uid() });
    onChange({ ...story, messages });
  };
  const moveMessage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= story.messages.length) return;
    const messages = [...story.messages];
    [messages[index], messages[target]] = [messages[target], messages[index]];
    onChange({ ...story, messages });
  };
  const append = (item: StoryMessage) => {
    if (!isPro && story.messages.length >= 10) {
      onRequestPro('more than 10 messages in one video');
      return;
    }
    onChange({ ...story, messages: [...story.messages, item] });
  };
  const loadTemplate = (template: StoryTemplate) => {
    if (!isPro && template.messages.length > 10) {
      onRequestPro('templates longer than 10 messages');
      return;
    }
    onChange(instantiateTemplate(template));
    setTemplatesOpen(false);
    toast('Template loaded', { detail: `${template.name} is ready on the timeline.` });
  };

  return (
    <div className="panel-content story-panel">
      <section className="panel-section project-section">
        <div className="project-heading">
          <div>
            <span className="eyebrow">Current project</span>
            <input className="project-name-input" aria-label="Project name" value={story.name} maxLength={72} onChange={(event) => onChange({ ...story, name: event.target.value })} />
          </div>
          <button className="icon-button" onClick={() => setNewOpen(true)} aria-label="Start a new story" title="New story"><RefreshCw size={18} /></button>
        </div>
        <div className="quick-actions">
          <button className="button secondary" onClick={() => setQuickOpen(true)}><WandSparkles size={17} />Quick Script Paste</button>
          <button className="button ghost" onClick={() => setTemplatesOpen(true)}><Sparkles size={17} />Templates</button>
        </div>
      </section>

      <section className="panel-section">
        <SectionHeader title="Characters" description="Names and avatars update every chat theme." />
        <div className="character-list">
          <CharacterEditor story={story} side="receiver" onChange={onChange} />
          <CharacterEditor story={story} side="sender" onChange={onChange} />
        </div>
      </section>

      <section className="panel-section message-section">
        <SectionHeader title="Message timeline" description={isPro ? `${story.messages.length} story beats` : `${story.messages.length} of 10 free story beats`} />
        <div className="message-list">
          {story.messages.map((item, index) => (
            <article className={`message-editor ${item.type === 'divider' ? 'divider-editor' : ''}`} key={item.id}>
              <header className="message-editor-header">
                <div className="message-position">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <span className={`side-label ${item.side}`}>
                    {item.type === 'divider' ? <SeparatorHorizontal size={13} /> : item.side === 'sender' ? <AlignRight size={13} /> : <AlignLeft size={13} />}
                    {item.type === 'divider' ? 'Scene' : item.side === 'sender' ? story.settings.senderName : story.settings.contactName}
                  </span>
                </div>
                <div className="message-tools">
                  <button className="icon-button quiet" disabled={index === 0} onClick={() => moveMessage(index, -1)} aria-label="Move message up"><ArrowUp size={15} /></button>
                  <button className="icon-button quiet" disabled={index === story.messages.length - 1} onClick={() => moveMessage(index, 1)} aria-label="Move message down"><ArrowDown size={15} /></button>
                  <button className="icon-button quiet" onClick={() => duplicateMessage(index)} aria-label="Duplicate message"><Copy size={15} /></button>
                  <button className="icon-button quiet danger" onClick={() => removeMessage(item.id)} aria-label="Delete message"><Trash2 size={15} /></button>
                </div>
              </header>

              {item.type === 'image' && item.src && (
                <label className="attachment-preview">
                  <img src={item.src} alt="Message attachment" />
                  <span><ImageIcon size={15} />Replace photo</span>
                  <input className="visually-hidden" type="file" accept="image/*" onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try { updateMessage(item.id, { src: await prepareImage(file, 1280) }); }
                    catch (error) { toast('Could not replace the photo', { detail: error instanceof Error ? error.message : undefined, tone: 'error' }); }
                  }} />
                </label>
              )}

              {item.type === 'voice' ? (
                <div className="voice-editor">
                  <div className="voice-wave-preview" aria-hidden="true">
                    {Array.from({ length: 28 }, (_, bar) => <i key={bar} style={{ height: `${22 + ((bar * 17) % 68)}%` }} />)}
                  </div>
                  <label className="range-field">
                    <span><Mic2 size={15} />Voice duration <strong>{item.duration ?? 4}s</strong></span>
                    <input type="range" min="1" max="30" step="1" value={item.duration ?? 4} onChange={(event) => updateMessage(item.id, { duration: Number(event.target.value) })} />
                  </label>
                </div>
              ) : (
                <textarea
                  className="message-textarea"
                  value={item.text}
                  maxLength={400}
                  rows={item.type === 'divider' ? 1 : 2}
                  placeholder={item.type === 'divider' ? 'Scene or time divider' : item.type === 'image' ? 'Add an optional caption' : 'Write a message in any language'}
                  onChange={(event) => updateMessage(item.id, { text: event.target.value })}
                />
              )}

              {item.type !== 'divider' && (
                <footer className="message-editor-footer">
                  <button className="side-switch" onClick={() => updateMessage(item.id, { side: item.side === 'sender' ? 'receiver' : 'sender' })}>
                    {item.side === 'sender' ? <AlignRight size={14} /> : <AlignLeft size={14} />}
                    {item.side === 'sender' ? 'Right sender' : 'Left receiver'}
                    <ChevronRight size={13} />
                  </button>
                  <button className={`sting-toggle ${item.sting ? 'active' : ''}`} onClick={() => updateMessage(item.id, { sting: !item.sting })} aria-pressed={item.sting}>
                    <Zap size={14} />Suspense sting
                  </button>
                </footer>
              )}
            </article>
          ))}
          {!story.messages.length && <div className="empty-state"><MessageSquareText size={26} /><strong>Your timeline is empty</strong><span>Add a message or load a story template.</span></div>}
        </div>

        <div className="add-message-grid">
          <button onClick={() => append(message('receiver', 'New message'))}><MessageSquareText size={17} /><span>Text</span><Plus size={13} /></button>
          <button onClick={() => photoInput.current?.click()}><ImageIcon size={17} /><span>Photo</span><Plus size={13} /></button>
          <button onClick={() => append(message('receiver', '', { type: 'voice', duration: 4 }))}><Mic2 size={17} /><span>Voice note</span><Plus size={13} /></button>
          <button onClick={() => append(divider('3 Hours Later...'))}><SeparatorHorizontal size={17} /><span>Divider</span><Plus size={13} /></button>
        </div>
        <input ref={photoInput} className="visually-hidden" type="file" accept="image/*" onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            append(message('receiver', '', { type: 'image', src: await prepareImage(file, 1280) }));
            toast('Photo added to the timeline');
          } catch (error) {
            toast('Could not add that photo', { detail: error instanceof Error ? error.message : undefined, tone: 'error' });
          }
          event.target.value = '';
        }} />
      </section>

      {quickOpen && (
        <Modal title="Quick Script Paste" description="Turn plain dialogue into a timed storyboard. The first speaker is the contact; the second is the sender." onClose={() => setQuickOpen(false)}>
          <textarea
            className="script-input"
            value={script}
            onChange={(event) => setScript(event.target.value)}
            placeholder={'Riya: Are you home right now?\nArjun: Yes, on the roof. Why?\n[Scene: 1 minute later]\nRiya: Then who is outside your window?!\nArjun: [sting] That is not funny.'}
          />
          <div className="parser-hints"><span>Use “Name: Message” for dialogue.</span><span>Add “[Scene: ...]” for a divider and “[sting]” before a plot twist.</span></div>
          <div className="modal-actions">
            <button className="button ghost" onClick={() => setQuickOpen(false)}>Cancel</button>
            <button className="button primary" onClick={() => {
              if (!script.trim()) { toast('Paste a script first', { tone: 'error' }); return; }
              const parsed = parseQuickScript(script, story);
              if (!isPro && parsed.messages.length > 10) {
                setQuickOpen(false);
                onRequestPro('scripts longer than 10 messages');
                return;
              }
              onChange(parsed);
              setQuickOpen(false);
              setScript('');
              toast('Storyboard created', { detail: `${parsed.messages.length} timed story beats are ready.` });
            }}><WandSparkles size={17} />Build storyboard</button>
          </div>
        </Modal>
      )}

      {templatesOpen && (
        <Modal title="Viral story templates" description="Load a complete, editable script with one tap." onClose={() => setTemplatesOpen(false)} wide>
          <div className="template-grid">
            {STORY_TEMPLATES.map((template, index) => {
              const Icon = templateIcons[index];
              return (
                <button className="template-card" key={template.id} onClick={() => loadTemplate(template)}>
                  <span className="template-icon"><Icon size={20} strokeWidth={1.7} /></span>
                  <span className="template-category">{template.category}</span>
                  <strong>{template.name}</strong>
                  <span className="template-description">{template.description}</span>
                  <span className="template-meta">{template.messages.length} story beats<ChevronRight size={15} /></span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {newOpen && (
        <Modal title="Start a new story?" description="Your current timeline will be replaced. Exported videos remain in your Vault." onClose={() => setNewOpen(false)}>
          <div className="modal-actions">
            <button className="button ghost" onClick={() => setNewOpen(false)}>Keep editing</button>
            <button className="button danger-button" onClick={() => { onChange(createEmptyStory()); setNewOpen(false); toast('New story started'); }}><RefreshCw size={16} />Start new story</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
