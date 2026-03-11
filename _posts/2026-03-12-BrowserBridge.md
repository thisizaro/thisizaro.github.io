---
title: Browser Bridge
featured: false
layout: post
---

# BrowserBridge

### Personal Notes

Hey, so basically I was working on making an AI automation where I needed the AI agent to be able to use my real browser session. But I couldn't use typical automation tools like Puppeteer, Selenium, or headless browsers, because they run in separate browser instances and don’t easily reuse my existing login session, cookies, and browser state.

So I thought, why not make a minimal setup that allows me to control and use basic features of browsing programmatically from outside the browser. That’s how this project started. The initial goal was just to create a small bridge between external tools (like AI agents or automation workflows) and my actual browser session.

Over time, the idea evolved a bit and eventually turned into the current setup you see here.

If you have a better solution for this problem, or ideas to improve this project, definitely let me know! I’d love to hear it.

And yeah, of course you guessed it right… it's 2026+ (and maybe even later when you're reading this), so I explained the project to an AI and let it help write the README 😂. But hey, it's still pretty good. Have fun! 😼🤓

**Project Link:** [https://github.com/thisizaro/BrowserBridge](https://github.com/thisizaro/BrowserBridge)

---

# Introduction

BrowserBridge is a local browser automation interface that allows external systems such as AI agents, scripts, or workflow tools to control a real web browser through WebSocket commands.

Unlike traditional automation tools, BrowserBridge operates inside the user's actual browser session. This means it preserves:

- login sessions
- cookies
- local storage
- dynamically rendered pages

This makes it suitable for automating authenticated websites and modern JavaScript applications.

---

# Architecture

Controller (AI / scripts / n8n) communicates with the browser through a FastAPI WebSocket router.

```
Controller
    │
    │ WebSocket
    ▼
FastAPI Server
    │
    │ WebSocket
    ▼
Browser Extension
    │
    ▼
Browser Tabs / DOM
```

---

# Project Structure

```
browserbridge/
│
├── server/
│   └── main.py
│
├── extension/
│   ├── manifest.json
│   ├── background.js
│   └── content.js
│
├── client_test.py
├── requirements.txt
│
└── docs/
    └── commands.md
```

---

# Setup

## 1. Start the Python Server

Create and activate a virtual environment:

```
python -m venv venv
```

Activate it.

**Linux / Mac**

```
source venv/bin/activate
```

**Windows**

```
venv\Scripts\activate
```

Install dependencies:

```
pip install -r requirements.txt
```

Run the FastAPI server:

```
uvicorn main:app --reload --port 8000
```

WebSocket endpoints:

```
ws://localhost:8000/ws/browser
ws://localhost:8000/ws/controller
```

---

## 2. Install the Browser Extension

1. Open the Chrome extensions page:

```
chrome://extensions
```

2. Enable **Developer Mode**

3. Click **Load unpacked**

4. Select the `extension` folder

The extension will automatically connect to the server.

---

## 3. Test the System

Run the test controller:

```
python client_test.py
```

Example command sent to the browser:

```
{
  "type": "command",
  "id": "cmd_001",
  "action": "open_url",
  "params": {
    "url": "https://example.com"
  }
}
```

This will open the URL in a new browser tab.

---

# Documentation

Detailed command documentation is available in:

```
docs/commands.md
```

---

# Current Commands

- open_url
- get_html
- eval_js

Additional commands will be added in future versions.

---

# Roadmap

Upcoming improvements:

- command queue
- tab targeting
- page load waiting
- DOM query commands
- browser interaction commands
- AI automation support

---

# Status

This project is currently in early development.
