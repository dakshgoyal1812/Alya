## 2026-06-22 - [I/O Bottleneck in Circular Buffer Persistence]
**Learning:** Using a modulo operator on a circular buffer's total history length for periodic persistence fails once the buffer reaches its maximum capacity (MAX_HISTORY), causing I/O to trigger on every single update.
**Action:** Always use an independent "unsaved changes" counter to track pending updates rather than relying on the array length when the array is size-limited.
