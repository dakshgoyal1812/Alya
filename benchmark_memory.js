// Benchmark to measure memory manager optimizations
import fs from 'fs';
import path from 'path';

const key = "discord:123456789012345678:987654"; // Platform with potential colons in ID

function benchmarkKeyParsing() {
  console.log("--- Benchmarking Key Parsing (10,000,000 iterations) ---");

  // Approach 1: split
  let start = performance.now();
  for (let i = 0; i < 10000000; i++) {
    const parts = key.split(":");
    const platform = parts[0];
    const channelId = parts.slice(1).join(":");
  }
  let end = performance.now();
  const timeSplit = end - start;
  console.log(`key.split(":"): ${timeSplit.toFixed(2)} ms`);

  // Approach 2: indexOf + substring
  start = performance.now();
  for (let i = 0; i < 10000000; i++) {
    const idx = key.indexOf(":");
    const platform = key.substring(0, idx);
    const channelId = key.substring(idx + 1);
  }
  end = performance.now();
  const timeSubstring = end - start;
  console.log(`indexOf + substring: ${timeSubstring.toFixed(2)} ms`);
  console.log(`Speedup: ${(timeSplit / timeSubstring).toFixed(1)}x\n`);
}

function benchmarkSerialization() {
  console.log("--- Benchmarking Serialization (100,000 iterations) ---");
  const data = {
    platform: "discord",
    channelId: "123456789012345678",
    lastUpdated: new Date().toISOString(),
    messageCount: 100,
    messages: Array.from({ length: 100 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `This is a sample message number ${i} to benchmark memory stringification.`,
      timestamp: new Date().toISOString()
    }))
  };

  // Pretty printed JSON
  let start = performance.now();
  for (let i = 0; i < 100000; i++) {
    const s = JSON.stringify(data, null, 2);
  }
  let end = performance.now();
  const timePretty = end - start;
  console.log(`JSON.stringify(..., null, 2): ${timePretty.toFixed(2)} ms`);

  // Compact JSON
  start = performance.now();
  for (let i = 0; i < 100000; i++) {
    const s = JSON.stringify(data);
  }
  end = performance.now();
  const timeCompact = end - start;
  console.log(`JSON.stringify(compact): ${timeCompact.toFixed(2)} ms`);
  console.log(`Speedup: ${(timePretty / timeCompact).toFixed(1)}x\n`);
}

async function benchmarkIO() {
  console.log("--- Benchmarking IO blocking vs non-blocking ---");
  const tempDir = path.join(process.cwd(), 'data', 'temp_bench');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const fileSync = path.join(tempDir, 'sync.json');
  const fileAsync = path.join(tempDir, 'async.json');

  const data = {
    platform: "discord",
    channelId: "123456789012345678",
    lastUpdated: new Date().toISOString(),
    messageCount: 100,
    messages: Array.from({ length: 100 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `This is a sample message number ${i} to benchmark memory stringification.`,
      timestamp: new Date().toISOString()
    }))
  };

  const payload = JSON.stringify(data);

  // Sync Write
  let start = performance.now();
  for (let i = 0; i < 100; i++) {
    fs.writeFileSync(fileSync, payload);
  }
  let end = performance.now();
  console.log(`fs.writeFileSync (100 runs): ${(end - start).toFixed(2)} ms`);

  // Async Write (measuring blocking time, not full resolve time)
  start = performance.now();
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(fs.promises.writeFile(fileAsync, payload));
  }
  end = performance.now();
  console.log(`fs.promises.writeFile initiating (100 runs): ${(end - start).toFixed(2)} ms (blocking time)`);

  // Wait for completion to clean up
  await Promise.all(promises);

  // Clean up
  try {
    fs.unlinkSync(fileSync);
    fs.unlinkSync(fileAsync);
    fs.rmdirSync(tempDir);
  } catch (e) {}
}

async function run() {
  benchmarkKeyParsing();
  benchmarkSerialization();
  await benchmarkIO();
}

run();
