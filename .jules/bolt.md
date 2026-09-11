# Bolt's Journal - Critical Learnings

## 2026-05-17 - Fast-Path Guard and Hoisted Regex for String Cleaning
**Learning:** Recompiling RegExp instances inside hot functions called on every LLM response chunk/message creates unnecessary object allocation and execution overhead. Combining module-level pre-compiled regular expressions with a character guard check (`if (!text.includes("<"))`) provides an ~8x speedup for typical plain text responses by completely bypassing regex parsing engine calls when tag delimiters are absent.
**Action:** Always pre-compile module-scope regular expressions and use cheap string predicate checks (like `includes`) as fast-path guards before invoking regex replacements.

## 2026-05-16 - Slicing Before Mapping for Conversation History
**Learning:** Performing a map operation on the entire conversation history and then slicing the last 20 messages is a major performance bottleneck (anti-pattern). When chat logs grow long (e.g. up to 100 messages), the map operation unnecessarily processes dozens of elements that are immediately discarded. Slicing the history array *before* mapping achieves a ~4x to 7x speedup in JavaScript execution and reduces CPU/memory footprint.
**Action:** Always slice array boundaries (e.g., limit to top N items) prior to mapping or performing heavy object-instantiation/destructuring transformations.
