// ============================================================
// 📊 Micro-Benchmark: Key Parsing Performance
// compares split(":") vs indexOf(":") + substring()
// ============================================================

import { getStats } from "./src/core/memory.js";

// Sample Keys
const standardKey = "discord:1234567890";
const complexKey = "slack:U12345:C67890:channel_name"; // ID contains extra colons
const iterations = 10000000;

console.log(`🚀 Starting Benchmark with ${iterations.toLocaleString()} iterations...\n`);

// ------------------------------------------------------------
// 1. Correctness Verification
// ------------------------------------------------------------
console.log("🔍 Correctness Verification:");

// Old split approach
function parseWithSplit(key) {
  const [platform, channelId] = key.split(":");
  return { platform, channelId };
}

// New indexOf approach
function parseWithIndexOf(key) {
  const idx = key.indexOf(":");
  if (idx !== -1) {
    const platform = key.substring(0, idx);
    const channelId = key.substring(idx + 1);
    return { platform, channelId };
  }
  return { platform: key, channelId: "" };
}

console.log(`  Standard Key: "${standardKey}"`);
console.log("    Split result:", parseWithSplit(standardKey));
console.log("    IndexOf result:", parseWithIndexOf(standardKey));

console.log(`\n  Complex Key (has colons in ID): "${complexKey}"`);
console.log("    Split result:", parseWithSplit(complexKey), " ❌ (Truncated!)");
console.log("    IndexOf result:", parseWithIndexOf(complexKey), "  ✅ (Correct!)");

console.log("\n------------------------------------------------------------\n");

// ------------------------------------------------------------
// 2. Performance Verification (Pure String Parsing - Platform Extraction)
// ------------------------------------------------------------
console.log("⚡ Performance Speed Benchmark (Platform Extraction - getStats style):");

// Split run
let sumSplit = 0;
const startSplit = performance.now();
for (let i = 0; i < iterations; i++) {
  const platform = standardKey.split(":")[0];
  if (platform === "discord") sumSplit++;
}
const endSplit = performance.now();
const durationSplit = endSplit - startSplit;

// IndexOf run
let sumIdx = 0;
const startIdx = performance.now();
for (let i = 0; i < iterations; i++) {
  const idx = standardKey.indexOf(":");
  const platform = idx !== -1 ? standardKey.substring(0, idx) : standardKey;
  if (platform === "discord") sumIdx++;
}
const endIdx = performance.now();
const durationIdx = endIdx - startIdx;

console.log(`  split(":")[0] run time:                        ${durationSplit.toFixed(2)} ms`);
console.log(`  indexOf(":") + substring() run time:           ${durationIdx.toFixed(2)} ms`);

const speedup = durationSplit / durationIdx;
console.log(`\n🎉 Speedup: ~${speedup.toFixed(1)}x faster!\n`);
