import { addMessage, getHistory, getStats, flushAll } from "./src/core/memory.js";
import fs from "fs";
import path from "path";

async function runTests() {
  console.log("🚀 Starting Alya Memory Manager Benchmark / Tests...");

  const platform = "discord";
  const channelWithColons = "guild:12345:channel:67890";
  const channelNormal = "channel_98765";

  // Test 1: Basic addition and retrieval
  console.log("\n🧪 Test 1: Adding and retrieving messages...");
  addMessage(platform, channelNormal, "user", "Hello Alya!");
  addMessage(platform, channelNormal, "assistant", "Hi there!");

  const history = getHistory(platform, channelNormal);
  if (history.length !== 2) {
    throw new Error(`Expected 2 messages in history, got ${history.length}`);
  }
  console.log("✅ Basic addition & retrieval passed!");

  // Test 2: Channel ID with colons (robust key parsing)
  console.log("\n🧪 Test 2: Testing Channel ID with colons parsing...");
  addMessage(platform, channelWithColons, "user", "Message from channel with colons");
  addMessage(platform, channelWithColons, "assistant", "Response to channel with colons");

  const statsBeforeFlush = getStats();
  console.log("Stats before flush:", JSON.stringify(statsBeforeFlush));

  if (!statsBeforeFlush.platforms[platform]) {
    throw new Error(`Expected platform ${platform} to be in stats`);
  }

  // Test 3: Flush to disk (uses indexOf and substring key parsing)
  console.log("\n🧪 Test 3: Flushing conversations to disk...");
  try {
    flushAll();
  } catch (e) {
    console.error("FlushAll failed: ", e);
  }

  // Verify file existence on disk
  const safeIdNormal = String(channelNormal).replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileNormal = path.join(process.cwd(), "data", "conversations", `${platform}_${safeIdNormal}.json`);

  const safeIdColons = String(channelWithColons).replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileColons = path.join(process.cwd(), "data", "conversations", `${platform}_${safeIdColons}.json`);

  if (!fs.existsSync(fileNormal)) {
    throw new Error(`Expected file to exist: ${fileNormal}`);
  }
  if (!fs.existsSync(fileColons)) {
    throw new Error(`Expected file to exist: ${fileColons}`);
  }

  // Verify file contents can be loaded and they are valid JSON
  const contentColons = JSON.parse(fs.readFileSync(fileColons, "utf8"));
  if (contentColons.channelId !== channelWithColons) {
    throw new Error(`Expected channelId in file to be "${channelWithColons}", got "${contentColons.channelId}"`);
  }
  console.log("✅ Channel ID with colons key parsing and serialization passed!");

  // Test 4: Performance benchmark of key parsing and memory manager operations
  console.log("\n🧪 Test 4: Performance Benchmarking...");
  const start = Date.now();
  const iterations = 1000;
  for (let i = 0; i < iterations; i++) {
    addMessage("benchmark", `chan:${i}`, "user", `text_${i}`);
  }
  const end = Date.now();
  console.log(`⚡ Added ${iterations} messages in ${end - start}ms.`);
  console.log(`📊 Final Memory stats:`, JSON.stringify(getStats()));

  console.log("\n🎉 All Alya Memory Manager Tests Passed Successfully!");
}

runTests().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
