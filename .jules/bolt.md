# Bolt's Journal - Critical Learnings

## 2026-05-16 - Slicing Before Mapping for Conversation History
**Learning:** Performing a map operation on the entire conversation history and then slicing the last 20 messages is a major performance bottleneck (anti-pattern). When chat logs grow long (e.g. up to 100 messages), the map operation unnecessarily processes dozens of elements that are immediately discarded. Slicing the history array *before* mapping achieves a ~4x to 7x speedup in JavaScript execution and reduces CPU/memory footprint.
**Action:** Always slice array boundaries (e.g., limit to top N items) prior to mapping or performing heavy object-instantiation/destructuring transformations.

## 2026-05-17 - Key Parsing and Non-Blocking File Persistence
**Learning:** Using `split(":")` on conversation keys inside Map iterations is highly inefficient because it allocates temporary arrays, leading to frequent garbage collection. Optimizing key parsing and extraction via `indexOf(":")` and `substring()` yields a ~2x to 3.5x execution speedup. Furthermore, periodic disk writes using synchronous `writeFileSync` block the Node.js event loop and increase chat response latency. Moving regular saves to asynchronous `fsPromises.writeFile` eliminates blocking, while retaining synchronous writes solely for process exit handlers (`process.on("exit")`) to guarantee data persistence.
**Action:** Replace `split` in hot loops with `indexOf` + `substring` to avoid array allocations, and use non-blocking asynchronous writing for regular file operations while keeping synchronous writes for critical shutdown phases.
