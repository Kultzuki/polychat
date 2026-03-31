/* ============================================
   PolyChat Chat Engine (Full — Phase 1-4)
   ============================================ */

import { getActiveModel } from './models.js';
import { getActiveTask } from './tasks.js';
import { getSystemPrompt } from './systemPrompt.js';
import { saveChat, getChat, getAllChats, deleteChat, generateTitle, summariseAndSave, buildMemoryPrompt } from './storage.js';
import { exportAsMarkdown, exportAsJSON, estimateConversationTokens, formatTokenCount } from './export.js';
import { copyShareableLink, loadSharedChat } from './share.js';
import { consumePendingImage, hasPendingImage, generateImage, getCurrentTab } from './imageFeatures.js';
import { compareModels } from './compare.js';
import { renderMarkdown, formatTime, generateId, scrollToBottom, copyToClipboard, showToast, getProviderInfo, formatModelName, autoResize } from './utils.js';

// ── State ──
let messages = [];
let isStreaming = false;
let currentChatId = null;

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

  // Send
  sendBtn?.addEventListener('click', handleSend);
  stopBtn?.addEventListener('click', stopGeneration);

  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  chatInput?.addEventListener('input', () => {
    autoResize(chatInput);
    updateSendButton();
  });

  updateSendButton();

  // ── Voice Dictation ──
  const micBtn = document.getElementById('mic-btn');
  let recognition = null;
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      micBtn.style.color = '#ef4444'; // Red recording indication
      micBtn.style.animation = 'pulse 1.5s infinite';
    };

    let finalTranscript = '';
    recognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      chatInput.value = finalTranscript + interim;
      autoResize(chatInput);
      updateSendButton();
    };

    recognition.onend = () => {
      micBtn.style.color = '';
      micBtn.style.animation = '';
    };

    let isRecording = false;
    micBtn?.addEventListener('click', () => {
      if (isRecording) {
        recognition.stop();
        isRecording = false;
      } else {
        finalTranscript = chatInput.value ? chatInput.value + ' ' : '';
        try { recognition.start(); } catch(e) {}
        isRecording = true;
      }
    });
  } else if (micBtn) {
    micBtn.style.display = 'none';
  }

  // ── Artifacts Pane Events ──
  const artifactsPane = document.getElementById('artifacts-pane');
  document.getElementById('artifacts-close-btn')?.addEventListener('click', () => {
    artifactsPane?.classList.remove('open');
  });

  const tabCodeBtn = document.getElementById('tab-artifact-code');
  const tabPreviewBtn = document.getElementById('tab-artifact-preview');
  const viewCode = document.getElementById('view-artifact-code');
  const viewPreview = document.getElementById('view-artifact-preview');

  tabCodeBtn?.addEventListener('click', () => {
    tabCodeBtn.classList.add('active'); tabPreviewBtn.classList.remove('active');
    viewCode.classList.add('active'); viewPreview.classList.remove('active');
  });
  tabPreviewBtn?.addEventListener('click', () => {
    tabPreviewBtn.classList.add('active'); tabCodeBtn.classList.remove('active');
    viewPreview.classList.add('active'); viewCode.classList.remove('active');
  });

  // Export menu
  const exportBtn = document.getElementById('export-btn');
  const exportMenu = document.getElementById('export-menu');
  exportBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenu?.classList.toggle('open');
  });
  document.addEventListener('click', () => exportMenu?.classList.remove('open'));

  document.getElementById('export-md')?.addEventListener('click', () => {
    exportAsMarkdown(messages, getActiveModel());
    exportMenu?.classList.remove('open');
  });
  document.getElementById('export-json')?.addEventListener('click', () => {
    exportAsJSON(messages, getActiveModel());
    exportMenu?.classList.remove('open');
  });
  document.getElementById('share-link')?.addEventListener('click', () => {
    copyShareableLink(messages, getActiveModel());
    exportMenu?.classList.remove('open');
  });

  // Global handlers
  window.polyChat = window.polyChat || {};
  window.polyChat.copyCode = async (btn) => {
    const code = decodeURIComponent(btn.dataset.code);
    await copyToClipboard(code);
    const originalText = btn.innerHTML;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> Copied!`;
    setTimeout(() => { btn.innerHTML = originalText; }, 2000);
  };
  window.polyChat.openArtifact = (btn) => {
    const code = decodeURIComponent(btn.dataset.code);
    const lang = btn.dataset.lang?.toLowerCase();
    
    // Open Pane
    const pane = document.getElementById('artifacts-pane');
    if (pane) pane.classList.add('open');
    
    // Set code block
    const codeBlock = document.getElementById('artifact-code-block');
    if (codeBlock) {
      codeBlock.className = `hljs language-${lang}`;
      codeBlock.textContent = code;
      if (window.hljs) window.hljs.highlightElement(codeBlock);
    }
    
    // Set iframe preview
    const iframe = document.getElementById('artifact-preview-iframe');
    if (iframe) {
      if (['html', 'svg'].includes(lang)) {
        iframe.srcdoc = code;
      } else if (['js', 'javascript', 'react', 'vue', 'svelte'].includes(lang)) {
        iframe.srcdoc = `<html><body><script>${code}</script></body></html>`;
      } else {
        iframe.srcdoc = '<html><body style="font-family:sans-serif;padding:20px;">Preview not supported for this language.</body></html>';
      }
    }
  };
  window.polyChat.copyMessage = async (msgId) => {
    const m = messages.find(x => x.id === msgId);
    if (m) {
      await copyToClipboard(m.content);
      showToast('Copied to clipboard', 'success');
    }
  };

  // Load chat history sidebar
  loadChatHistory();

  // Check for shared chat in URL
  const shared = loadSharedChat();
  if (shared) {
    messages = shared.messages;
    import('./models.js').then(({ setActiveModel }) => setActiveModel(shared.model));
    renderAllMessages();
    if (welcomeEl) welcomeEl.style.display = 'none';
    showToast('Loaded shared chat', 'success');
    window.location.hash = '';
  }

  // Handle unload summary
  window.addEventListener('beforeunload', () => {
    if (messages.length > 1) summariseAndSave(messages);
  });
}

/**
 * Handle send — routes to chat, compare, or generate based on active tab.
 */
async function handleSend() {
  const text = chatInput?.value?.trim();
  if (!text || isStreaming) return;

  const tab = getCurrentTab();

  if (tab === 'compare') {
    await handleCompare(text);
  } else if (tab === 'generate') {
    await handleGenerate(text);
  } else {
    await handleChat(text);
  }
}

/**
 * Standard chat send.
 */
async function handleChat(text) {
  const model = getActiveModel();
  const hasImage = hasPendingImage();

  addMessage('user', text);
  clearInput();

  if (welcomeEl) welcomeEl.style.display = 'none';

  await sendToAI(text, model, hasImage ? consumePendingImage() : null);

  // Save to IndexedDB
  await persistChat();
}

/**
 * Compare mode send.
 */
async function handleCompare(text) {
  const selectedModels = getSelectedCompareModels();
  if (selectedModels.length < 2) {
    showToast('Select at least 2 models to compare', 'error');
    return;
  }

  clearInput();
  const compareMessages = document.getElementById('compare-messages');
  const compareWelcome = document.getElementById('compare-welcome');
  if (compareWelcome) compareWelcome.style.display = 'none';

  // Add user message in compare area
  const userDiv = document.createElement('div');
  userDiv.className = 'message message--user message-enter-user';
  userDiv.innerHTML = `
    <div class="message__avatar" style="background: var(--accent-gradient); color: white;">U</div>
    <div class="message__content">
      <div class="message__bubble">${escapeForBubble(text)}</div>
    </div>
  `;
  compareMessages?.appendChild(userDiv);

  await compareModels(text, selectedModels, compareMessages);
}

/**
 * Image generate mode send.
 */
async function handleGenerate(text) {
  clearInput();
  const genMessages = document.getElementById('generate-messages');
  const genWelcome = document.getElementById('generate-welcome');
  if (genWelcome) genWelcome.style.display = 'none';

  // Add user message
  const userDiv = document.createElement('div');
  userDiv.className = 'message message--user message-enter-user';
  userDiv.innerHTML = `
    <div class="message__avatar" style="background: var(--accent-gradient); color: white;">U</div>
    <div class="message__content">
      <div class="message__bubble">${escapeForBubble(text)}</div>
    </div>
  `;
  genMessages?.appendChild(userDiv);

  await generateImage(text, genMessages);
}

function clearInput() {
  if (chatInput) {
    chatInput.value = '';
    autoResize(chatInput);
  }
  updateSendButton();
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
  updateTokenCounter();
  return msg;
}

/**
 * Render a single message.
 */
function renderMessage(msg) {
  if (!chatMessages) return;

  const div = document.createElement('div');
  div.className = `message message--${msg.role} ${msg.role === 'user' ? 'message-enter-user' : 'message-enter-ai'}`;
  div.id = `msg-${msg.id}`;

  const provider = getProviderInfo(msg.model);
  const avatarContent = msg.role === 'user' ? 'U' : provider.icon;

  div.innerHTML = `
    <div class="message__avatar ${msg.role === 'ai' ? provider.cssClass : ''}" ${msg.role === 'user' ? 'style="background: var(--accent-gradient); color: white;"' : ''}>
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

  // Apply syntax highlighting to code blocks
  div.querySelectorAll('pre code').forEach(block => {
    if (typeof hljs !== 'undefined') hljs.highlightElement(block);
  });
}

