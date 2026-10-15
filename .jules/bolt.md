# Bolt's Journal - Critical Learnings

## 2026-05-16 - Slicing Before Mapping for Conversation History
**Learning:** Performing a map operation on the entire conversation history and then slicing the last 20 messages is a major performance bottleneck (anti-pattern). When chat logs grow long (e.g. up to 100 messages), the map operation unnecessarily processes dozens of elements that are immediately discarded. Slicing the history array *before* mapping achieves a ~4x to 7x speedup in JavaScript execution and reduces CPU/memory footprint.
**Action:** Always slice array boundaries (e.g., limit to top N items) prior to mapping or performing heavy object-instantiation/destructuring transformations.

## 2026-05-17 - Fast-Path String Checking Before Multi-Regex Execution
**Learning:** Running multiple complex regular expressions on every LLM response string creates significant CPU overhead when the overwhelming majority of responses (>95%) contain standard text without leak tags. Adding a single fast-path character check (`text.includes("<")`) before invoking regex replacements bypasses regex execution completely for normal responses, resulting in a ~65x speedup (13ms vs 873ms per 100k calls).
**Action:** Always check for required trigger characters or substrings (`includes()`, `indexOf()`, `startsWith()`) before running multiple or heavy global regex replacements on hot path strings.
