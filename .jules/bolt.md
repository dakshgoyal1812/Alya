## 2025-05-15 - [Optimize LLM History Preparation]
**Learning:** In `LLMEngine.chat`, the application was mapping the entire conversation history (up to 100 messages) to a sanitized format before slicing it to the last 20 messages. This resulted in up to 80 redundant iterations and object creations per chat request. Slicing before mapping provides a linear performance gain proportional to the history length.
**Action:** Always slice arrays to the required window BEFORE performing expensive transformations like `.map()` or `.filter()`.
