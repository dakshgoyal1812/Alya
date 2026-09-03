# 🛡️ Alya AI Assistant — Comprehensive Security Audit & Bug Report

This document contains a comprehensive report on the security vulnerabilities, platform compatibility bugs, and functional issues identified during a thorough code audit of the **Alya AI Assistant** repository, along with the detailed status and remediation strategies for securing and optimizing the platform.

---

## Executive Summary

| Issue # | Vulnerability / Bug Description | File affected | Severity | Impact | Status |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **1** | Undefined `SYSTEM_PROMPT` Variable in `generate()` | `src/core/llm.js` | **High** | Causes immediate runtime crash (`ReferenceError`) when executing single prompt generations. | **Fixed** |
| **2** | Remote Code Execution (RCE) in `calculator` Tool | `src/core/tools.js` | **Critical** | Allows arbitrary JS execution on the host via `new Function()` prompt injection. | **Fixed** |
| **3** | Unsandboxed Arbitrary Python Code Execution | `src/core/tools.js` | **Critical** | Allows arbitrary shell/Python code execution and host compromise via `execSync`. | **Fixed** |
| **4** | Server-Side Request Forgery (SSRF) in `read_website` | `src/core/tools.js` | **High** | Enables internal network scanning and unauthorized loopback/metadata access. | **Fixed** |
| **5** | Path Traversal / Arbitrary File Read in `read_pdf` | `src/core/tools.js` | **High** | Allows reading sensitive host system files via path traversal (`..`). | **Fixed** |
| **6** | Operating System / Disk Utility Command Fallback | `src/core/tools.js` | **Medium** | Fails on Linux/macOS environments due to hardcoded Windows `wmic` commands. | **Fixed** |
| **7** | Rapid-Typing Race Conditions in Platform Bridges | `src/bridges/*` | **High** | Distorts context and loses user messages when responses take time to generate. | **Fixed** |
| **8** | Fragile Channel ID Key Splitting in Memory Manager | `src/core/memory.js` | **Medium** | Truncates channel IDs containing colons (`:`), causing corrupted memory persistence. | **Fixed** |

---

## Detailed Vulnerability & Bug Breakdown

### 1. Undefined `SYSTEM_PROMPT` Variable
- **Severity**: **High**
- **Impact**: Functional runtime crash (`ReferenceError: SYSTEM_PROMPT is not defined`).
- **Location**: `src/core/llm.js` (inside `generate(prompt)`)
- **Description**: The `generate(prompt)` method referenced `SYSTEM_PROMPT` directly for setting system prompt content. However, `SYSTEM_PROMPT` was neither defined nor imported in `llm.js`.
- **Remediation**: Replaced `SYSTEM_PROMPT` with `getSystemPrompt("normal")` imported from `./personality.js`.

---

### 2. Remote Code Execution (RCE) via `calculator` Tool
- **Severity**: **Critical**
- **Impact**: Full JavaScript execution in the Node.js process context.
- **Location**: `src/core/tools.js` (inside `executeTool` case `"calculator"`)
- **Description**: The tool evaluated mathematical expressions dynamically using `new Function()`. An attacker leveraging prompt injection could pass arbitrary JS code inside the math expression.
- **Remediation**: Added input regex sanitization (`/^[0-9+\-*/().\s]+$/`) ensuring only valid numeric expressions are evaluated.

---

### 3. Unsandboxed Python Code Execution (RCE)
- **Severity**: **Critical**
- **Impact**: Complete host takeover and filesystem compromise.
- **Location**: `src/core/tools.js` (inside `executeTool` case `"execute_python_code"`)
- **Description**: User-supplied Python code was written to disk and executed directly with shell permissions using `execSync`.
- **Remediation**: Disabled `"execute_python_code"` from `availableTools` and added safety safeguards in `executeTool`.

---

### 4. Server-Side Request Forgery (SSRF) via `read_website`
- **Severity**: **High**
- **Impact**: Internal network scanning, cloud metadata access (`169.254.169.254`), and loopback interface exposure.
- **Location**: `src/core/tools.js` (inside `executeTool` case `"read_website"`)
- **Description**: Arbitrary URLs were fetched via `fetch()` without IP or target host validation.
- **Remediation**: Implemented IP resolution and validation against private/loopback IP address ranges (`10.0.0.0/8`, `127.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`, `169.254.0.0/16`, `::1`).

---

### 5. Path Traversal & Arbitrary File Read via `read_pdf`
- **Severity**: **High**
- **Impact**: Reading arbitrary host files and sensitive configuration files.
- **Location**: `src/core/tools.js` (inside `executeTool` case `"read_pdf"`)
- **Description**: Direct file paths supplied as parameters were passed to `fs.readFileSync()`.
- **Remediation**: Standardized path normalization with `path.resolve()` and blocked relative traversal sequences (`..`) and sensitive system directories (`/etc/`, `/var/`, `system32`).

---

### 6. OS Utility Compatibility in `get_storage_info`
- **Severity**: **Medium**
- **Impact**: Command execution failure on non-Windows platforms (Linux/macOS Docker containers).
- **Location**: `src/core/tools.js` (inside `executeTool` case `"get_storage_info"`)
- **Description**: Disk space queries relied exclusively on `wmic logicaldisk`, which fails on Unix environments.
- **Remediation**: Added platform detection using `os.platform()`, falling back gracefully to `df -k` on Linux and macOS.

---

### 7. Race Conditions in Messaging Flow Across Platform Bridges
- **Severity**: **High**
- **Impact**: Desynchronized chat history, missing user context, and lost messages during rapid typing.
- **Location**: `src/bridges/discord.js`, `telegram.js`, `slack.js`, `whatsapp.js`, and `web.js`
- **Description**: Bridges updated conversation history *after* waiting for LLM completion, causing concurrent incoming user messages to miss recent history state.
- **Remediation**: Updated messaging flow in all bridges to immediately capture history snapshots and commit incoming user messages before invoking LLM calls.

---

### 8. Fragile Channel ID Key Splitting in Memory Manager
- **Severity**: **Medium**
- **Impact**: Data persistence corruption when channel or user IDs contain colons.
- **Location**: `src/core/memory.js` (inside `flushAll()` and `getStats()`)
- **Description**: Key string splitting was performed using `key.split(":")`, which truncates platform keys containing multiple colons.
- **Remediation**: Replaced `key.split(":")` with `key.indexOf(":")` and `substring()`.

---

## Conclusion & System Verification

All audit findings have been systematically reviewed and documented. The Alya AI Assistant codebase maintains strong protections against prompt injection, secure cross-platform operations, and reliable state handling across all active platform bridges.
