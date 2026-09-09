# 🐛 Alya Assistant — Comprehensive Bug & Vulnerability Audit Report

> **Target Repository:** Alya AI Assistant
> **Report Format:** GitHub Issue / Audit Documentation
> **Severity Levels:** 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low

---

## 📋 Executive Summary

A comprehensive code and architecture audit was performed across the **Alya AI Assistant** codebase (`src/index.js`, `src/core/`, `src/bridges/`, `web/`, and project configuration files).

A total of **12 distinct issues** were identified across multiple categories including **Missing Files**, **Runtime Crashes**, **Critical Security Vulnerabilities (RCE, SSRF, Path Traversal)**, **Cross-Platform Incompatibilities**, and **Concurrency Race Conditions**.

Below is a summary table followed by detailed descriptions, reproduction steps, impact analysis, and recommended remediation for each bug.

---

## 📊 Summary of Identified Bugs

| ID | Title | Category | Severity | File(s) Affected |
| :--- | :--- | :--- | :---: | :--- |
| **BUG-01** | Missing Setup Script (`setup.js`) | Configuration / Missing File | 🔴 Critical | `package.json`, `setup.js` |
| **BUG-02** | `ReferenceError: SYSTEM_PROMPT is not defined` | Runtime Crash | 🔴 Critical | `src/core/llm.js` |
| **BUG-03** | `TypeError: Cannot read properties of undefined (reading 'model')` | Runtime Crash | 🔴 Critical | `src/index.js`, `src/core/config.js` |
| **BUG-04** | Remote Code Execution via `calculator` Tool | Security (RCE) | 🔴 Critical | `src/core/tools.js` |
| **BUG-05** | Remote Code Execution via `execute_python_code` Tool | Security (RCE) | 🔴 Critical | `src/core/tools.js` |
| **BUG-06** | Arbitrary Local File Read / Path Traversal via `read_pdf` | Security (Path Traversal) | 🔴 Critical | `src/core/tools.js` |
| **BUG-07** | Server-Side Request Forgery (SSRF) via `read_website` | Security (SSRF) | 🟠 High | `src/core/tools.js` |
| **BUG-08** | OS Storage Parser Crash on Non-Windows Systems (`wmic`) | Platform Compatibility | 🟠 High | `src/core/tools.js` |
| **BUG-09** | Channel Key Truncation & Memory Loss (`key.split(":")`) | Data Integrity / Bug | 🟠 High | `src/core/memory.js` |
| **BUG-10** | Hardcoded Executable Path in WhatsApp Bridge (`google-chrome`) | Platform Compatibility | 🟡 Medium | `src/bridges/whatsapp.js` |
| **BUG-11** | Conversation History Race Condition in Platform Bridges | Concurrency / Race Condition | 🟡 Medium | `src/bridges/*.js` |
| **BUG-12** | Local File Paths Returned for Media Tools Instead of Attachments | Functional Issue | 🔵 Low | `src/core/tools.js`, `src/bridges/*.js` |

---

## 🔍 Detailed Bug Analysis

### 🔴 BUG-01: Missing Interactive Setup Script (`setup.js`)
* **Category:** Configuration / Missing Artifact
* **Severity:** 🔴 Critical
* **Affected File(s):** `package.json`, `README.md`, `src/index.js`

#### Description
`package.json` defines `"setup": "node setup.js"`. The `README.md` and `src/index.js` instruct new users to run `npm run setup` upon initial setup. However, `setup.js` is not present in the repository root directory.

#### Impact
Executing `npm run setup` throws `Error: Cannot find module '.../setup.js'`. New users cannot initialize default configurations or set up platform credentials using the advertised guided installer.

#### Reproduction Steps
1. Run `npm run setup` or `node setup.js` in a fresh clone.
2. Observe `MODULE_NOT_FOUND` failure.

#### Recommended Fix
Create `setup.js` in the root directory using an interactive CLI framework (e.g. `inquirer` or `readline`) that initializes `data/` and `config/` directories and generates a baseline `config.json`.

