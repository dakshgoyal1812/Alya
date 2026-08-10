# Bolt's Journal - Critical Learnings

## 2026-05-16 - Slicing Before Mapping for Conversation History
**Learning:** Performing a map operation on the entire conversation history and then slicing the last 20 messages is a major performance bottleneck (anti-pattern). When chat logs grow long (e.g. up to 100 messages), the map operation unnecessarily processes dozens of elements that are immediately discarded. Slicing the history array *before* mapping achieves a ~4x to 7x speedup in JavaScript execution and reduces CPU/memory footprint.
**Action:** Always slice array boundaries (e.g., limit to top N items) prior to mapping or performing heavy object-instantiation/destructuring transformations.

## 2026-05-17 - Key String Parsing Overhead in Hot Loops
**Learning:** Splitting flat database or cache keys (e.g., `"platform:channel_id"`) using `String.prototype.split(":")` inside hot iteration loops is a performance anti-pattern. It creates unnecessary temporary arrays that trigger garbage collection, and more critically, truncates channel IDs that naturally contain colons (common on Slack or Discord). Using `indexOf` and `substring` fixes the truncation bug and delivers a ~1.75x to 2x speedup with zero temporary array allocations.
**Action:** For simple string separation or extraction on structured keys, favor `indexOf` + `substring` over `split` to ensure correct delimiter-agnostic extraction and high performance.
