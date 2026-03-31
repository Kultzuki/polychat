# PolyChat ⚡

A premium multi-model AI chat app — chat with GPT, Claude, Gemini, and 500+ models from a single beautiful interface. Compare models side-by-side, generate images, and export conversations.

![PolyChat Screenshot](assets/logo.png)

## ✨ Features

### Core Chat
- **Multi-Model Chat** — Switch between GPT-4o, Claude 3.7, Gemini 2.5, DeepSeek, Grok, and hundreds more
- **Real-Time Streaming** — Responses stream token-by-token as they're generated
- **Dynamic Model List** — Models auto-update from Puter.js — no hardcoding needed
- **Syntax Highlighting** — Code blocks are highlighted using highlight.js
- **Markdown Rendering** — AI responses render bold, italic, code, lists, links, and headings

### Smart Features
- **Task Tagging** — One-click tags (Coding, Creative, Vision, General) auto-select the best model
- **Configurable Mappings** — Customize which model handles which task type
- **System Prompts** — Set global or per-model system prompts to shape AI behavior
- **Prompt Templates** — 11 starter templates for debugging, brainstorming, summarizing, and more
- **Token Estimator** — Live token count displayed in the toolbar

### Multi-Model Comparison
- **Side-by-Side** — Send the same prompt to multiple models and compare responses
- **Parallel Streaming** — All models stream simultaneously
- **Response Timing** — See how fast each model responds

### Image Features
- **Image Upload** — Attach images and ask vision-capable models about them
- **Image Generation** — Generate images from text prompts via DALL·E

### Persistence & Sharing
- **Chat History** — Conversations saved to IndexedDB (not localStorage — handles unlimited data)
- **Export Chat** — Download as Markdown or JSON
- **Shareable Links** — URL-encoded chat export for instant sharing
- **Premium Dark Theme** — Glassmorphism, gradient accents, smooth micro-animations

## 🚀 Quick Start

1. **Clone the repo**
   ```bash
   git clone https://github.com/kultzuki/polychat.git
   cd polychat
   ```

2. **Open locally**
   ```bash
   python3 -m http.server 8080
   ```

3. **Visit** `http://localhost:8080`

4. **Sign in** to [Puter](https://puter.com) when prompted — this enables AI access

> **Note:** PolyChat uses Puter.js's user-pays model. Users authenticate with their own Puter account. No API keys needed from the developer.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML5 (semantic) |
| Styling | Vanilla CSS (custom properties, 100+ design tokens) |
| Logic | Vanilla JavaScript (ES modules) |
| AI Backend | [Puter.js](https://puter.com) v2 |
| Storage | IndexedDB (async, no size limits) |
| Syntax | [highlight.js](https://highlightjs.org/) 11.9 |
| Fonts | Inter, JetBrains Mono |

## 📁 Project Structure

```
├── index.html              # Main app entry
├── css/
│   ├── variables.css       # Design tokens (100+ CSS custom properties)
│   ├── base.css            # Reset & typography
│   ├── animations.css      # 12 keyframes & transitions
│   ├── layout.css          # Responsive grid layout
│   ├── sidebar.css         # Sidebar, model switcher, task tags
│   ├── chat.css            # Chat messages, input, welcome
│   ├── components.css      # Buttons, modals, toasts, chips
│   └── features.css        # Comparison, image, history, export styles
├── js/
│   ├── app.js              # Entry point & initialization
│   ├── chat.js             # Chat engine with streaming + persistence
│   ├── models.js           # Dynamic model list from Puter
│   ├── tasks.js            # Task tagging & model mapping
│   ├── templates.js        # 11 prompt templates
│   ├── utils.js            # Markdown, clipboard, helpers
│   ├── storage.js          # IndexedDB chat persistence
│   ├── systemPrompt.js     # Global & per-model system prompts
│   ├── export.js           # Markdown/JSON export + token estimator
│   ├── compare.js          # Multi-model comparison engine
│   ├── imageFeatures.js    # Image upload & generation
│   └── share.js            # Shareable URL links
├── assets/
│   └── logo.png            # PolyChat logo
├── vercel.json             # Deployment config
└── README.md
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift + Enter` | New line |
| `Ctrl/⌘ + N` | New chat |
| `Ctrl/⌘ + /` | Focus input |
| `Esc` | Close dropdowns |

## 🚢 Deployment

PolyChat is a static site — deploy anywhere:

```bash
# Vercel (recommended)
npx vercel

# Or any static host
# GitHub Pages, Netlify, Cloudflare Pages, etc.
```

## 📄 License

MIT

---

Built with ⚡ by [@kultzuki](https://github.com/kultzuki)
