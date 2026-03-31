/* ============================================
   PolyChat Model Switcher
   ============================================ */

import { getProviderInfo, formatModelName, showToast } from './utils.js';

// ── State ──
let allModels = [];
let filteredModels = [];
let activeModel = 'claude-3-7-sonnet';
let isDropdownOpen = false;

// Popular models to show at the top
const POPULAR_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'claude-3-7-sonnet',
  'claude-3-5-sonnet',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'deepseek-chat',
  'grok-3',
  'llama-4-maverick',
];

// ── DOM References ──
let triggerEl, dropdownEl, searchInput, listEl, modelNameEl, providerIconEl, topbarBadgeEl;

/**
 * Initialize the model switcher.
 */
export function initModelSwitcher() {
  triggerEl = document.getElementById('model-trigger');
  dropdownEl = document.getElementById('model-dropdown');
  searchInput = document.getElementById('model-search');
  listEl = document.getElementById('model-list');
  modelNameEl = document.getElementById('model-name');
  providerIconEl = document.getElementById('model-provider-icon');
  topbarBadgeEl = document.getElementById('topbar-model-name');

  // Toggle dropdown
  triggerEl?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  // Search filter
  searchInput?.addEventListener('input', (e) => {
    filterModels(e.target.value);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (isDropdownOpen && !dropdownEl?.contains(e.target) && !triggerEl?.contains(e.target)) {
      closeDropdown();
    }
  });

  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isDropdownOpen) {
      closeDropdown();
    }
  });

  // Fetch models
  fetchModels();

  // Update UI with default model
  updateModelUI(activeModel);
}

/**
 * Fetch available models from Puter.
 */
async function fetchModels() {
  try {
    if (typeof puter !== 'undefined' && puter.ai) {
      const models = await puter.ai.listModels();
      allModels = models.map(m => typeof m === 'string' ? m : (m.id || m.name || m));
      // Sort: popular first, then alphabetical
      allModels.sort((a, b) => {
        const aPopular = POPULAR_MODELS.indexOf(a);
        const bPopular = POPULAR_MODELS.indexOf(b);
        if (aPopular !== -1 && bPopular !== -1) return aPopular - bPopular;
        if (aPopular !== -1) return -1;
        if (bPopular !== -1) return 1;
        return a.localeCompare(b);
      });
    } else {
      // Fallback if Puter is not loaded yet
      allModels = [...POPULAR_MODELS];
    }
    filteredModels = [...allModels];
    renderModelList();
  } catch (err) {
    console.warn('Failed to fetch models:', err);
    allModels = [...POPULAR_MODELS];
    filteredModels = [...allModels];
    renderModelList();
  }
}

/**
 * Filter models based on search query.
 */
function filterModels(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    filteredModels = [...allModels];
  } else {
    filteredModels = allModels.filter(m => m.toLowerCase().includes(q));
  }
  renderModelList();
}

/**
 * Render the model list in dropdown.
 */
function renderModelList() {
  if (!listEl) return;

  if (filteredModels.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state" style="padding: var(--space-4);">
        <div class="empty-state__text">No models found</div>
      </div>
    `;
    return;
  }

  // Group by provider
  const groups = {};
  const popularGroup = [];

  filteredModels.forEach(modelId => {
    if (POPULAR_MODELS.includes(modelId) && !document.getElementById('model-search')?.value) {
      popularGroup.push(modelId);
    } else {
      const provider = getProviderInfo(modelId);
      if (!groups[provider.name]) groups[provider.name] = [];
      groups[provider.name].push(modelId);
    }
  });

  let html = '';

  // Popular section
  if (popularGroup.length > 0) {
    html += `<div class="model-dropdown__group-label">⭐ Popular</div>`;
    popularGroup.forEach(id => {
      html += renderModelItem(id);
    });
  }

  // Provider groups
  Object.keys(groups).sort().forEach(providerName => {
    html += `<div class="model-dropdown__group-label">${providerName}</div>`;
    groups[providerName].forEach(id => {
      html += renderModelItem(id);
    });
  });

  listEl.innerHTML = html;

  // Attach click handlers
  listEl.querySelectorAll('.model-dropdown__item').forEach(item => {
    item.addEventListener('click', () => {
      setActiveModel(item.dataset.model);
      closeDropdown();
    });
  });
}

/**
 * Render a single model item.
 */
function renderModelItem(modelId) {
  const provider = getProviderInfo(modelId);
  const isActive = modelId === activeModel;
  return `
    <div class="model-dropdown__item ${isActive ? 'active' : ''}" data-model="${modelId}">
      <div class="model-dropdown__item-icon ${provider.cssClass}">${provider.icon}</div>
      <span>${formatModelName(modelId)}</span>
    </div>
  `;
}

/**
 * Set the active model.
 */
export function setActiveModel(modelId) {
  activeModel = modelId;
  updateModelUI(modelId);

  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('model-changed', { detail: { model: modelId } }));
}

/**
 * Update all model UI elements.
 */
function updateModelUI(modelId) {
  const provider = getProviderInfo(modelId);

  // Sidebar trigger
  if (modelNameEl) modelNameEl.textContent = formatModelName(modelId);
  if (providerIconEl) {
    providerIconEl.textContent = provider.icon;
    providerIconEl.className = `model-switcher__provider-icon ${provider.cssClass}`;
  }

  // Topbar badge
  if (topbarBadgeEl) topbarBadgeEl.textContent = formatModelName(modelId);

  // Update active state in dropdown
  listEl?.querySelectorAll('.model-dropdown__item').forEach(item => {
    item.classList.toggle('active', item.dataset.model === modelId);
  });
}

/**
 * Toggle dropdown visibility.
 */
function toggleDropdown() {
  isDropdownOpen ? closeDropdown() : openDropdown();
}

function openDropdown() {
  isDropdownOpen = true;
  dropdownEl?.classList.add('open');
  triggerEl?.closest('.model-switcher')?.classList.add('open');
  searchInput?.focus();
}

function closeDropdown() {
  isDropdownOpen = false;
  dropdownEl?.classList.remove('open');
  triggerEl?.closest('.model-switcher')?.classList.remove('open');
  if (searchInput) searchInput.value = '';
  filteredModels = [...allModels];
  renderModelList();
}

/**
 * Get the current active model.
 */
export function getActiveModel() {
  return activeModel;
}

/**
 * Get all available models (for task mapping config).
 */
export function getAllModels() {
  return allModels.length > 0 ? [...allModels] : [...POPULAR_MODELS];
}
