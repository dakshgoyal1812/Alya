# 🐛 Alya - Comprehensive Bug & Security Audit Report

This report documents all identified bugs, runtime errors, and security vulnerabilities across the Alya AI Assistant codebase, along with their resolution details.

---

## 📋 Summary of Findings

| ID | Category | Component | Description | Severity | Status |
|---|---|---|---|---|---|
| BUG-001 | Runtime Crash | `src/index.js` | TypeError when `config.groq` is undefined on startup status check | Medium | Fixed |
| BUG-002 | Runtime Crash | `src/core/llm.js` | `ReferenceError: SYSTEM_PROMPT is not defined` in `generate()` | High | Fixed |
| BUG-003 | Data Loss | `src/core/memory.js` | Truncation of channel IDs containing colons in `flushAll()` and `getStats()` | Medium | Fixed |
| SEC-001 | Security (RCE) | `src/core/tools.js` | Arbitrary Code Execution via un-sanitized `new Function()` in `calculator` | Critical | Fixed |
| SEC-002 | Security (RCE) | `src/core/tools.js` | Arbitrary Command Execution via un-sandboxed `execSync` in `execute_python_code` | Critical | Fixed |
| BUG-004 | Platform | `src/core/tools.js` | Windows-specific `wmic` command fails on Linux/macOS in `get_storage_info` | Medium | Fixed |
| SEC-003 | Security (Path Traversal) | `src/core/tools.js` | Arbitrary File Read / Path Traversal in `read_pdf` | High | Fixed |
| SEC-004 | Security (SSRF) | `src/core/tools.js` | Server-Side Request Forgery (SSRF) in `read_website` | High | Fixed |
| BUG-005 | Race Condition | `src/bridges/*` | Concurrent message history race condition across platform bridges | High | Fixed |

---

## 🔍 Detailed Bug Descriptions & Fixes

### 1. BUG-001: TypeError on Missing Groq Configuration (`src/index.js`)
- **Severity**: Medium
- **Description**: During application startup, `config.groq.model` was accessed directly without optional chaining. If `config.groq` was undefined, Node.js threw a `TypeError: Cannot read properties of undefined (reading 'model')` and crashed.
- **Fix**: Replaced `config.groq.model` with optional chaining and fallback: `config.groq?.model || llm.model`.

### 2. BUG-002: Undefined `SYSTEM_PROMPT` Variable (`src/core/llm.js`)
- **Severity**: High
- **Description**: In `LLMEngine.generate()`, `SYSTEM_PROMPT` was passed as system content, but the variable was neither defined in `llm.js` nor imported. Executing `generate()` resulted in `ReferenceError: SYSTEM_PROMPT is not defined`.
- **Fix**: Replaced `SYSTEM_PROMPT` with `getSystemPrompt("normal")` imported from `personality.js`.

### 3. BUG-003: Channel ID Truncation on Split (`src/core/memory.js`)
- **Severity**: Medium
- **Description**: In `flushAll()` and `getStats()`, conversation keys formatted as `platform:channelId` were split using `key.split(":")`. For platforms like Slack or Discord where channel/thread IDs contain colons, `key.split(":")` truncated the ID to its first element, causing history files to be saved to incorrect paths or overwritten.
- **Fix**: Replaced `key.split(":")` with `key.indexOf(":")` and `key.substring()`.

### 4. SEC-001: Remote Code Execution via Calculator Tool (`src/core/tools.js`)
- **Severity**: Critical
- **Description**: The `calculator` tool evaluated raw math expressions directly using `new Function("return " + args.expression)()`. Adversaries or maliciously engineered prompts could pass arbitrary JavaScript payloads (e.g., `process.exit()`) leading to arbitrary code execution.
- **Fix**: Added regex validation (`/^[0-9+\-*/().\s]+$/`) to reject any expression containing non-mathematical characters or statements.

### 5. SEC-002: Arbitrary Command Execution via Unsandboxed Python Tool (`src/core/tools.js`)
- **Severity**: Critical
- **Description**: The `execute_python_code` tool wrote user code to disk and executed it via `execSync("python script.py")` without sandboxing, isolation, or resource limits.
- **Fix**: Disabled `execute_python_code` tool execution and returned a clear security error message.

### 6. BUG-004: Windows-Only Storage Command Failure (`src/core/tools.js`)
- **Severity**: Medium
- **Description**: `get_storage_info` executed `wmic logicaldisk get ...`, which only exists on Windows. On macOS and Linux systems, this invocation threw an error and defaulted to fallback memory output instead of disk storage.
- **Fix**: Added platform branching (`process.platform === "win32"`) and implemented `df -k /` parsing for Unix-like environments.

### 7. SEC-003: Path Traversal Vulnerability in PDF Reader (`src/core/tools.js`)
- **Severity**: High
- **Description**: The `read_pdf` tool read arbitrary file paths supplied via `absolutePath` without restricting relative path sequences (`..`) or sensitive system directories (e.g., `/etc/`, `/var/`, `system32`), risking arbitrary file disclosure.
- **Fix**: Added checks blocking relative path sequences (`..`), resolved paths with `path.resolve()`, and enforced blacklists for sensitive system paths.

### 8. SEC-004: Server-Side Request Forgery in Web Reader (`src/core/tools.js`)
- **Severity**: High
- **Description**: The `read_website` tool fetched any user-supplied URL directly via `fetch()`, allowing internal network probing and access to private endpoints (such as `http://localhost` or `http://169.254.169.254`).
- **Fix**: Validated target hostname and IP address against local, loopback, and private IPv4 ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x).

### 9. BUG-005: Conversation History Race Condition (`src/bridges/*`)
- **Severity**: High
- **Description**: Across all platform bridges (`discord.js`, `telegram.js`, `slack.js`, `whatsapp.js`, `web.js`), user messages were added to memory (`addMessage`) *after* the LLM response completed. Rapid successive user messages in the same channel caused secondary messages to be evaluated against stale history that omitted the preceding user message.
- **Fix**: Updated all bridges to snapshot history (`const historySnapshot = [...history]`) and immediately record the incoming user message to memory (`addMessage`) before awaiting LLM responses.

---

## ✅ Verification

All fixes have been verified across the codebase to ensure syntax correctness, operational security, and cross-platform reliability.
