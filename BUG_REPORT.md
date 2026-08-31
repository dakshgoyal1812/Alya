# 🐛 Alya Assistant — Comprehensive Bug & Audit Report

This report summarizes all bugs, vulnerabilities, and edge-case issues identified and resolved across the **Alya AI Assistant** repository.

---

## 📋 Summary Table

| Issue ID | Module | Title | Severity | Status |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | `src/core/llm.js` | ReferenceError: `SYSTEM_PROMPT` undefined | 🔴 Critical | ✅ Fixed |
| **BUG-002** | `src/index.js` | TypeError on missing `config.groq` object | 🟠 High | ✅ Fixed |
| **BUG-003** | `src/core/config.js` | Missing `groq` options in `DEFAULT_CONFIG` | 🟡 Medium | ✅ Fixed |
| **BUG-004** | Root | Missing `setup.js` wizard script | 🟠 High | ✅ Fixed |
| **BUG-005** | `src/core/tools.js` | Arbitrary Code Execution in `calculator` tool | 🔴 Critical | ✅ Fixed |
| **BUG-006** | `src/core/tools.js` | Arbitrary File Read / Path Traversal in `read_pdf` | 🔴 Critical | ✅ Fixed |
| **BUG-007** | `src/core/tools.js` | Server-Side Request Forgery (SSRF) in `read_website` | 🔴 Critical | ✅ Fixed |
| **BUG-008** | `src/core/tools.js` | Platform error in `get_storage_info` on non-Windows OS | 🟠 High | ✅ Fixed |
| **BUG-009** | `src/core/memory.js` | Channel ID truncation on colons in `flushAll()` & `getStats()` | 🟡 Medium | ✅ Fixed |
| **BUG-010** | `src/bridges/*.js` | Race condition in conversation history snapshot timing | 🟠 High | ✅ Fixed |

---

## 🔍 Detailed Bug Reports & Fixes

### 🔴 BUG-001: Undefined `SYSTEM_PROMPT` Variable in `src/core/llm.js`
- **Impact**: Invoking `llm.generate(prompt)` threw a runtime `ReferenceError: SYSTEM_PROMPT is not defined`, crashing single-prompt text generation.
- **Root Cause**: `generate()` referenced `SYSTEM_PROMPT` directly, which was never imported or declared in `llm.js`.
- **Fix**: Replaced `SYSTEM_PROMPT` with `getSystemPrompt("normal")` imported from `personality.js`.

### 🟠 BUG-002: TypeError on Startup without `groq` Config in `src/index.js`
- **Impact**: Launching Alya with an empty or partial `config.json` threw `TypeError: Cannot read properties of undefined (reading 'model')` at startup.
- **Root Cause**: `src/index.js` accessed `config.groq.model` directly without checking if `config.groq` existed.
- **Fix**: Updated startup status logger to use optional chaining: `config.groq?.model || llm.model`.

### 🟡 BUG-003: Outdated Default Configuration in `src/core/config.js`
- **Impact**: New or unconfigured environments fell back to legacy `ollama` settings without providing default `groq` structures required by `llm.js`.
- **Root Cause**: `DEFAULT_CONFIG` was missing `groq` properties (`apiKey`, `apiKeys`, `model`).
- **Fix**: Updated `DEFAULT_CONFIG` in `src/core/config.js` to include standard Groq settings.

### 🟠 BUG-004: Missing Interactive Setup Script `setup.js`
- **Impact**: Running `npm run setup` failed with `Error: Cannot find module '/app/setup.js'`.
- **Root Cause**: `package.json` defined `"setup": "node setup.js"`, but `setup.js` was missing from the project root.
- **Fix**: Created an interactive CLI setup wizard `setup.js` supporting both interactive terminal configuration and automated non-interactive defaults.

### 🔴 BUG-005: Remote Code Execution (RCE) in `calculator` Tool
- **Impact**: Attacker/LLM could pass arbitrary JavaScript expressions into `calculator` to execute untrusted code via `new Function()`.
- **Root Cause**: `new Function("return " + args.expression)()` was executed without prior sanitization or string validation.
- **Fix**: Implemented strict regex input validation `/^[0-9+\-*/().\s]+$/` to restrict expression characters strictly to numbers, basic mathematical operators, and whitespace.

### 🔴 BUG-006: Path Traversal Vulnerability in `read_pdf` Tool
- **Impact**: The LLM could be tricked into reading sensitive system files (e.g. `/etc/passwd`, Windows system directories) via path traversal (`../`).
- **Root Cause**: Path arguments passed to `fs.readFileSync` were unvalidated.
- **Fix**: Added explicit checks blocking relative path traversal (`..`), resolved path normalization with `path.resolve()`, and restricted access to system directories (`/etc/`, `/var/`, `/proc/`, `/sys/`, `system32`).

### 🔴 BUG-007: Server-Side Request Forgery (SSRF) in `read_website` Tool
- **Impact**: The bot could be commanded to send HTTP requests to internal private infrastructure or loopback services (e.g., `http://127.0.0.1:3000`, `http://169.254.169.254`).
- **Root Cause**: `read_website` fetched any raw URL provided without validating destination IP addresses or hostname scopes.
- **Fix**: Validated protocol (`http`/`https`) and blocked requests targeting `localhost`, loopback addresses, private subnet ranges (`10.x.x.x`, `192.168.x.x`, `172.16-31.x.x`), and `.local` domains.

### 🟠 BUG-008: Non-Windows Platform Storage Command Failure in `get_storage_info`
- **Impact**: Calling `get_storage_info` on Linux or macOS threw an error because the Windows `wmic` binary is unavailable on non-Windows platforms.
- **Root Cause**: `execSync` invoked `wmic logicaldisk get size,freespace,caption` unconditionally regardless of `process.platform`.
- **Fix**: Added dynamic platform switching: executes `wmic` on Windows (`win32`) and parses standard POSIX filesystem output via `df -k /` on Linux and macOS (`darwin`).

### 🟡 BUG-009: Conversation Channel ID Truncation on Colons
- **Impact**: Discord/Slack channels or complex user IDs containing colons resulted in corrupted conversation storage keys during `flushAll()` and stats calculation.
- **Root Cause**: `key.split(":")` split on every colon occurrence, truncating channel IDs with multiple colons to their first element.
- **Fix**: Replaced `split(":")` with `indexOf(":")` and `substring()` to correctly isolate platform names and preserve full channel IDs.

### 🟠 BUG-010: Conversation History Race Condition in Platform Bridges
- **Impact**: In rapid messaging streams across Discord, Telegram, Slack, WhatsApp, and Web bridges, user messages added to history during async LLM calls could lead to lost context or race conditions.
- **Root Cause**: Incoming user messages were appended after `this.llm.chat()` completed or without snapshotting prior history.
- **Fix**: Captured an immutable history snapshot (`const historySnapshot = [...history]`) before storing the user message in memory and passing the snapshot to the LLM engine.

---

## 🧪 Verification & Integrity Testing

All fixes have been verified using:
1. `node --check` syntax validation across all source files.
2. Unit and edge-case execution tests covering secured tools (`calculator`, `read_pdf`, `read_website`, `get_storage_info`).
3. Memory module storage key parsing and stats calculation tests.
4. Non-interactive setup script verification.
