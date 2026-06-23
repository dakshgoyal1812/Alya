## 2023-06-23 - [Optimization of Conversation History Disk I/O]
**Learning:** In `src/core/memory.js`, using `history.length % 5 === 0` as a trigger for disk writes created a performance bottleneck once the history reached its maximum capacity (`MAX_HISTORY = 100`). At that point, the length remained constant at 100, causing a synchronous disk write for every single message added.
**Action:** Always use an independent counter for periodic persistence when the underlying collection is capped or has a fixed size.
