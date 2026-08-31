// ============================================================
// 🛠️ Interactive Setup Wizard for Alya
// Creates and updates config/config.json
// ============================================================

import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_DIR = path.join(__dirname, "config");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
const DATA_DIR = path.join(__dirname, "data");

// Ensure directories exist
if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let existingConfig = {
  groq: {
    apiKey: "",
    apiKeys: [],
    model: "llama-3.3-70b-versatile"
  },
  web: {
    enabled: true,
    port: 3000
  },
  discord: {
    enabled: false,
    token: ""
  },
  telegram: {
    enabled: false,
    token: ""
  },
  slack: {
    enabled: false,
    botToken: "",
    appToken: "",
    signingSecret: ""
  },
  whatsapp: {
    enabled: false
  }
};

if (fs.existsSync(CONFIG_PATH)) {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    existingConfig = { ...existingConfig, ...JSON.parse(raw) };
  } catch (e) {
    // Ignore invalid config
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question, defaultValue = "") {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function main() {
  console.log("\n  ✨ Welcome to the Alya AI Assistant Setup Wizard!\n");

  // If non-interactive environment (CI or piped input), write default config
  if (!process.stdin.isTTY) {
    console.log("Non-interactive terminal detected. Generating default config.json...");
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(existingConfig, null, 2));
    console.log(`✅ Saved default config to ${CONFIG_PATH}\n`);
    rl.close();
    return;
  }

  const apiKey = await ask("Groq API Key", existingConfig.groq?.apiKey || "");
  const model = await ask("Groq Model", existingConfig.groq?.model || "llama-3.3-70b-versatile");
  const webPort = await ask("Web Dashboard Port", String(existingConfig.web?.port || 3000));

  const enableDiscord = (await ask("Enable Discord Bridge? (y/n)", existingConfig.discord?.enabled ? "y" : "n")).toLowerCase() === "y";
  let discordToken = existingConfig.discord?.token || "";
  if (enableDiscord) {
    discordToken = await ask("Discord Bot Token", discordToken);
  }

  const enableTelegram = (await ask("Enable Telegram Bridge? (y/n)", existingConfig.telegram?.enabled ? "y" : "n")).toLowerCase() === "y";
  let telegramToken = existingConfig.telegram?.token || "";
  if (enableTelegram) {
    telegramToken = await ask("Telegram Bot Token", telegramToken);
  }

  const config = {
    groq: {
      apiKey: apiKey,
      apiKeys: apiKey ? [apiKey] : [],
      model: model
    },
    web: {
      enabled: true,
      port: parseInt(webPort, 10) || 3000
    },
    discord: {
      enabled: enableDiscord,
      token: discordToken
    },
    telegram: {
      enabled: enableTelegram,
      token: telegramToken
    },
    slack: {
      enabled: existingConfig.slack?.enabled || false,
      botToken: existingConfig.slack?.botToken || "",
      appToken: existingConfig.slack?.appToken || "",
      signingSecret: existingConfig.slack?.signingSecret || ""
    },
    whatsapp: {
      enabled: existingConfig.whatsapp?.enabled || false
    }
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`\n✅ Setup complete! Configuration saved to ${CONFIG_PATH}`);
  console.log("Run 'npm start' to launch Alya.\n");
  rl.close();
}

main().catch((err) => {
  console.error("Setup error:", err);
  rl.close();
  process.exit(1);
});
