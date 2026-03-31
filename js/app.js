/* ============================================
   PolyChat — Main Application Entry
   ============================================ */

import { initModelSwitcher } from './models.js';
import { initTaskTags } from './tasks.js';
import { initTemplates } from './templates.js';
import { initChat, newChat, sendProgrammatic } from './chat.js';

/**
 * Initialize the entire application.
 */
function init() {
  // Initialize all modules
  initModelSwitcher();
  initTaskTags();
  initTemplates();
  initChat();

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

  // ── Keyboard Shortcuts ──
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N: New Chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      newChat();
    }

    // Ctrl/Cmd + /: Focus input
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      document.getElementById('chat-input')?.focus();
    }
  });

  console.log('🚀 PolyChat initialized');
}

// ── Boot ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
