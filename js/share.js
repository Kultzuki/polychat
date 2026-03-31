/* ============================================
   PolyChat Shareable Links
   ============================================ */

import { showToast } from './utils.js';

/**
 * Generate a shareable URL from chat messages.
 * Uses URL-encoded compressed data in the hash.
 */
export function generateShareableLink(messages, model) {
  if (!messages.length) {
    showToast('No messages to share', 'error');
    return null;
  }

  const data = {
    m: model,
    c: messages.map(msg => ({
      r: msg.role === 'user' ? 'u' : 'a',
      t: msg.content,
    })),
  };

  try {
    const json = JSON.stringify(data);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    const url = `${window.location.origin}${window.location.pathname}#share=${encoded}`;

    if (url.length > 8000) {
      showToast('Chat is too long to share via URL. Export instead.', 'error');
      return null;
    }

    return url;
  } catch (e) {
    showToast('Failed to generate link', 'error');
    return null;
  }
}

/**
 * Copy shareable link to clipboard.
 */
export async function copyShareableLink(messages, model) {
  const url = generateShareableLink(messages, model);
  if (!url) return;

  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard!', 'success');
  } catch {
    // Fallback
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('Link copied!', 'success');
  }
}

/**
 * Load a shared chat from URL hash.
 * Returns { model, messages } or null.
 */
export function loadSharedChat() {
  const hash = window.location.hash;
  if (!hash.startsWith('#share=')) return null;

  try {
    const encoded = hash.slice(7);
    const json = decodeURIComponent(escape(atob(encoded)));
    const data = JSON.parse(json);

    const messages = (data.c || []).map((msg, i) => ({
      id: `shared-${i}`,
      role: msg.r === 'u' ? 'user' : 'ai',
      content: msg.t,
      model: data.m,
      timestamp: new Date(),
    }));

    return {
      model: data.m,
      messages,
    };
  } catch (e) {
    console.warn('Failed to load shared chat:', e);
    return null;
  }
}
