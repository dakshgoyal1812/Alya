# Bolt's Journal

## 2026-05-18 - Base entry
**Learning:** Initializing Bolt's journal.
**Action:** Ready to profile and optimize!

## 2026-05-18 - Replacing node-fetch with Native Fetch
**Learning:** The external 'node-fetch' package was imported but not defined in package.json, leading to ERR_MODULE_NOT_FOUND on boot. Since Node 18+, a native, high-performance global fetch implementation is available in the runtime, removing the need for third-party libraries for simple HTTP requests.
**Action:** Always prefer native, built-in APIs like global fetch to reduce dependency weight, improve startup performance, and prevent missing dependency runtime crashes.
