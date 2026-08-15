# Alya Bug & Vulnerability Audit Report

This report documents the bugs, performance issues, platform compatibility flaws, and security vulnerabilities identified in the Alya codebase, along with recommended/implemented mitigations.

---

## 1. Core Logic & Runtime Bugs

### 1.1 Undefined `SYSTEM_PROMPT` Reference Error
- **Location:** `src/core/llm.js` (in `generate()` method)
- **Description:** The `generate()` method references `SYSTEM_PROMPT` directly (`messages: [{ role: "system", content: SYSTEM_PROMPT }, ...]`), but `SYSTEM_PROMPT` is neither defined in `llm.js` nor imported from `personality.js`. Calling `generate()` throws a runtime `ReferenceError`.
- **Fix:** Replace `SYSTEM_PROMPT` with `getSystemPrompt("normal")`, which is already imported from `./personality.js`.

### 1.2 Channel ID Truncation in Memory Manager
- **Location:** `src/core/memory.js` (in `flushAll()` and `getStats()`)
- **Description:** Keys are stored as `${platform}:${channelId}`. In `flushAll()` and `getStats()`, `key.split(":")` is used to separate platform and channel ID. If `channelId` contains colons (common in Slack threads, Discord channel specs, or WhatsApp JIDs), `split(":")` splits into 3+ parts, truncating the channel ID and corrupting key resolution.
- **Fix:** Use `key.indexOf(":")` and `key.substring(...)` to reliably split only on the first colon.

---

## 2. Platform Compatibility & System Command Bugs

### 2.1 Hardcoded Windows-Only Command (`wmic`)
- **Location:** `src/core/tools.js` (in `get_storage_info` tool)
- **Description:** `execSync("wmic logicaldisk get size,freespace,caption")` is executed directly. On Linux or macOS, `wmic` does not exist, causing the tool to fail and fall back to memory info every time.
- **Fix:** Check `process.platform`. Use `df -k` on Linux/macOS and `wmic` on Windows to provide accurate disk storage details cross-platform.

---

## 3. Security & Input Sanitization Deficiencies

### 3.1 Unsanitized Mathematical Code Execution in `calculator`
- **Location:** `src/core/tools.js` (in `calculator` tool)
- **Description:** Expressions passed to `calculator` are evaluated using `new Function("return " + args.expression)()`. Without strict input filtering, arbitrary JavaScript code execution is possible.
- **Fix:** Validate `args.expression` against a strict whitelist regex `/^[0-9+\-*/().\s]+$/` prior to evaluation.

### 3.2 Unrestricted Host Execution in `execute_python_code`
- **Location:** `src/core/tools.js` (in `execute_python_code` tool)
- **Description:** Arbitrary Python scripts are written to temp files and executed on the host system via `execSync`.
- **Fix:** Disable `execute_python_code` or restrict script execution to prevent arbitrary code execution on host machines.

### 3.3 Path Traversal & Unrestricted File Read in `read_pdf`
- **Location:** `src/core/tools.js` (in `read_pdf` tool)
- **Description:** `read_pdf` accepts an arbitrary `absolutePath` without validating whether the path resolves inside allowed directories or points to sensitive system paths.
- **Fix:** Resolve path using `path.resolve()`, reject path traversal sequences (`..`), and restrict access to authorized user directories.

### 3.4 Server-Side Request Forgery (SSRF) in `read_website`
- **Location:** `src/core/tools.js` (in `read_website` tool)
- **Description:** `read_website` fetches any user-provided URL without validating IP addresses or hostnames, potentially allowing requests to internal network services (e.g. `localhost`, `127.0.0.1`, cloud metadata endpoints).
- **Fix:** Perform hostname/IP validation to ensure target URLs resolve to public IP addresses before fetching content.

---

## Summary of Fixes Status
- [x] Documented identified issues
- [ ] Fix runtime errors in `src/core/llm.js`
- [ ] Fix key parsing in `src/core/memory.js`
- [ ] Harden tools and cross-platform handling in `src/core/tools.js`
