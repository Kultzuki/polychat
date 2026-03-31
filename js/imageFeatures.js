/* ============================================
   PolyChat Image Features (Upload + Generate)
   ============================================ */

import { generateId, showToast, renderMarkdown, getProviderInfo, formatModelName, formatTime, scrollToBottom } from './utils.js';

/**
 * Initialize image features.
 */
export function initImageFeatures() {
  // Image upload button
  const uploadBtn = document.getElementById('image-upload-btn');
  const fileInput = document.getElementById('image-file-input');

  uploadBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', handleImageUpload);

  // Image generation tab
  const genTab = document.getElementById('tab-generate');
  genTab?.addEventListener('click', () => switchTab('generate'));

  const chatTab = document.getElementById('tab-chat');
  chatTab?.addEventListener('click', () => switchTab('chat'));

  const compareTab = document.getElementById('tab-compare');
  compareTab?.addEventListener('click', () => switchTab('compare'));
}

// ── State ──
let pendingImage = null;

/**
 * Handle image file selection.
 */
function handleImageUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select an image file', 'error');
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    showToast('Image must be under 20MB', 'error');
    return;
  }

  pendingImage = file;
  showImagePreview(file);
  showToast('Image attached! Ask a question about it.', 'success');

  // Reset file input
  e.target.value = '';
}

/**
 * Show image preview in the input area.
 */
function showImagePreview(file) {
  const previewArea = document.getElementById('image-preview-area');
  if (!previewArea) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    previewArea.innerHTML = `
      <div class="image-preview">
        <img src="${e.target.result}" alt="Attached image" class="image-preview__img">
        <button class="image-preview__remove" onclick="window.polyChat.removeImage()" aria-label="Remove image">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;
    previewArea.style.display = 'block';
  };
  reader.readAsDataURL(file);

  // Global remove handler
  window.polyChat = window.polyChat || {};
  window.polyChat.removeImage = () => {
    pendingImage = null;
    previewArea.innerHTML = '';
    previewArea.style.display = 'none';
  };
}

/**
 * Get and clear the pending image.
 */
export function consumePendingImage() {
  const img = pendingImage;
  pendingImage = null;

  const previewArea = document.getElementById('image-preview-area');
  if (previewArea) {
    previewArea.innerHTML = '';
    previewArea.style.display = 'none';
  }

  return img;
}

/**
 * Check if there's a pending image.
 */
export function hasPendingImage() {
  return pendingImage !== null;
}

/**
 * Generate an image using puter.ai.txt2img.
 */
export async function generateImage(prompt, container) {
  if (!prompt) return;

  const msgId = generateId();

  // Add generating indicator
  const genDiv = document.createElement('div');
  genDiv.className = 'message message--ai message-enter-ai';
  genDiv.id = `msg-${msgId}`;
  genDiv.innerHTML = `
    <div class="message__avatar provider-other">🎨</div>
    <div class="message__content">
      <div class="message__header">
        <span class="message__sender">Image Generator</span>
        <span class="message__model">DALL·E</span>
      </div>
      <div class="message__bubble" id="bubble-${msgId}">
        <div class="image-generating">
          <div class="spinner"></div>
          <span>Generating image...</span>
        </div>
      </div>
    </div>
  `;
  container.appendChild(genDiv);
  scrollToBottom(container.closest('.chat-container'));

  try {
    if (typeof puter === 'undefined' || !puter.ai) {
      throw new Error('Puter.js not loaded');
    }

    const result = await puter.ai.txt2img(prompt);

    const bubbleEl = document.getElementById(`bubble-${msgId}`);
    if (bubbleEl && result) {
      // result is an image blob or data URL
      let imgSrc;
      if (result instanceof Blob) {
        imgSrc = URL.createObjectURL(result);
      } else if (typeof result === 'string') {
        imgSrc = result;
      } else if (result.src || result.url) {
        imgSrc = result.src || result.url;
      } else {
        imgSrc = URL.createObjectURL(new Blob([result]));
      }

      bubbleEl.innerHTML = `
        <div class="generated-image">
          <img src="${imgSrc}" alt="${prompt}" class="generated-image__img" loading="lazy">
          <div class="generated-image__prompt">${prompt}</div>
          <div class="generated-image__actions">
            <button class="btn btn--ghost btn--sm" onclick="window.polyChat.downloadImage('${imgSrc}', 'polychat-image-${Date.now()}.png')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </button>
          </div>
        </div>
      `;
    }
  } catch (err) {
    const bubbleEl = document.getElementById(`bubble-${msgId}`);
    if (bubbleEl) {
      bubbleEl.innerHTML = `<p style="color: #ef4444;">⚠️ Image generation failed: ${err.message}</p>`;
    }
  }

  scrollToBottom(container.closest('.chat-container'));
}

/**
 * Download generated image.
 */
window.polyChat = window.polyChat || {};
window.polyChat.downloadImage = async (src, filename) => {
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Image downloaded', 'success');
  } catch {
    showToast('Download failed', 'error');
  }
};

/* ── Tab Switching ── */
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');

  // Show/hide relevant UI
  const chatContainer = document.getElementById('chat-container');
  const compareContainer = document.getElementById('compare-container');
  const generateContainer = document.getElementById('generate-container');

  if (chatContainer) chatContainer.style.display = tab === 'chat' ? '' : 'none';
  if (compareContainer) compareContainer.style.display = tab === 'compare' ? '' : 'none';
  if (generateContainer) generateContainer.style.display = tab === 'generate' ? '' : 'none';

  window.dispatchEvent(new CustomEvent('tab-changed', { detail: { tab } }));
}

export function getCurrentTab() {
  const activeTab = document.querySelector('.tab-btn.active');
  return activeTab?.id?.replace('tab-', '') || 'chat';
}
