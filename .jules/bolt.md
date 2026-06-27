## 2025-05-14 - [LLM History Preparation & Memory I/O Optimization]
**Learning:** Slicing an array *before* mapping is a simple but effective O(N) to O(1) (relative to history size) optimization. Similarly, relying on `array.length % N === 0` for periodic tasks fails when the array is capped/spliced, leading to redundant work.
**Action:** Always slice history buffers before processing for LLM prompts. Use an external counter for periodic tasks on capped buffers.
