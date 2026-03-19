'use strict';

require('dotenv').config();

function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

module.exports = {
    google: {
        keyFile: requireEnv('GOOGLE_SERVICE_ACCOUNT_KEY_FILE'),
        folderId: requireEnv('GDRIVE_FOLDER_ID'),
        processedFolderId: process.env.GDRIVE_PROCESSED_FOLDER_ID || null,
    },
    paperless: {
        url: requireEnv('PAPERLESS_URL').replace(/\/$/, ''),
        token: requireEnv('PAPERLESS_TOKEN'),
        tagName: process.env.PAPERLESS_TAG_NAME || 'google-drive',
    },
    telegram: {
        botToken: requireEnv('TELEGRAM_BOT_TOKEN'),
        chatId: requireEnv('TELEGRAM_CHAT_ID'),
    },
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '60000', 10),
};
