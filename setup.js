import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_DIR = path.join(__dirname, 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR);
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const defaultConfig = {
  ollama: {
    enabled: true,
    host: "http://localhost:11434/v1",
    model: "llama3.2"
  },
  groq: {
    apiKey: "PASTE_YOUR_GROQ_API_KEY_HERE",
    model: "llama-3.3-70b-versatile"
  },
  web: {
    enabled: true,
    port: 3000
  },
  discord: { enabled: false, token: "" },
  telegram: { enabled: false, token: "" },
  slack: { enabled: false, botToken: "", appToken: "", signingSecret: "" },
  whatsapp: { enabled: false }
};

if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
  console.log('✅ Configuration file created at config/config.json');
} else {
  console.log('ℹ️ Configuration file already exists.');
}

console.log('✅ Setup complete! You can now run "npm start".');
