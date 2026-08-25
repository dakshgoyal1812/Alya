<div align="center">

# ✨ Alya — Your Private, Local AI Assistant

**Private. Multi-Platform. Always Ready.**  
*A personal AI assistant that runs entirely on your local machine or cloud LLMs, connecting seamlessly to WhatsApp, Discord, Telegram, Slack, and a voice-enabled web dashboard.*

[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/dakshgoyal1812/Alya)
[![Ollama Powered](https://img.shields.io/badge/Ollama-100%25_Local_AI-black?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.com)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](Dockerfile)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<br/>

> **Alya** is your 100% private AI assistant. Powered by local LLMs (Ollama) or fast inference (Groq), she connects directly to your daily messaging apps. Message her from WhatsApp, Discord, Telegram, Slack, or chat with voice through the sleek web UI — just like talking to a friend.

<br/>

</div>

---

## ✨ Key Features

<table>
  <tr>
    <td width="50%">
      <h3>🧠 100% Local & Privacy-First</h3>
      <p>Powered by Ollama (Llama 3.2, Mistral, etc.). No data ever leaves your device unless you choose cloud providers.</p>
    </td>
    <td width="50%">
      <h3>💬 Multi-Platform Messaging Bridges</h3>
      <p>Seamlessly chat with Alya across <b>WhatsApp, Discord, Telegram, Slack</b>, and the built-in Web Dashboard.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🎤 Real-Time Voice Chat</h3>
      <p>Integrated speech recognition and text-to-speech in the web dashboard — works smoothly on desktop and mobile phones.</p>
    </td>
    <td width="50%">
      <h3>📝 Contextual Persistent Memory</h3>
      <p>Alya remembers conversation history per platform and retains context across interactions.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>⚡ Real-Time Stream Responses</h3>
      <p>Instant token-by-token streaming responses in the Web UI for a snappy, fluid conversational experience.</p>
    </td>
    <td width="50%">
      <h3>🛠️ Guided Interactive Setup Wizard</h3>
      <p>Run <code>npm run setup</code> to connect Ollama, verify platforms, and configure bot tokens step-by-step.</p>
    </td>
  </tr>
</table>

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js 18+** — [Download Node.js](https://nodejs.org/)
- **Ollama** (for local inference) — [Download Ollama](https://ollama.com/)

### 1. Clone & Install
```bash
# Clone the repository
git clone https://github.com/dakshgoyal1812/Alya.git
cd Alya

# Install dependencies
npm install

# Pull an AI model in Ollama
ollama pull llama3.2
```

### 2. Run the Guided Setup Wizard
```bash
npm run setup
```
The setup wizard tests your Ollama / LLM connection and helps you enable Discord, Telegram, Slack, and WhatsApp.

### 3. Launch Alya
```bash
npm start
```
Open **`http://localhost:3000`** in your browser to access the Web Voice Dashboard!

---

## 📱 Platform Setup Guides

| Platform | Setup Steps |
| :--- | :--- |
| **🌐 Web Dashboard** | Starts automatically at `http://localhost:3000`. Click 🎤 to start voice conversation. |
| **💬 WhatsApp** | Scan QR code on startup via WhatsApp → *Linked Devices* → *Link a Device*. |
| **🎮 Discord** | Create bot on [Discord Developer Portal](https://discord.com/developers/applications), enable *Message Content Intent*, and paste bot token. |
| **✈️ Telegram** | Message [@BotFather](https://t.me/BotFather) on Telegram, create a bot, and paste the API token in setup. |
| **💼 Slack** | Create an app on [Slack API](https://api.slack.com/apps), enable Socket Mode, add Bot scopes (`app_mentions:read`, `chat:write`, `im:history`), and paste tokens. |

---

## 🗂️ Project Structure

```bash
Alya/
├── Dockerfile          # Containerized deployment configuration
├── package.json        # Dependencies & launch scripts
├── setup.js            # Interactive CLI configuration wizard
├── src/
│   ├── index.js        # Main application orchestrator
│   ├── core/
│   │   ├── config.js   # Configuration manager
│   │   ├── llm.js      # Ollama & LLM inference connector
│   │   ├── memory.js   # Persistent multi-platform memory
│   │   └── personality.js # Alya's persona and system prompt
│   └── bridges/
│       ├── discord.js  # Discord bot bridge
│       ├── telegram.js # Telegram bot bridge
│       ├── slack.js    # Slack bolt bridge
│       ├── whatsapp.js # WhatsApp Web bridge
│       └── web.js      # Express & WebSocket voice server
└── web/
    ├── index.html      # Glassmorphic web dashboard
    ├── style.css       # Icy cyan theme styles
    ├── app.js          # Client-side audio & speech logic
    └── alya.png        # Alya avatar asset
```

---

## 🤖 Built-In Commands

| Command | Action |
| :--- | :--- |
| `!clear` / `/clear` | Clears conversation memory for the current channel |
| `!help` / `/help` | Displays available features and usage guide |
| `!status` / `/status` | Verifies active platform bridges and LLM status |

---

## 🔒 Privacy Guarantee

- All AI inference runs locally on your machine via Ollama.
- Conversation memories are saved locally in private JSON data files.
- Zero tracking, zero telemetry, 100% data ownership.

---

## 👨‍💻 Author

**Daksh Goyal**  
* GitHub: [@dakshgoyal1812](https://github.com/dakshgoyal1812)  
* Portfolio: [my-cv-rosy-psi.vercel.app](https://my-cv-rosy-psi.vercel.app)
