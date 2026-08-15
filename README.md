# Tab Intelligence - Local LLM Chrome Tab Organizer

A Manifest V3 Chrome Extension that harvests maximum semantic data from all open browser tabs across all windows and uses a **Local LLM** (Ollama, Gemini Nano Built-in AI, or LM Studio) to synthesize and organize your browser into clean, color-coded Chrome Tab Groups.

---

## 🌟 Key Capabilities

1. **Deep Cross-Window Harvesting ("Maximum Data")**:
   - Tab structural metadata (`windowId`, `tabId`, `pinned`, `audible`, `discarded`, `lastAccessed`).
   - Page meta tags (`description`, `og:title`, `keywords`, `canonical`).
   - Schema.org microdata / JSON-LD entity detection.
   - H1–H3 heading hierarchy outline.
   - Platform-specific extractors (GitHub repos/issues, YouTube videos/channels, StackOverflow tags, Reddit subreddits, E-commerce).
   - Sanitized Readability content extraction (boilerplate-free article text).
2. **Local LLM Provider Agnostic**:
   - **Ollama** (`http://localhost:11434` with `llama3.1:8b`, `qwen2.5:7b`, `mistral`, `deepseek-r1:8b`, etc.).
   - **Chrome Built-in Prompt API (Gemini Nano)**: Zero-setup on-device AI.
   - **LM Studio / vLLM / LocalAI** (`http://localhost:1234` OpenAI-compatible endpoint).
3. **Interactive Side Panel Diff & Customization**:
   - Real-time token streaming and progress visualization.
   - Interactive group editing: rename titles, change Chrome colors, drag-and-drop tab assignments.
   - Smart deduplication detection with 1-click duplicate tab closing.
4. **Chrome Tab Groups Execution & 1-Click Undo**:
   - Native `chrome.tabs.group()` and `chrome.tabGroups.update()` automation.
   - Session snapshot rollback to restore previous window and group states.

---

## 🚀 How to Install and Run in Chrome

### 1. Load Unpacked Extension
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Turn ON **Developer mode** (toggle in the top right corner).
3. Click **Load unpacked**.
4. Select the project directory: `c:\Users\bcint\proj\dev\extllm`.
5. The **Tab Intelligence** icon will appear in your Chrome toolbar.

### 2. Configure Your Local LLM Backend

#### Option A: Ollama (Recommended for large tab counts)
1. Ensure Ollama is running (`ollama serve` or open the Ollama desktop app).
2. Pull a recommended model:
   ```bash
   ollama run llama3.1:8b
   # or
   ollama run qwen2.5:7b
   ```
3. *Note on CORS*: If needed, launch Ollama with `OLLAMA_ORIGINS="chrome-extension://*"` or `OLLAMA_ORIGINS="*"`. The extension background service worker connects directly via extension privileges.

#### Option B: Chrome Built-in Prompt API (Gemini Nano)
1. Open `chrome://flags` in Chrome 128+.
2. Enable:
   - `#prompt-api-for-gemini-nano` -> **Enabled**
   - `#optimization-guide-on-device-model` -> **Enabled BypassPrefRequirement**
3. Restart Chrome and select **Chrome Gemini Nano** in the extension settings.

#### Option C: LM Studio / LocalAI
1. Start local server on `http://localhost:1234` with any preferred model.

#### Option D: Online / Cloud Web LLMs (Groq, Gemini Flash, OpenAI)
1. Get a free API key from [Groq](https://console.groq.com/) or [Google AI Studio](https://aistudio.google.com/).
2. In the extension settings, select **LM Studio / OpenAI-compatible**.
3. Enter endpoint (e.g. `https://api.groq.com/openai/v1`), model (e.g. `llama-3.3-70b-versatile`), and paste your API key.
4. See full setup instructions in [ONLINE_LLMS.md](file:///c:/Users/bcint/proj/dev/extllm/ONLINE_LLMS.md).

---

## ⚡ Fast and Quality processing profiles

The extension selects the processing profile **automatically** from the number of open tabs — there is no selector in the side panel. Small tab sets (20 tabs or fewer) use the richer Quality profile, and larger sets use the Fast profile so latency stays bounded. The choice never switches models, pulls models, uses a cloud fallback, or increases Ollama concurrency.

| Profile | Used when | What it does |
| --- | --- | --- |
| **Fast** | More than 20 tabs | Locally routes known operational tabs before inference, sends compact evidence, token-packs up to 50 tabs per Pass-1 request, caps the effective Ollama context at 8K, bounds output, and skips a second full Pass-2 correction request. |
| **Quality** | 20 tabs or fewer | Retains headings, keywords, platform context, and readability snippets; uses conservative 20-tab batches; and retains the validation/correction retry when the final grouping violates guardrails. |

Both profiles keep semantic two-pass grouping: Pass 1 labels each tab's subject/entity/intent, then Pass 2 forms Chrome tab groups. They keep one Ollama generation in flight by default because extra concurrency can increase KV-cache pressure and make local inference slower. Advanced users can pin a specific profile by setting `grouping.analysisProfile` to `fast` or `quality` in stored settings; the default `auto` chooses by tab count.

### Choosing a local model and context

- **Fast:** If installed locally, a capable small model such as `qwen2.5:3b` or `llama3.2:3b` is a practical starting point for 100-tab workloads. Select it yourself in Settings; the extension never changes your configured model automatically.
- **Quality:** Use the model you already trust for grouping quality. Larger models can improve labels but can dominate total latency, particularly if they load cold.
- **`num_ctx`:** Treat the Ollama setting as a memory/quality trade-off, not a speed setting. Larger contexts reserve more memory. Fast applies an 8K effective cap; Quality uses your configured cap. Every request within a run uses that profile-effective value so Ollama can reuse its runner instead of reloading it when the context changes.
- **Warm versus cold runs:** The first request may include model-load time. The extension sends `keep_alive` with the same profile-effective context so later requests and runs can reuse a resident model when memory permits.

### Progress, cancellation, and diagnostics

While an analysis runs, the side panel reports collection, Pass-1 batch completion, retry/fallback status, elapsed time, and throttled live Pass-2 output. Use **Cancel** to abort queued and in-flight work; cancellation never applies tab changes. After a completed, failed, or cancelled run, expand **analysis diagnostics** to see the safe request count, retries, timing, model-load time, and output-token rate when Ollama reports them.

### Reproducible 100-tab benchmark

Run a local, synthetic 100-tab benchmark against an installed model:

```bash
node benchmark-analysis-profiles.mjs fast qwen2.5:3b
# Optional comparison:
node benchmark-analysis-profiles.mjs quality qwen2.5:3b
```

The JSON report records cold/warm model load, Pass-1 and Pass-2 elapsed time, request count, retries, output-token rate, batch count, and coverage. Record the model, profile, context setting, and hardware alongside the report; performance is hardware- and model-dependent, so no single number is presented as universal.

## 🛠️ Usage

1. Click the **Tab Intelligence** action icon to open the **Side Panel**.
2. Select your desired scope (**All Windows** vs **Current Window**) and placement (**Group In-Place** vs **Consolidate Windows**).
3. (Optional) Enter a custom instruction (e.g. *"Group my coding research separately from leisure"*).
4. Click **Analyze & Group Tabs**.
5. Watch the live semantic synthesis.
6. Review the proposed groups, adjust any titles or colors, and click **Apply Groups**.
7. If needed, click **Undo** at any time to revert to your previous state.
