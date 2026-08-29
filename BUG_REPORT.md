# 🐛 Comprehensive Bug, Security, and Code Audit Report for Alya

This report presents a thorough audit of the **Alya AI Assistant** repository, covering identified runtime bugs, security vulnerabilities, cross-platform compatibility issues, missing setup scripts, and architectural discrepancies.

---

## 🚨 Critical Runtime Errors & Bugs

### 1. Undefined `SYSTEM_PROMPT` Variable Reference in `src/core/llm.js`
* **Severity:** High / Critical
* **File:** `src/core/llm.js` (Method: `generate(prompt)`)
* **Issue:** The `generate()` method attempts to construct messages using `{ role: "system", content: SYSTEM_PROMPT }`. However, `SYSTEM_PROMPT` is neither defined in `src/core/llm.js` nor imported from `src/core/personality.js`.
* **Impact:** Any invocation of `LLMEngine.generate()` throws an unhandled `ReferenceError: SYSTEM_PROMPT is not defined`, crashing execution.
* **Remediation:** Replace `SYSTEM_PROMPT` with `getSystemPrompt("normal")` or explicitly import/define `SYSTEM_PROMPT` in `src/core/llm.js`.

### 2. Missing `setup.js` Script
* **Severity:** High
* **Files Affected:** `package.json`, `src/index.js`, `README.md`
* **Issue:** `package.json` specifies `"setup": "node setup.js"`, `src/index.js` directs users to execute `npm run setup` when no configuration file is detected, and `README.md` references an interactive `setup.js` wizard. However, `setup.js` is missing from the repository root.
* **Impact:** Running `npm run setup` or following the initial onboarding instructions fails with `Error: Cannot find module '/path/to/setup.js'`.
* **Remediation:** Implement `setup.js` to handle guided interactive configuration creation (`config/config.json`), or update documentation and package scripts.

### 3. Channel Key Truncation in `src/core/memory.js`
* **Severity:** Medium / High
* **File:** `src/core/memory.js` (Functions: `flushAll()`, `getStats()`)
* **Issue:** Conversation history keys follow the format `${platform}:${channelId}` (e.g., `discord:12345678` or `slack:C123:456`). In functions like `flushAll()` and `getStats()`, keys are split using `key.split(":")`. When `channelId` contains colons (common on platforms like Slack), `split(":")` splits the ID into multiple parts, losing trailing components when passing `channelId` to `saveToDisk(platform, channelId)`.
* **Impact:** Potential conversation history truncation, missing data saves, or file naming collisions for channel IDs containing colons.
* **Remediation:** Parse keys using `key.indexOf(":")` and `substring()` to split only on the first colon delimiter, ensuring the full `channelId` is preserved.

---

## 🔒 Security Vulnerabilities

### 1. Remote Code Execution (RCE) via `execute_python_code` Tool
* **Severity:** Critical
* **File:** `src/core/tools.js` (Tool: `execute_python_code`)
* **Issue:** The tool writes untrusted LLM-generated Python code into temporary files and executes it directly on the host operating system using `execSync(`python "${tempFile}"`)` without container isolation, process privileges drop, or sandboxing.
* **Impact:** Attackers or prompt-injected inputs can execute arbitrary shell commands, access environment variables, read system credentials, or take full control of the host system.
* **Remediation:** Disable `execute_python_code` by default, or sandbox code execution within isolated Docker containers or restricted runtimes.

### 2. Server-Side Request Forgery (SSRF) in `read_website` & `screenshot_website`
* **Severity:** High
* **File:** `src/core/tools.js` (Tools: `read_website`, `screenshot_website`)
* **Issue:** `read_website` calls `fetch(args.url)` and `screenshot_website` executes Puppeteer `page.goto(args.url)` with arbitrary user-provided URLs without validating hostnames or IP address ranges.
* **Impact:** Malicious inputs can force the server to issue HTTP requests to internal endpoints (e.g., cloud metadata services at `http://169.254.169.254`, localhost ports, internal network administration interfaces).
* **Remediation:** Add strict URL validation that resolves hostnames and explicitly blocks loopback IPs (`127.0.0.0/8`, `::1`), private RFC1918 networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and link-local addresses.

