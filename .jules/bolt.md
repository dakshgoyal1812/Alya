# Bolt's Journal - Critical Learnings

## 2026-05-18 - Early Return Fast-Path for String Sanitization Regexes
**Learning:** Re-evaluating multiple complex regular expressions on every incoming LLM output string is a major source of unnecessary CPU overhead, as 95%+ of normal assistant responses contain no raw function tags or system markups. Hoisting regex constants to module scope and introducing a fast-path early return (`if (!text.includes("<")) return text.trim();`) bypasses regex execution entirely for standard responses, yielding a ~7x execution speedup (~5.2ms vs ~37.3ms per 100k calls).
**Action:** Always add cheap fast-path checks (e.g., `String.prototype.includes()`) before executing multi-pattern regex sanitization functions when the target characters are absent in most inputs.

## 2026-05-16 - Slicing Before Mapping for Conversation History
**Learning:** Performing a map operation on the entire conversation history and then slicing the last 20 messages is a major performance bottleneck (anti-pattern). When chat logs grow long (e.g. up to 100 messages), the map operation unnecessarily processes dozens of elements that are immediately discarded. Slicing the history array *before* mapping achieves a ~4x to 7x speedup in JavaScript execution and reduces CPU/memory footprint.
**Action:** Always slice array boundaries (e.g., limit to top N items) prior to mapping or performing heavy object-instantiation/destructuring transformations.
