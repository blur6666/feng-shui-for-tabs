# Feng Shui for Tabs - AI Chrome Tab Organizer

A Manifest V3 Chrome Extension that organizes open browser tabs into clean, color-coded Chrome Tab Groups using local AI (Ollama, Gemini Nano, LM Studio) or cloud LLM APIs (Google Gemini, Anthropic Claude, OpenAI, Groq, OpenRouter).

---

## Features

- **Semantic Two-Pass Grouping**: Labels tabs by topic and task rather than website or domain name, then clusters them into Chrome tab groups.
- **Local & Cloud LLM Providers**: Works with local offline engines (Ollama, Chrome Built-in Gemini Nano, LM Studio) and cloud APIs (Google Gemini, Anthropic Claude, OpenAI, Groq, OpenRouter).
- **Privacy Shield**: Blocklist sensitive domains, wildcards (`*.bank.com`), or local files (`file://`) so matching tabs are never sent to any LLM.
- **Granularity Control**: Choose between **Broad** (2–4 umbrella groups), **Balanced** (4–8 topic groups), or **Detailed** (8+ specific groups).
- **Manual Control & Junk Cleanup**: Deterministically detect and bulk-close duplicate tabs, empty/new tabs, expired OAuth redirects, and error pages.
- **Preview & Reversible**: Review proposed titles and colors before applying. Dismiss with **Cancel**, or restore previous tab layout with 1-click **Undo**.
- **Adaptive Performance**: Automatically routes large tab sets (20+ tabs) through token-optimized Fast pipelines to keep analysis latency bounded.

---

## Installation

1. Open Google Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the extension directory: `c:\Users\bcint\proj\dev\ext\feng-shui-for-tabs`.
5. Click the **Feng Shui for Tabs** icon in the extensions toolbar to open the side panel.

---

## LLM Setup Guide

Open the extension **Settings** (⚙️ icon in the top header) and choose your provider.

### Option 1: Cloud APIs (Fast & No Setup)

| Provider | Recommended Model | API Key |
| :--- | :--- | :--- |
| **Google Gemini** | `gemini-2.0-flash` | [Google AI Studio](https://aistudio.google.com/app/apikey) (Free Tier available) |
| **Anthropic Claude** | `claude-3-5-haiku-20241022` | [Anthropic Console](https://console.anthropic.com/settings/keys) |
| **OpenAI** | `gpt-4o-mini` | [OpenAI Platform](https://platform.openai.com/api-keys) |
| **Groq** | `llama-3.3-70b-versatile` | [Groq Console](https://console.groq.com/keys) (Free Tier available) |
| **OpenRouter** | `meta-llama/llama-3.3-70b-instruct` | [OpenRouter Keys](https://openrouter.ai/keys) |

### Option 2: Local AI (100% Private & Offline)

#### A. Ollama (Recommended for local inference)
1. Install and start Ollama (`ollama serve` or the desktop app).
2. Pull a recommended model:
   ```bash
   ollama run qwen2.5:3b
   # or
   ollama run llama3.2:3b
   ```
3. In extension settings, select **Ollama**, enter endpoint (`http://localhost:11434`), and select model `qwen2.5:3b`.

#### B. Chrome Built-in Prompt API (Gemini Nano)
1. Open `chrome://flags` in Chrome 128+.
2. Set `#prompt-api-for-gemini-nano` to **Enabled**.
3. Set `#optimization-guide-on-device-model` to **Enabled BypassPrefRequirement**.
4. Relaunch Chrome and select **Chrome Gemini Nano** in settings.

#### C. LM Studio / LocalAI
1. Start local server on `http://localhost:1234`.
2. Select **LM Studio / LocalAI** in extension settings.

---

## How It Works

1. **Tab Harvesting**: Gathers structural metadata (title, URL, search query, repo, subreddit) from open tabs across windows. Privacy Shield rules exclude sensitive tabs client-side.
2. **Pass 1 (Labeling)**: Batches tabs and extracts a concise semantic subject, entity, and intent for each tab.
3. **Pass 2 (Clustering)**: Synthesizes labels into cohesive topic groups with $\le 12$-character titles and high-contrast Chrome tab group colors.
4. **Validation & Reconciliation**: Guardrails detect and prevent domain-based grouping or collapsed clusters, ensuring every open tab is accounted for.
5. **Review & Apply**: Edit titles or colors in the sidepanel diff preview, then click **Apply Groups**.

---

## Benchmark & Testing

Run the synthetic regression test suites:

```bash
node scripts/test-json-repair-and-fallback.mjs
node scripts/test-latency-profiles.mjs
node scripts/test-reconciliation-robustness.mjs
node scripts/test-sidepanel-profiles.mjs
```

Run the 150-tab benchmark against Ollama:
```bash
node scripts/benchmark-analysis-profiles.mjs fast qwen2.5:3b 150
```