### 3. Arbitrary File Read via Path Traversal in `read_pdf`
* **Severity:** Medium / High
* **File:** `src/core/tools.js` (Tool: `read_pdf`)
* **Issue:** Accepts `args.absolutePath` directly from input and reads it using `fs.readFileSync(args.absolutePath)` without validating root directories or checking for path traversal sequences (`..`).
* **Impact:** Users or LLM tool invocations could read sensitive host system files (e.g., `/etc/passwd`, private keys, configuration secrets).
* **Remediation:** Normalize paths with `path.resolve()`, block relative path traversal inputs, and restrict read operations to authorized directories.

---

## 🛠️ Cross-Platform & Operational Inconsistencies

### 1. OS-Specific Windows Command in `get_storage_info`
* **Severity:** Medium
* **File:** `src/core/tools.js` (Tool: `get_storage_info`)
* **Issue:** Executes `wmic logicaldisk get size,freespace,caption` directly via `execSync()` without checking `process.platform`.
* **Impact:** On Linux and macOS operating systems, `wmic` does not exist. The command fails and falls back to memory statistics rather than returning actual disk usage.
* **Remediation:** Check `process.platform` dynamically; use `df -k` or native system calls on POSIX systems while reserving `wmic` / PowerShell for Windows.

### 2. Architecture Discrepancy: Ollama Local vs. Groq Cloud API
* **Severity:** Low / Architectural
* **Files:** `README.md`, `src/core/config.js` vs. `src/core/llm.js`
* **Issue:** `README.md` and default configurations describe 100% local LLM execution via Ollama (`http://localhost:11434`). However, `src/core/llm.js` uses `OpenAI` client pointing to Groq Cloud API (`https://api.groq.com/openai/v1`).
* **Impact:** Users expecting fully local offline LLM execution are required to supply Groq Cloud API keys.
* **Remediation:** Align documentation with the active engine, or introduce a configurable backend switch supporting both Ollama local and Groq cloud providers.

### 3. Media Output Formatting in Platform Bridges
* **Severity:** Low / UX
* **Files:** `src/core/tools.js`, `src/bridges/discord.js`, `src/bridges/telegram.js`, `src/bridges/slack.js`
* **Issue:** `screenshot_website` and `generate_qr_code` return absolute file paths (e.g., `data/temp/screenshot_....png`). Most bridges forward raw text responses instead of attaching generated images as native chat media uploads.
* **Impact:** Users receive raw file path strings instead of visual image embeds.
* **Remediation:** Update platform bridge message handlers to detect local image paths and send them as native platform media attachments.

---

## 📊 Summary Table

| Issue / Bug | Component | Severity | Type |
| :--- | :--- | :--- | :--- |
| Undefined `SYSTEM_PROMPT` in `generate()` | `src/core/llm.js` | Critical | Runtime Crash |
| RCE via `execute_python_code` | `src/core/tools.js` | Critical | Security Vulnerability |
| Missing `setup.js` Script | Project Root / `package.json` | High | Missing Script / CLI |
| SSRF in `read_website` & `screenshot_website` | `src/core/tools.js` | High | Security Vulnerability |
| Arbitrary File Read in `read_pdf` | `src/core/tools.js` | Medium | Security Vulnerability |
| Channel ID truncation on `:` split | `src/core/memory.js` | Medium | Data Integrity |
| Windows-only `wmic` call in `get_storage_info` | `src/core/tools.js` | Medium | Cross-Platform Compatibility |
| Ollama local vs. Groq Cloud API discrepancy | Documentation / `src/core/llm.js` | Low | Architectural Discrepancy |
