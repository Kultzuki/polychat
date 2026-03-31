/* ============================================
   PolyChat Utilities
   ============================================ */

/**
 * Lightweight markdown to HTML renderer.
 * Handles: bold, italic, inline code, code blocks, links, lists, headings, paragraphs.
 */
export function renderMarkdown(text) {
  if (!text) return '';

  let html = escapeHtml(text);

  // Code blocks (```lang\n...\n```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const language = lang || 'text';
    return `<pre><div class="code-header"><span>${language}</span><button class="copy-code-btn" onclick="window.polyChat.copyCode(this)" data-code="${encodeURIComponent(code.trim())}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</button></div><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Headings (### h3, ## h2, # h1)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Unordered lists
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs — wrap remaining lines
  html = html.replace(/^(?!<[a-z])((?!<\/?(pre|ul|ol|li|h[1-6]|blockquote)).+)$/gm, '<p>$1</p>');

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

/**
 * Escape HTML entities to prevent XSS.
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Auto-resize a textarea based on content.
 */
export function autoResize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, parseInt(getComputedStyle(document.documentElement).getPropertyValue('--input-max-height')) || 200) + 'px';
}

/**
 * Debounce function calls.
 */
export function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Format timestamp for messages.
 */
export function formatTime(date) {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

/**
 * Generate a unique ID.
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Copy text to clipboard with visual feedback.
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  }
}

/**
 * Show a toast notification.
 */
export function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '✕'}</span>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 300ms ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Get provider info from model name.
 */
export function getProviderInfo(modelId) {
  const id = (modelId || '').toLowerCase();
  if (id.includes('gpt') || id.includes('o1') || id.includes('o3') || id.includes('o4') || id.includes('dall-e') || id.includes('openai')) {
    return { name: 'OpenAI', icon: 'G', cssClass: 'provider-openai' };
  }
  if (id.includes('claude') || id.includes('anthropic')) {
    return { name: 'Anthropic', icon: 'A', cssClass: 'provider-anthropic' };
  }
  if (id.includes('gemini') || id.includes('google')) {
    return { name: 'Google', icon: 'G', cssClass: 'provider-google' };
  }
  if (id.includes('llama') || id.includes('meta')) {
    return { name: 'Meta', icon: 'M', cssClass: 'provider-meta' };
  }
  if (id.includes('mistral') || id.includes('mixtral') || id.includes('pixtral')) {
    return { name: 'Mistral', icon: 'M', cssClass: 'provider-mistral' };
  }
  if (id.includes('deepseek')) {
    return { name: 'DeepSeek', icon: 'D', cssClass: 'provider-deepseek' };
  }
  if (id.includes('grok') || id.includes('xai')) {
    return { name: 'xAI', icon: 'X', cssClass: 'provider-xai' };
  }
  return { name: 'Other', icon: '?', cssClass: 'provider-other' };
}

/**
 * Truncate model name for compact display.
 */
export function formatModelName(modelId) {
  if (!modelId) return 'Select model';
  // Remove provider prefix if present
  return modelId
    .replace(/^(openai\/|anthropic\/|google\/|meta\/|mistralai\/|deepseek\/|xai\/)/, '')
    .replace(/-latest$/, '');
}

/**
 * Scroll element to bottom smoothly.
 */
export function scrollToBottom(element, smooth = true) {
  if (!element) return;
  element.scrollTo({
    top: element.scrollHeight,
    behavior: smooth ? 'smooth' : 'instant'
  });
}
