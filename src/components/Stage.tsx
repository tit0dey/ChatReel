import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { LiveAudioEngine } from '../lib/audio';
import { seekBackgroundVideo, syncBackgroundPlayback } from '../lib/assets';
import { renderFrame } from '../lib/renderer';
import { formatTime, getOutputDimensions } from '../lib/story';
import type { AssetBundle, Story, StoryTimeline } from '../types';

interface StageProps {
  story: Story;
  timeline: StoryTimeline;
  assets: AssetBundle;
  assetsLoading?: boolean;
  suspended?: boolean;
}

function previewDimensions(aspect: Story['settings']['aspect']) {
  if (aspect === '16:9') return { width: 960, height: 540 };
  if (aspect === '1:1') return { width: 720, height: 720 };
  return { width: 540, height: 960 };
}

export function Stage({ story, timeline, assets, assetsLoading = false, suspended = false }: StageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef(new LiveAudioEngine());
  const timeRef = useRef(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const dimensions = useMemo(() => previewDimensions(story.settings.aspect), [story.settings.aspect]);
  const output = getOutputDimensions(story.settings.aspect, story.settings.resolution);

  useEffect(() => {
    if (timeRef.current > timeline.duration) {
      timeRef.current = timeline.duration;
      setTime(timeline.duration);
    }
  }, [timeline.duration]);

  useEffect(() => {
    if (suspended) setPlaying(false);
  }, [suspended]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !context || playing || suspended) return;
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    let cancelled = false;
    const draw = () => {
      if (!cancelled) renderFrame(context, { ...dimensions, time, story, timeline, assets });
    };
    if (assets.backgroundVideo) void seekBackgroundVideo(assets, time).then(draw);
    else draw();
    return () => { cancelled = true; };
  }, [time, story, timeline, assets, dimensions, playing, suspended]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !context || !playing || suspended) {
      audioRef.current.stop();
      syncBackgroundPlayback(assets, timeRef.current, false);
      return;
    }
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const offset = timeRef.current >= timeline.duration ? 0 : timeRef.current;
    timeRef.current = offset;
    if (!muted) audioRef.current.start(story, timeline, offset);
    syncBackgroundPlayback(assets, offset, true);
    const anchor = performance.now() - offset * 1000;
    let animationFrame = 0;
    const draw = (now: number) => {
      const next = Math.min(timeline.duration, (now - anchor) / 1000);
      timeRef.current = next;
      renderFrame(context, { ...dimensions, time: next, story, timeline, assets });
      setTime(next);
      if (next >= timeline.duration) setPlaying(false);
      else animationFrame = requestAnimationFrame(draw);
    };
    animationFrame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animationFrame);
      audioRef.current.stop();
      syncBackgroundPlayback(assets, timeRef.current, false);
    };
  }, [playing, muted, story, timeline, assets, dimensions, suspended]);

  useEffect(() => () => audioRef.current.stop(), []);

  const togglePlayback = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (timeRef.current >= timeline.duration) {
      timeRef.current = 0;
      setTime(0);
    }
    setPlaying(true);
  };
  const seek = (value: number) => {
    setPlaying(false);
    timeRef.current = value;
    setTime(value);
  };

  return (
    <section className="stage-panel" aria-label="Live video preview">
      <header className="stage-header">
        <div className="stage-title"><span className={`live-dot ${playing ? 'playing' : ''}`} /><strong>Live stage</strong><span>Real-time canvas</span></div>
        <div className="stage-specs"><span>{output.width} × {output.height}</span><span>{story.settings.fps} fps</span></div>
      </header>

      <div className={`canvas-stage aspect-${story.settings.aspect.replace(':', '-')}`} ref={stageRef} tabIndex={0} onKeyDown={(event) => {
        if (event.code === 'Space' && event.target === event.currentTarget) {
          event.preventDefault();
          togglePlayback();
        }
      }}>
        <div className="canvas-aura" />
        <canvas ref={canvasRef} className="story-canvas" aria-label="Chat story video frame" />
        {assetsLoading && <div className="asset-loading"><span className="spinner" />Preparing media</div>}
        <button className="fullscreen-button" onClick={() => void stageRef.current?.requestFullscreen?.().catch(() => undefined)} aria-label="Fullscreen preview"><Maximize2 size={17} /></button>
      </div>

      <div className="transport">
        <div className="transport-row">
          <button className="icon-button transport-secondary" onClick={() => seek(0)} aria-label="Restart preview"><RotateCcw size={17} /></button>
          <button className="play-button" onClick={togglePlayback} aria-label={playing ? 'Pause preview' : 'Play preview'}>
            {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button className={`icon-button transport-secondary ${muted ? 'muted' : ''}`} onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Unmute preview' : 'Mute preview'}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <div className="time-readout"><strong>{formatTime(time, true)}</strong><span>/</span><span>{formatTime(timeline.duration, true)}</span></div>
        </div>
        <div className="timeline-scrubber">
          <input
            type="range"
            min="0"
            max={timeline.duration}
            step="0.01"
            value={Math.min(time, timeline.duration)}
            onPointerDown={() => setPlaying(false)}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="Story timeline"
            style={{ '--timeline-progress': `${timeline.duration ? time / timeline.duration * 100 : 0}%` } as React.CSSProperties}
          />
          <div className="timeline-markers" aria-hidden="true">
            {timeline.items.map((item) => <i key={item.message.id} style={{ left: `${item.appearAt / timeline.duration * 100}%` }} />)}
          </div>
        </div>
        <div className="transport-hint"><span>Space to play or pause</span><span>{story.messages.length} story beats</span></div>
      </div>
    </section>
  );
}
