/* ============================================
   PolyChat System Prompt Editor
   ============================================ */

// ── State ──
const STORAGE_KEY = 'polychat_system_prompts';

let systemPrompts = {};   // { modelId: promptText }
let globalPrompt = '';

/**
 * Initialize system prompt editor.
 */
export function initSystemPrompt() {
  loadPrompts();

  const editBtn = document.getElementById('system-prompt-btn');
  editBtn?.addEventListener('click', openSystemPromptModal);
}

/**
 * Load saved prompts from localStorage.
 */
function loadPrompts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      globalPrompt = data.global || '';
      systemPrompts = data.perModel || {};
    }
  } catch {
    globalPrompt = '';
    systemPrompts = {};
  }
}

/**
 * Save prompts to localStorage.
 */
function savePrompts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      global: globalPrompt,
      perModel: systemPrompts,
    }));
  } catch (e) {
    console.warn('Failed to save system prompts:', e);
  }
}

/**
 * Get the system prompt for a given model.
 * Returns per-model prompt if set, otherwise global prompt.
 */
export function getSystemPrompt(modelId) {
  if (systemPrompts[modelId]) return systemPrompts[modelId];
  return globalPrompt || '';
}

/**
 * Set global system prompt.
 */
export function setGlobalPrompt(prompt) {
  globalPrompt = prompt;
  savePrompts();
}

/**
 * Set per-model system prompt.
 */
export function setModelPrompt(modelId, prompt) {
  if (prompt.trim()) {
    systemPrompts[modelId] = prompt;
  } else {
    delete systemPrompts[modelId];
  }
  savePrompts();
}

/**
 * Open the system prompt modal.
 */
function openSystemPromptModal() {
  const overlay = document.getElementById('system-prompt-overlay');
  const globalInput = document.getElementById('system-prompt-global');
  const modelSection = document.getElementById('system-prompt-model-section');
  const modelSelect = document.getElementById('system-prompt-model-select');
  const modelInput = document.getElementById('system-prompt-model-input');

  if (!overlay) return;

  // Set current values
  if (globalInput) globalInput.value = globalPrompt;

  // Populate model select from current models
  if (modelSelect) {
    const models = window.polyChat?.getModels?.() || [];
    modelSelect.innerHTML = `<option value="">Select a model for per-model prompt...</option>` +
      models.map(m => `<option value="${m}" ${systemPrompts[m] ? '• ' : ''}>${m}</option>`).join('');
  }

  if (modelInput) modelInput.value = '';

  // Model select change
  modelSelect?.addEventListener('change', () => {
    const model = modelSelect.value;
    if (modelInput) modelInput.value = systemPrompts[model] || '';
  });

  overlay.classList.add('active');

  // Save
  const saveBtn = document.getElementById('system-prompt-save');
  const handleSave = () => {
    globalPrompt = globalInput?.value?.trim() || '';
    const selectedModel = modelSelect?.value;
    if (selectedModel && modelInput) {
      setModelPrompt(selectedModel, modelInput.value);
    }
    savePrompts();
    closeSystemPromptModal();
    import('./utils.js').then(({ showToast }) => showToast('System prompt saved!', 'success'));
    saveBtn.removeEventListener('click', handleSave);
  };
  saveBtn?.addEventListener('click', handleSave);

  // Close
  const closeBtn = document.getElementById('system-prompt-close');
  closeBtn?.addEventListener('click', closeSystemPromptModal, { once: true });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSystemPromptModal();
  }, { once: true });
}

function closeSystemPromptModal() {
  const overlay = document.getElementById('system-prompt-overlay');
  overlay?.classList.remove('active');
}
