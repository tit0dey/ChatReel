import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { LiveAudioEngine, renderStoryAudio, AUDIO_SAMPLE_RATE } from './audio';
import { seekBackgroundVideo, syncBackgroundPlayback } from './assets';
import { getOutputDimensions, sanitizeFileName } from './story';
import { renderFrame } from './renderer';
import type { AssetBundle, ExportProgress, Story, StoryTimeline } from '../types';

interface ExportRequest {
  story: Story;
  timeline: StoryTimeline;
  assets: AssetBundle;
  isPro: boolean;
  partLabel?: string;
  onProgress: (progress: ExportProgress) => void;
  signal?: AbortSignal;
}

interface EncodedAudioTrack {
  codec: 'aac' | 'opus';
  chunks: Array<{ chunk: EncodedAudioChunk; meta?: EncodedAudioChunkMetadata }>;
}

const abortError = () => new DOMException('Export cancelled.', 'AbortError');
const nextTask = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError();
}

async function waitForQueue(encoder: VideoEncoder | AudioEncoder) {
  if (encoder.encodeQueueSize <= 4) return;
  await new Promise<void>((resolve) => {
    const check = () => {
      if (encoder.encodeQueueSize <= 2 || encoder.state === 'closed') {
        encoder.removeEventListener('dequeue', check);
        window.clearTimeout(timeout);
        resolve();
      }
    };
    const timeout = window.setTimeout(() => {
      encoder.removeEventListener('dequeue', check);
      resolve();
    }, 4000);
    encoder.addEventListener('dequeue', check);
    check();
  });
}

async function encodeAudioTrack(buffer: AudioBuffer | null, onProgress: (progress: ExportProgress) => void): Promise<EncodedAudioTrack | null> {
  if (!buffer || typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined') return null;
  const candidates = [
    { codec: 'mp4a.40.2', sampleRate: AUDIO_SAMPLE_RATE, numberOfChannels: 2, bitrate: 128_000 },
    { codec: 'opus', sampleRate: AUDIO_SAMPLE_RATE, numberOfChannels: 2, bitrate: 128_000 },
  ];
  let config: AudioEncoderConfig | null = null;
  for (const candidate of candidates) {
    try {
      if ((await AudioEncoder.isConfigSupported(candidate)).supported) {
        config = candidate;
        break;
      }
    } catch {
      // Try the next offline-safe codec.
    }
  }
  if (!config) return null;

  const chunks: EncodedAudioTrack['chunks'] = [];
  let encoderError: Error | null = null;
  const encoder = new AudioEncoder({
    output: (chunk, meta) => chunks.push({ chunk, meta }),
    error: (error) => { encoderError = error; },
  });
  encoder.configure(config);
  const framesPerChunk = AUDIO_SAMPLE_RATE;
  const totalFrames = buffer.length;

  try {
    for (let start = 0; start < totalFrames; start += framesPerChunk) {
      const frames = Math.min(framesPerChunk, totalFrames - start);
      const data = new Float32Array(frames * 2);
      data.set(buffer.getChannelData(0).subarray(start, start + frames), 0);
      const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0);
      data.set(right.subarray(start, start + frames), frames);
      const audioData = new AudioData({
        format: 'f32-planar',
        sampleRate: buffer.sampleRate,
        numberOfFrames: frames,
        numberOfChannels: 2,
        timestamp: Math.round(start * 1_000_000 / buffer.sampleRate),
        data,
      });
      encoder.encode(audioData);
      audioData.close();
      if (encoderError) throw encoderError;
      onProgress({ phase: 'audio', progress: Math.min(1, (start + frames) / totalFrames), detail: `Encoding ${config.codec === 'opus' ? 'Opus' : 'AAC'} audio` });
      if (encoder.encodeQueueSize > 4) await waitForQueue(encoder);
    }
    await encoder.flush();
    if (encoderError) throw encoderError;
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }
  return { codec: config.codec === 'opus' ? 'opus' : 'aac', chunks };
}

