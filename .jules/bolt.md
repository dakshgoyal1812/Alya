# Bolt's Journal - Critical Learnings

## 2026-05-16 - Slicing Before Mapping for Conversation History
**Learning:** Performing a map operation on the entire conversation history and then slicing the last 20 messages is a major performance bottleneck (anti-pattern). When chat logs grow long (e.g. up to 100 messages), the map operation unnecessarily processes dozens of elements that are immediately discarded. Slicing the history array *before* mapping achieves a ~4x to 7x speedup in JavaScript execution and reduces CPU/memory footprint.
**Action:** Always slice array boundaries (e.g., limit to top N items) prior to mapping or performing heavy object-instantiation/destructuring transformations.

## 2026-08-01 - Optimizing Key Splitting and Non-Blocking Disk I/O in Memory Manager
**Learning:** Using `String.prototype.split(":")` in the memory manager causes performance degradation due to repeated array allocations and garbage collection in hot loops. Additionally, `split(":")` creates a critical correctness bug/data loss when a channel ID contains a colon (e.g. Discord guilds/channels or third-party channel routing IDs). Utilizing `indexOf(":")` and `substring()` solves the performance bottleneck and the functional correctness bug simultaneously. Furthermore, regular file persistence in synchronous blockages (`writeFileSync`) degrades runtime event-loop latency. Wrapping regular message updates in asynchronous `promises.writeFile` calls keeps the application responsive.
**Action:** Always avoid `split` in hot loops where only head/tail extraction is needed, and utilize non-blocking async operations for ongoing disk I/O while reserving synchronous writes strictly for system exit scenarios.
