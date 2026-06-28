## 2025-01-24 - [Disk I/O Redundancy in Memory Manager]
**Learning:** A common performance anti-pattern was found where disk I/O was triggered based on the *total length* of a capped history array (`history.length % 5 === 0`). Once the history reached its maximum capacity (`MAX_HISTORY = 100`), and because the capacity was a multiple of the save interval, every new message triggered a synchronous `writeFileSync`. This converted a periodic optimization into a per-message bottleneck.
**Action:** Use a separate counter or "dirty bit" to track changes since the last save, rather than relying on the length of a collection that may be capped or constant.

## 2025-01-24 - [O(N^2) Streaming UI Updates]
**Learning:** In streaming chat interfaces, re-rendering the entire message bubble from scratch on every single token arrival leads to O(N^2) work (N = number of tokens). For long responses, this causes significant UI lag as the markdown parser and DOM engine struggle to keep up with the stream.
**Action:** Throttle DOM updates (e.g., to 100ms) to batch tokens together. This significantly reduces the number of rendering cycles and keeps the interface responsive even during very long AI responses.
