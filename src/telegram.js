'use strict';

const axios = require('axios');
const config = require('./config');

/**
 * Sends a plain-text or Markdown message to the configured Telegram chat.
 * @param {string} text - Message text (supports Telegram MarkdownV2 if parseMode is set)
 * @param {string} [parseMode='Markdown'] - 'Markdown', 'MarkdownV2', or 'HTML'
 */
async function sendMessage(text, parseMode = 'Markdown') {
    const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;

    await axios.post(url, {
        chat_id: config.telegram.chatId,
        text,
        parse_mode: parseMode,
    });
}

/**
 * Sends a notification for a successfully processed file.
 * @param {string} fileName
 * @param {string} paperlessTaskId
 */
async function notifySuccess(fileName, paperlessTaskId) {
    const message =
        `✅ *Documento adicionado ao Paperless\\-NGX*\n\n` +
        `📄 *Arquivo:* \`${escapeMarkdown(fileName)}\`\n` +
        `🏷️ *Tag de origem:* \`${escapeMarkdown(config.paperless.tagName)}\`\n` +
        `🆔 *Task ID:* \`${paperlessTaskId}\`\n` +
        `🗑️ Arquivo removido do Google Drive\\.`;

    await sendMessage(message, 'MarkdownV2');
}

/**
 * Sends an error notification.
 * @param {string} fileName
 * @param {Error} error
 */
async function notifyError(fileName, error) {
    const message =
        `❌ *Erro ao processar arquivo*\n\n` +
        `📄 *Arquivo:* \`${escapeMarkdown(fileName)}\`\n` +
        `⚠️ *Erro:* \`${escapeMarkdown(error.message)}\``;

    await sendMessage(message, 'MarkdownV2');
}

/**
 * Escapes special characters for Telegram MarkdownV2.
 */
function escapeMarkdown(text) {
    return String(text).replace(/[_*[\]()~`>#+=|{}.!\-]/g, '\\$&');
}

module.exports = { sendMessage, notifySuccess, notifyError };
