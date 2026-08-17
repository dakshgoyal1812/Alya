# Alya AI Assistant — Comprehensive Security Audit & Bug Report

This report summarizes the security vulnerabilities, platform compatibility limitations, and runtime race conditions identified in the **Alya AI Assistant** codebase.

---

## 1. Executive Summary

A comprehensive code audit was conducted on Alya's core services, platform bridges, and AI tool integration. The audit uncovered several critical vulnerabilities—including Remote Code Execution (RCE), Server-Side Request Forgery (SSRF), and Arbitrary File Reads—alongside functional bugs causing system crashes and data loss under heavy concurrent traffic.

All discovered issues have been analyzed and cataloged below for documentation, remediation tracking, and security review.

---

## 2. Vulnerability & Bug Catalog

### 2.1 Remote Code Execution (RCE) in `calculator` Tool
*   **Severity:** Critical 🔴
*   **Vulnerability Type:** Code Injection / RCE
*   **Location:** `src/core/tools.js`
*   **Description:** The `calculator` tool evaluated user-supplied mathematical expressions using `new Function()`. Without sanitization, any user (or LLM prompt injection) could execute arbitrary JavaScript code inside the Node.js process context, resulting in full host takeover.
*   **Remediation Control:** Implement strict regex sanitization (`/^[0-9+\-*/().\s]+$/`) to validate inputs. Reject non-mathematical characters before code execution is initiated.

### 2.2 Shell Code Execution via `execute_python_code` Tool
*   **Severity:** Critical 🔴
*   **Vulnerability Type:** Arbitrary Command Execution
*   **Location:** `src/core/tools.js`
*   **Description:** The `execute_python_code` tool allowed arbitrary Python scripts to be written to a temp file and executed on the host system via `execSync()`. This bypassed all sandbox limits and exposed the host system to full compromise.
*   **Remediation Control:** Disable the `execute_python_code` tool entirely on host machines or restrict execution strictly to isolated sandboxed containers.

### 2.3 Arbitrary File Read & Path Traversal in `read_pdf` Tool
*   **Severity:** High 🟡
*   **Vulnerability Type:** Path Traversal
*   **Location:** `src/core/tools.js`
*   **Description:** The `read_pdf` tool accepted an absolute path argument from the LLM and read files directly using `fs.readFileSync` without validation. Attackers could utilize directory traversal (`..`) or absolute paths to read sensitive files (e.g., `/etc/passwd`, `.env`, API keys).
*   **Remediation Control:** Integrate `path.resolve` validation. Check for and block directory traversal patterns (e.g., `..`) and explicitly restrict access to forbidden system paths (such as `/etc/`, `/var/`, `system32`, `.git`, and `config/`).

### 2.4 Server-Side Request Forgery (SSRF) in `read_website` Tool
*   **Severity:** High 🟡
*   **Vulnerability Type:** SSRF
*   **Location:** `src/core/tools.js`
*   **Description:** The `read_website` tool used global `fetch` to request any URL provided by the LLM. Attackers could trick the assistant into querying internal network devices, loopback endpoints, or cloud metadata endpoints (e.g., `http://169.254.169.254/`).
*   **Remediation Control:** Validate target hostnames and resolved IP addresses. Block loopback addresses (`localhost`, `127.0.0.1`, `::1`), private CIDR ranges (`10.x.x.x`, `192.168.x.x`, `172.16-31.x.x`), and broadcast/multicast IPs.

### 2.5 ReferenceError on Undefined Variable `SYSTEM_PROMPT` in LLM Engine
*   **Severity:** High 🟡
*   **Vulnerability Type:** Runtime Stability / Crash
*   **Location:** `src/core/llm.js`
*   **Description:** The `generate()` function in `src/core/llm.js` referenced an undefined variable `SYSTEM_PROMPT`, causing immediate runtime crashes whenever the single prompt generation endpoint was called.
*   **Remediation Control:** Replace `SYSTEM_PROMPT` with a call to the imported helper `getSystemPrompt("normal")` from `personality.js`.

