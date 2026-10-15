# Alya AI Assistant — Comprehensive Security Audit & Bug Report

This report summarizes the security vulnerabilities, platform compatibility limitations, and runtime race conditions identified and successfully resolved in the **Alya AI Assistant** codebase.

---

## 1. Executive Summary

A comprehensive code audit was conducted on Alya's core services, platform bridges, and AI tool integration. The audit uncovered several critical vulnerabilities—including Remote Code Execution (RCE), Server-Side Request Forgery (SSRF), and Arbitrary File Reads—alongside functional bugs causing system crashes and data loss under heavy concurrent traffic.

All discovered issues have been completely remediated. Robust, performance-oriented controls were implemented without introducing unnecessary dependencies or external package overhead.

---

## 2. Vulnerability & Bug Catalog

### 2.1 Remote Code Execution (RCE) in `calculator` Tool
*   **Severity:** Critical 🔴
*   **Vulnerability Type:** Code Injection / RCE
*   **Description:** The `calculator` tool evaluated user-supplied mathematical expressions using `new Function()`. Without sanitization, arbitrary JavaScript code could be executed in the Node.js process context.
*   **Remediation:** Added strict regex sanitization (`/^[0-9+\-*/().\s]+$/`) to validate inputs before evaluating. Non-mathematical characters are rejected.

### 2.2 Shell Code Execution via `execute_python_code` Tool
*   **Severity:** Critical 🔴
*   **Vulnerability Type:** Arbitrary Command Execution
*   **Description:** The `execute_python_code` tool allowed arbitrary Python scripts to be written to a temporary file and executed on the host system via `execSync()`.
*   **Remediation:** Disabled the `execute_python_code` tool on host machines, returning a safe, descriptive notice instead.

### 2.3 Arbitrary File Read & Path Traversal in `read_pdf` Tool
*   **Severity:** High 🟡
*   **Vulnerability Type:** Path Traversal
*   **Description:** The `read_pdf` tool accepted an absolute path argument and read files directly using `fs.readFileSync` without path validation or restriction.
*   **Remediation:** Integrated `path.resolve` validation, explicit checks blocking directory traversal patterns (`..`), and restricted access to sensitive system paths (e.g., `/etc/`, `/var/`, `system32`, `.git`, `config/`).

### 2.4 Server-Side Request Forgery (SSRF) in `read_website` Tool
*   **Severity:** High 🟡
*   **Vulnerability Type:** SSRF
*   **Description:** The `read_website` tool used global `fetch` to request any URL without validating target hosts, exposing internal networks and loopback interfaces.
*   **Remediation:** Added target hostname and IP validation to block loopback addresses (`localhost`, `127.0.0.1`, `::1`), private CIDR ranges, and broadcast/multicast endpoints.

### 2.5 ReferenceError on Undefined Variable `SYSTEM_PROMPT` in LLM Engine
*   **Severity:** High 🟡
*   **Vulnerability Type:** Runtime Stability / Crash
*   **Description:** The `generate()` function in `src/core/llm.js` referenced an undefined variable `SYSTEM_PROMPT`, causing immediate runtime crashes when invoked.
*   **Remediation:** Replaced `SYSTEM_PROMPT` with `getSystemPrompt("normal")` from `personality.js`.

### 2.6 Key Splitting Collision in Memory Map
*   **Severity:** Medium 🟢
*   **Vulnerability Type:** Functional Defect
*   **Description:** The functions `flushAll()` and `getStats()` parsed memory map keys using `key.split(":")`. Channel IDs containing colons caused improper parsing and potential state corruption.
*   **Remediation:** Refactored splitting logic using `key.indexOf(":")` and `substring()`.

### 2.7 Concurrent Race Conditions in Message Flows
*   **Severity:** Medium 🟢
*   **Vulnerability Type:** Logic Race Condition / History Corruption
*   **Description:** In Discord, Slack, Telegram, WhatsApp, and Web bridges, user messages were appended to memory only after the LLM responded, causing rapid consecutive user messages to lose historical context.
*   **Remediation:** Modified platform bridges to record incoming user messages into memory immediately upon arrival.

### 2.8 Platform Compatibility Limitations in Storage Info Tool
*   **Severity:** Low 🟢
*   **Vulnerability Type:** Platform Defect
*   **Description:** The `get_storage_info` tool relied exclusively on Windows `wmic` command, throwing exceptions on Unix-like operating systems.
*   **Remediation:** Added OS detection and implemented POSIX `df -k` fallback for Linux and macOS environments.

---

## 3. Remediation Status Summary

| # | Bug / Vulnerability | File Impacted | Severity | Status |
|---|---|---|---|---|
| 1 | Remote Code Execution (RCE) via calculator | `src/core/tools.js` | Critical 🔴 | **Fixed** |
| 2 | Python host takeover vulnerability | `src/core/tools.js` | Critical 🔴 | **Fixed** |
| 3 | Arbitrary file read / directory traversal | `src/core/tools.js` | High 🟡 | **Fixed** |
| 4 | Server-Side Request Forgery (SSRF) | `src/core/tools.js` | High 🟡 | **Fixed** |
| 5 | Undefined SYSTEM_PROMPT ReferenceError | `src/core/llm.js` | High 🟡 | **Fixed** |
| 6 | Key parsing splitting collision on channel ID | `src/core/memory.js` | Medium 🟢 | **Fixed** |
| 7 | Logic race conditions under concurrent typing | `src/bridges/*` | Medium 🟢 | **Fixed** |
| 8 | Platform incompatibility (wmic on Linux/macOS) | `src/core/tools.js` | Low 🟢 | **Fixed** |

All identified issues are resolved, tested, and verified. 🚀
