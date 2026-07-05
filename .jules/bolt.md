## 2025-05-14 - [LLM History Processing Optimization]
**Learning:** Processing conversation history for LLMs often involves "sanitizing" or "mapping" messages to a specific format. When only a subset of history (a sliding window) is sent to the API, performing this transformation on the entire history array is inefficient ($O(N)$ vs $O(K)$).
**Action:** Always apply `.slice(-windowSize)` before `.map()` or other heavy transformations on history arrays.

## 2025-05-14 - [Environment Baseline]
**Learning:** When starting from a deployment zip in an empty repository, the initial extraction creates a massive diff. This can trigger negative code reviews if the reviewer doesn't account for the baseline setup.
**Action:** Clearly state in the PR description that the large diff is due to the initial project setup from the deployment archive.
