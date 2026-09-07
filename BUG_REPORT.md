# 🐛 Comprehensive Bug Audit & Vulnerability Report — Alya Assistant

This document contains a complete technical analysis and audit of bugs, security vulnerabilities, edge case failures, and architecture risks identified across the Alya Assistant codebase.

---

## 📊 Summary of Findings

| ID | Issue Title | Severity | Impacted Component | Category |
|---|---|---|---|---|
| **ALY-001** | Arbitrary Code Execution in `execute_python_code` Tool | **CRITICAL** | `src/core/tools.js` | Security / RCE |
| **ALY-002** | Unsanitized Math Evaluation in `calculator` Tool | **CRITICAL** | `src/core/tools.js` | Security / RCE |
| **ALY-003** | Arbitrary File Read & Path Traversal in `read_pdf` Tool | **HIGH** | `src/core/tools.js` | Security / Path Traversal |
| **ALY-004** | Server-Side Request Forgery (SSRF) in `read_website` Tool | **HIGH** | `src/core/tools.js` | Security / SSRF |
| **ALY-005** | ReferenceError for Undefined `SYSTEM_PROMPT` Variable | **HIGH** | `src/core/llm.js` | Runtime / Crash |
| **ALY-006** | TypeError Crash on Startup When `config.groq` is Undefined | **MEDIUM** | `src/index.js` | Runtime / Crash |
| **ALY-007** | Channel ID Key Truncation on Colons in Memory Manager | **MEDIUM** | `src/core/memory.js` | Data Integrity |
| **ALY-008** | Storage Info Parsing Command Non-Cross-Platform | **LOW** | `src/core/tools.js` | Cross-Platform Compatibility |
| **ALY-009** | Multi-Key TTS Fallback Missing Single Key Handling | **LOW** | `src/core/tts.js` | Configuration Fallback |
| **ALY-010** | Local File Path Leakage in Generated Media Tools | **LOW** | `src/core/tools.js` / Bridges | User Experience |

---

## 🔍 Detailed Bug Findings

### ALY-001: Arbitrary Code Execution in `execute_python_code` Tool
- **Severity**: Critical
- **File**: `src/core/tools.js`
- **Description**: The `execute_python_code` tool creates a temporary file containing arbitrary code provided by the model or via prompt injection and executes it using `execSync("python <file>")`.
- **Impact**: Any attacker who can influence prompt input can execute arbitrary operating system commands on the machine hosting Alya.
- **Remediation**: Disable the tool by default, or run Python execution inside a restricted, sandboxed container (e.g. isolated Docker container with dropped privileges and no network access).

---

### ALY-002: Unsanitized Math Evaluation in `calculator` Tool
- **Severity**: Critical
- **File**: `src/core/tools.js`
- **Description**: The `calculator` tool executes expressions via `new Function('return ' + args.expression)()`. Because inputs are not validated, arbitrary JavaScript expressions (e.g., `process.exit()` or Node.js `child_process` calls) can be executed.
- **Impact**: Arbitrary JS code execution on the host machine.
- **Remediation**: Validate `args.expression` against a strict whitelist regular expression (`/^[0-9+\-*/().\s]+$/`) before evaluating.

---

### ALY-003: Arbitrary File Read & Path Traversal in `read_pdf` Tool
- **Severity**: High
- **File**: `src/core/tools.js`
- **Description**: `read_pdf` takes `args.absolutePath` and directly opens it using `fs.readFileSync(args.absolutePath)` without validating relative path traversal (`..`) sequences or enforcing permitted directory limits.
- **Impact**: Allows reading confidential system files or sensitive user data from disk.
- **Remediation**: Resolve paths with `path.resolve()`, ensure path stays within permitted directories, and block path traversal tokens (`..`) and system root directories (`/etc/`, `/var/`, `C:\Windows`).

---

