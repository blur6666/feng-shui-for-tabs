# Cloud LLM Setup Guide

Feng Shui for Tabs supports high-performance cloud LLM providers as well as completely offline local AI.

---

## ⚡ Provider Comparison

| Provider | Recommended Model | Context | Free Tier? | Best For |
|---|---|---|---|---|
| **Google Gemini** | `gemini-2.0-flash` | 1M+ tokens | ✅ Free via AI Studio | Accurate semantic grouping & massive tab sets |
| **Anthropic Claude** | `claude-3-5-haiku-20241022` | 200k tokens | ❌ Prepaid API | Nuanced categorizations & clean logic |
| **OpenAI** | `gpt-4o-mini` | 128k tokens | ❌ Prepaid API | Stable industry benchmark |
| **Groq** | `llama-3.3-70b-versatile` | 128k tokens | ✅ Free Tier | Instantaneous sub-second results |
| **OpenRouter** | `meta-llama/llama-3.3-70b-instruct` | Up to 1M | ✅ Free & Paid Models | Access to 200+ models with one API key |
| **Ollama (Local)** | `qwen2.5:3b` | Up to 128k tokens | ✅ 100% Free | Total privacy, 0 data leaves PC |

---

## 🛠️ Step-by-Step API Key Setup

### 1. Google Gemini (Recommended — Free & Fast)
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and sign in.
2. Click **Get API key** $\rightarrow$ **Create API key**.
3. In Feng Shui for Tabs Settings:
   - Select **Google Gemini (Flash)**.
   - Paste your API key (`AIzaSy...`).
   - Default model: `gemini-2.0-flash` (or `gemini-2.5-flash`).

---

### 2. Anthropic Claude (Top-tier Reasoning)
1. Go to [Anthropic Console](https://console.anthropic.com/settings/keys).
2. Click **Create Key** and copy your key (`sk-ant-api03-...`).
3. In Feng Shui for Tabs Settings:
   - Select **Anthropic Claude**.
   - Paste your API key.
   - Default model: `claude-3-5-haiku-20241022` (or `claude-3-5-sonnet-20241022`).

---

### 3. OpenAI
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys).
2. Create a new secret key (`sk-proj-...`).
3. In Feng Shui for Tabs Settings:
   - Select **OpenAI**.
   - Paste your key.
   - Default model: `gpt-4o-mini` (or `gpt-4o`).

---

### 4. OpenRouter (Access to DeepSeek-R1, Llama 3.3, Mistral, Qwen)
1. Go to [OpenRouter Keys](https://openrouter.ai/keys).
2. Create an API key (`sk-or-v1-...`).
3. In Feng Shui for Tabs Settings:
   - Select **OpenRouter**.
   - Paste your key.
   - Enter model ID: e.g., `meta-llama/llama-3.3-70b-instruct` or `deepseek/deepseek-r1`.

---

### 5. Groq (Ultra-Fast — Free)
1. Go to [Groq Console](https://console.groq.com/keys) and create a free account.
2. Click **Create API Key** and copy it (`gsk_...`).
3. In Feng Shui for Tabs Settings:
   - Select **Groq**.
   - Paste your key.
   - Default model: `llama-3.3-70b-versatile` or `llama-3.1-8b-instant`.

---

## 🔒 Privacy Reminder
- When using **Cloud Providers (Gemini, Claude, OpenAI, OpenRouter, Groq)**, tab titles, domain names, and page outlines are sent over encrypted HTTPS directly to the chosen provider.
- When using **Local AI (Ollama, Gemini Nano)**, 100% of data processing stays entirely on your computer.
- Tabs matching your **Privacy Shield** rules are never sent to any LLM.
