/**
 * Unified Multi-Provider LLM Adapter
 * Supports Google Gemini, Anthropic Claude, OpenAI, OpenRouter, Groq, Ollama, Chrome Gemini Nano, and LM Studio.
 */

import { PROVIDERS, PROVIDER_METADATA, SYSTEM_PROMPT, estimateTokens } from '../shared/constants.js';

// Helper to extract clean JSON from LLM output (handles code fences, preamble, thought tags)
export function extractJsonFromResponse(rawText) {
  if (!rawText) throw new Error('Empty response received from LLM.');

  // Strip <think>...</think> tags if reasoning models like DeepSeek-R1 output thoughts
  const withoutThoughts = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Try direct parse
  try {
    return JSON.parse(withoutThoughts);
  } catch {
    // Continue
  }

  // Look for ```json ... ``` blocks
  const codeBlockMatch = withoutThoughts.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue
    }
  }

  // Find outermost curly braces
  const firstOpen = withoutThoughts.indexOf('{');
  const lastClose = withoutThoughts.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose > firstOpen) {
    const jsonCandidate = withoutThoughts.substring(firstOpen, lastClose + 1);
    try {
      return JSON.parse(jsonCandidate);
    } catch (err) {
      // Attempt common fixes: remove trailing commas before closing braces/brackets
      const cleaned = jsonCandidate
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '');
      try {
        return JSON.parse(cleaned);
      } catch {
        throw new Error(`Failed to parse LLM JSON output: ${err.message}`);
      }
    }
  }

  throw new Error('No valid JSON object found in LLM response.');
}

export class LLMAdapter {
  /**
   * Test connection to the selected LLM provider.
   */
  static async testConnection(settings) {
    const provider = settings.provider || PROVIDERS.OLLAMA;

    try {
      switch (provider) {
        case PROVIDERS.GEMINI: {
          const apiKey = settings.gemini?.apiKey;
          if (!apiKey) throw new Error('Please enter your Google Gemini API Key.');
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/v1/models`, {
            headers: { 'Authorization': `Bearer ${apiKey.trim()}` }
          });
          if (!res.ok) throw new Error(`Gemini API returned ${res.status}: ${res.statusText}`);
          return { success: true, provider, name: 'Google Gemini' };
        }

        case PROVIDERS.CLAUDE: {
          const apiKey = settings.claude?.apiKey;
          if (!apiKey) throw new Error('Please enter your Anthropic Claude API Key.');
          // Lightweight test prompt
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey.trim(),
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: settings.claude?.model || 'claude-3-5-haiku-20241022',
              max_tokens: 10,
              messages: [{ role: 'user', content: 'hi' }]
            })
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `Claude API returned ${res.status}`);
          }
          return { success: true, provider, name: 'Anthropic Claude' };
        }

        case PROVIDERS.OPENAI: {
          const apiKey = settings.openai?.apiKey;
          if (!apiKey) throw new Error('Please enter your OpenAI API Key.');
          const res = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey.trim()}` }
          });
          if (!res.ok) throw new Error(`OpenAI returned ${res.status}: ${res.statusText}`);
          return { success: true, provider, name: 'OpenAI' };
        }