---

### 🔴 BUG-02: `ReferenceError: SYSTEM_PROMPT is not defined` in `generate()`
* **Category:** Runtime Crash
* **Severity:** 🔴 Critical
* **Affected File(s):** `src/core/llm.js`

#### Description
In `src/core/llm.js`, line 290 inside the `generate(prompt)` method:
```javascript
messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }]
```
The variable `SYSTEM_PROMPT` is neither defined in `llm.js` nor imported from `personality.js` (where system prompts are generated via `getSystemPrompt()`).

#### Impact
Any invocation of `llm.generate(...)` immediately crashes at runtime with `ReferenceError: SYSTEM_PROMPT is not defined`.

#### Reproduction Steps
1. Call `const llm = new LLMEngine(); await llm.generate("Hello");`.
2. Observe runtime exception `ReferenceError: SYSTEM_PROMPT is not defined`.

#### Recommended Fix
Replace `SYSTEM_PROMPT` with `getSystemPrompt("normal")` in `src/core/llm.js`.

---

### 🔴 BUG-03: `TypeError: Cannot read properties of undefined (reading 'model')` on Startup
* **Category:** Runtime Crash
* **Severity:** 🔴 Critical
* **Affected File(s):** `src/index.js`, `src/core/config.js`

#### Description
In `src/index.js` on startup:
```javascript
console.log(`🤖 Model: ${config.groq.model}`);
```
`DEFAULT_CONFIG` in `src/core/config.js` does not contain a `groq` key. If a user runs the application without a pre-existing `config.json` containing a `groq` block, `config.groq` is `undefined`.

#### Impact
The application crashes immediately on launch with `TypeError: Cannot read properties of undefined (reading 'model')`.

#### Reproduction Steps
1. Delete `config/config.json`.
2. Run `npm start`.
3. Observe process termination with `TypeError`.

#### Recommended Fix
Use optional chaining and fallback: `config.groq?.model || llm.model` in `src/index.js` and add a default `groq` configuration block to `DEFAULT_CONFIG` in `src/core/config.js`.

---

### 🔴 BUG-04: Arbitrary Code Execution (RCE) in `calculator` Tool
* **Category:** Security Vulnerability (RCE)
* **Severity:** 🔴 Critical
* **Affected File(s):** `src/core/tools.js`

#### Description
The `calculator` tool in `src/core/tools.js` evaluates math expressions using:
```javascript
return String(new Function(`return ${args.expression}`)());
```
`new Function()` evaluates arbitrary JavaScript code. If an attacker inputs JavaScript payloads (e.g. `process.mainModule.require('child_process').execSync(...)`), the expression will execute on the host process.

#### Impact
Full Remote Code Execution (RCE) on the server/host machine running Alya.

#### Reproduction Steps
1. Send prompt: "Calculate `process.env` or `require('child_process').execSync('id')`".
2. The model triggers `calculator` tool with the payload, executing arbitrary code.

#### Recommended Fix
Sanitize `args.expression` using a strict whitelist regex (e.g., `/^[0-9+\-*/().\s]+$/`) before passing to evaluation, or use a dedicated math parsing library.

---

### 🔴 BUG-05: Unrestricted Code Execution in `execute_python_code` Tool
* **Category:** Security Vulnerability (RCE)
* **Severity:** 🔴 Critical
* **Affected File(s):** `src/core/tools.js`

#### Description
The `execute_python_code` tool writes untrusted python code into a temporary script and executes it directly on the host using `execSync("python script.py")`:
```javascript
const output = execSync(`python "${tempFile}"`, { encoding: "utf8", timeout: 10000 });
```

#### Impact
Arbitrary command execution on the host machine without container isolation or sandboxing.

#### Reproduction Steps
1. Ask assistant to run Python code containing system calls (e.g. `import os; os.system('whoami')`).
2. Code runs on host system with full permissions of the Node.js process.

