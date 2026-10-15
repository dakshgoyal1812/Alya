# Bolt's Journal - Critical Learnings

## 2026-05-16 - Slicing Before Mapping for Conversation History
**Learning:** Performing a map operation on the entire conversation history and then slicing the last 20 messages is a major performance bottleneck (anti-pattern). When chat logs grow long (e.g. up to 100 messages), the map operation unnecessarily processes dozens of elements that are immediately discarded. Slicing the history array *before* mapping achieves a ~4x to 7x speedup in JavaScript execution and reduces CPU/memory footprint.
**Action:** Always slice array boundaries (e.g., limit to top N items) prior to mapping or performing heavy object-instantiation/destructuring transformations.

## 2026-05-17 - Asynchronous Periodic Saving with Synchronous Exit Flushing
**Learning:** Performing synchronous disk I/O operations (like `writeFileSync`) on hot paths like messaging streams severely blocks the single-threaded Node.js event loop, resulting in noticeable response lag and concurrency bottlenecks under load. However, fully asynchronous I/O during process termination fails because the event loop ceases processing new async tasks during the exit phase.
**Action:** Use fire-and-forget asynchronous disk I/O (`fs.promises.writeFile`) for runtime periodic operations to keep the event loop completely free, but preserve synchronous writing (`writeFileSync`) for `process.on("exit")` and termination handlers to guarantee data persistence.
