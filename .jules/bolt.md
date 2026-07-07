## 2025-05-15 - [LLM History Preparation]
**Learning:** Mapping a large history array (e.g., 100 messages) before slicing it down to what the LLM actually needs (e.g., 20 messages) incurs significant unnecessary overhead. Slicing first reduces the number of mapping operations and temporary object allocations by 80%.
**Action:** Always slice history arrays to the required window size BEFORE applying transformations or sanitization.

## 2025-05-15 - [Event Loop Blocking & Async I/O]
**Learning:** Synchronous file operations (like `writeFileSync`) in high-frequency paths (like saving conversation history every 5 messages) can block the Node.js event loop, leading to degraded performance and higher latency. However, synchronous writes are still necessary during process exit (`process.on('exit')`) because the event loop no longer accepts new asynchronous tasks.
**Action:** Use `fs.promises.writeFile` for periodic background saves, but keep `fs.writeFileSync` for emergency flushes on exit.

## 2025-05-15 - [Security vs. Performance]
**Learning:** Tools that evaluate arbitrary code (like `new Function` or `execSync` with Python) are significant RCE vectors. Performance gains should never come at the cost of security. Basic regex sanitization for mathematical expressions can mitigate some risks while maintaining functionality.
**Action:** Sanitize all dynamic code evaluation inputs and disable high-risk features if they cannot be properly sandboxed.
