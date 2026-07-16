## 2025-05-16 - LLM History Processing Optimization
**Learning:** Slicing the conversation history array before mapping it to the API format significantly reduces CPU and memory overhead by avoiding unnecessary object transformations for messages that are discarded anyway.
**Action:** Always check if an array needs to be truncated before performing expensive map/filter operations.

## 2025-05-16 - Baseline Commit for Deployment Packages
**Learning:** When working with repositories where source code is delivered via a zip archive (e.g., Alya-Deployment.zip), implementing changes without a baseline commit results in PRs that include thousands of unrelated lines.
**Action:** Extract the archive and make an initial "baseline" commit of the original source code before implementing any optimizations or fixes.