        case PROVIDERS.OPENROUTER: {
          const apiKey = settings.openrouter?.apiKey;
          if (!apiKey) throw new Error('Please enter your OpenRouter API Key.');
          const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
            headers: { 'Authorization': `Bearer ${apiKey.trim()}` }
          });
          if (!res.ok) throw new Error(`OpenRouter returned ${res.status}: ${res.statusText}`);
          return { success: true, provider, name: 'OpenRouter' };
        }

        case PROVIDERS.GROQ: {
          const apiKey = settings.groq?.apiKey;
          if (!apiKey) throw new Error('Please enter your Groq API Key.');
          const res = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey.trim()}` }
          });
          if (!res.ok) throw new Error(`Groq returned ${res.status}: ${res.statusText}`);
          return { success: true, provider, name: 'Groq' };
        }

        case PROVIDERS.OLLAMA: {
          const endpoint = settings.ollama?.endpoint || 'http://localhost:11434';
          const res = await fetch(`${endpoint}/api/tags`);
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          const data = await res.json();
          const models = (data.models || []).map(m => m.name);
          return { success: true, models, provider: PROVIDERS.OLLAMA, name: 'Ollama' };
        }

        case PROVIDERS.GEMINI_NANO: {
          const aiObj = globalThis.ai || (typeof LanguageModel !== 'undefined' ? { languageModel: LanguageModel } : null);
          if (!aiObj || !aiObj.languageModel) {
            throw new Error('Chrome Built-in Prompt API is not available. Enable it in chrome://flags/#prompt-api-for-gemini-nano');
          }
          const capabilities = await aiObj.languageModel.capabilities();
          if (capabilities.available === 'no') {
            throw new Error('Gemini Nano is not ready on this device.');
          }
          return { success: true, provider: PROVIDERS.GEMINI_NANO, capabilities, name: 'Gemini Nano' };
        }

        case PROVIDERS.LM_STUDIO: {
          const endpoint = settings.lmStudio?.endpoint || 'http://localhost:1234';
          const apiKey = settings.lmStudio?.apiKey || '';
          const headers = {};
          if (apiKey && apiKey.trim()) headers['Authorization'] = `Bearer ${apiKey.trim()}`;
          const res = await fetch(`${endpoint.replace(/\/+$/, '')}/v1/models`, { headers });
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          const data = await res.json();
          const models = (data.data || []).map(m => m.id);
          return { success: true, models, provider: PROVIDERS.LM_STUDIO, name: 'LM Studio' };
        }

        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (err) {
      return { success: false, error: err.message, provider };
    }
  }

  /**
   * Generates tab grouping plan using the configured LLM provider.
   */
  static async generateGroupingPlan(prompt, settings, onTokenChunk = null, systemPrompt = SYSTEM_PROMPT) {
    const provider = settings.provider || PROVIDERS.OLLAMA;

    switch (provider) {
      case PROVIDERS.GEMINI:
        return this._callOpenAICompatible({
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
          model: settings.gemini?.model || 'gemini-2.0-flash',
          apiKey: settings.gemini?.apiKey,
          prompt,
          systemPrompt,
          onTokenChunk
        });

      case PROVIDERS.CLAUDE:
        return this._callAnthropic({
          model: settings.claude?.model || 'claude-3-5-haiku-20241022',
          apiKey: settings.claude?.apiKey,
          prompt,
          systemPrompt,
          onTokenChunk
        });

      case PROVIDERS.OPENAI:
        return this._callOpenAICompatible({
          endpoint: 'https://api.openai.com',
          model: settings.openai?.model || 'gpt-4o-mini',
          apiKey: settings.openai?.apiKey,
          prompt,
          systemPrompt,
          onTokenChunk
        });

      case PROVIDERS.OPENROUTER:
        return this._callOpenAICompatible({
          endpoint: 'https://openrouter.ai/api',
          model: settings.openrouter?.model || 'meta-llama/llama-3.3-70b-instruct',
          apiKey: settings.openrouter?.apiKey,
          headers: {
            'HTTP-Referer': 'https://tabintelligence.local',
            'X-Title': 'Tab Intelligence'
          },
          prompt,
          systemPrompt,
          onTokenChunk
        });

      case PROVIDERS.GROQ:
        return this._callOpenAICompatible({
          endpoint: 'https://api.groq.com/openai',
          model: settings.groq?.model || 'llama-3.3-70b-versatile',
          apiKey: settings.groq?.apiKey,
          prompt,
          systemPrompt,
          onTokenChunk
        });

      case PROVIDERS.OLLAMA:
        return this._callOllama(prompt, settings, onTokenChunk, systemPrompt);

      case PROVIDERS.GEMINI_NANO:
        return this._callGeminiNano(prompt, settings, onTokenChunk, systemPrompt);

      case PROVIDERS.LM_STUDIO:
        return this._callOpenAICompatible({
          endpoint: settings.lmStudio?.endpoint || 'http://localhost:1234',
          model: settings.lmStudio?.model || 'local-model',
          apiKey: settings.lmStudio?.apiKey,
          temperature: settings.lmStudio?.temperature ?? 0.2,
          prompt,
          systemPrompt,
          onTokenChunk
        });

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Anthropic Claude API streaming implementation
   */
  static async _callAnthropic({ model, apiKey, prompt, systemPrompt, onTokenChunk }) {
    if (!apiKey || !apiKey.trim()) {
      throw new Error('Anthropic Claude API Key is required. Please set it in Settings.');
    }

    const payload = {
      model,
      max_tokens: 4096,
      system: systemPrompt || SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      stream: true
    };

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Claude API error (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === 'content_block_delta' && data.delta?.text) {
              accumulatedText += data.delta.text;
              if (onTokenChunk) onTokenChunk(data.delta.text, accumulatedText);
            }
          } catch {
            // Incomplete JSON chunk
          }
        }
      }
    }

    return extractJsonFromResponse(accumulatedText);
  }

  /**
   * Universal OpenAI-compatible API streaming implementation
   */
  static async _callOpenAICompatible({ endpoint, model, apiKey, headers = {}, temperature = 0.2, prompt, systemPrompt, onTokenChunk }) {
    const payload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt || SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature,
      stream: true,
      response_format: { type: 'json_object' }
    };

    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    if (apiKey && apiKey.trim()) {
      requestHeaders['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const baseUrl = endpoint.replace(/\/+$/, '');
    const url = baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

    const res = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`LLM API error (${res.status}): ${errText || res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const delta = data.choices?.[0]?.delta?.content || '';
            if (delta) {
              accumulatedText += delta;
              if (onTokenChunk) onTokenChunk(delta, accumulatedText);
            }
          } catch {
            // Incomplete line chunk
          }
        }
      }
    }

    return extractJsonFromResponse(accumulatedText);
  }

  /**
   * Ollama implementation
   */
  static async _callOllama(prompt, settings, onTokenChunk, systemPrompt = SYSTEM_PROMPT) {
    const endpoint = settings.ollama?.endpoint || 'http://localhost:11434';
    const model = settings.ollama?.model || 'gemma4:12b';
    const temperature = settings.ollama?.temperature ?? 0.2;
    const num_ctx = Number(settings.ollama?.num_ctx) || 32768;
    const activeSystemPrompt = systemPrompt || SYSTEM_PROMPT;

    // Token budgeting check before dispatch
    const totalPromptText = (prompt || '') + '\n' + (activeSystemPrompt || '');
    const estimatedTokens = estimateTokens(totalPromptText);
    if (estimatedTokens > num_ctx) {
      throw new Error(`Context budget exceeded: Estimated ${estimatedTokens} tokens exceeds configured Ollama context window (num_ctx: ${num_ctx}). Please increase num_ctx in Settings or reduce batch size.`);
    }

    const payload = {
      model,
      prompt,
      system: activeSystemPrompt,
      format: 'json',
      stream: true,
      options: {
        temperature,
        num_ctx
      }
    };

    const res = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (res.status === 403) {
        throw new Error(`Ollama 403 Forbidden: Ollama blocked the browser origin. Reload the extension in chrome://extensions, or set OLLAMA_ORIGINS="*" in Windows environment variables and restart Ollama.`);
      }
      throw new Error(`Ollama error (${res.status}): ${errText || res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.trim().length > 0);

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            accumulatedText += parsed.response;
            if (onTokenChunk) onTokenChunk(parsed.response, accumulatedText);
          }
        } catch {
          // Incomplete line
        }
      }
    }

    return extractJsonFromResponse(accumulatedText);
  }

  /**
   * Chrome Built-in Prompt API (Gemini Nano) implementation
   */
  static async _callGeminiNano(prompt, settings, onTokenChunk) {
    const aiObj = globalThis.ai || (typeof LanguageModel !== 'undefined' ? { languageModel: LanguageModel } : null);
    if (!aiObj || !aiObj.languageModel) {
      throw new Error('Chrome Built-in Prompt API is not supported in this Chrome browser instance.');
    }

    const session = await aiObj.languageModel.create({
      systemPrompt: SYSTEM_PROMPT,
      temperature: settings.geminiNano?.temperature ?? 0.2,
      topK: settings.geminiNano?.topK ?? 3
    });

    try {
      const stream = session.promptStreaming(prompt);
      let accumulatedText = '';
      let previousLength = 0;

      for await (const chunk of stream) {
        accumulatedText = chunk;
        const newDelta = chunk.slice(previousLength);
        previousLength = chunk.length;
        if (onTokenChunk && newDelta) {
          onTokenChunk(newDelta, accumulatedText);
        }
      }

      return extractJsonFromResponse(accumulatedText);
    } finally {
      if (session && typeof session.destroy === 'function') {
        session.destroy();
      }
    }
  }
}
