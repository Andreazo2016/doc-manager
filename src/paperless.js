'use strict';

const axios = require('axios');
const FormData = require('form-data');
const config = require('./config');

let cachedTagId = null;

/**
 * Returns the axios headers for Paperless-NGX API requests.
 */
function getHeaders() {
    return {
        Authorization: `Token ${config.paperless.token}`,
    };
}

/**
 * Sanitizes a filename by replacing accented/special chars with ASCII equivalents.
 * Paperless-NGX can reject uploads with non-ASCII filenames in Content-Disposition.
 */
function sanitizeFilename(name) {
    return name
        .normalize('NFD')                         // decompose accented chars
        .replace(/[\u0300-\u036f]/g, '')          // strip combining diacritics
        .replace(/[^\w.\-\s]/g, '_')              // replace remaining specials with _
        .trim();
}

/**
 * Fetches the ID of the origin tag from Paperless-NGX.
 * Creates the tag if it doesn't exist.
 * @returns {number} Tag ID
 */
async function getOrCreateTagId() {
    if (cachedTagId !== null) return cachedTagId;

    const tagName = config.paperless.tagName;

    // Try to find the existing tag
    const response = await axios.get(`${config.paperless.url}/api/tags/`, {
        headers: getHeaders(),
        params: { name: tagName },
    });

    const results = response.data.results || [];
    const existingTag = results.find(
        (t) => t.name.toLowerCase() === tagName.toLowerCase()
    );

    if (existingTag) {
        cachedTagId = existingTag.id;
        console.log(`[Paperless] Using existing tag "${tagName}" (id=${cachedTagId})`);
        return cachedTagId;
    }

    // Create the tag if not found
    console.log(`[Paperless] Tag "${tagName}" not found — creating it...`);
    const createResponse = await axios.post(
        `${config.paperless.url}/api/tags/`,
        { name: tagName },
        { headers: getHeaders() }
    );

    cachedTagId = createResponse.data.id;
    console.log(`[Paperless] Tag created with id=${cachedTagId}`);
    return cachedTagId;
}

/**
 * Uploads a document to Paperless-NGX with the origin tag.
 * @param {Buffer} fileBuffer - File content
 * @param {string} fileName - Original file name (will be sanitized)
 * @param {string} mimeType - MIME type of the file
 * @returns {string} Task UUID returned by Paperless
 */
async function uploadDocument(fileBuffer, fileName, mimeType) {
    const tagId = await getOrCreateTagId();
    const safeFileName = sanitizeFilename(fileName);

    if (safeFileName !== fileName) {
        console.log(`[Paperless] Filename sanitized: "${fileName}" → "${safeFileName}"`);
    }

    const form = new FormData();
    form.append('document', fileBuffer, {
        filename: safeFileName,
        contentType: mimeType,
    });
    // Send tag as integer (Paperless-NGX expects numeric IDs)
    form.append('tags', tagId);

    try {
        const response = await axios.post(
            `${config.paperless.url}/api/documents/post_document/`,
            form,
            {
                headers: {
                    ...getHeaders(),
                    ...form.getHeaders(),
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            }
        );
        // Paperless returns a task UUID string
        return response.data;
    } catch (err) {
        // Enrich the error with the Paperless response body for easier debugging
        const body = err.response?.data;
        const detail = body ? ` | Paperless response: ${JSON.stringify(body)}` : '';
        throw new Error(`${err.message}${detail}`);
    }
}

module.exports = { getOrCreateTagId, uploadDocument };
