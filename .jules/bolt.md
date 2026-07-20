# Bolt's Performance Journal ⚡

## 2026-07-20 - LLM History Preparation Optimization
**Learning:** Mapping a large history array (e.g., up to 100 messages) before slicing it down to the last 20 messages introduces significant unnecessary CPU cycles and memory allocations. Slicing the history array first and then mapping over the sliced subset reduces processing time by ~80% and avoids allocating temporary objects for discarded messages.
**Action:** Always slice array bounds to the required output window size BEFORE applying mapping or transformation functions.
