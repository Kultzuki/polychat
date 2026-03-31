# PolyChat ⚡

A premium multi-model AI chat app — chat with GPT, Claude, Gemini, and 500+ models from a single beautiful interface.

![PolyChat Screenshot](assets/logo.png)

## ✨ Features

- **Multi-Model Chat** — Switch between GPT-4o, Claude 3.7, Gemini 2.5, DeepSeek, Grok, and hundreds more
- **Task Tagging** — One-click task tags (Coding, Creative, Vision, General) that auto-select the best model
- **Prompt Templates** — 11 starter templates for common tasks like debugging, brainstorming, and summarizing
- **Real-Time Streaming** — Responses stream token-by-token as they're generated
- **Dynamic Model List** — Models auto-update from Puter.js — no hardcoding needed
- **Configurable Mappings** — Customize which model handles which task type
- **Premium Dark Theme** — Glassmorphism, gradient accents, smooth micro-animations
- **Fully Responsive** — Works on desktop, tablet, and mobile
- **Zero Backend** — Runs entirely in the browser via Puter.js

## 🚀 Quick Start

1. **Clone the repo**
   ```bash
   git clone https://github.com/kultzuki/polychat.git
   cd polychat
   ```

2. **Open locally**
   ```bash
   python3 -m http.server 8080
   # or use any static file server
   ```

3. **Visit** `http://localhost:8080`

4. **Sign in** to your [Puter](https://puter.com) account when prompted — this enables AI access

> **Note:** PolyChat uses Puter.js's user-pays model. Users authenticate with their own Puter account. No API keys needed from the developer.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML5 (semantic) |
| Styling | Vanilla CSS (custom properties) |
| Logic | Vanilla JavaScript (ES modules) |
| AI Backend | [Puter.js](https://puter.com) v2 |
| Fonts | Inter, JetBrains Mono |

## 📁 Project Structure

```
├── index.html          # Main app entry
├── css/
│   ├── variables.css   # Design tokens (100+ CSS custom properties)
│   ├── base.css        # Reset & typography
│   ├── animations.css  # Keyframes & transitions
│   ├── layout.css      # Responsive grid
│   ├── sidebar.css     # Sidebar & model switcher
│   ├── chat.css        # Chat messages & input
│   └── components.css  # Buttons, modals, toasts
├── js/
│   ├── app.js          # Entry point & initialization
│   ├── chat.js         # Chat engine with streaming
│   ├── models.js       # Dynamic model list from Puter
│   ├── tasks.js        # Task tagging system
│   ├── templates.js    # Prompt template definitions
│   └── utils.js        # Markdown, clipboard, helpers
└── assets/
    └── logo.png        # PolyChat logo
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift + Enter` | New line |
| `Ctrl/⌘ + N` | New chat |
| `Ctrl/⌘ + /` | Focus input |
| `Esc` | Close dropdowns |

## 🗺️ Roadmap

- [x] **Phase 1** — MVP: Chat UI, Model Switcher, Dark Theme, Task Tagging, Prompt Templates
- [ ] **Phase 2** — Polish: IndexedDB Chat History, System Prompt Editor, Export Chat, Token Estimator
- [ ] **Phase 3** — Differentiators: Multi-Model Comparison, Image Upload, Image Generation
- [ ] **Phase 4** — Portfolio Finish: React Migration, Code Tool Tab, Shareable Links

## 📄 License

MIT

---

Built with ⚡ by [@kultzuki](https://github.com/kultzuki)
