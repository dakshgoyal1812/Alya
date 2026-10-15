// ============================================================
// 🧠 Memory Manager — Conversation History
// Stores conversation history per user/channel in JSON files
// All data stays local — privacy first! ✨
// ============================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync, promises as fsPromises } from "fs";
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
 * Helper to construct the conversation payload for serialization
 */
function serializeConversation(platform, channelId, messages) {
  return JSON.stringify(
    {
      platform,
      channelId,
      lastUpdated: new Date().toISOString(),
      messageCount: messages.length,
      messages,
    },
    null,
    2
  );
}

/**
 * Save a conversation to disk synchronously (used in exit/flush handlers)
 */
function saveToDisk(platform, channelId) {
  const key = getKey(platform, channelId);
  const messages = conversations.get(key) || [];
  const filePath = getFilePath(platform, channelId);

  try {
    writeFileSync(filePath, serializeConversation(platform, channelId, messages));
  } catch (error) {
    console.error(`Error saving conversation ${platform}:${channelId}:`, error.message);
  }
}

/**
 * Save a conversation to disk asynchronously (used for periodic saves to prevent blocking)
 */
async function saveToDiskAsync(platform, channelId) {
  const key = getKey(platform, channelId);
  const messages = conversations.get(key) || [];
  const filePath = getFilePath(platform, channelId);

  try {
    await fsPromises.writeFile(filePath, serializeConversation(platform, channelId, messages), "utf-8");
  } catch (error) {
    console.error(`Error saving conversation asynchronously ${platform}:${channelId}:`, error.message);
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

  // Save to disk every 5 messages asynchronously to avoid blocking the event loop
  if (history.length % 5 === 0) {
    saveToDiskAsync(platform, channelId).catch((error) => {
      console.error(`Async save failed in addMessage for ${platform}:${channelId}:`, error.message);
    });
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
    const index = key.indexOf(":");
    if (index !== -1) {
      const platform = key.substring(0, index);
      const channelId = key.substring(index + 1);
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
    const index = key.indexOf(":");
    const platform = index !== -1 ? key.substring(0, index) : key;
    platforms[platform] = (platforms[platform] || 0) + 1;
  }

  return { totalMessages, totalConversations, platforms };
}

// Flush conversations to disk on exit (synchronously, as exit handler must be synchronous)
process.on("exit", flushAll);
