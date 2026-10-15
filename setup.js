import fs from "fs";
import path from "path";

const rootDir = process.cwd();

// Directories to create
const dirs = [
  path.join(rootDir, "data"),
  path.join(rootDir, "data", "conversations"),
  path.join(rootDir, "data", "temp"),
  path.join(rootDir, "config")
];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

const configPath = path.join(rootDir, "config", "config.json");
const defaultConfig = {
  ollama: {
    host: "http://localhost:11434",
    model: "llama3.2",
    contextWindow: 4096,
    temperature: 0.7
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

if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), "utf8");
  console.log(`Created default config: ${configPath}`);
} else {
  console.log(`Config file already exists: ${configPath}`);
}

console.log("Alya environment setup successfully completed!");