async function chooseVideoConfig(width: number, height: number, fps: number): Promise<{ config: VideoEncoderConfig; muxCodec: 'avc' | 'vp9' } | null> {
  if (typeof VideoEncoder === 'undefined') return null;
  const codecs = ['avc1.4d0028', 'avc1.420028', 'avc1.640028', 'avc1.42001f', 'vp09.00.10.08'];
  if (fps === 60 && height >= 1080) codecs.splice(4, 0, 'avc1.64002a', 'avc1.4d002a');
  const pixels = width * height;
  const bitrate = Math.round((pixels / (1920 * 1080)) * (fps === 60 ? 14_000_000 : 9_000_000));
  for (const codec of codecs) {
    const config: VideoEncoderConfig = {
      codec,
      width,
      height,
      bitrate: Math.max(4_000_000, bitrate),
      framerate: fps,
      latencyMode: 'quality',
      hardwareAcceleration: 'prefer-hardware',
    };
    if (codec.startsWith('avc')) config.avc = { format: 'avc' };
    try {
      const support = await VideoEncoder.isConfigSupported(config);
      if (support.supported) return { config, muxCodec: codec.startsWith('vp09') ? 'vp9' : 'avc' };
    } catch {
      // Some WebViews reject a profile outright; probing continues safely.
    }
  }
  return null;
}

async function exportWithWebCodecs(request: ExportRequest): Promise<Blob> {
  const { story, timeline, assets, isPro, onProgress, signal, partLabel } = request;
  const { width, height } = getOutputDimensions(story.settings.aspect, story.settings.resolution);
  const videoChoice = await chooseVideoConfig(width, height, story.settings.fps);
  if (!videoChoice) throw new Error('Hardware video encoding is unavailable.');

  onProgress({ phase: 'audio', progress: 0, detail: 'Rendering the synchronized audio mix' });
  let audioBuffer = await renderStoryAudio(story, timeline);
  throwIfAborted(signal);
  const audioTrack = await encodeAudioTrack(audioBuffer, onProgress);
  audioBuffer = null;
  throwIfAborted(signal);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Canvas rendering is unavailable.');
  const frameCount = Math.ceil(timeline.duration * story.settings.fps);
  const target = new ArrayBufferTarget();

  // Audio is fully encoded before this instance exists, so codec and metadata
  // failures cannot surface for the first time during finalization.
  const muxer = new Muxer({
    target,
    video: { codec: videoChoice.muxCodec, width, height, frameRate: story.settings.fps },
    audio: audioTrack ? { codec: audioTrack.codec, sampleRate: AUDIO_SAMPLE_RATE, numberOfChannels: 2 } : undefined,
    fastStart: { expectedVideoChunks: frameCount, expectedAudioChunks: audioTrack?.chunks.length ?? 0 },
    firstTimestampBehavior: 'offset',
  });
  audioTrack?.chunks.forEach(({ chunk, meta }) => muxer.addAudioChunk(chunk, meta));
  if (audioTrack) audioTrack.chunks.length = 0;

  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => { encoderError = error; },
  });
  encoder.configure(videoChoice.config);

  try {
    for (let index = 0; index < frameCount; index++) {
      throwIfAborted(signal);
      const time = index / story.settings.fps;
      await seekBackgroundVideo(assets, time);
      renderFrame(context, { width, height, time, story, timeline, assets, isPro, partLabel });
      const frame = new VideoFrame(canvas, {
        timestamp: Math.round(index * 1_000_000 / story.settings.fps),
        duration: Math.round(1_000_000 / story.settings.fps),
      });
      encoder.encode(frame, { keyFrame: index % (story.settings.fps * 2) === 0 });
      frame.close();
      if (encoderError) throw encoderError;
      if (encoder.encodeQueueSize > 4) await waitForQueue(encoder);
      if (index % 4 === 0) await nextTask();
      onProgress({
        phase: 'video',
        progress: (index + 1) / frameCount,
        detail: `Rendering frame ${index + 1} of ${frameCount}`,
      });
    }
    onProgress({ phase: 'finalizing', progress: 1, detail: 'Finalizing the MP4 file' });
    await encoder.flush();
    if (encoderError) throw encoderError;
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }
  muxer.finalize();
  return new Blob([target.buffer], { type: 'video/mp4' });
}

