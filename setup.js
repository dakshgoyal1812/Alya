import fs from "fs";
import path from "path";

const CONFIG_DIR = path.join(process.cwd(), "config");
const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

console.log("✨ Alya — Setup & Initializer Script");
console.log("──────────────────────────────────");

// Ensure directories exist
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  console.log("📁 Created config directory:", CONFIG_DIR);
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log("📁 Created data directory:", DATA_DIR);
}

// Default config
const DEFAULT_CONFIG = {
  groq: {
    apiKey: "PASTE_YOUR_GROQ_API_KEY",
    model: "llama-3.3-70b-versatile"
  },
  ollama: {
    host: "http://localhost:11434",
    model: "llama3.2",
    contextWindow: 4096,
    temperature: 0.7,
  },
  web: {
    enabled: true,
    port: 3000,
  },
  discord: {
    enabled: false,
    token: "",
  },
  telegram: {
    enabled: false,
    token: "",
  },
  slack: {
    enabled: false,
    botToken: "",
    appToken: "",
    signingSecret: "",
  },
  whatsapp: {
    enabled: false,
  },
};

if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
  console.log("📝 Generated default configuration file:", CONFIG_FILE);
} else {
  console.log("✅ Configuration file already exists.");
}

console.log("──────────────────────────────────");
console.log("🎉 Setup complete! You can now start Alya with: pnpm start\n");
