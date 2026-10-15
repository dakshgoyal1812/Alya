# Bolt's Journal - Critical Learnings

## 2026-05-16 - Slicing Before Mapping for Conversation History
**Learning:** Performing a map operation on the entire conversation history and then slicing the last 20 messages is a major performance bottleneck (anti-pattern). When chat logs grow long (e.g. up to 100 messages), the map operation unnecessarily processes dozens of elements that are immediately discarded. Slicing the history array *before* mapping achieves a ~4x to 7x speedup in JavaScript execution and reduces CPU/memory footprint.
**Action:** Always slice array boundaries (e.g., limit to top N items) prior to mapping or performing heavy object-instantiation/destructuring transformations.

## 2026-05-17 - Fast-Path Short-Circuiting and RegExp Hoisting in Response Post-Processing
**Learning:** Re-instantiating RegExp objects inside hot paths (e.g., response cleaning on every stream chunk or message completion) introduces unnecessary GC overhead and execution latency. Furthermore, checking a fast substring condition (e.g. `!text.includes("<")`) before executing regex replacements allows standard plain-text responses to skip expensive regex engines altogether (~11.6x speedup, 53ms vs 623ms for 1,000,000 iterations).
**Action:** Always hoist regular expression literals to module-level constants and add cheap fast-path guard checks when string cleaning routines process high-volume text.
