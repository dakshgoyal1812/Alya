# Bolt's Journal - Critical Learnings Only ⚡

## 2025-07-08 - [History Preparation Bottleneck]
**Learning:** History preparation in `src/core/llm.js` was mapping over the entire conversation history (up to 100 messages) before slicing it down to 20 messages for the LLM request. This is inefficient as 80% of the mapping work is discarded.
**Action:** Always slice history arrays to the required window size BEFORE applying mapping or complex transformations to minimize processing overhead.
