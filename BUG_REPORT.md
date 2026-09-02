# 🐛 Comprehensive Bug & Security Audit Report — Alya AI Assistant

**Repository:** `dakshgoyal1812/Alya`
**Date:** September 2, 2026
**Auditor:** Jules (AI Software Engineer)
**Status:** Audit Completed

---

## Executive Summary

A comprehensive code and security audit of the **Alya AI Assistant** codebase was conducted. The audit revealed **10 distinct issues** spanning critical runtime errors, remote code execution vulnerabilities, data corruption risks, missing scripts, and platform compatibility issues.

---

## 📊 Summary Table

| ID | Title | Severity | Impact | Affected Location |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | `ReferenceError: SYSTEM_PROMPT is not defined` | 🔴 **Critical** | Process crash on `llm.generate()` call | `src/core/llm.js:282` |
| **BUG-02** | Arbitrary Remote Code Execution (RCE) via `execute_python_code` | 🔴 **Critical** | Host system compromise | `src/core/tools.js:500-515` |
| **BUG-03** | Unsanitized Expression Evaluation in `calculator` Tool | 🔴 **Critical** | Arbitrary JS code execution in Node runtime | `src/core/tools.js:348` |
| **BUG-04** | Missing Mandatory Setup Script (`setup.js`) | 🟠 **High** | `npm run setup` fails with `MODULE_NOT_FOUND` | `package.json:8` & Root |
| **BUG-05** | Conversation Channel ID Truncation & Memory Loss | 🟠 **High** | Overwritten/corrupted conversation history | `src/core/memory.js:135,149` |
| **BUG-06** | Server-Side Request Forgery (SSRF) in `read_website` | 🟠 **High** | Exposure of internal network services & cloud metadata | `src/core/tools.js:405-420` |
| **BUG-07** | Arbitrary File Read Vulnerability in `read_pdf` | 🟠 **High** | Leakage of sensitive local host files | `src/core/tools.js:485-497` |
| **BUG-08** | Platform Bridge Local File Path Leakage | 🟡 **Medium** | Raw local file paths sent to users instead of media | Platform Bridges (`src/bridges/`) |
| **BUG-09** | Race Condition in Concurrent Message History Updates | 🟡 **Medium** | Dropped messages or out-of-order responses under load | All Bridges (`src/bridges/*.js`) |
| **BUG-10** | OS Specific Command Failure in `get_storage_info` | 🟢 **Low** | Unhandled fallback on Linux/macOS systems | `src/core/tools.js:320` |

---

## 🔍 Detailed Bug Analysis & Recommendations

### BUG-01: `ReferenceError: SYSTEM_PROMPT is not defined` in `LLMEngine.generate()`
* **Severity:** 🔴 Critical
* **Affected File:** `src/core/llm.js` (line 282)
* **Description:** The `generate(prompt)` method attempts to pass `SYSTEM_PROMPT` to the OpenAI chat completion call:
  ```javascript
  messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }]
  ```
  However, `SYSTEM_PROMPT` is neither imported nor declared in `src/core/llm.js`. Calling `llm.generate(...)` throws an unhandled `ReferenceError` and crashes the application.
* **Root Cause:** Missing import or reference error during prompt modularization.
* **Remediation:** Replace `SYSTEM_PROMPT` with `getSystemPrompt("normal")` which is already imported from `./personality.js`:
  ```javascript
  messages: [{ role: "system", content: getSystemPrompt("normal") }, { role: "user", content: prompt }]
  ```

---

### BUG-02: Arbitrary Remote Code Execution (RCE) via `execute_python_code` Tool
* **Severity:** 🔴 Critical
* **Affected File:** `src/core/tools.js` (lines 500–515)
* **Description:** The `execute_python_code` tool writes user or LLM-provided Python code directly to a file in `./data/temp/` and executes it synchronously on the host OS:
  ```javascript
  const output = execSync(`python "${tempFile}"`, { encoding: "utf8", timeout: 10000 });
  ```
  If prompt injection occurs or a malicious user requests code execution, arbitrary shell commands can be run with full permissions of the Node.js process user.
* **Root Cause:** Execution of untrusted code directly on the host operating system without sandboxing or container isolation.
* **Remediation:** Disable or remove the `execute_python_code` tool from `availableTools`, or execute the code within a constrained docker container with disabled networking and read-only filesystem mounts.

---

### BUG-03: Unsanitized Expression Evaluation in `calculator` Tool
* **Severity:** 🔴 Critical
* **Affected File:** `src/core/tools.js` (line 348)
* **Description:** The `calculator` tool evaluates expressions using `new Function`:
  ```javascript
  return String(new Function(`return ${args.expression}`)());
  ```
  Without input sanitization, an attacker can pass arbitrary JavaScript expressions such as:
  `process.mainModule.require('child_process').execSync('id')`
  executing arbitrary system commands inside the Node process.
* **Root Cause:** Evaluating user-controlled strings in JS context using `new Function()`.
* **Remediation:** Validate the input string against a strict mathematical character whitelist before evaluating:
  ```javascript
  if (!/^[0-9+\-*/().\s]+$/.test(args.expression)) {
    return "Error: Invalid characters in mathematical expression.";
  }
  return String(new Function(`return ${args.expression}`)());
  ```

---

