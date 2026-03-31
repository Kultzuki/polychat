/* ============================================
   PolyChat Chat Engine (with Streaming)
   ============================================ */

import { getActiveModel } from './models.js';
import { getActiveTask } from './tasks.js';
import { renderMarkdown, formatTime, generateId, scrollToBottom, copyToClipboard, showToast, getProviderInfo, formatModelName, autoResize } from './utils.js';

// ── State ──
let messages = [];
let isStreaming = false;
let currentAbortController = null;

// ── DOM References ──
let chatContainer, chatMessages, chatInput, sendBtn, stopBtn, welcomeEl;

/**
 * Initialize the chat engine.
 */
export function initChat() {
  chatContainer = document.getElementById('chat-container');
  chatMessages = document.getElementById('chat-messages');
  chatInput = document.getElementById('chat-input');
  sendBtn = document.getElementById('send-btn');
  stopBtn = document.getElementById('stop-btn');
  welcomeEl = document.getElementById('welcome');

  // Send on button click
  sendBtn?.addEventListener('click', handleSend);

  // Stop generation
  stopBtn?.addEventListener('click', stopGeneration);

  // Send on Enter (Shift+Enter for newline)
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Auto-resize textarea
  chatInput?.addEventListener('input', () => {
    autoResize(chatInput);
    updateSendButton();
  });

  // Initialize send button state
  updateSendButton();

  // Expose copy function globally for code blocks
  window.polyChat = window.polyChat || {};
  window.polyChat.copyCode = async (btn) => {
    const code = decodeURIComponent(btn.dataset.code);
    await copyToClipboard(code);
    const originalText = btn.innerHTML;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> Copied!`;
    setTimeout(() => { btn.innerHTML = originalText; }, 2000);
  };
}

/**
 * Handle send message.
 */
async function handleSend() {
  const text = chatInput?.value?.trim();
  if (!text || isStreaming) return;

  const model = getActiveModel();
  const task = getActiveTask();

  // Add user message
  addMessage('user', text);

  // Clear input
  chatInput.value = '';
  autoResize(chatInput);
  updateSendButton();

  // Hide welcome screen
  if (welcomeEl) {
    welcomeEl.style.display = 'none';
  }

  // Send to AI
  await sendToAI(text, model);
}

/**
 * Add a message to the chat.
 */
function addMessage(role, content, model = null) {
  const msg = {
    id: generateId(),
    role,
    content,
    model: model || getActiveModel(),
    timestamp: new Date(),
  };
  messages.push(msg);
  renderMessage(msg);
  scrollToBottom(chatContainer);
  return msg;
}

/**
 * Render a single message to the DOM.
 */
function renderMessage(msg) {
  if (!chatMessages) return;

  const div = document.createElement('div');
  div.className = `message message--${msg.role} ${msg.role === 'user' ? 'message-enter-user' : 'message-enter-ai'}`;
  div.id = `msg-${msg.id}`;

  const provider = getProviderInfo(msg.model);
  const avatarContent = msg.role === 'user' ? 'U' : provider.icon;
  const avatarClass = msg.role === 'ai' ? provider.cssClass : '';

  div.innerHTML = `
    <div class="message__avatar ${avatarClass}" style="${msg.role === 'ai' ? '' : ''}">
      ${avatarContent}
    </div>
    <div class="message__content">
      <div class="message__header">
        <span class="message__sender">${msg.role === 'user' ? 'You' : formatModelName(msg.model)}</span>
        ${msg.role === 'ai' ? `<span class="message__model">${provider.name}</span>` : ''}
        <span class="message__time">${formatTime(msg.timestamp)}</span>
      </div>
      <div class="message__bubble" id="bubble-${msg.id}">
        ${msg.role === 'user' ? escapeForBubble(msg.content) : renderMarkdown(msg.content)}
      </div>
      <div class="message__actions">
        <button class="message__action-btn tooltip" data-tooltip="Copy" onclick="window.polyChat.copyMessage('${msg.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>
    </div>
  `;

  chatMessages.appendChild(div);

  // Copy message handler
  window.polyChat.copyMessage = async (msgId) => {
    const m = messages.find(x => x.id === msgId);
    if (m) {
      await copyToClipboard(m.content);
      showToast('Copied to clipboard', 'success');
    }
  };
}

/**
 * Escape text for user message bubble (preserve whitespace).
 */
function escapeForBubble(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

/**
 * Send message to AI via Puter.js with streaming.
 */
async function sendToAI(userMessage, model) {
  isStreaming = true;
  updateStreamingUI(true);

  // Prepare conversation history for context
  const conversationHistory = messages
    .filter(m => m.role === 'user' || m.role === 'ai')
    .map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content
    }));

  // Create AI message placeholder
  const aiMsg = {
    id: generateId(),
    role: 'ai',
    content: '',
    model: model,
    timestamp: new Date(),
  };
  messages.push(aiMsg);

  // Render typing indicator first
  renderTypingMessage(aiMsg);
  scrollToBottom(chatContainer);

  try {
    if (typeof puter === 'undefined' || !puter.ai) {
      throw new Error('Puter.js not loaded. Please refresh the page.');
    }

    const response = await puter.ai.chat(conversationHistory, {
      model: model,
      stream: true,
    });

    // Remove typing indicator, show actual bubble
    replaceTypingWithBubble(aiMsg);

    const bubbleEl = document.getElementById(`bubble-${aiMsg.id}`);
    let fullText = '';

    for await (const part of response) {
      if (!isStreaming) break; // User stopped

      const chunk = part?.text || '';
      fullText += chunk;
      aiMsg.content = fullText;

      // Update bubble with rendered markdown
      if (bubbleEl) {
        bubbleEl.innerHTML = renderMarkdown(fullText);
      }
      scrollToBottom(chatContainer, false);
    }

    // Final render with complete markdown
    if (bubbleEl) {
      bubbleEl.innerHTML = renderMarkdown(fullText);
    }

  } catch (error) {
    console.error('AI Error:', error);
    aiMsg.content = `⚠️ Error: ${error.message || 'Something went wrong. Please try again.'}`;
    replaceTypingWithBubble(aiMsg);
    const bubbleEl = document.getElementById(`bubble-${aiMsg.id}`);
    if (bubbleEl) {
      bubbleEl.innerHTML = `<p style="color: #ef4444;">${aiMsg.content}</p>`;
    }
  } finally {
    isStreaming = false;
    updateStreamingUI(false);
    scrollToBottom(chatContainer);
  }
}

/**
 * Render typing indicator message.
 */
function renderTypingMessage(msg) {
  if (!chatMessages) return;

  const provider = getProviderInfo(msg.model);
  const div = document.createElement('div');
  div.className = 'message message--ai message--typing message-enter-ai';
  div.id = `msg-${msg.id}`;

  div.innerHTML = `
    <div class="message__avatar ${provider.cssClass}">
      ${provider.icon}
    </div>
    <div class="message__content">
      <div class="message__header">
        <span class="message__sender">${formatModelName(msg.model)}</span>
        <span class="message__model">${provider.name}</span>
      </div>
      <div class="message__bubble" id="bubble-${msg.id}">
        <div class="typing-indicator">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>
    </div>
  `;

  chatMessages.appendChild(div);
}

/**
 * Replace typing indicator with actual message bubble.
 */
function replaceTypingWithBubble(msg) {
  const msgEl = document.getElementById(`msg-${msg.id}`);
  if (!msgEl) return;

  msgEl.classList.remove('message--typing');

  const provider = getProviderInfo(msg.model);

  msgEl.innerHTML = `
    <div class="message__avatar ${provider.cssClass}">
      ${provider.icon}
    </div>
    <div class="message__content">
      <div class="message__header">
        <span class="message__sender">${formatModelName(msg.model)}</span>
        <span class="message__model">${provider.name}</span>
        <span class="message__time">${formatTime(msg.timestamp)}</span>
      </div>
      <div class="message__bubble" id="bubble-${msg.id}">
        ${renderMarkdown(msg.content)}
      </div>
      <div class="message__actions">
        <button class="message__action-btn tooltip" data-tooltip="Copy" onclick="window.polyChat.copyMessage('${msg.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>
    </div>
  `;
}

/**
 * Stop the current generation.
 */
function stopGeneration() {
  isStreaming = false;
}

/**
 * Update UI for streaming state.
 */
function updateStreamingUI(streaming) {
  if (sendBtn) sendBtn.style.display = streaming ? 'none' : 'flex';
  if (stopBtn) stopBtn.classList.toggle('visible', streaming);
  if (chatInput) chatInput.disabled = streaming;
}

/**
 * Update send button active state.
 */
function updateSendButton() {
  const hasText = chatInput?.value?.trim().length > 0;
  sendBtn?.classList.toggle('active', hasText && !isStreaming);
}

/**
 * Start a new chat — clear messages and UI.
 */
export function newChat() {
  messages = [];
  if (chatMessages) chatMessages.innerHTML = '';
  if (welcomeEl) welcomeEl.style.display = 'flex';
  if (chatInput) {
    chatInput.value = '';
    chatInput.disabled = false;
    autoResize(chatInput);
  }
  updateSendButton();
  isStreaming = false;
  updateStreamingUI(false);
}

/**
 * Send a message programmatically (used by welcome suggestions).
 */
export function sendProgrammatic(text) {
  if (!chatInput) return;
  chatInput.value = text;
  chatInput.dispatchEvent(new Event('input'));
  handleSend();
}