function escapeForBubble(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

/**
 * Render all messages (used when loading a chat).
 */
function renderAllMessages() {
  if (!chatMessages) return;
  chatMessages.innerHTML = '';
  messages.forEach(msg => renderMessage(msg));
  scrollToBottom(chatContainer, false);
  updateTokenCounter();
}

/**
 * Send to AI with streaming.
 */
async function sendToAI(userMessage, model, imageFile = null) {
  isStreaming = true;
  updateStreamingUI(true);

  const systemPrompt = getSystemPrompt(model);
  const memoryPrompt = await buildMemoryPrompt();
  
  let finalSystemPrompt = systemPrompt || '';
  if (memoryPrompt) {
    finalSystemPrompt = finalSystemPrompt ? `${memoryPrompt}\n\n${finalSystemPrompt}` : memoryPrompt;
  }

  const conversationHistory = [];

  if (finalSystemPrompt) {
    conversationHistory.push({ role: 'system', content: finalSystemPrompt });
  }

  messages.filter(m => m.role === 'user' || m.role === 'ai').forEach(m => {
    conversationHistory.push({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content,
    });
  });

  const aiMsg = {
    id: generateId(),
    role: 'ai',
    content: '',
    model: model,
    timestamp: new Date(),
  };
  messages.push(aiMsg);

  renderTypingMessage(aiMsg);
  scrollToBottom(chatContainer);

  try {
    if (typeof puter === 'undefined' || !puter.ai) {
      throw new Error('Puter.js not loaded. Please refresh the page.');
    }

    const options = { model, stream: true };
    if (imageFile) options.image = imageFile;

    const response = await puter.ai.chat(conversationHistory, options);
    replaceTypingWithBubble(aiMsg);

    const bubbleEl = document.getElementById(`bubble-${aiMsg.id}`);
    let fullText = '';

    for await (const part of response) {
      if (!isStreaming) break;
      const chunk = part?.text || '';
      fullText += chunk;
      aiMsg.content = fullText;
      if (bubbleEl) bubbleEl.innerHTML = renderMarkdown(fullText);
      scrollToBottom(chatContainer, false);
    }

    if (bubbleEl) {
      bubbleEl.innerHTML = renderMarkdown(fullText);
      // Syntax highlighting
      bubbleEl.querySelectorAll('pre code').forEach(block => {
        if (typeof hljs !== 'undefined') hljs.highlightElement(block);
      });
    }

  } catch (error) {
    console.error('AI Error:', error);
    aiMsg.content = `⚠️ Error: ${error.message || 'Something went wrong.'}`;
    replaceTypingWithBubble(aiMsg);
    const bubbleEl = document.getElementById(`bubble-${aiMsg.id}`);
    if (bubbleEl) bubbleEl.innerHTML = `<p style="color: #ef4444;">${aiMsg.content}</p>`;
  } finally {
    isStreaming = false;
    updateStreamingUI(false);
    scrollToBottom(chatContainer);
    updateTokenCounter();
    await persistChat();
  }
}

function renderTypingMessage(msg) {
  if (!chatMessages) return;
  const provider = getProviderInfo(msg.model);
  const div = document.createElement('div');
  div.className = 'message message--ai message--typing message-enter-ai';
  div.id = `msg-${msg.id}`;
  div.innerHTML = `
    <div class="message__avatar ${provider.cssClass}">${provider.icon}</div>
    <div class="message__content">
      <div class="message__header">
        <span class="message__sender">${formatModelName(msg.model)}</span>
        <span class="message__model">${provider.name}</span>
      </div>
      <div class="message__bubble" id="bubble-${msg.id}">
        <div class="typing-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
      </div>
    </div>
  `;
  chatMessages.appendChild(div);
}

function replaceTypingWithBubble(msg) {
  const msgEl = document.getElementById(`msg-${msg.id}`);
  if (!msgEl) return;
  msgEl.classList.remove('message--typing');
  const provider = getProviderInfo(msg.model);
  msgEl.innerHTML = `
    <div class="message__avatar ${provider.cssClass}">${provider.icon}</div>
    <div class="message__content">
      <div class="message__header">
        <span class="message__sender">${formatModelName(msg.model)}</span>
        <span class="message__model">${provider.name}</span>
        <span class="message__time">${formatTime(msg.timestamp)}</span>
      </div>
      <div class="message__bubble" id="bubble-${msg.id}">${renderMarkdown(msg.content)}</div>
      <div class="message__actions">
        <button class="message__action-btn tooltip" data-tooltip="Copy" onclick="window.polyChat.copyMessage('${msg.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>
    </div>
  `;
}

function stopGeneration() { isStreaming = false; }

function updateStreamingUI(streaming) {
  if (sendBtn) sendBtn.style.display = streaming ? 'none' : 'flex';
  if (stopBtn) stopBtn.classList.toggle('visible', streaming);
  if (chatInput) chatInput.disabled = streaming;
}

function updateSendButton() {
  const hasText = chatInput?.value?.trim().length > 0;
  sendBtn?.classList.toggle('active', hasText && !isStreaming);
}

/**
 * Update token counter display.
 */
function updateTokenCounter() {
  const countEl = document.getElementById('token-count');
  const counterEl = document.getElementById('token-counter');
  if (!countEl) return;

  const tokens = estimateConversationTokens(messages);
  countEl.textContent = `${formatTokenCount(tokens)} tokens`;

  counterEl?.classList.remove('token-counter--warning', 'token-counter--danger');
  if (tokens > 100000) {
    counterEl?.classList.add('token-counter--danger');
  } else if (tokens > 50000) {
    counterEl?.classList.add('token-counter--warning');
  }
}

/* ═════════════════════════════════════════
   Chat Persistence (IndexedDB)
   ═════════════════════════════════════════ */

async function persistChat() {
  if (messages.length === 0) return;

  try {
    if (!currentChatId) currentChatId = generateId();

    await saveChat({
      id: currentChatId,
      title: generateTitle(messages),
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        model: m.model,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      })),
      model: getActiveModel(),
    });

    loadChatHistory();
  } catch (e) {
    console.warn('Failed to persist chat:', e);
  }
}

