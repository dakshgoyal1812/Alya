# 🐛 Comprehensive Bug, Security, and Code Audit Report for Alya

This report contains a detailed breakdown of all identified bugs, runtime errors, security vulnerabilities, missing files, and architectural inconsistencies in the **Alya AI Assistant** repository.

---

## 🚨 Critical Runtime Errors & Bugs

### 1. Missing `SYSTEM_PROMPT` Reference in `src/core/llm.js`
* **Severity:** High / Critical
* **File:** `src/core/llm.js` (Method: `generate(prompt)`)
* **Issue:** The `generate()` function calls `messages: [{ role: "system", content: SYSTEM_PROMPT }, ...]` but `SYSTEM_PROMPT` is neither defined in `llm.js` nor imported from `personality.js`.
* **Impact:** Invoking `generate()` triggers an unhandled `ReferenceError: SYSTEM_PROMPT is not defined`, crashing the function execution.
* **Remediation:** Replace `SYSTEM_PROMPT` with `getSystemPrompt("normal")` or import `SYSTEM_PROMPT` from `src/core/personality.js`.

### 2. Missing `setup.js` File
* **Severity:** High
* **Files Affected:** `package.json`, `src/index.js`, `README.md`
* **Issue:** `package.json` specifies `"setup": "node setup.js"`, `src/index.js` tells users to run `npm run setup` when config is missing, and `README.md` features `setup.js` as the guided interactive setup wizard. However, `setup.js` is absent from the root directory.
* **Impact:** Running `npm run setup` or following initial setup instructions fails with `Error: Cannot find module '/path/to/setup.js'`.
* **Remediation:** Create `setup.js` to handle interactive wizard configuration, or update package scripts and documentation accordingly.

### 3. Channel Key Truncation in `src/core/memory.js`
* **Severity:** Medium / High
* **File:** `src/core/memory.js` (Functions: `flushAll()`, `getStats()`)
* **Issue:** Conversation keys are formatted as `${platform}:${channelId}` (e.g. `slack:C123:456` or `discord:12345`). `flushAll()` and `getStats()` parse keys using `key.split(":")`. If `channelId` contains colons (common on platforms like Slack or custom IDs), `split(":")` breaks the ID into multiple fragments, losing part of the channel ID when calling `saveToDisk(platform, channelId)`.
* **Impact:** Data loss or corrupted saves for channel IDs containing colons.
* **Remediation:** Use `key.indexOf(":")` and `substring()` to split key into platform and full channel ID.

---

## 🔒 Security Vulnerabilities

### 1. Remote Code Execution (RCE) in `execute_python_code` Tool
* **Severity:** Critical
* **File:** `src/core/tools.js` (Tool: `execute_python_code`)
* **Issue:** The tool writes untrusted LLM-generated Python code into a file and executes it via `execSync("python script.py")` on the host operating system without any sandboxing or container isolation.
* **Impact:** Any user interacting with the bot could prompt it to execute arbitrary shell commands, read host environment variables, modify system files, or achieve full system compromise.
* **Remediation:** Disable this tool by default, or isolate python execution inside an unprivileged Docker container or sandbox.

### 2. Server-Side Request Forgery (SSRF) in `read_website` & `screenshot_website`
* **Severity:** High
* **File:** `src/core/tools.js` (Tools: `read_website`, `screenshot_website`)
* **Issue:** `read_website` uses `fetch(args.url)` and `screenshot_website` uses Puppeteer `page.goto(args.url)` with arbitrary user-supplied URLs without IP range or hostname validation.
* **Impact:** Users can force the application server to make HTTP requests or render internal network endpoints (e.g., `http://169.254.169.254` cloud metadata, `http://localhost:8080`, router administrative pages).
* **Remediation:** Implement strict URL validation blocking loopback, RFC1918 private IP ranges, and internal network hostnames.

### 3. Arbitrary File Read Risk in `read_pdf`
* **Severity:** Medium
* **File:** `src/core/tools.js` (Tool: `read_pdf`)
* **Issue:** Accepts `args.absolutePath` directly from user input or LLM generation and reads file content via `fs.readFileSync(args.absolutePath)` without directory boundaries or traversal validation.
* **Impact:** May expose sensitive system files if an attacker manipulates path inputs.
* **Remediation:** Validate that target file paths reside within an allowed directory structure or restrict access to specified uploaded folders.

---

## 🛠️ Cross-Platform & Operational Inconsistencies

### 1. OS-Specific Command Execution in `get_storage_info`
* **Severity:** Medium
* **File:** `src/core/tools.js` (Tool: `get_storage_info`)
* **Issue:** Executes `wmic logicaldisk get size,freespace,caption` directly without checking process platform (`process.platform`).
* **Impact:** On Linux and macOS, `wmic` fails, throwing an exception that falls back to memory metrics instead of returning disk metrics.
* **Remediation:** Check `process.platform` and execute `df -k` or platform-appropriate utilities on POSIX systems while using `wmic` or PowerShell on Windows.

### 2. Mismatch Between Architecture & Documentation (Ollama vs. Groq)
* **Severity:** Low / Documentation
* **Files:** `README.md` vs `src/core/llm.js`
* **Issue:** `README.md` advertises 100% local Ollama inference (`ollama pull llama3.2`). However, `src/core/llm.js` connects to Groq Cloud API (`https://api.groq.com/openai/v1`) using OpenAI SDK. `config.js` still retains `ollama` default settings that are unused by `LLMEngine`.
* **Impact:** Confuses users expecting fully local LLM execution.
* **Remediation:** Align documentation with active backend implementation or re-introduce Ollama backend option in `llm.js`.

### 3. Media Path Output in Platforms vs Real Attachments
* **Severity:** Low / UX
* **Files:** `src/core/tools.js`, `src/bridges/discord.js`, `src/bridges/telegram.js`
* **Issue:** Tools `screenshot_website` and `generate_qr_code` instruct the LLM to reply with local image file paths (e.g. `data/temp/screenshot_....png`). Platform bridges like Discord and Telegram forward text paths rather than uploading the generated file as a platform native attachment (except WhatsApp TTS which handles voice note uploads).
* **Impact:** Text file paths are displayed to end-users instead of embedded images.
* **Remediation:** Update bridges to detect generated image file paths and attach them as native media files.

---

## 📊 Summary Table

| Issue / Bug | Component | Severity | Type |
| :--- | :--- | :--- | :--- |
| Undefined `SYSTEM_PROMPT` in `generate()` | `src/core/llm.js` | Critical | Runtime Crash |
| RCE via `execute_python_code` | `src/core/tools.js` | Critical | Security Vulnerability |
| Missing `setup.js` Script | Project Root / `package.json` | High | Missing File / CLI |
| SSRF in `read_website` & `screenshot_website` | `src/core/tools.js` | High | Security Vulnerability |
| Channel ID truncation on `:` split | `src/core/memory.js` | Medium | Data Integrity |
| Windows-only `wmic` call in storage info | `src/core/tools.js` | Medium | Cross-Platform Compatibility |
| Local Ollama vs Groq API discrepancy | Documentation / `llm.js` | Low | Architectural Discrepancy |
