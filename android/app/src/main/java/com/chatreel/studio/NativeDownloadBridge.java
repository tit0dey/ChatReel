package com.chatreel.studio;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

/**
 * Receives bounded file chunks from JavaScript. The bridge never receives the
 * whole movie in one Binder transaction, which keeps large exports reliable.
 */
public final class NativeDownloadBridge {
    private final Context context;
    private OutputStream outputStream;
    private Uri pendingUri;
    private File legacyFile;

    NativeDownloadBridge(Context context) {
        this.context = context.getApplicationContext();
    }

    @JavascriptInterface
    public synchronized boolean beginDownload(String requestedName) {
        cancelDownload();
        try {
            String fileName = sanitizeName(requestedName);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = context.getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                values.put(MediaStore.MediaColumns.MIME_TYPE, fileName.endsWith(".webm") ? "video/webm" : "video/mp4");
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/ChatReelStudio");
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                pendingUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (pendingUri == null) return false;
                outputStream = resolver.openOutputStream(pendingUri, "w");
            } else {
                File downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                File directory = new File(downloads, "ChatReelStudio");
                if (!directory.exists() && !directory.mkdirs()) return false;
                legacyFile = new File(directory, fileName);
                outputStream = new FileOutputStream(legacyFile, false);
            }
            return outputStream != null;
        } catch (Exception error) {
            cancelDownload();
            return false;
        }
    }

    @JavascriptInterface
    public synchronized boolean writeVideoChunk(String base64Chunk) {
        if (outputStream == null || base64Chunk == null) return false;
        try {
            byte[] bytes = Base64.decode(base64Chunk, Base64.DEFAULT);
            outputStream.write(bytes);
            return true;
        } catch (Exception error) {
            return false;
        }
    }

    @JavascriptInterface
    public synchronized boolean finishDownload() {
        if (outputStream == null) return false;
        try {
            outputStream.flush();
            closeStream();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && pendingUri != null) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                context.getContentResolver().update(pendingUri, values, null, null);
            }
            pendingUri = null;
            legacyFile = null;
            return true;
        } catch (Exception error) {
            cancelDownload();
            return false;
        }
    }

    @JavascriptInterface
    public synchronized void cancelDownload() {
        closeStream();
        try {
            if (pendingUri != null) context.getContentResolver().delete(pendingUri, null, null);
            if (legacyFile != null && legacyFile.exists()) legacyFile.delete();
        } catch (Exception ignored) {
            // A partially-created file is already closed; cleanup is best effort.
        }
        pendingUri = null;
        legacyFile = null;
    }

    private void closeStream() {
        if (outputStream == null) return;
        try {
            outputStream.close();
        } catch (IOException ignored) {
            // The caller still clears its reference so no stream can leak.
        }
        outputStream = null;
    }

    private static String sanitizeName(String value) {
        String clean = value == null ? "ChatReel-Story.mp4" : value.replaceAll("[^a-zA-Z0-9._-]", "-");
        clean = clean.replaceAll("-+", "-");
        if (clean.length() > 80) clean = clean.substring(clean.length() - 80);
        if (!clean.endsWith(".mp4") && !clean.endsWith(".webm")) clean += ".mp4";
        return clean;
    }
}
