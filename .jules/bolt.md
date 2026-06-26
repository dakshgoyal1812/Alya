## 2025-01-24 - [Disk I/O Redundancy in Capped Arrays]
**Learning:** Logic that depends on array length (like `length % 5 === 0`) becomes redundant and potentially expensive once the array is capped (e.g., via `splice`). If the length is always at the cap, the condition might evaluate to true for every single push, leading to unintended high-frequency I/O or processing.
**Action:** Use an independent counter (e.g., a `Map` or a separate variable) to track changes when working with capped arrays to ensure periodic tasks are executed at the intended frequency.

## 2025-01-24 - [Security-Performance Balance]
**Learning:** Performance optimizations (like using `new Function` or `execSync`) often introduce critical security vulnerabilities (RCE). Correctness and security must always precede performance.
**Action:** Always sanitize inputs for dynamic execution and use safe alternatives (like throttling vs. unsafe caching) when optimizing hot paths.
