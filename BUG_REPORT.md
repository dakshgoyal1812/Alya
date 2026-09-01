# 🛡️ Alya — Comprehensive Bug & Security Audit Report

This report documents the security vulnerabilities, critical runtime crashes, platform compatibility bugs, and concurrency issues identified and resolved in Alya AI Assistant.

---

## 📊 Summary of Findings

| ID | Issue Description | Component | Severity | Category | Status |
|---|---|---|---|---|---|
| **ALYA-01** | ReferenceError: Undefined `SYSTEM_PROMPT` in `generate` | `src/core/llm.js` | 🔴 Critical | Runtime Crash | **Fixed** |
| **ALYA-02** | Arbitrary Remote Code Execution (RCE) in Calculator Tool | `src/core/tools.js` | 🔴 Critical | Security (RCE) | **Fixed** |
| **ALYA-03** | Host Remote Code Execution (RCE) in Python Code Executor | `src/core/tools.js` | 🔴 Critical | Security (RCE) | **Fixed** |
| **ALYA-04** | Arbitrary File Read via Path Traversal in PDF Reader Tool | `src/core/tools.js` | 🟠 High | Security (Access Control) | **Fixed** |
| **ALYA-05** | Server-Side Request Forgery (SSRF) in Web Page Reader Tool | `src/core/tools.js` | 🟠 High | Security (SSRF) | **Fixed** |
| **ALYA-06** | Platform Compatibility Storage Crash on Unix/macOS | `src/core/tools.js` | 🟡 Medium | Platform Bug | **Fixed** |
| **ALYA-07** | Channel/User ID Truncation Bug (Colon Split Bug) | `src/core/memory.js` | 🟠 High | Data Integrity | **Fixed** |
| **ALYA-08** | Message Concurrency Race Conditions in Platform Bridges | `src/bridges/*` | 🟠 High | Concurrency | **Fixed** |

---

## 🔍 Detailed Reports & Fixes

### 🔴 ALYA-01: ReferenceError on Undefined `SYSTEM_PROMPT`
- **Component:** `src/core/llm.js` (inside `generate(prompt)`)
- **Severity:** 🔴 Critical (Runtime Crash)
- **Description:** The `generate` function attempted to reference a global variable `SYSTEM_PROMPT` which was never defined or imported in the module, leading to a `ReferenceError` runtime crash when invoked.
- **Fix Applied:** Replaced `SYSTEM_PROMPT` with `getSystemPrompt("normal")` dynamically imported from `src/core/personality.js`.

---

### 🔴 ALYA-02: Remote Code Execution (RCE) in Calculator Tool
- **Component:** `src/core/tools.js` (inside `calculator`)
- **Severity:** 🔴 Critical (Security Vulnerability)
- **Description:** The `calculator` tool evaluated expressions passed into `new Function()`. Unsanitized input allowed arbitrary JavaScript payloads to execute within the Node.js process context.
- **Fix Applied:** Enforced strict regex input validation using `/^[0-9+\-*/().\s]+$/` to restrict evaluation to numerical digits and safe arithmetic operators.

---

### 🔴 ALYA-03: Remote Code Execution (RCE) in Python Code Executor
- **Component:** `src/core/tools.js` (inside `execute_python_code`)
- **Severity:** 🔴 Critical (Security Vulnerability)
- **Description:** The Python executor tool enabled execution of arbitrary Python scripts on the host system via `execSync("python ...")`.
- **Fix Applied:** Disabled Python code execution and returned a clear error message indicating the tool is disabled for security reasons.

---

### 🟠 ALYA-04: Path Traversal Vulnerability in PDF Reader Tool
- **Component:** `src/core/tools.js` (inside `read_pdf`)
- **Severity:** 🟠 High (Security Vulnerability)
- **Description:** The `read_pdf` tool parsed raw path inputs directly, allowing path traversal (`..` sequences) to read sensitive system files.
- **Fix Applied:** Implemented path normalization with `path.resolve()`, blocked relative path traversal sequences (`..`), normalized path separators, and restricted access to system directories (`/etc/`, `/var/`, `/sys/`, `/proc/`, `/dev/`, `system32`, `windows`).

---

### 🟠 ALYA-05: Server-Side Request Forgery (SSRF) in Web Page Reader Tool
- **Component:** `src/core/tools.js` (inside `read_website`)
- **Severity:** 🟠 High (Security Vulnerability)
- **Description:** The `read_website` tool performed Server-Side `fetch()` requests without restricting target hostnames or IP addresses.
- **Fix Applied:** Added URL parsing to validate target hostnames, blocking `localhost`, loopback addresses, and private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`). Additionally, manual redirect handling (`redirect: "manual"`) was enabled.

---

### 🟡 ALYA-06: Platform Compatibility Storage Crash on Unix/macOS
- **Component:** `src/core/tools.js` (inside `get_storage_info`)
- **Severity:** 🟡 Medium (Platform Compatibility)
- **Description:** `get_storage_info` executed Windows-specific `wmic` commands without OS checks, causing command execution failures on Linux and macOS.
- **Fix Applied:** Added platform branching via `process.platform`. On non-Windows OSes, it executes `df -k /` and parses filesystem storage metrics reliably.

---

### 🟠 ALYA-07: Channel/User ID Truncation Bug (Colon Split Bug)
- **Component:** `src/core/memory.js` (inside `flushAll` and `getStats`)
- **Severity:** 🟠 High (Data Integrity / Bug)
- **Description:** `key.split(":")` truncated channel or user IDs that contained colons (common on Slack and Discord), causing conversation data loading and saving failures.
- **Fix Applied:** Refactored key parsing using `key.indexOf(":")` and `key.substring()` to correctly handle IDs containing colons without array allocation overhead.

---

### 🟠 ALYA-08: Message Concurrency Race Conditions in Platform Bridges
- **Component:** `src/bridges/*` (Discord, Telegram, Slack, Web, WhatsApp)
- **Severity:** 🟠 High (Concurrency / Logic Bug)
- **Description:** Messaging bridges queried history prior to invoking async LLM operations and recorded user messages post-completion, leading to lost context during concurrent rapid typing.
- **Fix Applied:** Updated all platform bridges to record incoming user messages immediately via `addMessage` upon receipt and pass a snapshot `history.slice(0, -1)` to `llm.chat(...)`.

---

## 🔒 Verification & Compliance

All fixes have been verified for syntax correctness (`node --check`) and module compatibility across `src/core/*.js` and `src/bridges/*.js`.
