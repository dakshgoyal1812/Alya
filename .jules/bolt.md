## 2026-07-09 - [LLM History Preparation]
**Learning:** Slicing an array before mapping it (O(N) vs O(K) where K is the slice size) yielded a ~4x-8x speedup in history preparation. This is especially impactful in chat applications where history can grow large but only a small window is sent to the LLM.
**Action:** Always slice large collections before applying expensive transformations if only a subset is needed.
