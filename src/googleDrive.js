'use strict';

const { google } = require('googleapis');
const config = require('./config');

let driveClient = null;

/**
 * Initializes and returns an authenticated Google Drive client.
 */
async function getDriveClient() {
    if (driveClient) return driveClient;

    const auth = new google.auth.GoogleAuth({
        keyFile: config.google.keyFile,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const authClient = await auth.getClient();
    driveClient = google.drive({ version: 'v3', auth: authClient });
    return driveClient;
}

/**
 * Lists all non-trashed files in the watched Drive folder.
 * @returns {Array<{id: string, name: string, mimeType: string}>}
 */
async function listFiles() {
    const drive = await getDriveClient();

    const response = await drive.files.list({
        q: `'${config.google.folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType)',
        pageSize: 100,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });

    return response.data.files || [];
}

/**
 * Downloads a file by ID and returns its content as a Buffer.
 * Handles both regular files and Google Workspace documents (exports as PDF).
 * @param {string} fileId
 * @param {string} mimeType
 * @returns {{ buffer: Buffer, finalMimeType: string, finalName: string }}
 */
async function downloadFile(fileId, mimeType, fileName) {
    const drive = await getDriveClient();

    const googleWorkspaceMimeTypes = {
        'application/vnd.google-apps.document': 'application/pdf',
        'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.google-apps.presentation': 'application/pdf',
    };

    const exportMime = googleWorkspaceMimeTypes[mimeType];

    let response;
    let finalMimeType;
    let finalName = fileName;

    if (exportMime) {
        // Export Google Workspace files
        response = await drive.files.export(
            { fileId, mimeType: exportMime, supportsAllDrives: true },
            { responseType: 'arraybuffer' }
        );
        finalMimeType = exportMime;
        if (exportMime === 'application/pdf' && !finalName.endsWith('.pdf')) {
            finalName += '.pdf';
        }
    } else {
        // Download regular files
        response = await drive.files.get(
            { fileId, alt: 'media', supportsAllDrives: true },
            { responseType: 'arraybuffer' }
        );
        finalMimeType = mimeType;
    }

    return {
        buffer: Buffer.from(response.data),
        finalMimeType,
        finalName,
    };
}

/**
 * Moves a file from the watched folder to the processed folder (or Drive root if not configured).
 * Uses addParents + removeParents so Editor access is sufficient — no file ownership needed.
 * @param {string} fileId
 */
async function moveToProcessed(fileId) {
    const drive = await getDriveClient();

    const params = {
        fileId,
        removeParents: config.google.folderId,
        supportsAllDrives: true,
        fields: 'id, parents',
    };

    if (config.google.processedFolderId) {
        params.addParents = config.google.processedFolderId;
    }

    await drive.files.update(params);
}

module.exports = { listFiles, downloadFile, moveToProcessed };
