export type ChatTheme = 'imessage' | 'whatsapp' | 'instagram' | 'discord' | 'messenger' | 'telegram';
export type ChatMode = 'light' | 'dark';
export type ViewportMode = 'floating' | 'fullscreen';
export type AspectRatio = '9:16' | '16:9' | '1:1';
export type Resolution = '720' | '1080';
export type FrameRate = 30 | 60;
export type SpeedPreset = 'fast' | 'natural' | 'suspense';
export type BackgroundKind = 'highway' | 'parkour' | 'rain' | 'aurora' | 'starlight' | 'custom';
export type AmbientKind = 'none' | 'lofi' | 'suspense' | 'rain';
export type MessageType = 'text' | 'image' | 'voice' | 'divider';
export type MessageSide = 'sender' | 'receiver';
export type ExportMode = 'single' | 'series';

export interface StoryMessage {
  id: string;
  type: MessageType;
  side: MessageSide;
  text: string;
  src?: string;
  duration?: number;
  sting?: boolean;
}

export interface StorySettings {
  contactName: string;
  senderName: string;
  contactAvatar?: string;
  senderAvatar?: string;
  contactAvatarColor: string;
  senderAvatarColor: string;
  theme: ChatTheme;
  chatMode: ChatMode;
  viewport: ViewportMode;
  background: BackgroundKind;
  customBackgroundSrc?: string;
  customBackgroundType?: 'image' | 'video';
  backgroundDim: number;
  backgroundBlur: number;
  aspect: AspectRatio;
  watermark: boolean;
  watermarkText: string;
  speed: SpeedPreset;
  ambient: AmbientKind;
  sound: boolean;
  voiceover: boolean;
  resolution: Resolution;
  fps: FrameRate;
  exportMode: ExportMode;
  partDuration: number;
}

export interface Story {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  settings: StorySettings;
  messages: StoryMessage[];
}

export interface TimelineItem {
  message: StoryMessage;
  index: number;
  start: number;
  appearAt: number;
  end: number;
  typingDuration: number;
  holdDuration: number;
}

export interface StoryTimeline {
  items: TimelineItem[];
  duration: number;
}

export interface OutputDimensions {
  width: number;
  height: number;
}

export interface AssetBundle {
  images: Map<string, HTMLImageElement>;
  backgroundImage?: HTMLImageElement;
  backgroundVideo?: HTMLVideoElement;
}

export interface RenderOptions {
  width: number;
  height: number;
  time: number;
  story: Story;
  timeline: StoryTimeline;
  assets: AssetBundle;
  partLabel?: string;
}

export interface VaultEntry {
  id: string;
  name: string;
  createdAt: number;
  duration: number;
  size: number;
  mimeType: string;
  blob: Blob;
}

export interface ExportProgress {
  phase: 'audio' | 'video' | 'finalizing' | 'complete';
  progress: number;
  detail: string;
}

export interface NativeDownloadBridge {
  beginDownload: (fileName: string) => boolean;
  writeVideoChunk: (base64Chunk: string) => boolean;
  finishDownload: () => boolean;
  cancelDownload: () => void;
}

declare global {
  interface Window {
    ChatReelAndroid?: NativeDownloadBridge;
  }
}
