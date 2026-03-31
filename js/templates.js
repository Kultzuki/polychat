/* ============================================
   PolyChat Prompt Templates
   ============================================ */

import { selectTask } from './tasks.js';

// ── Template Definitions ──
const TEMPLATES = [
  // Coding
  {
    id: 'explain-code',
    icon: '📖',
    label: 'Explain Code',
    task: 'coding',
    prompt: 'Please explain the following code in detail. Break down what each part does and why:\n\n```\n[Paste your code here]\n```',
    description: 'Get a clear explanation of any code'
  },
  {
    id: 'debug-error',
    icon: '🐛',
    label: 'Debug Error',
    task: 'coding',
    prompt: 'I\'m getting the following error. Please help me debug it:\n\n**Error:**\n```\n[Paste error message]\n```\n\n**Code:**\n```\n[Paste relevant code]\n```',
    description: 'Fix bugs and errors in your code'
  },
  {
    id: 'refactor',
    icon: '🔧',
    label: 'Refactor',
    task: 'coding',
    prompt: 'Please refactor the following code for better readability, performance, and maintainability. Explain the changes you made:\n\n```\n[Paste your code here]\n```',
    description: 'Clean up and improve code quality'
  },
  {
    id: 'unit-tests',
    icon: '🧪',
    label: 'Write Tests',
    task: 'coding',
    prompt: 'Write comprehensive unit tests for the following code. Include edge cases and use clear test descriptions:\n\n```\n[Paste your code here]\n```',
    description: 'Generate unit tests for a function'
  },

  // Creative
  {
    id: 'blog-post',
    icon: '✍️',
    label: 'Blog Post',
    task: 'creative',
    prompt: 'Write a well-structured blog post about the following topic. Include an engaging introduction, clear sections with headings, and a compelling conclusion:\n\nTopic: [Your topic here]',
    description: 'Draft a structured blog post'
  },
  {
    id: 'brainstorm',
    icon: '💡',
    label: 'Brainstorm',
    task: 'creative',
    prompt: 'Brainstorm 10 creative and unique ideas for the following. For each idea, include a brief description of why it would work:\n\nTopic: [Your topic here]',
    description: 'Generate creative ideas on any topic'
  },
  {
    id: 'rewrite-formal',
    icon: '👔',
    label: 'Make Formal',
    task: 'creative',
    prompt: 'Rewrite the following text in a professional, formal tone while preserving the original meaning:\n\n[Paste your text here]',
    description: 'Convert casual text to professional tone'
  },

  // General
  {
    id: 'summarize',
    icon: '📝',
    label: 'Summarize',
    task: 'general',
    prompt: 'Summarize the following text into concise key points. Highlight the most important information:\n\n[Paste your text here]',
    description: 'Extract key points from long text'
  },
  {
    id: 'eli5',
    icon: '🧒',
    label: 'ELI5',
    task: 'general',
    prompt: 'Explain the following concept in the simplest way possible, as if explaining to a 5-year-old. Use analogies and examples:\n\n[Your topic or concept here]',
    description: 'Simplify complex topics'
  },
  {
    id: 'pros-cons',
    icon: '⚖️',
    label: 'Pros & Cons',
    task: 'general',
    prompt: 'Provide a balanced analysis of the pros and cons for the following. Include at least 5 points for each side:\n\n[Your topic/decision here]',
    description: 'Get a balanced analysis'
  },
  {
    id: 'translate',
    icon: '🌐',
    label: 'Translate',
    task: 'general',
    prompt: 'Translate the following text to [target language]. Maintain the original tone and meaning:\n\n[Paste your text here]',
    description: 'Quick translation to any language'
  },
];

// ── DOM References ──
let templatesBar;

/**
 * Initialize prompt templates.
 */
export function initTemplates() {
  templatesBar = document.getElementById('templates-bar');
  renderTemplates();
}

/**
 * Render template chips.
 */
function renderTemplates() {
  if (!templatesBar) return;

  templatesBar.innerHTML = TEMPLATES.map(t => `
    <button class="template-chip tooltip" data-template="${t.id}" data-tooltip="${t.description}">
      <span class="chip-icon">${t.icon}</span>
      <span>${t.label}</span>
    </button>
  `).join('');

  // Attach click handlers
  templatesBar.querySelectorAll('.template-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const template = TEMPLATES.find(t => t.id === chip.dataset.template);
      if (template) applyTemplate(template);
    });
  });
}

/**
 * Apply a template — fills input and selects task tag.
 */
function applyTemplate(template) {
  const textarea = document.getElementById('chat-input');
  if (!textarea) return;

  // Set task tag (which auto-selects model)
  if (template.task) {
    selectTask(template.task);
  }

  // Fill input
  textarea.value = template.prompt;
  textarea.focus();

  // Trigger auto-resize
  textarea.dispatchEvent(new Event('input'));

  // Place cursor at the placeholder
  const placeholderMatch = template.prompt.match(/\[([^\]]+)\]/);
  if (placeholderMatch) {
    const start = template.prompt.indexOf(placeholderMatch[0]);
    const end = start + placeholderMatch[0].length;
    textarea.setSelectionRange(start, end);
  }
}

/**
 * Get all templates (for reference).
 */
export function getTemplates() {
  return [...TEMPLATES];
}
