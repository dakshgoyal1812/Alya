# 🐛 Alya Assistant — Comprehensive Bug & Security Audit Report

This report outlines the identified bugs, runtime errors, platform compatibility issues, and security vulnerabilities found during an in-depth audit of the **Alya** codebase.

---

## 📌 Executive Summary

| Issue ID | Severity | Category | File | Description |
|---|---|---|---|---|
| **BUG-001** | 🔴 Critical | Runtime Crash | `src/core/llm.js` | ReferenceError: Undefined variable `SYSTEM_PROMPT` in `generate()` method |
| **BUG-002** | 🟠 High | Logic / Data Loss | `src/core/memory.js` | Channel ID truncation when channel/user IDs contain colons (`split(":")`) |
| **SEC-001** | 🔴 Critical | Security (RCE) | `src/core/tools.js` | Arbitrary Code Execution via `execute_python_code` tool |
| **SEC-002** | 🔴 Critical | Security (RCE) | `src/core/tools.js` | Unsanitized input evaluation via `new Function` in `calculator` tool |
| **SEC-003** | 🟠 High | Security (Path Traversal) | `src/core/tools.js` | Arbitrary File Read vulnerability via `read_pdf` tool |
| **SEC-004** | 🟠 High | Security (SSRF) | `src/core/tools.js` | Server-Side Request Forgery via `read_website` tool |
| **BUG-003** | 🟡 Medium | Platform Compatibility | `src/core/tools.js` | Hardcoded `wmic` command fails on Linux/macOS environments in `get_storage_info` |
| **BUG-004** | 🟡 Medium | Concurrency / Race Condition | `src/bridges/*.js` | Race condition in conversation history during rapid concurrent message inputs |

---

## 🔍 Detailed Bug & Vulnerability Breakdown

### 1. 🔴 BUG-001: ReferenceError `SYSTEM_PROMPT` is Undefined
- **File:** `src/core/llm.js` (inside `generate()` method)
- **Description:** The `generate(prompt)` function attempts to pass `SYSTEM_PROMPT` to OpenAI chat completions:
  ```javascript
  messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }]
  ```
- **Impact:** `SYSTEM_PROMPT` is not imported or defined in `src/core/llm.js` (the file imports `getSystemPrompt`). Calling `generate()` causes a fatal runtime `ReferenceError: SYSTEM_PROMPT is not defined`.
- **Recommendation:** Replace `SYSTEM_PROMPT` with `getSystemPrompt("normal")`.

---

### 2. 🟠 BUG-002: Truncation of Channel IDs Containing Colons
- **File:** `src/core/memory.js` (`flushAll()` and `getStats()` functions)
- **Description:** Keys in `memory.js` follow the format `platform:channelId`. When extracting the platform and channel ID, the code uses:
  ```javascript
  const [platform, channelId] = key.split(":");
  ```
- **Impact:** On platforms such as Slack, Discord, or custom bridges where channel/user IDs contain colons (e.g. `slack:C123:T456`), `key.split(":")` truncates the channel ID to just `C123`. This leads to corrupted conversation saves or failure to load history.
- **Recommendation:** Replace `key.split(":")` with `key.indexOf(":")` and string slicing (`key.substring(firstColon + 1)`).

---

### 3. 🔴 SEC-001: Remote Code Execution via `execute_python_code`
- **File:** `src/core/tools.js`
- **Description:** The `execute_python_code` tool takes arbitrary Python code from the LLM or direct input, writes it to a temporary file, and executes it directly on the host using `execSync('python ...')`.
- **Impact:** Any attacker or prompt injection can execute arbitrary system commands, access host resources, or compromise the host machine.
- **Recommendation:** Disable or sandbox the `execute_python_code` execution environment.

---

### 4. 🔴 SEC-002: Unsanitized Input Evaluation in `calculator` Tool
- **File:** `src/core/tools.js`
- **Description:** The `calculator` tool evaluates expressions using `new Function`:
  ```javascript
  return String(new Function(`return ${args.expression}`)());
  ```
- **Impact:** Malicious expressions like `process.exit(1)` or code injections can be executed through the calculator function.
- **Recommendation:** Sanitize the input expression using strict whitelist regular expressions (e.g. `/^[0-9+\-*/().\s]+$/`) before passing it to `new Function()`.

---

### 5. 🟠 SEC-003: Path Traversal Vulnerability in `read_pdf`
- **File:** `src/core/tools.js`
- **Description:** `read_pdf` accepts an `absolutePath` parameter and reads any file on the filesystem using `fs.readFileSync(args.absolutePath)`.
- **Impact:** Allows arbitrary file read access (e.g. `/etc/passwd`, sensitive configuration files, API keys).
- **Recommendation:** Validate resolved path boundaries and prevent path traversal sequences (like `..`) or access to restricted system directories.

---

### 6. 🟠 SEC-004: Server-Side Request Forgery (SSRF) in `read_website`
- **File:** `src/core/tools.js`
- **Description:** The `read_website` tool fetches arbitrary URLs via `fetch(args.url)` without validating target IP addresses or hostnames.
- **Impact:** Enables attackers to make HTTP requests to internal network services, cloud metadata endpoints (`http://169.254.169.254`), or local services (`http://localhost:3000`).
- **Recommendation:** Implement IP/hostname validation to reject private, loopback, and cloud metadata addresses.

---

### 7. 🟡 BUG-003: Platform Incompatibility in `get_storage_info`
- **File:** `src/core/tools.js`
- **Description:** `get_storage_info` executes `execSync("wmic logicaldisk get size,freespace,caption")` by default.
- **Impact:** On non-Windows operating systems (Linux, macOS, Docker containers), `wmic` fails, throwing an exception and falling back to memory statistics rather than disk usage.
- **Recommendation:** Check `os.platform()` dynamically and use OS-appropriate commands like `df -k` on POSIX systems.

---

### 8. 🟡 BUG-004: Conversation History Race Condition
- **File:** `src/bridges/*.js` (Discord, Telegram, Slack, WhatsApp, Web)
- **Description:** Bridges retrieve history via `getHistory()`, invoke `llm.chat(history, content)`, and then append messages to memory using `addMessage()`.
- **Impact:** If multiple messages arrive concurrently in the same channel before the LLM finishes generating a response, the mutated `history` array leads to duplicated or out-of-order message context.
- **Recommendation:** Pass a snapshot copy of history (`[...history]`) and append incoming user messages to memory immediately upon receipt.

---

*Report generated for repository maintainers.* ✨
