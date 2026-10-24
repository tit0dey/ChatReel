# ChatReel Studio

ChatReel Studio v1.0.0 is a local-first chat story video studio for Shorts, Reels, TikTok, and landscape or square video. It renders realistic animated conversations on Canvas2D, synthesizes synchronized sound with WebAudio, and encodes video directly on the device.

## Highlights

- Six canvas-rendered chat systems: iMessage, WhatsApp, Instagram DM, Discord, Messenger, and Telegram Glass.
- Light and dark chat variants, floating chat card or full-screen phone viewport, status bar, receipts, typing status, spring message motion, and eased auto-scrolling.
- Text in any Unicode script, device photo attachments, animated voice-note bubbles, and scene dividers.
- Five procedural motion backgrounds plus custom image or video backgrounds with dim and blur controls.
- Procedural send, receive, keyboard, suspense, and ambient audio without external audio files.
- 720p and 1080p output at 30 fps, plus 1080p at 60 fps.
- Hardware WebCodecs MP4 export with pre-encoded AAC or Opus audio and a MediaRecorder compatibility path.
- Single-video and automatic multi-part series exports.
- Local IndexedDB export Vault and local project persistence.
- Secure Android WebView shell with native media pickers and chunked Downloads/ChatReelStudio saving.

No API keys, remote media services, accounts, or server-side rendering are required.

## Web development

Requirements: Node.js 22 or newer.

```bash
npm ci
npm run dev
```

The Vite development server listens on `0.0.0.0:5173`.

## Verification and production build

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

The Express production server listens on `0.0.0.0:5173`. It serves the Android package at both `/apk` and `/ChatReel-Studio.apk` without placing the APK in `public/` or embedding it in the web bundle.

## Quick Script format

```text
Riya: Are you home right now?
Arjun: Yes, on the roof. Why?
[Scene: 1 minute later]
Riya: Then who is outside your window?!
Arjun: [sting] That is not funny.
```

The first speaker becomes the left-side contact and the second speaker becomes the right-side sender. Additional speakers remain on the receiver side. Scene directions become dividers. A leading `[sting]` enables the suspense sound and visual accent for that message.

## Android project

The native project is in `android/`. It uses `WebViewAssetLoader` with the secure origin `https://appassets.androidplatform.net`, hardware WebCodecs-capable WebView settings, native file chooser intents, and a 512 KB chunked JavaScript download bridge.

To assemble locally with Android SDK 35 and JDK 17:

```bash
npm ci
npm run build
node scripts/sync-android-assets.mjs
cd android
./gradlew :app:assembleRelease
```

A local release signing identity can be placed at `android/chatreel-upload.p12`. The file is intentionally ignored by Git. Set `CHATREEL_KEYSTORE_PASSWORD`, `CHATREEL_KEY_ALIAS`, and `CHATREEL_KEY_PASSWORD` in the environment when using it.

The Android workflow builds the current web bundle, inserts it into the native asset container, assembles the release APK, checks 4-byte zip alignment, verifies APK Signature Scheme V2 and V3, and uploads `ChatReel-Studio.apk` as a build artifact. For repeatable update signatures, provide `CHATREEL_KEYSTORE_BASE64`, `CHATREEL_KEYSTORE_PASSWORD`, `CHATREEL_KEY_ALIAS`, and `CHATREEL_KEY_PASSWORD` as repository Actions secrets. If no stored identity is available, the workflow generates a fresh PKCS12 identity for that artifact so the release is still cryptographically signed.

## GitHub Pages

`.github/workflows/deploy.yml` verifies and builds the app on every push to `main`, then publishes `dist/` through GitHub Pages. Enable GitHub Pages with the “GitHub Actions” source in repository settings if it is not already enabled.

## Export implementation notes

- Audio is rendered offline before the MP4 muxer is created. AAC (`mp4a.40.2`) is probed first, with 48 kHz Opus as a fallback.
- H.264 Level 4.0 profiles are probed before alternate profiles and VP9. A higher Level 4.2 profile is also available for 1080p60 hardware that requires it.
- `VideoFrame` and `AudioData` objects close immediately after encoding. Encoder queues are bounded and rendering yields regularly to the UI thread.
- Canvas rounded rectangles and Unicode grapheme segmentation include compatibility fallbacks for older WebViews.
- Device speech supplies dual-character live voice preview when available. It is never awaited during export, so offline devices continue with the fully synthesized soundtrack.
- If WebCodecs is unavailable, the app uses real-time MediaRecorder capture. Browsers without MP4 recording support produce their native compatibility format and name the file accordingly.

## Repository layout

```text
src/components/       Studio panels, player, dialogs, and notifications
src/lib/              Timeline, Canvas renderer, WebAudio, exporters, and Vault
android/              Native Android WebView application
scripts/              Icon generation and Android asset synchronization
.github/workflows/    GitHub Pages and signed Android builds
apk/                  Signed distributable Android package
```
