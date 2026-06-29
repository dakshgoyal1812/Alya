## 2026-06-29 - [Avoid Redundant Disk I/O with Capped Arrays]
**Learning:** Using `array.length % N === 0` to throttle periodic disk saves becomes a performance bottleneck when the array is capped at a maximum size (e.g., via `splice`). Once the array reaches `MAX_SIZE`, the condition triggers on every single addition, leading to redundant disk writes.
**Action:** Use a separate counter or "unsaved changes" tracker to monitor how many items have been added since the last save, ensuring throttling logic remains correct regardless of the array's current size.