/**
 * Load chat history list in sidebar.
 */
export async function loadChatHistory() {
  const historyEl = document.getElementById('chat-history');
  if (!historyEl) return;

  try {
    const chats = await getAllChats();
    if (chats.length === 0) {
      historyEl.innerHTML = `<div class="empty-state" style="padding: var(--space-4);"><div class="empty-state__text" style="font-size: var(--text-xs);">No chat history yet</div></div>`;
      return;
    }

    // Group by date
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    let html = '';
    let currentGroup = '';

    chats.forEach(chat => {
      const date = new Date(chat.updatedAt).toDateString();
      let group;
      if (date === today) group = 'Today';
      else if (date === yesterday) group = 'Yesterday';
      else group = 'Older';

      if (group !== currentGroup) {
        currentGroup = group;
        html += `<div class="chat-history__date-label">${group}</div>`;
      }

      const isActive = chat.id === currentChatId;
      html += `
        <div class="chat-history__item ${isActive ? 'active' : ''}" data-chat-id="${chat.id}">
          <span class="chat-history__item-icon">💬</span>
          <span class="chat-history__item-text">${escapeText(chat.title || 'Untitled')}</span>
          <button class="chat-history__item-delete" data-delete-id="${chat.id}" aria-label="Delete chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;
    });

    historyEl.innerHTML = html;

    // Click to load
    historyEl.querySelectorAll('.chat-history__item').forEach(item => {
      item.addEventListener('click', async (e) => {
        if (e.target.closest('.chat-history__item-delete')) return;
        const chatId = item.dataset.chatId;
        await loadChat(chatId);
      });
    });

    // Delete
    historyEl.querySelectorAll('.chat-history__item-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const chatId = btn.dataset.deleteId;
        await deleteChat(chatId);
        if (chatId === currentChatId) newChat();
        else loadChatHistory();
        showToast('Chat deleted', 'success');
      });
    });
  } catch (e) {
    console.warn('Failed to load history:', e);
  }
}

function escapeText(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Load a specific chat from storage.
 */
async function loadChat(chatId) {
  if (messages && messages.length > 1) {
    summariseAndSave(messages);
  }

  try {
    const chat = await getChat(chatId);
    if (!chat) return;

    currentChatId = chatId;
    messages = (chat.messages || []).map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));

    renderAllMessages();
    if (welcomeEl) welcomeEl.style.display = messages.length > 0 ? 'none' : 'flex';

    if (chat.model) {
      import('./models.js').then(({ setActiveModel }) => setActiveModel(chat.model));
    }

    loadChatHistory();

    // Close sidebar on mobile
    const sidebar = document.getElementById('sidebar');
    sidebar?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');

  } catch (e) {
    console.warn('Failed to load chat:', e);
  }
}

/**
 * Start a new chat.
 */
export function newChat() {
  if (messages && messages.length > 1) {
    summariseAndSave(messages);
  }

  messages = [];
  currentChatId = null;
  if (chatMessages) chatMessages.innerHTML = '';
  if (welcomeEl) welcomeEl.style.display = 'flex';
  if (chatInput) {
    chatInput.value = '';
    chatInput.disabled = false;
    autoResize(chatInput);
  }
  updateSendButton();
  updateTokenCounter();
  isStreaming = false;
  updateStreamingUI(false);
  loadChatHistory();
}

/**
 * Send a message programmatically.
 */
export function sendProgrammatic(text) {
  if (!chatInput) return;
  chatInput.value = text;
  chatInput.dispatchEvent(new Event('input'));
  handleSend();
}

/**
 * Get selected compare models.
 */
function getSelectedCompareModels() {
  const chips = document.querySelectorAll('.compare-model-chip.selected');
  return Array.from(chips).map(c => c.dataset.model);
}

/**
 * Get messages (for external access).
 */
export function getMessages() {
  return [...messages];
}
