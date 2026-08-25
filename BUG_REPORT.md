# 🛡️ Alya AI Assistant — Comprehensive Bug & Security Audit Report

This document provides a detailed report of all audited bugs, security vulnerabilities, performance bottlenecks, and system fixes in the **Alya AI Assistant** codebase.

---

## 📑 Table of Contents

1. [Executive Summary](#-executive-summary)
2. [Security Vulnerabilities & Mitigations](#-security-vulnerabilities--mitigations)
   - [1. Remote Code Execution (RCE) via Python Sandbox](#1-remote-code-execution-rce-via-python-sandbox)
   - [2. Server-Side Request Forgery (SSRF) in Web Scraper](#2-server-side-request-forgery-ssrf-in-web-scraper)
   - [3. Arbitrary File Read / Path Traversal in PDF Reader](#3-arbitrary-file-read--path-traversal-in-pdf-reader)
   - [4. Code Execution via Unsanitized Math Evaluation](#4-code-execution-via-unsanitized-math-evaluation)
   - [5. Sensitive Data Leak in Docker Images](#5-sensitive-data-leak-in-docker-images)
3. [Runtime & Logic Bug Fixes](#-runtime--logic-bug-fixes)
   - [1. ReferenceError: SYSTEM_PROMPT is not Defined](#1-referenceerror-system_prompt-is-not-defined)
   - [2. Memory Channel ID Colon Truncation](#2-memory-channel-id-colon-truncation)
   - [3. Startup Configuration Null-Pointer Crash](#3-startup-configuration-null-pointer-crash)
   - [4. Storage Info Command Platform Incompatibility](#4-storage-info-command-platform-incompatibility)
   - [5. Memory Usage Reference Error](#5-memory-usage-reference-error)
   - [6. Race Condition in Platform History Snapshots](#6-race-condition-in-platform-history-snapshots)
4. [Audit Summary Matrix](#-audit-summary-matrix)

---

## 📌 Executive Summary

A comprehensive code and security audit was conducted across all core modules (`src/core/`), platform bridge adapters (`src/bridges/`), and web interface files (`web/`).

The audit identified several critical security vulnerabilities (including Remote Code Execution, SSRF, and Path Traversal) and runtime bugs (such as undefined variable references, cross-platform command incompatibilities, and concurrency race conditions). All identified issues have been addressed and validated.

---

## 🔒 Security Vulnerabilities & Mitigations

### 1. Remote Code Execution (RCE) via Python Sandbox
* **Location:** `src/core/tools.js` (`execute_python_code`)
* **Severity:** 🔴 **CRITICAL**
* **Root Cause:** The `execute_python_code` tool executed raw LLM-generated Python strings directly on the host system via `execSync("python " + tempFile)`.
* **Impact:** Prompt injection or untrusted user input could execute arbitrary shell/system commands on the host machine.
* **Mitigation:** Disabled raw host execution for `execute_python_code` and added strict safety guardrails preventing arbitrary shell command execution.

### 2. Server-Side Request Forgery (SSRF) in Web Scraper
* **Location:** `src/core/tools.js` (`read_website`)
* **Severity:** 🟠 **HIGH**
* **Root Cause:** `read_website` fetched any arbitrary URL requested by the LLM without IP address validation or protocol checks.
* **Impact:** Threat actors could induce the application to fetch internal network resources, loopback endpoints (`127.0.0.1`), or cloud instance metadata endpoints (`169.254.169.254`).
* **Mitigation:** Implemented IP and URL validation blocking private, loopback, and cloud metadata IP ranges, restricting protocol schemes to `http:` and `https:`.

### 3. Arbitrary File Read / Path Traversal in PDF Reader
* **Location:** `src/core/tools.js` (`read_pdf`)
* **Severity:** 🟠 **HIGH**
* **Root Cause:** `read_pdf` accepted user/LLM supplied file paths (`absolutePath`) and read file bytes directly without path sanitization.
* **Impact:** Potential unauthorized read access to sensitive host files (e.g., `/etc/passwd`, environment files, API keys).
* **Mitigation:** Added path normalization with `path.resolve()`, blocked relative path traversal sequences (`..`), and prohibited access to sensitive system directories.

### 4. Code Execution via Unsanitized Math Evaluation
* **Location:** `src/core/tools.js` (`calculator`)
* **Severity:** 🟠 **HIGH**
* **Root Cause:** The expression argument was evaluated using dynamic function execution (`new Function("return " + expression)()`).
* **Impact:** Input containing JavaScript payloads could execute arbitrary script code within the Node.js context.
* **Mitigation:** Implemented strict input regex sanitization (`/^[0-9+\-*/().\s]+$/`) before evaluating mathematical expressions.

### 5. Sensitive Data Leak in Docker Images
* **Location:** `.dockerignore`
* **Severity:** 🟡 **MEDIUM**
* **Root Cause:** Local storage and configuration directories (`data/`, `config/`) were not explicitly ignored during Docker image builds.
* **Impact:** Risk of baking secret API credentials or persistent user conversations into built container images.
* **Mitigation:** Updated `.dockerignore` to explicitly exclude `data/` and `config/` directories.

---

## 🐛 Runtime & Logic Bug Fixes

### 1. ReferenceError: SYSTEM_PROMPT is not Defined
* **Location:** `src/core/llm.js` (`generate` method)
* **Severity:** 🔴 **CRITICAL (Runtime Crash)**
* **Root Cause:** The `generate()` method referenced `SYSTEM_PROMPT` directly, which was neither imported nor declared in `src/core/llm.js`.
* **Fix:** Replaced `SYSTEM_PROMPT` with `getSystemPrompt("normal")` imported from `src/core/personality.js`.

### 2. Memory Channel ID Colon Truncation
* **Location:** `src/core/memory.js` (`flushAll`, `getStats`)
* **Severity:** 🟡 **MEDIUM**
* **Root Cause:** Memory keys were split using `key.split(":")`. For platforms or channels containing colons in their IDs, the channel ID was improperly truncated.
* **Fix:** Replaced `split(":")` with `key.indexOf(":")` and `substring()` to correctly preserve complex channel IDs.

### 3. Startup Configuration Null-Pointer Crash
* **Location:** `src/index.js`
* **Severity:** 🟡 **MEDIUM**
* **Root Cause:** Accessing `config.groq.model` during startup status logging threw a `TypeError` when `config.groq` was undefined or missing from configuration files.
* **Fix:** Added optional chaining `config.groq?.model || llm.model` to prevent startup exceptions.

### 4. Storage Info Command Platform Incompatibility
* **Location:** `src/core/tools.js` (`get_storage_info`)
* **Severity:** 🟡 **MEDIUM**
* **Root Cause:** Executed Windows-only `wmic` command indiscriminately across all operating systems. On Linux and macOS systems, this call threw an error and fell back to memory stats.
* **Fix:** Added cross-platform branching using `process.platform`, utilizing `df -k` for Unix/Linux/macOS systems.

### 5. Memory Usage Reference Error
* **Location:** `src/core/tools.js` (`get_memory_usage`)
* **Severity:** 🟢 **LOW**
* **Root Cause:** Mismatched variable reference in JSON response formatting (`freeMemoryGB` vs `freeMB`).
* **Fix:** Corrected variable identifier references in memory reporting.

### 6. Race Condition in Platform History Snapshots
* **Location:** `src/bridges/discord.js`, `telegram.js`, `slack.js`, `whatsapp.js`, `web.js`
* **Severity:** 🟡 **MEDIUM**
* **Root Cause:** Concurrent user input during active responses caused in-place mutations of conversation history arrays.
* **Fix:** Isolated prompt history with snapshot copies (`[...history]`) prior to initiating async LLM calls.

---

## 📊 Audit Summary Matrix

| ID | Issue Description | Type | Severity | Affected File | Status |
|---|---|---|---|---|---|
| SEC-01 | Unsanitized Python code execution | RCE | 🔴 Critical | `src/core/tools.js` | ✅ Fixed |
| SEC-02 | Unrestricted website scraping | SSRF | 🟠 High | `src/core/tools.js` | ✅ Fixed |
| SEC-03 | Arbitrary PDF file path read | Path Traversal | 🟠 High | `src/core/tools.js` | ✅ Fixed |
| SEC-04 | Dynamic math expression evaluation | Code Injection | 🟠 High | `src/core/tools.js` | ✅ Fixed |
| SEC-05 | Missing secrets in Docker ignore | Data Leak | 🟡 Medium | `.dockerignore` | ✅ Fixed |
| BUG-01 | Undefined `SYSTEM_PROMPT` in `generate()` | ReferenceError | 🔴 Critical | `src/core/llm.js` | ✅ Fixed |
| BUG-02 | Channel key splitting on colon | Logic Bug | 🟡 Medium | `src/core/memory.js` | ✅ Fixed |
| BUG-03 | Direct config property access on boot | TypeError | 🟡 Medium | `src/index.js` | ✅ Fixed |
| BUG-04 | Windows `wmic` tool execution on Linux | Incompatibility | 🟡 Medium | `src/core/tools.js` | ✅ Fixed |
| BUG-05 | Memory calculation variable mismatch | ReferenceError | 🟢 Low | `src/core/tools.js` | ✅ Fixed |
| BUG-06 | Concurrent conversation array mutation | Race Condition | 🟡 Medium | `src/bridges/*` | ✅ Fixed |

---

*Report compiled and verified by Jules AI Engineer for Alya.*
