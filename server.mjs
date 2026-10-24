import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const app = express();
const port = Number(process.env.PORT || 5173);
const root = resolve(process.cwd(), 'dist');
const apkPath = resolve(process.cwd(), 'apk/ChatReel-Studio.apk');

app.disable('x-powered-by');
app.use(express.static(root, { index: false, maxAge: '1h' }));

const sendApk = (_req, res) => {
  if (!existsSync(apkPath)) {
    res.status(404).type('text/plain').send('The Android build is not available yet.');
    return;
  }
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="ChatReel-Studio.apk"');
  res.sendFile(apkPath);
};

app.get(['/apk', '/ChatReel-Studio.apk'], sendApk);
app.get(/.*/, (_req, res) => res.sendFile(resolve(root, 'index.html')));

app.listen(port, '0.0.0.0', () => {
  console.log(`ChatReel Studio is available on http://0.0.0.0:${port}`);
});
