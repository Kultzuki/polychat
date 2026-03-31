/* ============================================
   PolyChat — Main Application Entry (Full)
   ============================================ */

import { initModelSwitcher, getAllModels, getActiveModel } from './models.js';
import { initTaskTags } from './tasks.js';
import { initTemplates } from './templates.js';
import { initChat, newChat, sendProgrammatic, loadChatHistory } from './chat.js';
import { initSystemPrompt } from './systemPrompt.js';
import { initImageFeatures, getCurrentTab } from './imageFeatures.js';
import { formatModelName, getProviderInfo } from './utils.js';

/**
 * Initialize the entire application.
 */
function init() {
  // Initialize all modules
  initModelSwitcher();
  initTaskTags();
  initTemplates();
  initChat();
  initSystemPrompt();
  initImageFeatures();

  // Make models accessible globally for other modules
  window.polyChat = window.polyChat || {};
  window.polyChat.getModels = getAllModels;

  // ── Sidebar Toggle (Mobile) ──
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const sidebarClose = document.getElementById('sidebar-close');

  function openSidebar() {
    sidebar?.classList.add('open');
    sidebarOverlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar?.classList.remove('open');
    sidebarOverlay?.classList.remove('active');
    document.body.style.overflow = '';
  }

  menuToggle?.addEventListener('click', openSidebar);
  sidebarOverlay?.addEventListener('click', closeSidebar);
  sidebarClose?.addEventListener('click', closeSidebar);

  // ── New Chat Button ──
  const newChatBtn = document.getElementById('new-chat-btn');
  newChatBtn?.addEventListener('click', () => {
    newChat();
    closeSidebar();
  });

  // ── Welcome Suggestions ──
  document.querySelectorAll('.welcome__suggestion').forEach(suggestion => {
    suggestion.addEventListener('click', () => {
      const prompt = suggestion.dataset.prompt;
      if (prompt) sendProgrammatic(prompt);
    });
  });

  // ── Tab Switching ──
  const tabs = ['chat', 'compare', 'generate'];
  tabs.forEach(tab => {
    const btn = document.getElementById(`tab-${tab}`);
    btn?.addEventListener('click', () => switchTab(tab));
  });

  // ── Compare Model Selector ──
  setupCompareSelector();

  // Listen for model list updates
  window.addEventListener('models-loaded', setupCompareSelector);

  // ── Keyboard Shortcuts ──
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      newChat();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      document.getElementById('chat-input')?.focus();
    }
  });

  // ── Input Placeholder Update on Tab Switch ──
  window.addEventListener('tab-changed', (e) => {
    const input = document.getElementById('chat-input');
    if (!input) return;
    switch (e.detail?.tab) {
      case 'compare': input.placeholder = 'Enter prompt to compare across models...'; break;
      case 'generate': input.placeholder = 'Describe the image you want to generate...'; break;
      default: input.placeholder = 'Message PolyChat...';
    }
  });

  console.log('🚀 PolyChat initialized (All Phases)');
}

/**
 * Switch between tabs.
 */
function switchTab(tab) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');

  // Show/hide containers
  const containers = {
    chat: document.getElementById('chat-container'),
    compare: document.getElementById('compare-container'),
    generate: document.getElementById('generate-container'),
  };

  Object.entries(containers).forEach(([key, el]) => {
    if (el) el.style.display = key === tab ? '' : 'none';
  });

  // Show/hide templates bar (only in chat mode)
  const templatesBar = document.getElementById('templates-bar');
  if (templatesBar) templatesBar.style.display = tab === 'chat' ? '' : 'none';

  // Show/hide compare selector
  const compareSelector = document.getElementById('compare-model-selector');
  if (compareSelector) compareSelector.style.display = tab === 'compare' ? 'flex' : 'none';

  // Dispatch event
  window.dispatchEvent(new CustomEvent('tab-changed', { detail: { tab } }));
}

/**
 * Setup compare model multi-selector.
 */
function setupCompareSelector() {
  const selector = document.getElementById('compare-model-selector');
  if (!selector) return;

  const COMPARE_MODELS = [
    'gpt-4o', 'gpt-4o-mini', 'claude-3-7-sonnet', 'claude-3-5-sonnet',
    'gemini-2.5-flash', 'gemini-2.0-flash', 'deepseek-chat', 'grok-3',
    'llama-4-maverick',
  ];

  selector.innerHTML = `
    <span style="font-size: var(--text-xs); color: var(--text-muted); margin-right: var(--space-1);">Models:</span>
    ${COMPARE_MODELS.map(m => {
      const provider = getProviderInfo(m);
      return `
        <button class="compare-model-chip" data-model="${m}">
          <span class="model-dropdown__item-icon ${provider.cssClass}" style="width: 14px; height: 14px; font-size: 8px;">${provider.icon}</span>
          <span>${formatModelName(m)}</span>
        </button>
      `;
    }).join('')}
  `;

  // Pre-select first 2
  const chips = selector.querySelectorAll('.compare-model-chip');
  if (chips[0]) chips[0].classList.add('selected');
  if (chips[2]) chips[2].classList.add('selected'); // claude

  // Toggle selection
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('selected');
    });
  });
}

// ── Boot ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
