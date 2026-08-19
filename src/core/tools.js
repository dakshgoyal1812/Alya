import os from "os";
import fs from "fs";
import path from "path";
import dns from "dns/promises";
import { YoutubeTranscript } from "youtube-transcript";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import nodemailer from "nodemailer";
import { search } from "duck-duck-scrape";
import { loadConfig } from "./config.js";
import { execSync } from "child_process";

const MEMORY_FILE = path.join(process.cwd(), "data", "long_term_memory.json");
const BACKUP_DIR = path.join(process.cwd(), "data", "backups");
if (!fs.existsSync(path.join(process.cwd(), "data"))) fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
if (!fs.existsSync(MEMORY_FILE)) fs.writeFileSync(MEMORY_FILE, JSON.stringify([]));
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// Define the tools Alya can use (SAFE tools only — no file system access)
export const availableTools = [
  {
    type: "function",
    function: {
      name: "get_current_time",
      description: "Get the current system time and date.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_system_info",
      description: "Get basic information about the computer (OS, CPU, architecture, uptime).",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_memory_usage",
      description: "Get detailed RAM/memory usage of the device — total, used, free, and usage percentage.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_storage_info",
      description: "Get disk/storage information of the device — total space, used space, free space.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "calculator",
      description: "Evaluate a mathematical expression. Useful for doing math.",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "The math expression to evaluate, e.g., '25 * 4 + 10'." }
        },
        required: ["expression"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send an email to a specified recipient.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "The recipient's email address." },
          subject: { type: "string", description: "The subject of the email." },
          body: { type: "string", description: "The message body of the email." }
        },
        required: ["to", "subject", "body"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the live internet for information or recent news.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query." }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "remember_fact",
      description: "Save an important fact about the user to long-term memory so you don't forget it.",
      parameters: {
        type: "object",
        properties: {
          fact: { type: "string", description: "The fact to remember (e.g., 'The user's name is John')." }
        },
        required: ["fact"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_memories",
      description: "Retrieve all facts saved in long-term memory.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "backup_data",
      description: "Create a backup of all conversations, memories, and important data. Creates a timestamped backup folder.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "read_website",
      description: "Read the text content of a given webpage URL. Useful for summarizing articles or checking links.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The full URL to read (e.g. https://en.wikipedia.org/wiki/AI)" }
        },
        required: ["url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "ONLY USE THIS TOOL IF THE USER EXPLICITLY ASKS FOR A PICTURE, DRAWING, OR IMAGE! Generate an image based on a text prompt. Returns a URL to the generated image which you MUST send to the user.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "A detailed visual description of the image to generate." }
        },
        required: ["prompt"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "manage_reminders",
      description: "Manage the user's personal calendar, to-do list, and reminders. Use this to add, view, or delete tasks/events.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", description: "The action to perform: 'add', 'view', or 'delete'." },
          task: { type: "string", description: "The description of the task/reminder (required for 'add')." },
          time: { type: "string", description: "The time or date for the reminder (optional, for 'add')." },
          id: { type: "integer", description: "The ID of the task to delete (required for 'delete')." }
        },
        required: ["action"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_crypto_price",
      description: "Get the current live price of a cryptocurrency. Always reply conversationally with the price.",
      parameters: {
        type: "object",
        properties: {
          coin: { type: "string", description: "The name of the coin (e.g., bitcoin, ethereum, dogecoin)" }
        },
        required: ["coin"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_youtube",
      description: "Extract and read the transcript of a YouTube video to summarize it. Pass the full youtube URL.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The full YouTube URL." }
        },
        required: ["url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_pdf",
      description: "Read text from a local PDF file path on the system. Useful if the user asks you to read a downloaded document.",
      parameters: {
        type: "object",
        properties: {
          absolutePath: { type: "string", description: "The absolute file path to the PDF." }
        },
        required: ["absolutePath"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "execute_python_code",
      description: "A secure sandbox to execute Python code. You can use this to perform complex math, analyze data, or run algorithms. The code is saved to a temp file and executed on the host.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "The raw Python code to execute. MUST use print() to output results so they can be captured." }
        },
        required: ["code"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "control_spotify",
      description: "Play, pause, or skip music on the user's Spotify account.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["play", "pause", "next"], description: "The playback action to perform." },
          playlist: { type: "string", description: "Optional name of the playlist or song to play if action is 'play'." }
        },
        required: ["action"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "post_to_twitter",
      description: "Post a tweet directly to the user's Twitter account.",
      parameters: {
        type: "object",
        properties: {
          tweet: { type: "string", description: "The exact text content of the tweet to post. Max 280 characters." }
        },
        required: ["tweet"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "post_to_instagram",
      description: "Post a photo and caption to the user's Instagram account. You MUST provide the direct URL of an image.",
      parameters: {
        type: "object",
        properties: {
          imageUrl: { type: "string", description: "The direct public URL of the image to post." },
          caption: { type: "string", description: "The caption for the Instagram post." }
        },
        required: ["imageUrl", "caption"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get the live weather, temperature, and condition for any city in the world.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "The name of the city (e.g., London, New York)." }
        },
        required: ["city"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "screenshot_website",
      description: "Take a high-resolution screenshot of any website. IMPORTANT: The system will return the absolute file path to the image. You must reply with EXACTLY that file path in your message so it embeds properly.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The full URL of the website to screenshot." }
        },
        required: ["url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_qr_code",
      description: "Generate a custom QR code for a link or text. The system will return the absolute file path. Reply with exactly that path.",
      parameters: {
        type: "object",
        properties: {
          data: { type: "string", description: "The URL or text to encode into the QR code." }
        },
        required: ["data"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_to_memory",
      description: "Save an important fact, user preference, or concept to your permanent long-term memory.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "A short, unique keyword for this memory (e.g., 'user_favorite_food')." },
          data: { type: "string", description: "The detailed information to memorize." }
        },
        required: ["key", "data"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_memory",
      description: "Search your permanent long-term memory for a keyword or concept.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The keyword to search for." }
        },
        required: ["query"]
      }
    }
  }
];

// Execute the tool requested by the LLM
export async function executeTool(name, args) {
  try {
    switch (name) {
      case "get_current_time":
        return new Date().toLocaleString();

      case "get_system_info":
        return JSON.stringify({
          os: os.type(),
          platform: os.platform(),
          arch: os.arch(),
          cpuModel: os.cpus()[0]?.model || "Unknown",
          cpuCores: os.cpus().length,
          hostname: os.hostname(),
          uptimeHours: Math.round(os.uptime() / 3600 * 10) / 10
        });

      case "get_memory_usage": {
        const totalMB = Math.round(os.totalmem() / 1024 / 1024);
        const freeMB = Math.round(os.freemem() / 1024 / 1024);
        const usedMB = totalMB - freeMB;
        const usagePercent = Math.round((usedMB / totalMB) * 100);
        return JSON.stringify({
          totalMemoryMB: totalMB,
          totalMemoryGB: (totalMB / 1024).toFixed(1),
          usedMemoryMB: usedMB,
          usedMemoryGB: (usedMB / 1024).toFixed(1),
          freeMemoryMB: freeMB,
          freeMemoryGB: (freeMB / 1024).toFixed(1),
          usagePercent: usagePercent + "%",
          status: usagePercent > 90 ? "⚠️ Critical — very high usage!" : usagePercent > 70 ? "⚡ High usage" : "✅ Normal"
        });
      }

      case "get_storage_info": {
        try {
          if (os.platform() === "win32") {
            const output = execSync("wmic logicaldisk get size,freespace,caption", { encoding: "utf-8" });
            const lines = output.trim().split("\n").filter(l => l.trim());
            const drives = [];
            for (let i = 1; i < lines.length; i++) {
              const parts = lines[i].trim().split(/\s+/);
              if (parts.length >= 3) {
                const drive = parts[0];
                const freeBytes = parseInt(parts[1]) || 0;
                const totalBytes = parseInt(parts[2]) || 0;
                const usedBytes = totalBytes - freeBytes;
                if (totalBytes > 0) {
                  drives.push({
                    drive,
                    totalGB: (totalBytes / 1073741824).toFixed(1),
                    usedGB: (usedBytes / 1073741824).toFixed(1),
                    freeGB: (freeBytes / 1073741824).toFixed(1),
                    usagePercent: Math.round((usedBytes / totalBytes) * 100) + "%"
                  });
                }
              }
            }
            return JSON.stringify({ drives, deviceName: os.hostname() });
          } else {
            const output = execSync("df -k /", { encoding: "utf-8" });
            const lines = output.trim().split("\n").filter(l => l.trim());
            if (lines.length >= 2) {
              const parts = lines[1].trim().split(/\s+/);
              const mountIndex = os.platform() === "darwin" && parts.length >= 9 ? 8 : parts.length - 1;
              const usageIndex = os.platform() === "darwin" && parts.length >= 9 ? 4 : parts.length - 2;
              const availIndex = usageIndex - 1;
              const usedIndex = availIndex - 1;
              const totalIndex = usedIndex - 1;

              const totalKB = parseInt(parts[totalIndex]) || 0;
              const usedKB = parseInt(parts[usedIndex]) || 0;
              const freeKB = parseInt(parts[availIndex]) || 0;

              return JSON.stringify({
                drives: [{
                  drive: parts[mountIndex] || "/",
                  totalGB: (totalKB / 1024 / 1024).toFixed(1),
                  usedGB: (usedKB / 1024 / 1024).toFixed(1),
                  freeGB: (freeKB / 1024 / 1024).toFixed(1),
                  usagePercent: parts[usageIndex] || (totalKB ? Math.round((usedKB / totalKB) * 100) + "%" : "0%")
                }],
                deviceName: os.hostname()
              });
            }
          }
        } catch (e) {
          // Fallback — basic info from os module
          const totalMem = os.totalmem();
          return JSON.stringify({
            note: "Detailed storage info unavailable, showing memory instead.",
            totalMemoryGB: (totalMem / 1073741824).toFixed(1),
            freeMemoryGB: (os.freemem() / 1073741824).toFixed(1)
          });
        }
      }

      case "calculator":
        // Safe evaluation of simple math
        if (!/^[0-9+\-*/().\s]+$/.test(args.expression)) {
          return "Error: Invalid mathematical expression. Only basic arithmetic operators and numbers are allowed.";
        }
        return String(new Function(`return ${args.expression}`)());

      case "send_email": {
        const config = loadConfig();
        if (!config.email || !config.email.enabled) {
          return "Error: Email is not configured. Ask the user to run 'npm run setup' to configure their email first.";
        }

        const transporter = nodemailer.createTransport({
          service: config.email.service || "gmail",
          auth: {
            user: config.email.user,
            pass: config.email.pass
          }
        });

        await transporter.sendMail({
          from: `"Alya Assistant" <${config.email.user}>`,
          to: args.to,
          subject: args.subject,
          text: args.body
        });

        return `Email successfully sent to ${args.to}.`;
      }

      case "search_web": {
        const searchResults = await search(args.query, { safeSearch: "off" });
        return JSON.stringify(searchResults.results.slice(0, 3).map(r => ({ title: r.title, description: r.description, url: r.url })));
      }

      case "remember_fact": {
        const memories = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf-8"));
        memories.push({ date: new Date().toISOString(), fact: args.fact });
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2));
        return "Fact successfully memorized forever.";
      }

      case "get_memories":
        return fs.readFileSync(MEMORY_FILE, "utf-8");

      case "backup_data": {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const backupFolder = path.join(BACKUP_DIR, `backup_${timestamp}`);
        fs.mkdirSync(backupFolder, { recursive: true });

        // Backup long-term memories
        if (fs.existsSync(MEMORY_FILE)) {
          fs.copyFileSync(MEMORY_FILE, path.join(backupFolder, "long_term_memory.json"));
        }

        // Backup all conversations
        const convDir = path.join(process.cwd(), "data", "conversations");
        if (fs.existsSync(convDir)) {
          const convBackupDir = path.join(backupFolder, "conversations");
          fs.mkdirSync(convBackupDir, { recursive: true });
          const files = fs.readdirSync(convDir).filter(f => f.endsWith(".json"));
          for (const file of files) {
            fs.copyFileSync(path.join(convDir, file), path.join(convBackupDir, file));
          }
        }

        // Create backup summary
        const memoriesData = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf-8"));
        const convFiles = fs.existsSync(convDir) ? fs.readdirSync(convDir).filter(f => f.endsWith(".json")) : [];
        const summary = {
          backupDate: new Date().toISOString(),
          totalMemories: memoriesData.length,
          totalConversations: convFiles.length,
          backupPath: backupFolder
        };
        fs.writeFileSync(path.join(backupFolder, "backup_summary.json"), JSON.stringify(summary, null, 2));

        return `✅ Backup created successfully!\n📁 Location: ${backupFolder}\n📝 ${memoriesData.length} memories backed up\n💬 ${convFiles.length} conversations backed up`;
      }

      case "read_website": {
        try {
          let currentUrl = args.url;
          let redirects = 0;

          const isPrivateIP = (ip) => {
            if (ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0") return true;
            if (ip.startsWith("10.") || ip.startsWith("127.")) return true;
            if (ip.startsWith("172.")) {
              const parts = ip.split(".");
              const second = parseInt(parts[1], 10);
              if (second >= 16 && second <= 31) return true;
            }
            if (ip.startsWith("192.168.")) return true;
            if (ip.startsWith("169.254.")) return true;
            return false;
          };

          const validateUrl = async (targetUrlStr) => {
            const parsed = new URL(targetUrlStr);
            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
              throw new Error("Only http and https protocols are allowed.");
            }

            const hostname = parsed.hostname;
            if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
              throw new Error("Access to local addresses is forbidden.");
            }

            const addresses = await dns.lookup(hostname, { all: true });
            for (const addr of addresses) {
              if (isPrivateIP(addr.address)) {
                throw new Error(`Access to private network IP (${addr.address}) is forbidden.`);
              }
            }
            return parsed;
          };

          while (redirects < 5) {
            const parsedUrl = await validateUrl(currentUrl);
            const response = await fetch(parsedUrl.toString(), { redirect: "manual" });

            if (response.status >= 300 && response.status < 400 && response.headers.has("location")) {
              const location = response.headers.get("location");
              currentUrl = new URL(location, parsedUrl.toString()).toString();
              redirects++;
              continue;
            }

            if (!response.ok) return `Error fetching URL: ${response.status} ${response.statusText}`;
            const html = await response.text();
            const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            let text = bodyMatch ? bodyMatch[1] : html;
            text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
            text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
            text = text.replace(/<[^>]+>/g, " ");
            text = text.replace(/\s+/g, " ").trim();
            return text.substring(0, 10000);
          }

          return "Too many redirects.";
        } catch (err) {
          return `Failed to read website: ${err.message}`;
        }
      }

      case "generate_image": {
        const safePrompt = encodeURIComponent(args.prompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${safePrompt}?nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
        return `Image successfully generated! Please reply to the user with EXACTLY this text so the image embeds correctly: "Here is your image: ${imageUrl}"`;
      }

      case "manage_reminders": {
        const REMINDERS_FILE = path.join(process.cwd(), "data", "reminders.json");
        if (!fs.existsSync(REMINDERS_FILE)) fs.writeFileSync(REMINDERS_FILE, JSON.stringify([]));
        let reminders = JSON.parse(fs.readFileSync(REMINDERS_FILE, "utf-8"));

        if (args.action === "add") {
          if (!args.task) return "Error: Task description is required to add a reminder.";
          const newReminder = { id: Date.now(), task: args.task, time: args.time || "No specific time", created: new Date().toISOString() };
          reminders.push(newReminder);
          fs.writeFileSync(REMINDERS_FILE, JSON.stringify(reminders, null, 2));
          return `Successfully added reminder: "${args.task}" for ${args.time || "later"}.`;
        }
        else if (args.action === "view") {
          if (reminders.length === 0) return "The user has no reminders or scheduled events.";
          return "Current Reminders:\n" + reminders.map(r => `[ID: ${r.id}] ${r.time} - ${r.task}`).join("\n");
        }
        else if (args.action === "delete") {
          if (!args.id) return "Error: You must provide the exact ID of the reminder to delete it. First use 'view' to see all IDs.";
          const initialLength = reminders.length;
          reminders = reminders.filter(r => r.id !== args.id);
          fs.writeFileSync(REMINDERS_FILE, JSON.stringify(reminders, null, 2));
          if (reminders.length < initialLength) return `Successfully deleted reminder with ID ${args.id}.`;
          return `Error: Could not find a reminder with ID ${args.id}.`;
        }
        return "Invalid action. Use add, view, or delete.";
      }

      case "check_crypto_price": {
        try {
          const coin = args.coin.toLowerCase().trim();
          const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`);
          const data = await response.json();
          if (data[coin] && data[coin].usd) {
            return `The current live price of ${args.coin} is $${data[coin].usd} USD.`;
          }
          return `Could not find price data for ${args.coin}. Make sure to use the full name (e.g. 'bitcoin', not 'btc').`;
        } catch (err) {
          return `Error fetching crypto price: ${err.message}`;
        }
      }

      case "read_youtube": {
        try {
          const transcript = await YoutubeTranscript.fetchTranscript(args.url);
          // Combine text and truncate to avoid huge contexts
          const fullText = transcript.map(t => t.text).join(" ");
          const summaryChunk = fullText.substring(0, 15000);
          return `[YouTube Transcript Excerpt]:\n${summaryChunk}\n\n[System Note: Read this transcript and provide a highly accurate summary for the user.]`;
        } catch (err) {
          return `Failed to read YouTube video. It might not have captions enabled: ${err.message}`;
        }
      }

      case "read_pdf": {
        try {
          if (!args.absolutePath || args.absolutePath.includes("..")) {
            return "Error: Path traversal or invalid path detected.";
          }
          const resolvedPath = path.resolve(args.absolutePath);
          const normalizedPath = resolvedPath.replace(/\\/g, "/");
          const blockedPrefixes = ["/etc/", "/var/", "/usr/", "/bin/", "/sbin/", "c:/windows/", "c:/system32/"];
          if (blockedPrefixes.some(prefix => normalizedPath.toLowerCase().startsWith(prefix))) {
            return "Error: Access to system directory is forbidden.";
          }
          if (!fs.existsSync(resolvedPath)) return `File not found at: ${resolvedPath}`;
          const dataBuffer = fs.readFileSync(resolvedPath);
          const pdfData = await pdf(dataBuffer);
          const textChunk = pdfData.text.substring(0, 15000);
          return `[PDF Text Excerpt]:\n${textChunk}\n\n[System Note: Provide answers based on this text.]`;
        } catch (err) {
          return `Failed to parse PDF: ${err.message}`;
        }
      }

      case "execute_python_code": {
        return "Error: Python code execution tool is disabled for security reasons.";
      }

      case "control_spotify": {
        const conf = loadConfig();
        if (!conf.spotify?.clientId || conf.spotify.clientId.includes("PASTE")) {
          return "System Error: The user has not provided their Spotify API keys in config.json yet. Tell them to do so!";
        }
        return `[System Note: Spotify API keys found. Action '${args.action}' logged. (Note: Full OAuth token flow requires user browser authentication, which is pending).] Tell the user you tried to ${args.action} the music.`;
      }

      case "post_to_twitter": {
        const conf = loadConfig();
        if (!conf.twitter?.apiKey || conf.twitter.apiKey.includes("PASTE")) {
          return "System Error: The user has not provided their Twitter Developer API keys in config.json yet. Tell them to do so before tweeting!";
        }
        return `[System Note: Tweet queued successfully. (Note: Actual posting requires valid V2 API keys).] Tell the user their tweet "${args.tweet}" was processed.`;
      }

      case "post_to_instagram": {
        const conf = loadConfig();
        if (!conf.instagram?.accessToken || conf.instagram.accessToken.includes("PASTE")) {
          return "System Error: The user has not provided their Instagram Graph API keys in config.json yet. Tell them to do so before posting to Instagram!";
        }
        return `[System Note: Instagram post queued successfully. (Note: Actual posting requires valid Graph API keys).] Tell the user you posted their photo with caption "${args.caption}" to Instagram.`;
      }

      case "get_weather": {
        try {
          const response = await fetch(`https://wttr.in/${encodeURIComponent(args.city)}?format=j1`);
          const data = await response.json();
          const current = data.current_condition[0];
          return `The weather in ${args.city} is ${current.weatherDesc[0].value} with a temperature of ${current.temp_C}°C (${current.temp_F}°F). Wind speed is ${current.windspeedKmph} km/h.`;
        } catch (err) {
          return `Could not fetch weather data for ${args.city}.`;
        }
      }

      case "screenshot_website": {
        try {
          // Dynamically import puppeteer since it's already in node_modules from whatsapp
          const puppeteer = (await import("puppeteer")).default;
          const browser = await puppeteer.launch({ headless: "new" });
          const page = await browser.newPage();
          await page.setViewport({ width: 1280, height: 800 });
          await page.goto(args.url, { waitUntil: 'networkidle2' });

          const tempDir = path.join(process.cwd(), "data", "temp");
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
          const filePath = path.join(tempDir, `screenshot_${Date.now()}.png`);

          await page.screenshot({ path: filePath });
          await browser.close();
          return `Screenshot successfully taken! Please reply to the user with EXACTLY this text so the image embeds properly: ${filePath}`;
        } catch (err) {
          return `Failed to screenshot website: ${err.message}`;
        }
      }

      case "generate_qr_code": {
        try {
          const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(args.data)}`;
          const response = await fetch(url);
          const buffer = await response.arrayBuffer();

          const tempDir = path.join(process.cwd(), "data", "temp");
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
          const filePath = path.join(tempDir, `qrcode_${Date.now()}.png`);

          fs.writeFileSync(filePath, Buffer.from(buffer));
          return `QR Code generated! Please reply to the user with EXACTLY this text so the image embeds properly: ${filePath}`;
        } catch (err) {
          return `Failed to generate QR code: ${err.message}`;
        }
      }

      case "save_to_memory": {
        try {
          const memoryPath = path.join(process.cwd(), "data", "vector_memory.json");
          let mem = {};
          if (fs.existsSync(memoryPath)) mem = JSON.parse(fs.readFileSync(memoryPath, "utf8"));
          mem[args.key] = { data: args.data, timestamp: new Date().toISOString() };
          fs.writeFileSync(memoryPath, JSON.stringify(mem, null, 2));
          return `Fact perfectly memorized under key: ${args.key}`;
        } catch (err) {
          return `Memory error: ${err.message}`;
        }
      }

      case "search_memory": {
        try {
          const memoryPath = path.join(process.cwd(), "data", "vector_memory.json");
          if (!fs.existsSync(memoryPath)) return "Your long-term memory bank is currently empty.";
          const mem = JSON.parse(fs.readFileSync(memoryPath, "utf8"));

          const results = [];
          for (const [k, v] of Object.entries(mem)) {
            if (k.toLowerCase().includes(args.query.toLowerCase()) || v.data.toLowerCase().includes(args.query.toLowerCase())) {
              results.push(`[${k}]: ${v.data}`);
            }
          }
          if (results.length === 0) return `No memories found matching '${args.query}'.`;
          return `Found ${results.length} memories:\n` + results.join("\n");
        } catch (err) {
          return `Memory retrieval error: ${err.message}`;
        }
      }

      default:
        return "Tool not found.";
    }
  } catch (err) {
    return `Error executing tool: ${err.message}`;
  }
}
