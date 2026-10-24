import type { Story, StoryMessage, StoryTimeline } from '../types';

export const AUDIO_SAMPLE_RATE = 48000;
type AudioContextLike = AudioContext | OfflineAudioContext;
type SourceCollector = Set<AudioScheduledSourceNode>;

function noiseBuffer(context: BaseAudioContext, seconds = 2): AudioBuffer {
  const length = Math.ceil(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 918273;
  for (let i = 0; i < length; i++) {
    seed = (seed * 16807) % 2147483647;
    data[i] = (seed / 2147483647) * 2 - 1;
  }
  return buffer;
}

function track<T extends AudioScheduledSourceNode>(source: T, collector?: SourceCollector): T {
  collector?.add(source);
  return source;
}

function tone(context: AudioContextLike, destination: AudioNode, at: number, frequency: number, duration: number, volume: number, type: OscillatorType = 'sine', endFrequency?: number, collector?: SourceCollector) {
  if (duration <= 0) return;
  const oscillator = track(context.createOscillator(), collector);
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(1, frequency), at);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), at + duration);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), at + Math.min(0.018, duration * 0.15));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  oscillator.connect(gain).connect(destination);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.03);
}

function noiseHit(context: AudioContextLike, destination: AudioNode, noise: AudioBuffer, at: number, duration: number, volume: number, filterType: BiquadFilterType, startFrequency: number, endFrequency: number, collector?: SourceCollector) {
  if (duration <= 0) return;
  const source = track(context.createBufferSource(), collector);
  source.buffer = noise;
  const filter = context.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(Math.max(20, startFrequency), at);
  filter.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), at + duration);
  filter.Q.value = 0.8;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), at + Math.min(0.025, duration * 0.2));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  source.connect(filter).connect(gain).connect(destination);
  source.start(at, 0, duration + 0.02);
}

function sendWhoosh(context: AudioContextLike, destination: AudioNode, noise: AudioBuffer, at: number, collector?: SourceCollector) {
  noiseHit(context, destination, noise, at, 0.24, 0.12, 'bandpass', 550, 4200, collector);
  tone(context, destination, at, 260, 0.2, 0.035, 'sine', 680, collector);
}

function receivePop(context: AudioContextLike, destination: AudioNode, at: number, collector?: SourceCollector) {
  tone(context, destination, at, 660, 0.16, 0.09, 'sine', 880, collector);
  tone(context, destination, at + 0.045, 990, 0.18, 0.045, 'sine', 1180, collector);
}

function keyboardTap(context: AudioContextLike, destination: AudioNode, noise: AudioBuffer, at: number, collector?: SourceCollector) {
  noiseHit(context, destination, noise, at, 0.025, 0.017, 'highpass', 1800, 3600, collector);
  tone(context, destination, at, 920, 0.025, 0.009, 'triangle', 580, collector);
}

function dividerTick(context: AudioContextLike, destination: AudioNode, at: number, collector?: SourceCollector) {
  tone(context, destination, at, 440, 0.16, 0.035, 'sine', 520, collector);
  tone(context, destination, at + 0.08, 660, 0.2, 0.026, 'sine', 720, collector);
}

function suspenseSting(context: AudioContextLike, destination: AudioNode, noise: AudioBuffer, at: number, collector?: SourceCollector) {
  tone(context, destination, at, 108, 1.15, 0.2, 'sine', 34, collector);
  tone(context, destination, at, 55, 1.25, 0.12, 'triangle', 30, collector);
  noiseHit(context, destination, noise, at, 0.75, 0.075, 'lowpass', 2400, 120, collector);
  tone(context, destination, at + 0.025, 880, 0.28, 0.045, 'sine', 660, collector);
}

function scheduleAmbient(context: AudioContextLike, destination: AudioNode, story: Story, start: number, duration: number, collector?: SourceCollector) {
  const kind = story.settings.ambient;
  if (kind === 'none' || duration <= 0) return;
  const ambientGain = context.createGain();
  ambientGain.gain.setValueAtTime(0.0001, start);
  ambientGain.gain.exponentialRampToValueAtTime(0.65, start + Math.min(0.8, duration * 0.1));
  ambientGain.gain.setValueAtTime(0.65, start + Math.max(0.8, duration - 0.8));
  ambientGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  ambientGain.connect(destination);

  if (kind === 'rain') {
    const noise = noiseBuffer(context, 3);
    const source = track(context.createBufferSource(), collector);
    source.buffer = noise;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3800;
    const gain = context.createGain();
    gain.gain.value = 0.065;
    source.connect(filter).connect(gain).connect(ambientGain);
    source.start(start);
    source.stop(start + duration);
    tone(context, ambientGain, start, 72, duration, 0.013, 'sine', 68, collector);
    return;
  }

  if (kind === 'suspense') {
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.connect(ambientGain);
    [43.65, 65.41, 87.31].forEach((frequency, index) => {
      const oscillator = track(context.createOscillator(), collector);
      oscillator.type = index === 1 ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index * 4 - 4;
      const gain = context.createGain();
      gain.gain.value = index === 0 ? 0.055 : 0.025;
      oscillator.connect(gain).connect(filter);
      oscillator.start(start);
      oscillator.stop(start + duration);
    });
    const lfo = track(context.createOscillator(), collector);
    const lfoGain = context.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start(start);
    lfo.stop(start + duration);
    return;
  }

  const chords = [
    [130.81, 164.81, 196, 246.94],
    [110, 130.81, 164.81, 196],
    [146.83, 174.61, 220, 261.63],
    [98, 123.47, 146.83, 196],
  ];
  const chordLength = 4;
  for (let at = 0; at < duration; at += chordLength) {
    const chord = chords[Math.floor(at / chordLength) % chords.length];
    const length = Math.min(chordLength + 0.35, duration - at);
    chord.forEach((frequency, index) => {
      tone(context, ambientGain, start + at, frequency, length, index === 0 ? 0.028 : 0.018, index % 2 ? 'triangle' : 'sine', frequency * 0.998, collector);
    });
    tone(context, ambientGain, start + at, chord[0] * 2, 0.42, 0.012, 'sine', chord[0] * 1.99, collector);
  }
}

