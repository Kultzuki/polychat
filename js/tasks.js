/* ============================================
   PolyChat Task Tagging System
   ============================================ */

import { setActiveModel, getAllModels } from './models.js';
import { getProviderInfo, formatModelName, showToast } from './utils.js';

// ── Default task → model mappings ──
const DEFAULT_MAPPINGS = {
  coding: 'claude-3-7-sonnet',
  creative: 'gpt-4o',
  vision: 'gemini-2.5-flash',
  general: 'gpt-4o-mini',
};

const TASK_META = {
  coding: { icon: '🧑‍💻', label: 'Coding', color: 'var(--tag-coding)' },
  creative: { icon: '✨', label: 'Creative', color: 'var(--tag-creative)' },
  vision: { icon: '👁️', label: 'Vision', color: 'var(--tag-vision)' },
  general: { icon: '💬', label: 'General', color: 'var(--tag-general)' },
};

// ── State ──
let taskMappings = {};
let activeTask = null;

/**
 * Initialize task tagging system.
 */
export function initTaskTags() {
  // Load mappings from localStorage
  loadMappings();

  // Set up tag click handlers
  document.querySelectorAll('.task-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const task = tag.dataset.task;
      selectTask(task);
    });
  });

  // Config button
  const configBtn = document.getElementById('task-config-btn');
  configBtn?.addEventListener('click', openConfigModal);
}

/**
 * Load task mappings from localStorage.
 */
function loadMappings() {
  try {
    const saved = localStorage.getItem('polychat_task_mappings');
    if (saved) {
      taskMappings = { ...DEFAULT_MAPPINGS, ...JSON.parse(saved) };
    } else {
      taskMappings = { ...DEFAULT_MAPPINGS };
    }
  } catch {
    taskMappings = { ...DEFAULT_MAPPINGS };
  }
}

/**
 * Save task mappings to localStorage.
 */
function saveMappings() {
  try {
    localStorage.setItem('polychat_task_mappings', JSON.stringify(taskMappings));
  } catch (e) {
    console.warn('Failed to save task mappings:', e);
  }
}

/**
 * Select a task tag — auto-switches model.
 */
export function selectTask(taskName) {
  // Toggle off if same task clicked
  if (activeTask === taskName) {
    activeTask = null;
    updateTagUI();
    return;
  }

  activeTask = taskName;
  const model = taskMappings[taskName];
  if (model) {
    setActiveModel(model);
  }
  updateTagUI();

  // Dispatch event
  window.dispatchEvent(new CustomEvent('task-changed', { detail: { task: taskName, model } }));
}

/**
 * Update task tag UI to reflect active state.
 */
function updateTagUI() {
  document.querySelectorAll('.task-tag').forEach(tag => {
    const isActive = tag.dataset.task === activeTask;
    tag.classList.toggle('active', isActive);
  });

  // Update topbar task indicator
  const topbarDot = document.querySelector('.topbar__model-badge .dot');
  if (topbarDot && activeTask) {
    const meta = TASK_META[activeTask];
    if (meta) topbarDot.style.background = meta.color;
  } else if (topbarDot) {
    topbarDot.style.background = 'var(--tag-general)';
  }
}

/**
 * Open configuration modal for task→model mappings.
 */
function openConfigModal() {
  const overlay = document.getElementById('config-modal-overlay');
  const body = document.getElementById('config-modal-body');
  if (!overlay || !body) return;

  const models = getAllModels();

  let html = '';
  Object.entries(TASK_META).forEach(([task, meta]) => {
    const currentModel = taskMappings[task] || DEFAULT_MAPPINGS[task];
    html += `
      <div class="mapping-item">
        <div class="mapping-item__tag" style="color: ${meta.color}">
          <span>${meta.icon}</span>
          <span>${meta.label}</span>
        </div>
        <select class="mapping-item__select" data-task="${task}">
          ${models.map(m => `
            <option value="${m}" ${m === currentModel ? 'selected' : ''}>${formatModelName(m)}</option>
          `).join('')}
        </select>
      </div>
    `;
  });

  body.innerHTML = html;
  overlay.classList.add('active');

  // Save button
  const saveBtn = document.getElementById('config-save-btn');
  saveBtn?.addEventListener('click', () => {
    body.querySelectorAll('.mapping-item__select').forEach(select => {
      taskMappings[select.dataset.task] = select.value;
    });
    saveMappings();
    closeConfigModal();
    showToast('Task mappings saved!', 'success');

    // Re-apply active task if one is selected
    if (activeTask) {
      const newModel = taskMappings[activeTask];
      if (newModel) setActiveModel(newModel);
    }
  }, { once: true });

  // Reset button
  const resetBtn = document.getElementById('config-reset-btn');
  resetBtn?.addEventListener('click', () => {
    taskMappings = { ...DEFAULT_MAPPINGS };
    saveMappings();
    closeConfigModal();
    openConfigModal(); // Re-open with defaults
    showToast('Reset to defaults', 'success');
  }, { once: true });

  // Close button
  const closeBtn = document.getElementById('config-close-btn');
  closeBtn?.addEventListener('click', closeConfigModal, { once: true });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeConfigModal();
  }, { once: true });
}

function closeConfigModal() {
  const overlay = document.getElementById('config-modal-overlay');
  overlay?.classList.remove('active');
}

/**
 * Get the active task name.
 */
export function getActiveTask() {
  return activeTask;
}

/**
 * Get model for a specific task.
 */
export function getModelForTask(taskName) {
  return taskMappings[taskName] || DEFAULT_MAPPINGS[taskName];
}
