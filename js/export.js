/* ============================================
   PolyChat Export & Token Estimator
   ============================================ */

import { showToast, formatModelName } from './utils.js';

/**
 * Export chat as Markdown.
 */
export function exportAsMarkdown(messages, model) {
  if (!messages.length) {
    showToast('No messages to export', 'error');
    return;
  }

  let md = `# PolyChat Export\n`;
  md += `**Model:** ${formatModelName(model)}\n`;
  md += `**Date:** ${new Date().toLocaleDateString()}\n`;
  md += `**Messages:** ${messages.length}\n\n---\n\n`;

  messages.forEach(msg => {
    const sender = msg.role === 'user' ? '**You**' : `**${formatModelName(msg.model || model)}**`;
    const time = new Date(msg.timestamp).toLocaleTimeString();
    md += `### ${sender} — ${time}\n\n`;
    md += `${msg.content}\n\n---\n\n`;
  });

  downloadFile(md, `polychat-export-${Date.now()}.md`, 'text/markdown');
  showToast('Exported as Markdown', 'success');
}

/**
 * Export chat as JSON.
 */
export function exportAsJSON(messages, model) {
  if (!messages.length) {
    showToast('No messages to export', 'error');
    return;
  }

  const data = {
    app: 'PolyChat',
    exportedAt: new Date().toISOString(),
    model: model,
    messageCount: messages.length,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
      model: m.model,
      timestamp: m.timestamp,
    })),
  };

  downloadFile(JSON.stringify(data, null, 2), `polychat-export-${Date.now()}.json`, 'application/json');
  showToast('Exported as JSON', 'success');
}

/**
 * Download a file to user's device.
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================================
   Token Estimator
   ============================================ */

/**
 * Estimate token count for text.
 * Uses a simple heuristic: ~4 characters per token for English.
 * This is a rough estimate — actual token counts vary by model/tokenizer.
 */
export function estimateTokens(text) {
  if (!text) return 0;
  // Rough: 1 token ≈ 4 chars for English, 1 token ≈ 1.5 chars for code
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks = text.match(codeBlockRegex) || [];
  const codeLength = codeBlocks.reduce((sum, block) => sum + block.length, 0);
  const textLength = text.length - codeLength;
  return Math.ceil(textLength / 4 + codeLength / 3);
}

/**
 * Estimate total tokens for a conversation.
 */
export function estimateConversationTokens(messages) {
  return messages.reduce((total, msg) => total + estimateTokens(msg.content), 0);
}

/**
 * Format token count for display.
 */
export function formatTokenCount(count) {
  if (count < 1000) return `~${count}`;
  return `~${(count / 1000).toFixed(1)}k`;
}