### ALY-004: Server-Side Request Forgery (SSRF) in `read_website` Tool
- **Severity**: High
- **File**: `src/core/tools.js`
- **Description**: `read_website` directly invokes `fetch(args.url)` without validating the host address or target IP range.
- **Impact**: Enables SSRF attacks targeting internal microservices, AWS EC2 metadata endpoints (`http://169.254.169.254`), or loopback services (`http://127.0.0.1`).
- **Remediation**: Perform DNS lookup before fetching, validate that resolved IPs are public non-reserved IP addresses, and block requests to private/loopback IP spaces.

---

### ALY-005: ReferenceError for Undefined `SYSTEM_PROMPT` Variable
- **Severity**: High
- **File**: `src/core/llm.js`
- **Description**: In `LLMEngine.generate(prompt)`, the code references `SYSTEM_PROMPT` on line 321. However, `SYSTEM_PROMPT` is neither defined nor imported in `src/core/llm.js`.
- **Impact**: Calling `generate(prompt)` throws `ReferenceError: SYSTEM_PROMPT is not defined`, crashing single-generation invocations.
- **Remediation**: Replace `SYSTEM_PROMPT` with `getSystemPrompt("normal")` imported from `./personality.js`.

---

### ALY-006: TypeError Crash on Startup When `config.groq` is Undefined
- **Severity**: Medium
- **File**: `src/index.js`
- **Description**: `src/index.js` accesses `config.groq.model` directly. When `config.json` does not contain a `groq` key (as in the default config template in `src/core/config.js`), starting the application causes a fatal `TypeError: Cannot read properties of undefined (reading 'model')`.
- **Impact**: Immediate application crash on boot when `config.groq` is absent.
- **Remediation**: Use optional chaining or safe fallbacks: `config.groq?.model || llm.model`.

---

### ALY-007: Channel ID Key Truncation on Colons in Memory Manager
- **Severity**: Medium
- **File**: `src/core/memory.js`
- **Description**: In `flushAll()` and `getStats()`, conversation keys (`${platform}:${channelId}`) are split using `key.split(":")`. If `channelId` contains a colon (common on Slack or Discord channel/thread formats), `split(":")` truncates `channelId` to its first segment.
- **Impact**: Conversation files are written to incorrect file paths or lost, causing history corruption.
- **Remediation**: Use `key.indexOf(":")` and `substring()` to split only on the first colon.

---

### ALY-008: Storage Info Parsing Command Non-Cross-Platform
- **Severity**: Low
- **File**: `src/core/tools.js`
- **Description**: `get_storage_info` attempts to execute Windows-specific `wmic logicaldisk` commands unconditionally. On Linux/macOS systems, this execution fails and falls back to system RAM statistics instead of disk space.
- **Impact**: Incorrect storage information returned on non-Windows platforms.
- **Remediation**: Detect `process.platform` and execute `df -k` on POSIX systems while using `wmic` or PowerShell on Windows.

---

### ALY-009: Multi-Key TTS Fallback Missing Single Key Handling
- **Severity**: Low
- **File**: `src/core/tts.js`
- **Description**: `generateTTS` checks `config.elevenlabs?.apiKeys`, but does not fall back to `config.elevenlabs?.apiKey` if `apiKeys` is missing or empty.
- **Impact**: Users with legacy single-key configs experience TTS failures.
- **Remediation**: Fall back to `config.elevenlabs.apiKey` when `apiKeys` array is absent.

---

### ALY-010: Local File Path Leakage in Generated Media Tools
- **Severity**: Low
- **File**: `src/core/tools.js` / Bridges
- **Description**: `screenshot_website` and `generate_qr_code` return absolute filesystem paths (e.g., `/home/user/app/data/temp/screenshot_123.png`) to messaging platforms instead of uploading actual media attachments.
- **Impact**: Exposes local machine folder structure to external messaging channels.
- **Remediation**: Implement native media uploading across platform bridges or serve images over WebBridge HTTP endpoints.