function recorderMimeType(): string {
  const candidates = [
    'video/mp4;codecs="avc1.42001f,mp4a.40.2"',
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    'video/mp4',
    'video/webm;codecs="vp9,opus"',
    'video/webm',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

async function exportWithMediaRecorder(request: ExportRequest): Promise<Blob> {
  const { story, timeline, assets, isPro, onProgress, signal, partLabel } = request;
  if (typeof MediaRecorder === 'undefined') throw new Error('This browser does not provide a video recorder.');
  const { width, height } = getOutputDimensions(story.settings.aspect, story.settings.resolution);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Canvas rendering is unavailable.');
  const stream = canvas.captureStream(story.settings.fps);
  const audio = new LiveAudioEngine();
  audio.start(story, timeline, 0, true);
  audio.stream?.getAudioTracks().forEach((track) => stream.addTrack(track));
  syncBackgroundPlayback(assets, 0, true);

  const mimeType = recorderMimeType();
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: mimeType || undefined,
    videoBitsPerSecond: story.settings.resolution === '1080' ? 10_000_000 : 5_000_000,
    audioBitsPerSecond: 128_000,
  });
  let animationFrame = 0;
  let startedAt = 0;

  return new Promise<Blob>((resolve, reject) => {
    let cancelled = false;
    const stop = () => {
      if (recorder.state !== 'inactive') recorder.stop();
    };
    const onAbort = () => {
      cancelled = true;
      stop();
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => {
      cancelAnimationFrame(animationFrame);
      audio.stop();
      reject(new Error('The compatibility recorder stopped unexpectedly.'));
    };
    recorder.onstop = () => {
      cancelAnimationFrame(animationFrame);
      signal?.removeEventListener('abort', onAbort);
      audio.stop();
      syncBackgroundPlayback(assets, 0, false);
      stream.getTracks().forEach((track) => track.stop());
      if (cancelled) reject(abortError());
      else resolve(new Blob(chunks, { type: mimeType || 'video/webm' }));
    };

    const draw = (now: number) => {
      if (!startedAt) startedAt = now;
      const time = Math.min(timeline.duration, (now - startedAt) / 1000);
      renderFrame(context, { width, height, time, story, timeline, assets, isPro, partLabel });
      onProgress({ phase: 'video', progress: time / timeline.duration, detail: 'Recording with the compatibility encoder' });
      if (time >= timeline.duration) {
        onProgress({ phase: 'finalizing', progress: 1, detail: 'Finalizing the recording' });
        window.setTimeout(stop, 120);
      } else {
        animationFrame = requestAnimationFrame(draw);
      }
    };

    recorder.start(1000);
    animationFrame = requestAnimationFrame(draw);
  });
}

export async function exportStoryVideo(request: ExportRequest): Promise<Blob> {
  const hardwareAvailable = typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined' && typeof AudioEncoder !== 'undefined';
  if (hardwareAvailable) {
    try {
      return await exportWithWebCodecs(request);
    } catch (error) {
      if (request.signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error;
      console.warn('Hardware export failed; using compatibility recording.', error);
      request.onProgress({ phase: 'video', progress: 0, detail: 'Switching to the compatibility recorder' });
    }
  }
  return exportWithMediaRecorder(request);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    const slice = bytes.subarray(offset, Math.min(offset + 32_768, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export async function saveVideoBlob(blob: Blob, storyName: string): Promise<'native' | 'browser'> {
  const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
  const fileName = `${sanitizeFileName(storyName)}.${extension}`;
  const bridge = window.ChatReelAndroid;
  if (bridge) {
    if (!bridge.beginDownload(fileName)) throw new Error('Android could not create the download file.');
    try {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const chunkSize = 512 * 1024;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        if (!bridge.writeVideoChunk(toBase64(bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length))))) {
          throw new Error('Android could not write a video chunk.');
        }
        await nextTask();
      }
      if (!bridge.finishDownload()) throw new Error('Android could not finish the download.');
      return 'native';
    } catch (error) {
      bridge.cancelDownload();
      throw error;
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'browser';
}

export function exportEngineLabel(): string {
  return typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined' ? 'Hardware WebCodecs' : 'Compatibility recorder';
}