### BUG-04: Missing Mandatory Setup Script (`setup.js`)
* **Severity:** 🟠 High
* **Affected Files:** `package.json` (line 8), `README.md`, `src/index.js` (line 30)
* **Description:** `package.json` specifies `"setup": "node setup.js"`. Furthermore, both `README.md` and `src/index.js` explicitly prompt the user to run `npm run setup` when configuration is missing. However, `setup.js` does not exist in the codebase.
* **Root Cause:** Missing script artifact.
* **Remediation:** Add a interactive `setup.js` CLI script (using `inquirer` or `readline`) to prompt users for API keys, bridge configuration, and generate `config/config.json`.

---

### BUG-05: Conversation Channel ID Truncation & History Overwrite
* **Severity:** 🟠 High
* **Affected File:** `src/core/memory.js` (lines 135, 149)
* **Description:** Functions `flushAll()` and `getStats()` split memory keys formatted as `${platform}:${channelId}`:
  ```javascript
  const [platform, channelId] = key.split(":");
  ```
  If `channelId` contains a colon (e.g., Slack thread IDs `C12345:167890`, composite IDs, or platform identifiers), `split(":")` breaks the key into 3+ elements. The `channelId` variable receives only the first fragment, causing conversation saves to truncate the channel ID and corrupt/overwrite history files of other channels.
* **Root Cause:** Assuming `key` contains exactly one colon.
* **Remediation:** Use `indexOf(":")` and `substring()` to split key strictly on the first colon:
  ```javascript
  const colonIndex = key.indexOf(":");
  const platform = key.substring(0, colonIndex);
  const channelId = key.substring(colonIndex + 1);
  ```

---

### BUG-06: Server-Side Request Forgery (SSRF) in `read_website`
* **Severity:** 🟠 High
* **Affected File:** `src/core/tools.js` (lines 405–420)
* **Description:** The `read_website` tool accepts any URL string and executes a standard `fetch(args.url)`. There are no restrictions on target hosts, allowing attackers to target internal IP ranges (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.169.254` AWS metadata).
* **Root Cause:** Lack of URL scheme and target IP address validation.
* **Remediation:** Validate that the protocol is strictly `http:` or `https:`, resolve hostnames via DNS, and block private, loopback, and cloud metadata IP ranges prior to making requests.

---

### BUG-07: Arbitrary File Read Vulnerability in `read_pdf`
* **Severity:** 🟠 High
* **Affected File:** `src/core/tools.js` (lines 485–497)
* **Description:** `read_pdf` accepts an `absolutePath` parameter and reads it using `fs.readFileSync(args.absolutePath)`. An attacker can supply paths like `/etc/passwd` or `../../config/config.json` to extract system configuration and secret credentials.
* **Root Cause:** Unrestricted file system access accepting arbitrary paths.
* **Remediation:** Normalize paths using `path.resolve`, verify that requested files stay within an allowed directory (e.g. `./data/uploads`), and reject traversal patterns containing `..`.

---

### BUG-08: Platform Bridge Local File Path Leakage
* **Severity:** 🟡 Medium
* **Affected Files:** `src/core/tools.js` & Platform Bridges (`src/bridges/*.js`)
* **Description:** Tools such as `screenshot_website` and `generate_qr_code` save output images locally in `data/temp/` and return prompt instructions like:
  `Please reply to the user with EXACTLY this text so the image embeds properly: /app/data/temp/screenshot_12345.png`
  Because platform bridges (Discord, Telegram, Slack) do not handle local file path outputs, users receive raw local file path strings rather than actual image attachments.
* **Root Cause:** Tools return system file paths instead of media objects, and platform bridges lack media attachment post-processing.
* **Remediation:** Standardize tool returns for media generation and update platform bridges to detect returned file paths and upload them as native attachments (e.g. `message.reply({ files: [filePath] })`).

---

### BUG-09: Race Condition in Concurrent Message History Updates
* **Severity:** 🟡 Medium
* **Affected Files:** `src/bridges/discord.js`, `telegram.js`, `slack.js`, `whatsapp.js`, `web.js`
* **Description:** Incoming messages retrieve history (`getHistory`), send the history to `llm.chat(...)`, and only add user/assistant messages to memory (`addMessage`) after the LLM completes. If a user sends multiple messages rapidly, subsequent messages read the old history snapshot, resulting in lost messages or misplaced context.
* **Root Cause:** Asynchronous gap between history retrieval and message logging.
* **Remediation:** Immediately log the incoming user message with `addMessage`, take a snapshot of history (`[...history]`) to pass to `llm.chat`, and then append the assistant response when generation finishes.

---

### BUG-10: OS-Specific Command Failure in `get_storage_info`
* **Severity:** 🟢 Low
* **Affected File:** `src/core/tools.js` (line 320)
* **Description:** `get_storage_info` executes `execSync("wmic logicaldisk get size,freespace,caption")`. On Linux and macOS systems, `wmic` does not exist, causing `execSync` to fail and throw an exception every time before falling back to memory info.
* **Root Cause:** Hardcoded Windows utility execution without platform checking.
* **Remediation:** Check `process.platform` before executing system commands (`wmic` on `win32`, `df -k` on `linux` / `darwin`).

---

## 🛠️ Summary of Required Actions

1. Fix `ReferenceError` in `src/core/llm.js` by using `getSystemPrompt("normal")`.
2. Add regex sanitization `/^[0-9+\-*/().\s]+$/` to `calculator` in `src/core/tools.js`.
3. Disable or sandbox `execute_python_code`.
4. Fix `key.split(":")` in `src/core/memory.js` to use `indexOf(":")` and `substring()`.
5. Implement URL/IP validation for `read_website` and path traversal checks for `read_pdf`.
6. Create `setup.js` CLI wizard for user onboarding.
