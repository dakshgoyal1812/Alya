# 🐛 Comprehensive Bug & Security Audit Report for Alya

This report presents a thorough security, runtime, and architectural audit of the **Alya** repository. Issues are categorized by severity level along with root cause analysis, reproduction scenarios, and proposed remediation steps.

---

## 📊 Summary of Identified Issues

| ID | Issue Title | Category | Severity | Affected File(s) |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | Undefined `SYSTEM_PROMPT` Variable Causes Engine Crash | Runtime Crash | 🔴 Critical | `src/core/llm.js` |
| **BUG-02** | Missing `setup.js` Entrypoint Script | Missing Dependency | 🔴 Critical | Root Directory (`setup.js`) |
| **BUG-03** | Remote Code Execution (RCE) via Unsanitized Python Sandbox Tool | Security / RCE | 🔴 Critical | `src/core/tools.js` |
| **BUG-04** | Remote Code Execution (RCE) via Math Calculator Evaluation | Security / RCE | 🔴 Critical | `src/core/tools.js` |
| **BUG-05** | Server-Side Request Forgery (SSRF) in Web Fetcher Tool | Security / SSRF | 🟠 High | `src/core/tools.js` |
| **BUG-06** | Arbitrary File Read / Path Traversal in PDF Reader Tool | Security / Path Traversal | 🟠 High | `src/core/tools.js` |
| **BUG-07** | `TypeError` on Missing `config.groq` During Application Startup | Runtime Crash | 🟠 High | `src/index.js`, `src/core/config.js` |
| **BUG-08** | Race Condition in Multi-Platform Message Memory Persistence | Concurrency / Data Integrity | 🟠 High | `src/bridges/*.js` |
| **BUG-09** | Conversation Key Truncation in Memory Manager | Data Integrity | 🟡 Medium | `src/core/memory.js` |
| **BUG-10** | Local Image Path Embed Mismatch Across Messaging Platforms | UX / Media Handling | 🟡 Medium | `src/core/tools.js`, `src/bridges/*.js` |
| **BUG-11** | Cross-Platform Storage Info Failure (`wmic` Deprecation) | OS Compatibility | 🟡 Medium | `src/core/tools.js` |
| **BUG-12** | Single-Key ElevenLabs Fallback Failure in TTS Module | Configuration | 🔵 Low | `src/core/tts.js` |
| **BUG-13** | Hardcoded Language Model Voice Input and Captions Edge Cases | Frontend / UX | 🔵 Low | `web/app.js`, `src/bridges/telegram.js` |

---

## 🔴 Critical Severity Issues

### BUG-01: Undefined `SYSTEM_PROMPT` Variable Causes Engine Crash
- **Severity**: 🔴 Critical
- **Affected File**: `src/core/llm.js` (Line 251)
- **Description**: In `LLMEngine.generate(prompt)`, the code references `SYSTEM_PROMPT` directly:
  ```javascript
  messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }]
  ```
  However, `SYSTEM_PROMPT` is neither defined nor imported in `src/core/llm.js` (only `getSystemPrompt` is imported from `./personality.js`).
- **Impact**: Any feature or tool that calls `llm.generate(...)` throws a `ReferenceError: SYSTEM_PROMPT is not defined` and crashes the operation.
- **Remediation**: Replace `SYSTEM_PROMPT` with `getSystemPrompt("normal")`.

### BUG-02: Missing `setup.js` Entrypoint Script
- **Severity**: 🔴 Critical
- **Affected File**: Repository Root / `package.json`
- **Description**: `package.json` defines `"setup": "node setup.js"`. `README.md` and error handlers instruct users to run `npm run setup`. However, `setup.js` does not exist in the repository root.
- **Impact**: Running `npm run setup` fails with `Error: Cannot find module '/.../setup.js'`. Users cannot initialize or configure the application interactively as advertised.
- **Remediation**: Create the `setup.js` wizard script or update `package.json` and documentation.

