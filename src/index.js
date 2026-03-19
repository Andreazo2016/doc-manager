'use strict';

const config = require('./config');
const { listFiles, downloadFile, moveToProcessed } = require('./googleDrive');
const { uploadDocument, getOrCreateTagId } = require('./paperless');
const { notifySuccess, notifyError } = require('./telegram');

/**
 * Processes a single file: download → upload to Paperless → delete from Drive → notify.
 */
async function processFile(file) {
    const { id, name, mimeType } = file;
    console.log(`[Worker] Processing: "${name}" (${mimeType})`);

    // 1. Download from Google Drive
    const { buffer, finalMimeType, finalName } = await downloadFile(id, mimeType, name);
    console.log(`[Worker] Downloaded "${finalName}" (${buffer.length} bytes)`);

    // 2. Upload to Paperless-NGX
    const taskId = await uploadDocument(buffer, finalName, finalMimeType);
    console.log(`[Worker] Uploaded to Paperless. Task ID: ${taskId}`);

    // 3. Move to processed folder in Google Drive
    await moveToProcessed(id);
    console.log(`[Worker] Moved "${finalName}" to the processed folder`);

    // 4. Telegram notification
    await notifySuccess(finalName, taskId);
    console.log(`[Worker] Telegram notification sent`);
}

/**
 * Main polling loop. Runs every POLL_INTERVAL_MS milliseconds.
 */
async function poll() {
    console.log(`[Poller] Checking Google Drive folder ${config.google.folderId}...`);

    let files;
    try {
        files = await listFiles();
    } catch (err) {
        console.error('[Poller] Failed to list files:', err.message);
        return;
    }

    if (files.length === 0) {
        console.log('[Poller] No new files found.');
        return;
    }

    console.log(`[Poller] Found ${files.length} file(s). Processing...`);

    for (const file of files) {
        try {
            await processFile(file);
        } catch (err) {
            console.error(`[Worker] Error processing "${file.name}":`, err.message);
            try {
                await notifyError(file.name, err);
            } catch (telegramErr) {
                console.error('[Telegram] Failed to send error notification:', telegramErr.message);
            }
        }
    }
}

async function main() {
    console.log('========================================');
    console.log('  Doc Manager — Google Drive Watcher');
    console.log('========================================');
    console.log(`  Drive Folder : ${config.google.folderId}`);
    console.log(`  Paperless    : ${config.paperless.url}`);
    console.log(`  Tag          : ${config.paperless.tagName}`);
    console.log(`  Poll every   : ${config.pollIntervalMs / 1000}s`);
    console.log('========================================\n');

    // Pre-warm: resolve Paperless tag on startup so errors are caught early
    try {
        await getOrCreateTagId();
    } catch (err) {
        console.error('[Startup] Could not connect to Paperless-NGX:', err.message);
        console.error('  Check PAPERLESS_URL and PAPERLESS_TOKEN in your .env file.');
        process.exit(1);
    }

    // Run immediately, then on interval
    await poll();
    setInterval(poll, config.pollIntervalMs);
}

main().catch((err) => {
    console.error('[Fatal]', err.message);
    process.exit(1);
});
