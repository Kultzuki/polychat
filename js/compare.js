/* ============================================
   PolyChat Multi-Model Comparison
   ============================================ */

import { renderMarkdown, formatTime, generateId, getProviderInfo, formatModelName, scrollToBottom } from './utils.js';
import { getSystemPrompt } from './systemPrompt.js';
import { estimateTokens, formatTokenCount } from './export.js';

// ── State ──
let isComparing = false;

/**
 * Send the same prompt to multiple models in parallel.
 * @param {string} prompt - User's prompt
 * @param {string[]} models - Array of model IDs to compare
 * @param {HTMLElement} container - DOM container to render results
 */
export async function compareModels(prompt, models, container) {
  if (!prompt || !models.length || isComparing) return;
  isComparing = true;

  // Create comparison layout
  const comparisonId = generateId();
  const wrapper = document.createElement('div');
  wrapper.className = 'comparison-wrapper message-enter';
  wrapper.id = `compare-${comparisonId}`;

  // Header
  wrapper.innerHTML = `
    <div class="comparison-header">
      <span class="comparison-label">⚔️ Comparing ${models.length} models</span>
      <span class="comparison-prompt">"${prompt.length > 80 ? prompt.slice(0, 80) + '…' : prompt}"</span>
    </div>
    <div class="comparison-grid" id="grid-${comparisonId}" style="grid-template-columns: repeat(${Math.min(models.length, 3)}, 1fr);">
      ${models.map((model, i) => {
        const provider = getProviderInfo(model);
        return `
          <div class="comparison-card" id="card-${comparisonId}-${i}">
            <div class="comparison-card__header">
              <div class="comparison-card__model">
                <span class="model-dropdown__item-icon ${provider.cssClass}">${provider.icon}</span>
                <span>${formatModelName(model)}</span>
              </div>
              <span class="comparison-card__tokens" id="tokens-${comparisonId}-${i}">—</span>
            </div>
            <div class="comparison-card__body" id="body-${comparisonId}-${i}">
              <div class="typing-indicator">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
              </div>
            </div>
            <div class="comparison-card__footer" id="footer-${comparisonId}-${i}">
              <span class="comparison-card__time" id="time-${comparisonId}-${i}">...</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.appendChild(wrapper);
  scrollToBottom(container.closest('.chat-container'));

  // Fire all requests in parallel
  const startTimes = models.map(() => Date.now());

  const promises = models.map(async (model, i) => {
    const bodyEl = document.getElementById(`body-${comparisonId}-${i}`);
    const timeEl = document.getElementById(`time-${comparisonId}-${i}`);
    const tokenEl = document.getElementById(`tokens-${comparisonId}-${i}`);

    try {
      const systemPrompt = getSystemPrompt(model);
      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      const response = await puter.ai.chat(messages, { model, stream: true });

      let fullText = '';
      for await (const part of response) {
        const chunk = part?.text || '';
        fullText += chunk;
        if (bodyEl) bodyEl.innerHTML = renderMarkdown(fullText);
        scrollToBottom(container.closest('.chat-container'), false);
      }

      const elapsed = ((Date.now() - startTimes[i]) / 1000).toFixed(1);
      if (timeEl) timeEl.textContent = `${elapsed}s`;
      if (tokenEl) tokenEl.textContent = formatTokenCount(estimateTokens(fullText));

      return { model, text: fullText, time: elapsed, error: null };
    } catch (err) {
      if (bodyEl) bodyEl.innerHTML = `<p style="color: #ef4444;">Error: ${err.message}</p>`;
      if (timeEl) timeEl.textContent = 'Failed';
      return { model, text: '', time: 0, error: err.message };
    }
  });

  await Promise.allSettled(promises);
  isComparing = false;
}

/**
 * Check if a comparison is currently running.
 */
export function isComparisonRunning() {
  return isComparing;
}