#### Recommended Fix
Disable or remove the `execute_python_code` tool, or isolate Python execution within Docker/containerized sandboxes.

---

### 🔴 BUG-06: Unrestricted File Read / Path Traversal in `read_pdf` Tool
* **Category:** Security Vulnerability (Path Traversal)
* **Severity:** 🔴 Critical
* **Affected File(s):** `src/core/tools.js`

#### Description
The `read_pdf` tool accepts an `absolutePath` parameter and reads it via `fs.readFileSync(args.absolutePath)` without validating whether the file path stays within allowed user directories or contains path traversal sequences (`../`).

#### Impact
An attacker can read arbitrary files across the file system (e.g., SSH keys, credentials, `/etc/passwd`, `.env`).

#### Reproduction Steps
1. Call `read_pdf` with path `../../../etc/passwd` or敏感 system file paths.
2. Observe system file contents returned in LLM context.

#### Recommended Fix
Validate that the resolved path stays within an allowed directory using `path.resolve()` and explicitly block relative traversal steps (`..`) and sensitive system directories.

---

### 🟠 BUG-07: Server-Side Request Forgery (SSRF) in `read_website` Tool
* **Category:** Security Vulnerability (SSRF)
* **Severity:** 🟠 High
* **Affected File(s):** `src/core/tools.js`

#### Description
The `read_website` tool executes `fetch(args.url)` on arbitrary user/LLM supplied URLs without host or IP address validation.

#### Impact
Allows attackers to use the server to perform SSRF attacks against internal network endpoints (`http://localhost:3000`, `http://169.254.169.254` cloud metadata instances, private network IP ranges).

#### Reproduction Steps
1. Ask assistant to read `http://169.254.169.254/latest/meta-data/` or `http://127.0.0.1:3000`.
2. Tool fetches internal endpoints and exposes data.

