// ============================================================
// 🧠 Memory Manager — Conversation History
// Stores conversation history per user/channel in JSON files
// All data stays local — privacy first! ✨
// ============================================================

import { readFileSync, writeFileSync, promises as fsPromises, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, "..", "..", "data", "conversations");

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * In-memory cache of conversations, periodically flushed to disk
 */
const conversations = new Map();

/**
 * Maximum messages to keep per conversation
 */
const MAX_HISTORY = 100;

/**
 * Get the file path for a conversation
 */
function getFilePath(platform, channelId) {
  const safeId = String(channelId).replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(DATA_DIR, `${platform}_${safeId}.json`);
}

/**
 * Generate a unique conversation key
 */
function getKey(platform, channelId) {
  return `${platform}:${channelId}`;
}

/**
 * Load a conversation from disk
 */
function loadFromDisk(platform, channelId) {
  const filePath = getFilePath(platform, channelId);
  try {
    if (existsSync(filePath)) {
      const data = JSON.parse(readFileSync(filePath, "utf-8"));
      return data.messages || [];
    }
  } catch (error) {
    console.error(`Error loading conversation ${platform}:${channelId}:`, error.message);
  }
  return [];
}

/**
 * Save a conversation to disk synchronously
 */
function saveToDisk(platform, channelId) {
  const key = getKey(platform, channelId);
  const messages = conversations.get(key) || [];
  const filePath = getFilePath(platform, channelId);

  try {
    writeFileSync(
      filePath,
      JSON.stringify(
        {
          platform,
          channelId,
          lastUpdated: new Date().toISOString(),
          messageCount: messages.length,
          messages,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(`Error saving conversation ${platform}:${channelId}:`, error.message);
  }
}

/**
 * Save a conversation to disk asynchronously
 */
async function saveToDiskAsync(platform, channelId) {
  const key = getKey(platform, channelId);
  const messages = conversations.get(key) || [];
  const filePath = getFilePath(platform, channelId);

  try {
    await fsPromises.writeFile(
      filePath,
      JSON.stringify(
        {
          platform,
          channelId,
          lastUpdated: new Date().toISOString(),
          messageCount: messages.length,
          messages,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(`Error saving conversation ${platform}:${channelId}:`, error.message);
  }
}

/**
 * Get conversation history for a platform + channel
 * @param {string} platform - 'discord' | 'telegram' | 'slack' | 'whatsapp' | 'web'
 * @param {string} channelId - Unique identifier for the conversation
 * @returns {Array} Array of {role, content, timestamp} messages
 */
export function getHistory(platform, channelId) {
  const key = getKey(platform, channelId);

  if (!conversations.has(key)) {
    const loaded = loadFromDisk(platform, channelId);
    conversations.set(key, loaded);
  }

  return conversations.get(key);
}

/**
 * Add a message to conversation history
 * @param {string} platform - The platform name
 * @param {string} channelId - The channel/user ID
 * @param {string} role - 'user' | 'assistant'
 * @param {string} content - Message content
 */
export function addMessage(platform, channelId, role, content) {
  const history = getHistory(platform, channelId);

  history.push({
    role,
    content,
    timestamp: new Date().toISOString(),
  });

  // Trim to max history
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  // Save to disk asynchronously every 5 messages
  if (history.length % 5 === 0) {
    saveToDiskAsync(platform, channelId);
  }
}

/**
 * Clear conversation history
 */
export function clearHistory(platform, channelId) {
  const key = getKey(platform, channelId);
  conversations.set(key, []);
  saveToDisk(platform, channelId);
}

/**
 * Flush all conversations to disk
 */
export function flushAll() {
  for (const [key] of conversations) {
    const colonIdx = key.indexOf(":");
    if (colonIdx !== -1) {
      const platform = key.substring(0, colonIdx);
      const channelId = key.substring(colonIdx + 1);
      saveToDisk(platform, channelId);
    }
  }
}

/**
 * Get conversation statistics
 */
export function getStats() {
  let totalMessages = 0;
  let totalConversations = 0;
  const platforms = {};

  for (const [key, messages] of conversations) {
    totalConversations++;
    totalMessages += messages.length;
    const colonIdx = key.indexOf(":");
    const platform = colonIdx !== -1 ? key.substring(0, colonIdx) : key;
    platforms[platform] = (platforms[platform] || 0) + 1;
  }

  return { totalMessages, totalConversations, platforms };
}

// Flush conversations to disk on exit
process.on("exit", flushAll);
