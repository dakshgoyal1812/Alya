## 2026-05-17 - LLM History Preparation Optimization
**Learning:** Mapping a large array and then slicing it is significantly slower than slicing first and then mapping, especially when the slice size is much smaller than the original array. In `LLMEngine`, the conversation history can grow up to 100 messages, but only the last 20 are sent to the LLM. Slicing first reduces the mapping overhead by up to 80%.
**Action:** Always slice arrays to the required window before performing expensive mapping or transformation operations.

## 2026-05-17 - Security and Functional Fixes
**Learning:** Deployment packages can contain critical bugs (like undefined variables `SYSTEM_PROMPT`) and severe security vulnerabilities (RCE vectors via `new Function` and `execSync`). Always audit third-party or provided code before optimization.
**Action:** Prioritize fixing RCE vectors and runtime-breaking bugs alongside performance optimizations.
