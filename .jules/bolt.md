# Bolt's Performance Journal ⚡

## 2025-07-19 - LLM History Preparation Optimization
**Learning:** Mapping over a full conversation history (up to 100 messages) before slicing it down to the last 20 messages introduces unnecessary CPU and memory allocation overhead. Slicing the history array first and then mapping over the sliced subset reduces processing time significantly, particularly for long chat histories.
**Action:** Always slice array bounds to the required output window before applying map or transformation functions.
