# Alya AI Assistant — Comprehensive Bug & Security Audit Report

## Overview
This document presents a comprehensive audit of all identified bugs, runtime errors, security vulnerabilities, edge cases, and architectural issues across the Alya AI Assistant codebase, along with their resolution status.

---

## 🚨 Security Vulnerabilities

### 1. Remote Code Execution (RCE) via `calculator` Tool
- **Severity**: Critical
- **Location**: `src/core/tools.js` (`calculator`)
- **Issue**: The `calculator` tool evaluated input directly using `new Function("return " + args.expression)()` without input sanitization or expression validation. An attacker or malicious prompt injection could execute arbitrary JavaScript code within the Node.js runtime.
- **Fix**: Implemented strict regex sanitization (`/^[0-9+\-*/().\s]+$/`) before evaluating mathematical expressions. Any input containing non-mathematical characters is immediately rejected.

### 2. Remote Code Execution (RCE) via `execute_python_code` Tool
- **Severity**: Critical
- **Location**: `src/core/tools.js` (`execute_python_code`)
- **Issue**: Executing arbitrary Python code using `execSync("python script.py")` allowed unauthenticated code execution on the host machine with host user permissions.
- **Fix**: Disabled the `execute_python_code` tool as a critical security measure to prevent untrusted code execution on the host system.

### 3. Server-Side Request Forgery (SSRF) in `read_website`
- **Severity**: High
- **Location**: `src/core/tools.js` (`read_website`)
- **Issue**: The `read_website` tool accepted arbitrary HTTP/HTTPS URLs and fetched them using `fetch()`. This enabled SSRF attacks targeting internal network services, loopback endpoints (`127.0.0.1`, `localhost`), and cloud metadata instances (`169.254.169.254`).
- **Fix**: Implemented SSRF protection by validating target URLs and blocking private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback addresses (`127.0.0.0/8`), link-local IPs (`169.254.0.0/16`), and non-HTTP/HTTPS protocols.

### 4. Arbitrary File Read / Path Traversal in `read_pdf`
- **Severity**: High
- **Location**: `src/core/tools.js` (`read_pdf`)
- **Issue**: `read_pdf` accepted file paths without checking for path traversal sequences like `..` or restricting access to authorized directories.
- **Fix**: Added path normalization via `path.resolve()`, explicit checks blocking relative `..` sequences, and restrictions against sensitive system directories (e.g., `/etc/`, `/var/`, `C:\Windows\System32`).

---

## 💥 Runtime Crashes & Reference Errors

### 5. `ReferenceError: SYSTEM_PROMPT is not defined`
- **Severity**: High
- **Location**: `src/core/llm.js` (`generate` method)
- **Issue**: The `generate(prompt)` method referenced an unimported variable `SYSTEM_PROMPT`, causing a runtime `ReferenceError` crash whenever `llm.generate()` was called.
- **Fix**: Replaced `SYSTEM_PROMPT` with `getSystemPrompt("normal")` imported from `./personality.js`.

### 6. `TypeError: Cannot read properties of undefined (reading 'model')` at Startup
- **Severity**: Medium
- **Location**: `src/index.js`
- **Issue**: When `config.groq` was undefined in configuration, accessing `config.groq.model` during startup logging threw a `TypeError` and crashed the process.
- **Fix**: Updated startup status logging to use optional chaining: `config.groq?.model || llm.model`.

### 7. `ReferenceError` / Variable Mismatch in `get_memory_usage` Tool
- **Severity**: Low
- **Location**: `src/core/tools.js` (`get_memory_usage`)
- **Issue**: The returned JSON structure referenced `freeMemoryGB` which was undefined, instead of `freeMB`.
- **Fix**: Corrected the object property reference to use `freeMB`.

---

## 🖥️ Platform Compatibility & Multi-OS Issues

### 8. Windows Command Hardcoding (`wmic`) in `get_storage_info`
- **Severity**: Medium
- **Location**: `src/core/tools.js` (`get_storage_info`)
- **Issue**: Executing `wmic logicaldisk get ...` directly caused process failures and errors on Linux and macOS where `wmic` is not available.
- **Fix**: Added platform detection (`process.platform`) to execute `df -k` on Linux and macOS (`linux`, `darwin`) and reserve `wmic` for Windows (`win32`).

---

## 🛠️ Data Integrity & Concurrency Bugs

### 9. Memory Channel Key Truncation in `flushAll()` & `getStats()`
- **Severity**: Medium
- **Location**: `src/core/memory.js`
- **Issue**: `key.split(":")` was used to split platform and channel ID. On platforms like Slack or Discord where channel or user IDs contain colons, `split(":")` truncated channel IDs, causing file key mismatches or missing conversation history.
- **Fix**: Replaced `key.split(":")` with `key.indexOf(":")` and `key.substring()` to parse only the first colon separator.

### 10. Message Race Condition in Platform Bridges
- **Severity**: Medium
- **Location**: `src/bridges/discord.js`, `slack.js`, `telegram.js`, `whatsapp.js`, `web.js`
- **Issue**: Platform bridges retrieved history, waited for the asynchronous `llm.chat()` request to resolve, and then saved user and assistant messages to memory. Under rapid user typing, history snapshots became out of sync or duplicated.
- **Fix**: Captured an immediate snapshot `const historySnapshot = [...history]` before immediately storing incoming user messages in memory and passing `historySnapshot` to `llm.chat()`.

### 11. Missing ElevenLabs Single API Key Fallback
- **Severity**: Low
- **Location**: `src/core/tts.js`
- **Issue**: When `config.elevenlabs.apiKeys` was absent or empty but a single `config.elevenlabs.apiKey` string was provided, TTS initialization failed.
- **Fix**: Added fallback logic to support single `config.elevenlabs.apiKey` string alongside `apiKeys` array.