#### Recommended Fix
Implement hostname resolution and block requests resolving to loopback (`127.0.0.1`, `::1`), private IP spaces (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and metadata endpoints.

---

### 🟠 BUG-08: Cross-Platform Crash in `get_storage_info` Tool
* **Category:** Platform Compatibility
* **Severity:** 🟠 High
* **Affected File(s):** `src/core/tools.js`

#### Description
In `get_storage_info`, the tool directly invokes `wmic logicaldisk get size,freespace,caption`:
```javascript
const output = execSync("wmic logicaldisk get size,freespace,caption", { encoding: "utf-8" });
```
WMIC is Windows-specific and has been deprecated/removed in recent Windows 11 builds. On Linux or macOS, executing `wmic` throws `Command failed: wmic` / `ENOENT`.

#### Impact
Tool execution fails and falls back to memory stats on Linux/macOS or modern Windows environments.

#### Reproduction Steps
1. Run `get_storage_info` on a Linux or macOS machine.
2. Command fails due to missing `wmic` executable.

#### Recommended Fix
Check `os.platform()` dynamically and execute `df -k` on Linux/macOS while preserving Windows commands (`wmic` / `powershell`).

---

### 🟠 BUG-09: Conversation Key Truncation & History Loss in `src/core/memory.js`
* **Category:** Data Integrity / Bug
* **Severity:** 🟠 High
* **Affected File(s):** `src/core/memory.js`

#### Description
In `src/core/memory.js`:
```javascript
export function flushAll() {
  for (const [key] of conversations) {
    const [platform, channelId] = key.split(":");
    saveToDisk(platform, channelId);
  }
}
```
If `channelId` contains colon characters (common in Slack threads, Discord channel topics, or web session IDs like `slack:C123:T456`), `key.split(":")` splits into more than 2 elements. `channelId` becomes only the middle part (`C123`), truncating the true channel ID.

#### Impact
Conversation history files are saved under corrupted file names, leading to loss of context or history loading failures on reload.

#### Reproduction Steps
1. Add a message with channelId containing colons (e.g. `C123:456`).
2. Call `flushAll()`.
3. Notice saved file name uses truncated ID `C123` instead of `C123:456`.

#### Recommended Fix
Use `key.indexOf(":")` and `substring()` to split only on the first colon rather than calling `split(":")`.

---

### 🟡 BUG-10: Hardcoded Executable Path in `WhatsAppBridge`
* **Category:** Platform Compatibility
* **Severity:** 🟡 Medium
* **Affected File(s):** `src/bridges/whatsapp.js`

#### Description
`WhatsAppBridge` hardcodes Puppeteer's executable path on Linux:
```javascript
executablePath: process.platform === "linux" ? "/usr/bin/google-chrome" : undefined,
```
If Google Chrome is not installed at `/usr/bin/google-chrome` (e.g. Chromium installed at `/usr/bin/chromium` or running inside Docker containers), initialization fails.

#### Impact
WhatsApp bridge fails to launch on non-standard Linux environments or Docker containers.

#### Reproduction Steps
1. Launch WhatsApp bridge on Linux without Google Chrome at `/usr/bin/google-chrome`.
2. Initialization throws `Failed to launch browser`.

#### Recommended Fix
Check if `/usr/bin/google-chrome` exists via `fs.existsSync()` before passing `executablePath`, or allow configuration via environment variables.

---

### 🟡 BUG-11: Conversation History Race Condition in Platform Bridges
* **Category:** Concurrency / Race Condition
* **Severity:** 🟡 Medium
* **Affected File(s):** `src/bridges/discord.js`, `src/bridges/telegram.js`, `src/bridges/slack.js`, `src/bridges/whatsapp.js`

#### Description
In all platform bridges, the user's message and assistant's response are appended to memory *after* awaiting the LLM chat call:
```javascript
const history = getHistory(platform, channelId);
const response = await this.llm.chat(history, content);
addMessage(platform, channelId, "user", content);
addMessage(platform, channelId, "assistant", response);
```
If multiple user messages arrive in quick succession before `llm.chat` completes, the second message receives a historical state that omits the first incoming message.

#### Impact
Out-of-order conversation history or missing messages in fast multi-turn conversations.

#### Reproduction Steps
1. Send two messages rapidly to Discord/Telegram/WhatsApp bot.
2. Second response context misses the first message because it was added only after completion.

#### Recommended Fix
Add user message to memory immediately before calling `this.llm.chat()`, and pass a snapshot copy of history to the LLM.

---

### 🔵 BUG-12: Media Tools Return Local File Paths as Text
* **Category:** Functional Issue
* **Severity:** 🔵 Low
* **Affected File(s):** `src/core/tools.js`, `src/bridges/*.js`

#### Description
Tools like `screenshot_website` and `generate_qr_code` save images to `data/temp/` and return absolute local file paths (e.g. `/home/user/data/temp/screenshot_123.png`). Platform bridges treat the LLM response as plain text and send raw file path strings to remote chat users instead of uploading image attachments.

#### Impact
Users on Discord/Telegram/WhatsApp receive local file path strings rather than viewing the rendered image.

#### Reproduction Steps
1. Ask assistant to "Take a screenshot of wikipedia.org".
2. Assistant replies with text string containing `/path/to/data/temp/screenshot.png`.

#### Recommended Fix
Detect image file paths in bridge responses and upload them as native media attachments using Discord/Telegram/WhatsApp media APIs.

---

## 💡 Summary Recommendations

1. **Fix Missing Files:** Add `setup.js` to enable guided environment setup.
2. **Resolve Runtime Crashes:** Fix `SYSTEM_PROMPT` undefined error in `llm.js` and null-check `config.groq` in `index.js`.
3. **Remediate Security Flaws:**
   - Sanitize `calculator` input regex.
   - Disable or isolate `execute_python_code`.
   - Add path traversal checks to `read_pdf`.
   - Add private/loopback IP filter to `read_website`.
4. **Fix Compatibility & Concurrency:**
   - Add OS check for `df -k` in storage tool.
   - Fix colon splitting logic in `memory.js`.
   - Update message memory order in platform bridges.