### BUG-03: Remote Code Execution (RCE) via Unsanitized Python Sandbox Tool
- **Severity**: 🔴 Critical
- **Affected File**: `src/core/tools.js`
- **Description**: The `execute_python_code` tool receives user/LLM-generated code and runs:
  ```javascript
  execSync(`python "${tempFile}"`, { encoding: "utf8", timeout: 10000 });
  ```
  There is no sandboxing, process isolation, resource cap, or code inspection.
- **Impact**: Any user connected via Discord, Telegram, Slack, WhatsApp, or Web can execute arbitrary OS commands, read environment secrets, modify files, or escalate privileges on the host server.
- **Remediation**: Disable the `execute_python_code` tool by default, or isolate execution within a restricted Docker container or gVisor sandbox.

### BUG-04: Remote Code Execution (RCE) via Math Calculator Evaluation
- **Severity**: 🔴 Critical
- **Affected File**: `src/core/tools.js`
- **Description**: The `calculator` tool evaluates expressions via direct JavaScript code construction:
  ```javascript
  return String(new Function(`return ${args.expression}`)());
  ```
- **Impact**: Attacker-crafted prompts like `args.expression = "process.mainModule.require('child_process').execSync('whoami')"` execute arbitrary JavaScript with full Node.js server permissions.
- **Remediation**: Use a safe math evaluation parser (e.g., `mathjs` or strict regex validation `/^[0-9+\-*/().\s]+$/`) instead of `new Function()`.

---

## 🟠 High Severity Issues

