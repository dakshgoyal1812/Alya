# Bolt's Journal ⚡

## 2025-05-14 - Optimize LLM History Preparation
**Learning:** Object transformations (mapping) in Node.js are relatively expensive when done on large arrays. When only a subset of the array is needed (e.g., the last 20 messages for LLM context), slicing the array *before* mapping reduces CPU overhead linearly with the number of skipped elements.
**Action:** Always slice large arrays to the required window size before applying expensive `.map()` or `.filter()` operations if the window is fixed.