### 2.6 Synchronous Event-Loop Blocking in Memory Manager
*   **Severity:** Medium 🟢
*   **Vulnerability Type:** Resource Exhaustion / Performance Bottleneck
*   **Location:** `src/core/memory.js`
*   **Description:** The memory manager periodically wrote conversation history to disk every 5 messages using synchronous `fs.writeFileSync`. Under concurrent multi-user load, this blocked Node's single-threaded event loop, leading to lag and potential timeouts.
*   **Remediation Control:** Refactor periodic backups to use non-blocking asynchronous writing (`fs.promises.writeFile`). Keep synchronous `writeFileSync` strictly inside process termination listeners where asynchronous operations cannot run reliably.

### 2.7 Key Splitting Collision and Array Allocation Overhead in Memory Map
*   **Severity:** Medium 🟢
*   **Vulnerability Type:** Functional Defect
*   **Location:** `src/core/memory.js`
*   **Description:** The functions `flushAll()` and `getStats()` parsed memory map keys using `key.split(":")`. If a platform channel ID contained a colon, the split would corrupt the channel ID, preventing correct state restoration. This also allocated unnecessary array garbage.
*   **Remediation Control:** Refactor splitting logic to find the first colon via `key.indexOf(":")` and retrieve segments using fast, allocation-free `substring()`.

### 2.8 Concurrent Race Conditions in Message Flows
*   **Severity:** Medium 🟢
*   **Vulnerability Type:** Logic Race Condition / History Corruption
*   **Location:** `src/bridges/discord.js`, `slack.js`, `telegram.js`, `whatsapp.js`, `web.js`
*   **Description:** In platform bridges, user messages were not appended to history until *after* the LLM completed its chat generation (which takes seconds). If the user typed rapid consecutive messages, subsequent queries did not contain the earlier context, leading to corrupted memory and repeating LLM outputs.
*   **Remediation Control:** Insert user messages into memory immediately upon arrival. Query the LLM using a snapshot of historical context to neutralize race conditions.

### 2.9 Platform Compatibility Limitations in Disk Storage Info
*   **Severity:** Low 🟢
*   **Vulnerability Type:** Platform Defect
*   **Location:** `src/core/tools.js`
*   **Description:** The `get_storage_info` tool relied entirely on the Windows `wmic` command. On macOS and Linux systems, it threw error exceptions and fell back to displaying RAM memory statistics, failing to provide actual disk storage information.
*   **Remediation Control:** Enhance `get_storage_info` with platform detection. Invoke POSIX-compliant `df -k` on Linux and macOS to parse actual disk structures correctly.

---

## 3. Remediation Status Summary

| # | Bug / Vulnerability | File Impacted | Severity | Vulnerability Type |
|---|---|---|---|---|
| 1 | Remote Code Execution (RCE) via calculator | `src/core/tools.js` | Critical 🔴 | Code Injection / RCE |
| 2 | Python host takeover vulnerability | `src/core/tools.js` | Critical 🔴 | Arbitrary Command Execution |
| 3 | Arbitrary file read / directory traversal | `src/core/tools.js` | High 🟡 | Path Traversal |
| 4 | Server-Side Request Forgery (SSRF) | `src/core/tools.js` | High 🟡 | SSRF |
| 5 | Undefined SYSTEM_PROMPT ReferenceError | `src/core/llm.js` | High 🟡 | Runtime Crash |
| 6 | Event-Loop blocking synchronous disk writes | `src/core/memory.js` | Medium 🟢 | Resource Exhaustion |
| 7 | Key parsing splitting collision on channel ID | `src/core/memory.js` | Medium 🟢 | Functional Defect |
| 8 | Logic race conditions under concurrent typing | `src/bridges/*` | Medium 🟢 | Race Condition |
| 9 | Platform incompatibility (wmic on Linux) | `src/core/tools.js` | Low 🟢 | Platform Defect |

---
