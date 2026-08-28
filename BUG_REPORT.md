# 🐛 Alya Assistant — Comprehensive Bug & Security Report

This document provides a detailed report of all discovered bugs, security vulnerabilities, edge cases, and code quality issues in the **Alya Assistant** codebase.

---

## 📊 Summary of Identified Issues

| Severity | Category | Bug Description | Location |
| :--- | :--- | :--- | :--- |
| 🚨 **High** | Runtime Crash | Undefined `SYSTEM_PROMPT` reference in `LLMEngine.generate()` | `src/core/llm.js` |
| 🚨 **High** | Security (RCE) | Remote Code Execution via un-sandboxed `execute_python_code` tool | `src/core/tools.js` |
| 🚨 **High** | Security (Injection) | Arbitrary code execution via unsafe `new Function()` in `calculator` tool | `src/core/tools.js` |
| 🚨 **High** | Security (SSRF) | Unrestricted network requests in `read_website` tool (SSRF risk) | `src/core/tools.js` |
| 🚨 **High** | Security (Path Traversal) | Arbitrary file read vulnerability in `read_pdf` tool | `src/core/tools.js` |
| ⚠️ **Medium** | Cross-Platform | Platform storage command (`wmic`) fails non-Windows operating systems | `src/core/tools.js` |
| ⚠️ **Medium** | Concurrency | Race condition during message history updates across platform bridges | `src/bridges/*.js` |
| ⚠️ **Medium** | User Experience | Local absolute file paths returned for generated media assets | `src/core/tools.js` |
| ℹ️ **Low** | Missing Dependency | Missing `setup.js` wizard script referenced in documentation | Repository Root / README |
| ℹ️ **Low** | Data Truncation | Channel ID splitting by colon truncates platform IDs containing colons | `src/core/memory.js` |

---

## 🔍 Detailed Bug Findings & Remediation

### 1. 🚨 Undefined `SYSTEM_PROMPT` Variable Reference
- **File Location**: `src/core/llm.js` (Method: `generate(prompt)`)
- **Severity**: High (Runtime Crash)
- **Description**: The `generate(prompt)` method references `SYSTEM_PROMPT` directly:
  ```javascript
  messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }]
  ```
  However, `SYSTEM_PROMPT` is not defined or imported in `src/core/llm.js`. Calling `generate()` throws a runtime `ReferenceError: SYSTEM_PROMPT is not defined`.
- **Recommended Fix**:
  Replace `SYSTEM_PROMPT` with `getSystemPrompt("normal")` which is already imported from `./personality.js`.

---

### 2. 🚨 Remote Code Execution (RCE) in `execute_python_code` Tool
- **File Location**: `src/core/tools.js`
- **Severity**: Critical Security Vulnerability
- **Description**: The `execute_python_code` tool writes untrusted code from model completions directly to a temporary file and runs it via `execSync(\`python "${tempFile}"\`)` on the host system without sandboxing, container isolation, or resource bounds.
- **Recommended Fix**:
  Disable this tool in production or run python scripts inside a restricted container sandbox (such as Docker or gVisor) with network and file access disabled.

---

### 3. 🚨 Unsafe Code Evaluation in `calculator` Tool
- **File Location**: `src/core/tools.js`
- **Severity**: High (Code Injection)
- **Description**: The `calculator` tool evaluates math expressions using `new Function(\`return ${args.expression}\`)()`. If the LLM produces a malicious expression string or arbitrary JavaScript, it executes in the main Node.js process context.
- **Recommended Fix**:
  Sanitize the expression string with a strict whitelist regex (e.g., `/^[0-9+\-*/().\s]+$/`) before evaluating, or use a safe math parser library (e.g. `expr-eval` or `mathjs`).

---

### 4. 🚨 Server-Side Request Forgery (SSRF) in `read_website`
- **File Location**: `src/core/tools.js`
- **Severity**: High Security Vulnerability
- **Description**: `read_website` issues HTTP requests to arbitrary URLs passed to `fetch(args.url)` without validating target hostnames or IP addresses. An attacker could use this tool to scan or read internal network services (e.g. `http://127.0.0.1:8080`, `http://169.254.169.254`).
- **Recommended Fix**:
  Implement IP validation before fetching. Resolve the domain and block requests targeting private/loopback IP ranges (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`).

---

### 5. 🚨 Path Traversal & Arbitrary File Read in `read_pdf`
- **File Location**: `src/core/tools.js`
- **Severity**: High Security Vulnerability
- **Description**: `read_pdf` accepts any `absolutePath` argument and passes it to `fs.readFileSync(args.absolutePath)` without validating whether the file resides within an allowed uploads or documents directory.
- **Recommended Fix**:
  Normalize and validate the resolved file path using `path.resolve()` and enforce that the target path lies inside an explicit allowed base directory.

---

### 6. ⚠️ Cross-Platform Storage Info Command Failure
- **File Location**: `src/core/tools.js` (Tool: `get_storage_info`)
- **Severity**: Medium
- **Description**: The tool executes `wmic logicaldisk get size,freespace,caption`, which is Windows-only. On Linux or macOS environments, execution throws an error and falls back to reporting memory usage instead of actual disk space.
- **Recommended Fix**:
  Detect `process.platform` dynamically. Use `df -k` or `df -h` on Linux/macOS and `wmic` or `powershell` on Windows.

---

### 7. ⚠️ Race Condition in Channel Message History
- **File Location**: `src/bridges/discord.js`, `slack.js`, `telegram.js`, `whatsapp.js`, `web.js`
- **Severity**: Medium
- **Description**: Platform bridges retrieve conversation history with `const history = getHistory(...)` before awaiting `this.llm.chat(...)`, and add the new messages to memory via `addMessage(...)` *after* `chat()` resolves. If multiple user messages arrive in quick succession, concurrent requests read outdated history snapshots and duplicate or omit recent messages.
- **Recommended Fix**:
  Pass a copied snapshot `const historySnapshot = [...history]` to `this.llm.chat()` while adding the incoming user message to memory immediately upon receipt.

---

### 8. ⚠️ Unmapped Local File Paths for Generated Media
- **File Location**: `src/core/tools.js` (`screenshot_website`, `generate_qr_code`)
- **Severity**: Medium (User Experience)
- **Description**: Media tools return local file paths (such as `/app/data/temp/qrcode_123.png`). Chat platforms like Telegram, Discord, and Slack cannot resolve local server paths when rendered as text links.
- **Recommended Fix**:
  Upload media files using platform native attachment functions or serve them via static HTTP endpoints on the Web bridge.

---

### 9. ℹ️ Missing `setup.js` Setup Wizard Script
- **File Location**: Project Root / `package.json` / `README.md` / `src/index.js`
- **Severity**: Low
- **Description**: Documentation and CLI prompts instruct users to run `npm run setup` / `node setup.js`. However, `setup.js` is missing from the repository root.
- **Recommended Fix**:
  Create `setup.js` to handle interactive user configuration generation, or update README instructions to describe manual `config/config.json` creation.

---

### 10. ℹ️ Channel ID Truncation on Colon-Delimited Keys
- **File Location**: `src/core/memory.js` (`flushAll()` and `getStats()`)
- **Severity**: Low
- **Description**: Functions split stored keys using `key.split(":")` assuming keys take the exact format `platform:channelId`. If a channel ID contains colons, `channelId` gets truncated to its first segment.
- **Recommended Fix**:
  Use `key.indexOf(":")` and `key.substring(...)` to extract the platform and full channel ID.

---