function scheduleStory(context: AudioContextLike, destination: AudioNode, story: Story, timeline: StoryTimeline, offset: number, collector?: SourceCollector) {
  const noise = noiseBuffer(context);
  const scheduleAt = (time: number) => context.currentTime + time - offset;
  const remaining = timeline.duration - offset;

  if (story.settings.sound) {
    for (const entry of timeline.items) {
      const { message } = entry;
      for (let tap = entry.start + 0.08; tap < entry.appearAt - 0.04; tap += 0.19 + ((entry.index + Math.round(tap * 10)) % 3) * 0.035) {
        if (tap >= offset) keyboardTap(context, destination, noise, scheduleAt(tap), collector);
      }
      if (entry.appearAt < offset) continue;
      const at = scheduleAt(entry.appearAt);
      if (message.type === 'divider') dividerTick(context, destination, at, collector);
      else if (message.side === 'sender') sendWhoosh(context, destination, noise, at, collector);
      else receivePop(context, destination, at, collector);
      if (message.sting) suspenseSting(context, destination, noise, at, collector);
    }
  }
  scheduleAmbient(context, destination, story, context.currentTime, Math.max(0, remaining), collector);
}

function languageForText(text: string): string {
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/[áéíóúñ¿¡]/i.test(text)) return 'es';
  return 'en';
}

function speak(message: StoryMessage, story: Story) {
  if (!('speechSynthesis' in window) || !message.text.trim() || message.type === 'divider') return;
  try {
    const utterance = new SpeechSynthesisUtterance(message.text);
    const language = languageForText(message.text);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith(language)) ?? null;
    utterance.lang = utterance.voice?.lang ?? language;
    utterance.pitch = message.side === 'sender' ? 0.86 : 1.12;
    utterance.rate = story.settings.speed === 'fast' ? 1.12 : story.settings.speed === 'suspense' ? 0.86 : 0.98;
    utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Device voices are optional and never block visual or audio rendering.
  }
}

export async function renderStoryAudio(story: Story, timeline: StoryTimeline): Promise<AudioBuffer | null> {
  if (typeof OfflineAudioContext === 'undefined') return null;
  const length = Math.ceil(timeline.duration * AUDIO_SAMPLE_RATE);
  const context = new OfflineAudioContext(2, length, AUDIO_SAMPLE_RATE);
  const master = context.createGain();
  master.gain.value = 0.82;
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.knee.value = 16;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.18;
  master.connect(compressor).connect(context.destination);
  scheduleStory(context, master, story, timeline, 0);
  return context.startRendering();
}

export class LiveAudioEngine {
  private context: AudioContext | null = null;
  private sources: SourceCollector = new Set();
  private timers: number[] = [];
  private recordingDestination: MediaStreamAudioDestinationNode | null = null;

  get stream(): MediaStream | null {
    return this.recordingDestination?.stream ?? null;
  }

  start(story: Story, timeline: StoryTimeline, offset: number, recording = false) {
    this.stop();
    if (typeof AudioContext === 'undefined') return;
    const context = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
    this.context = context;
    void context.resume().catch(() => undefined);
    const master = context.createGain();
    master.gain.value = 0.82;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.ratio.value = 5;
    master.connect(compressor);
    compressor.connect(context.destination);
    if (recording) {
      this.recordingDestination = context.createMediaStreamDestination();
      compressor.connect(this.recordingDestination);
    }
    scheduleStory(context, master, story, timeline, offset, this.sources);

    if (story.settings.voiceover && !recording) {
      timeline.items.forEach((entry) => {
        if (entry.appearAt < offset || entry.message.type === 'divider') return;
        const timer = window.setTimeout(() => speak(entry.message, story), Math.max(0, (entry.appearAt - offset) * 1000));
        this.timers.push(timer);
      });
    }
  }

  stop() {
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers = [];
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.sources.forEach((source) => {
      try { source.stop(); } catch { /* Already stopped. */ }
      source.disconnect();
    });
    this.sources.clear();
    if (this.context) void this.context.close().catch(() => undefined);
    this.context = null;
    this.recordingDestination = null;
  }
}