### BUG-05: Server-Side Request Forgery (SSRF) in Web Fetcher Tool
- **Severity**: 🟠 High
- **Affected File**: `src/core/tools.js` (`read_website` tool)
- **Description**: `read_website` performs `fetch(args.url)` without validating the scheme, hostname, or IP address.
- **Impact**: Attackers can force the server to issue HTTP requests to internal services, loopback addresses (`http://127.0.0.1`), or cloud metadata endpoints (`http://169.254.169.254/latest/meta-data/`).
- **Remediation**: Validate target URLs against a blacklist of private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`) and restrict schemes to `http` and `https`.

### BUG-06: Arbitrary File Read / Path Traversal in PDF Reader Tool
- **Severity**: 🟠 High
- **Affected File**: `src/core/tools.js` (`read_pdf` tool)
- **Description**: `read_pdf` takes an `absolutePath` parameter and passes it directly to `fs.readFileSync(args.absolutePath)`.
- **Impact**: Users can read arbitrary files on the host machine (e.g., `/etc/passwd`, private keys, configuration files) if accessible by the Node process.
- **Remediation**: Sanitize the path using `path.resolve()`, restrict file access to an allowed directory (e.g., `data/uploads`), and block path traversal sequences (`..`).

### BUG-07: `TypeError` on Missing `config.groq` During Application Startup
- **Severity**: 🟠 High
- **Affected File**: `src/index.js` (Line 44), `src/core/config.js`
- **Description**: In `src/index.js`, the startup sequence accesses `config.groq.model`:
  ```javascript
  console.log(`🤖 Model: ${config.groq.model}`);
  ```
  `DEFAULT_CONFIG` in `src/core/config.js` contains an `ollama` object but no `groq` object.
- **Impact**: If `config.json` lacks a `groq` section or is generated from defaults, startup crashes with `TypeError: Cannot read properties of undefined (reading 'model')`.
- **Remediation**: Add `groq` defaults to `DEFAULT_CONFIG` in `src/core/config.js` and use optional chaining (`config.groq?.model || llm.model`) in `src/index.js`.

### BUG-08: Race Condition in Multi-Platform Message Memory Persistence
- **Severity**: 🟠 High
- **Affected File**: `src/bridges/discord.js`, `src/bridges/telegram.js`, `src/bridges/slack.js`, `src/bridges/whatsapp.js`, `src/bridges/web.js`
- **Description**: Incoming user messages are added to memory *after* calling `this.llm.chat(history, content)`:
  ```javascript
  const history = getHistory("discord", channelId);
  const response = await this.llm.chat(history, content);
  addMessage("discord", channelId, "user", content);
  addMessage("discord", channelId, "assistant", response);
  ```
- **Impact**: While the LLM request is pending, subsequent concurrent messages for the same channel do not see preceding user queries, corrupting message sequence order and context.
- **Remediation**: Immediately append user messages to memory *before* invoking `this.llm.chat(...)`.

---

## 🟡 Medium Severity Issues

### BUG-09: Conversation Key Truncation in Memory Manager
- **Severity**: 🟡 Medium
- **Affected File**: `src/core/memory.js` (`flushAll` and `getStats`)
- **Description**: `flushAll()` and `getStats()` split conversation keys via `key.split(":")`:
  ```javascript
  const [platform, channelId] = key.split(":");
  ```
- **Impact**: If a channel ID contains colons (common in Slack threads or complex channel IDs), `split(":")` truncates the ID to its first component, attempting to write to the wrong file path or corrupting conversation data.
- **Remediation**: Use `key.indexOf(":")` and `substring()` to split only on the first delimiter.

### BUG-10: Local Image Path Embed Mismatch Across Messaging Platforms
- **Severity**: 🟡 Medium
- **Affected File**: `src/core/tools.js`, `src/bridges/*.js`
- **Description**: Tools like `screenshot_website` and `generate_qr_code` save images to `data/temp/*.png` and return local absolute file paths to the LLM.
- **Impact**: Discord, Telegram, Slack, and WhatsApp cannot render local file paths sent in text responses. Users receive unrendered file path strings instead of images.
- **Remediation**: Update bridge handlers to detect local image paths in LLM responses and send them as native file attachments.

### BUG-11: Cross-Platform Storage Info Failure (`wmic` Deprecation)
- **Severity**: 🟡 Medium
- **Affected File**: `src/core/tools.js` (`get_storage_info` tool)
- **Description**: `get_storage_info` executes `wmic logicaldisk get size,freespace,caption`. `wmic` is deprecated/removed in modern Windows 11 builds and unavailable on macOS/Linux.
- **Impact**: Storage queries consistently fail on non-Windows environments and modern Windows builds, falling back to memory info instead of disk usage.
- **Remediation**: Detect the OS platform (`process.platform`) and execute `df -k` on Unix-like systems (`linux`, `darwin`).

---

## 🔵 Low Severity / Quality Issues

### BUG-12: Single-Key ElevenLabs Fallback Failure in TTS Module
- **Severity**: 🔵 Low
- **Affected File**: `src/core/tts.js`
- **Description**: `generateTTS` checks `config.elevenlabs?.apiKeys`. If the user config contains `config.elevenlabs.apiKey` (singular string), `keys` evaluates to an empty array `[]`.
- **Impact**: Valid single-key configurations fail TTS generation with a false warning that ElevenLabs is not configured.
- **Remediation**: Support both `config.elevenlabs.apiKey` and `config.elevenlabs.apiKeys`.

### BUG-13: Hardcoded Language Model Voice Input and Captions Edge Cases
- **Severity**: 🔵 Low
- **Affected File**: `web/app.js`, `src/bridges/telegram.js`
- **Description**: Speech recognition in `web/app.js` is hardcoded to `hi-IN` without language switching. Additionally, Telegram photo/voice messages with captions are ignored if `msg.text` is empty.
- **Impact**: Reduced usability for English-speaking Web UI users and missing text handling for Telegram media messages.
- **Remediation**: Allow configurable recognition language in the Web UI and check `msg.caption` in Telegram handlers.

---

## 🛠️ Recommended Action Plan

1. **Immediate Patching**:
   - Fix `SYSTEM_PROMPT` in `src/core/llm.js`.
   - Add default `groq` config object in `src/core/config.js` and nullish checks in `src/index.js`.
   - Disable or restrict `execute_python_code` and sanitize `calculator` math inputs.
2. **Security & Input Validation**:
   - Implement IP check in `read_website` and path resolution in `read_pdf`.
3. **Bridge & Memory Optimization**:
   - Move `addMessage` calls before LLM invocations in platform bridges.
   - Fix string splitting logic in `src/core/memory.js`.
4. **Tooling & Setup**:
   - Add `setup.js` wizard script to support `npm run setup`.
