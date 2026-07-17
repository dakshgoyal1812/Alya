# Bolt's Journal - Critical Learnings

## 2025-02-28 - Non-Blocking Memory Saves vs Process Exit Safety
**Learning:** In memory/history management systems of conversational agents, periodic updates are hot paths that can significantly delay the event loop when written synchronously (`writeFileSync`). However, during Node.js process termination event handlers (such as `"exit"`), asynchronous promises (`writeFile`) are ignored since the event loop is already winding down. Therefore, optimizing periodic writes requires introducing a non-blocking asynchronous writer for runtime messages (`addMessage`) while strictly preserving synchronous writers (`writeFileSync`) for process exit flushes (`flushAll`).
**Action:** Use `promises as fsPromises` from the `fs` module to implement non-blocking writes (`saveToDiskAsync`) on high-frequency conversational hot paths, but retain synchronous `fs.writeFileSync` inside process lifetime handlers to avoid silent data loss.
