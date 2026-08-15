/**
 * Unified Multi-Provider LLM Adapter
 * Supports Google Gemini, Anthropic Claude, OpenAI, OpenRouter, Groq, Ollama, Chrome Gemini Nano, and LM Studio.
 */

import { PROVIDERS, SYSTEM_PROMPT, estimateTokens } from '../shared/constants.js';

const NANOSECONDS_PER_MILLISECOND = 1_000_000;
const NANOSECONDS_PER_SECOND = 1_000_000_000;

function nowMs() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function positiveNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function millisecondsFromNanoseconds(value) {
  const nanoseconds = Number(value);
  return Number.isFinite(nanoseconds) && nanoseconds >= 0
    ? Math.round(nanoseconds / NANOSECONDS_PER_MILLISECOND)
    : null;
}

function tokensPerSecond(count, durationNanoseconds) {
  const tokens = Number(count);
  const duration = Number(durationNanoseconds);
  if (!Number.isFinite(tokens) || !Number.isFinite(duration) || duration <= 0) return null;
  return Number((tokens / (duration / NANOSECONDS_PER_SECOND)).toFixed(2));
}

function requestLabel(options = {}) {
  const phase = options.phase || 'analysis';
  const batch = options.batchIndex ? ` batch ${options.batchIndex}${options.totalBatches ? `/${options.totalBatches}` : ''}` : '';
  return `${phase}${batch}`;
}

function normalizeRequestOptions(onTokenChunkOrOptions, systemPrompt, legacyOptions = {}) {
  if (onTokenChunkOrOptions && typeof onTokenChunkOrOptions === 'object' && !Array.isArray(onTokenChunkOrOptions)) {
    return {
      stream: true,
      systemPrompt: SYSTEM_PROMPT,
      ...onTokenChunkOrOptions
    };
  }

  return {
    stream: true,
    systemPrompt: systemPrompt || SYSTEM_PROMPT,
    ...legacyOptions,
    onTokenChunk: typeof onTokenChunkOrOptions === 'function' ? onTokenChunkOrOptions : null
  };
}

/**
 * Gives every request a caller-controlled cancellation signal plus total and
 * inactivity deadlines. Timers are always cleaned up by the caller.
 */
function createRequestControl(options = {}) {
  const controller = new AbortController();
  const timeoutMs = positiveNumber(options.timeoutMs);
  const stallTimeoutMs = positiveNumber(options.stallTimeoutMs);
  let totalTimer = null;
  let stallTimer = null;
  let abortMessage = '';

  const abort = (message) => {
    if (controller.signal.aborted) return;
    abortMessage = message;
    controller.abort(new Error(message));
  };

  const externalSignal = options.signal;
  const onExternalAbort = () => {
    const reason = externalSignal?.reason;
    abort(reason?.message || `Analysis cancelled during ${requestLabel(options)}.`);
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      onExternalAbort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  if (timeoutMs) {
    totalTimer = setTimeout(() => {
      abort(`${requestLabel(options)} exceeded its ${Math.round(timeoutMs / 1000)}s request deadline.`);
    }, timeoutMs);
  }

  const touch = () => {
    if (!stallTimeoutMs || controller.signal.aborted) return;
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      abort(`${requestLabel(options)} produced no response activity for ${Math.round(stallTimeoutMs / 1000)}s.`);
    }, stallTimeoutMs);
  };

  touch();

  return {
    signal: controller.signal,
    touch,
    get abortMessage() {
      return abortMessage;
    },
    cleanup() {
      if (totalTimer) clearTimeout(totalTimer);
      if (stallTimer) clearTimeout(stallTimer);
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
    }
  };
}

function normalizeAbortError(error, control, options) {
  if (control?.signal?.aborted) {
    return new Error(control.abortMessage || error?.message || `Analysis cancelled during ${requestLabel(options)}.`);
  }
  return error;
}

function makeResult(value, provider, startedAt, options, extraMetrics = {}) {
  const metrics = {
    provider,
    phase: options.phase || 'analysis',
    batchIndex: options.batchIndex || null,
    totalBatches: options.totalBatches || null,
    attempt: options.attempt || 1,
    elapsedMs: Math.round(nowMs() - startedAt),
    ...extraMetrics
  };

  if (typeof options.onMetrics === 'function') {
    options.onMetrics(metrics);
  }

  return { value, metrics };
}

function parseOllamaMetrics(record = {}) {
  return {
    totalDurationMs: millisecondsFromNanoseconds(record.total_duration),
    loadDurationMs: millisecondsFromNanoseconds(record.load_duration),
    promptEvalCount: Number.isFinite(Number(record.prompt_eval_count)) ? Number(record.prompt_eval_count) : null,
    promptEvalDurationMs: millisecondsFromNanoseconds(record.prompt_eval_duration),
    promptTokensPerSecond: tokensPerSecond(record.prompt_eval_count, record.prompt_eval_duration),
    evalCount: Number.isFinite(Number(record.eval_count)) ? Number(record.eval_count) : null,
    evalDurationMs: millisecondsFromNanoseconds(record.eval_duration),
    outputTokensPerSecond: tokensPerSecond(record.eval_count, record.eval_duration)
  };
}

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
          const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey.trim()}` }
          });
          if (!res.ok) throw new Error(`Gemini API returned ${res.status}: ${res.statusText}`);
          return { success: true, provider, name: 'Google Gemini' };
        }

        case PROVIDERS.CLAUDE: {
          const apiKey = settings.claude?.apiKey;
          if (!apiKey) throw new Error('Please enter your Anthropic Claude API Key.');
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
          const models = (data.models || []).map(model => model.name);
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
          const models = (data.data || []).map(model => model.id);
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
   * Generates structured data using the configured LLM provider.
   *
   * New callers pass a request-options object as the third argument. The
   * legacy positional callback/system-prompt form remains supported while the
   * pipeline is migrated.
   */
  static async generateGroupingPlan(prompt, settings, onTokenChunkOrOptions = null, systemPrompt = SYSTEM_PROMPT, legacyOptions = {}) {
    const options = normalizeRequestOptions(onTokenChunkOrOptions, systemPrompt, legacyOptions);
    const provider = settings.provider || PROVIDERS.OLLAMA;

    switch (provider) {
      case PROVIDERS.GEMINI:
        return this._callOpenAICompatible({
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
          model: settings.gemini?.model || 'gemini-2.0-flash',
          apiKey: settings.gemini?.apiKey,
          prompt,
          options
        });

      case PROVIDERS.CLAUDE:
        return this._callAnthropic({
          model: settings.claude?.model || 'claude-3-5-haiku-20241022',
          apiKey: settings.claude?.apiKey,
          prompt,
          options
        });

      case PROVIDERS.OPENAI:
        return this._callOpenAICompatible({
          endpoint: 'https://api.openai.com',
          model: settings.openai?.model || 'gpt-4o-mini',
          apiKey: settings.openai?.apiKey,
          prompt,
          options
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
          options
        });

      case PROVIDERS.GROQ:
        return this._callOpenAICompatible({
          endpoint: 'https://api.groq.com/openai',
          model: settings.groq?.model || 'llama-3.3-70b-versatile',
          apiKey: settings.groq?.apiKey,
          prompt,
          options
        });

      case PROVIDERS.OLLAMA:
        return this._callOllama({ prompt, settings, options });

      case PROVIDERS.GEMINI_NANO:
        return this._callGeminiNano({ prompt, settings, options });

      case PROVIDERS.LM_STUDIO:
        return this._callOpenAICompatible({
          endpoint: settings.lmStudio?.endpoint || 'http://localhost:1234',
          model: settings.lmStudio?.model || 'local-model',
          apiKey: settings.lmStudio?.apiKey,
          temperature: settings.lmStudio?.temperature ?? 0.2,
          prompt,
          options
        });

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Best-effort Ollama model preload. It is intentionally isolated from the
   * analysis result because a warm-up failure should not hide a usable model.
   */
  static async warmOllama(settings, options = {}) {
    const endpoint = settings.ollama?.endpoint || 'http://localhost:11434';
    const model = settings.ollama?.model || 'gemma4:12b';
    const control = createRequestControl({ ...options, phase: options.phase || 'warming' });
    const startedAt = nowMs();

    try {
      const res = await fetch(`${endpoint.replace(/\/+$/, '')}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: control.signal,
        body: JSON.stringify({
          model,
          prompt: '',
          stream: false,
          keep_alive: options.keepAlive || '10m',
          options: positiveNumber(options.numCtx) ? { num_ctx: positiveNumber(options.numCtx) } : undefined
        })
      });
      control.touch();
      if (!res.ok) throw new Error(`Ollama warm-up error (${res.status}).`);
      const data = await res.json().catch(() => ({}));
      return makeResult(true, PROVIDERS.OLLAMA, startedAt, options, parseOllamaMetrics(data));
    } catch (err) {
      throw normalizeAbortError(err, control, options);
    } finally {
      control.cleanup();
    }
  }

  /**
   * Anthropic Claude implementation.
   */
  static async _callAnthropic({ model, apiKey, prompt, options }) {
    if (!apiKey || !apiKey.trim()) {
      throw new Error('Anthropic Claude API Key is required. Please set it in Settings.');
    }

    const startedAt = nowMs();
    const control = createRequestControl(options);
    const shouldStream = options.stream !== false;
    const payload = {
      model,
      max_tokens: positiveNumber(options.numPredict, 4096),
      system: options.systemPrompt || SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      stream: shouldStream
    };

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json'
        },
        signal: control.signal,
        body: JSON.stringify(payload)
      });
      control.touch();

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Claude API error (${res.status})`);
      }

      if (!shouldStream) {
        const data = await res.json();
        const text = (data.content || []).map(part => part.text || '').join('');
        return makeResult(extractJsonFromResponse(text), PROVIDERS.CLAUDE, startedAt, options, {
          promptEvalCount: data.usage?.input_tokens ?? null,
          evalCount: data.usage?.output_tokens ?? null
        });
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Claude returned an empty response stream.');
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        control.touch();
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === 'content_block_delta' && data.delta?.text) {
              accumulatedText += data.delta.text;
              options.onTokenChunk?.(data.delta.text, accumulatedText);
            }
          } catch {
            // Ignore incomplete SSE event payloads.
          }
        }
      }

      return makeResult(extractJsonFromResponse(accumulatedText), PROVIDERS.CLAUDE, startedAt, options);
    } catch (err) {
      throw normalizeAbortError(err, control, options);
    } finally {
      control.cleanup();
    }
  }

  /**
   * Universal OpenAI-compatible API implementation.
   */
  static async _callOpenAICompatible({ endpoint, model, apiKey, headers = {}, temperature = 0.2, prompt, options }) {
    const startedAt = nowMs();
    const control = createRequestControl(options);
    const shouldStream = options.stream !== false;
    const payload = {
      model,
      messages: [
        { role: 'system', content: options.systemPrompt || SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature,
      stream: shouldStream,
      response_format: { type: 'json_object' }
    };

    if (positiveNumber(options.numPredict)) payload.max_tokens = positiveNumber(options.numPredict);

    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (apiKey && apiKey.trim()) requestHeaders.Authorization = `Bearer ${apiKey.trim()}`;

    const baseUrl = endpoint.replace(/\/+$/, '');
    const url = baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        signal: control.signal,
        body: JSON.stringify(payload)
      });
      control.touch();

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`LLM API error (${res.status}): ${errText || res.statusText}`);
      }

      if (!shouldStream) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        return makeResult(extractJsonFromResponse(text), 'openai-compatible', startedAt, options, {
          promptEvalCount: data.usage?.prompt_tokens ?? null,
          evalCount: data.usage?.completion_tokens ?? null
        });
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('LLM API returned an empty response stream.');
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        control.touch();
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(trimmed.slice(6));
            const delta = data.choices?.[0]?.delta?.content || '';
            if (delta) {
              accumulatedText += delta;
              options.onTokenChunk?.(delta, accumulatedText);
            }
          } catch {
            // Ignore incomplete SSE event payloads.
          }
        }
      }

      return makeResult(extractJsonFromResponse(accumulatedText), 'openai-compatible', startedAt, options);
    } catch (err) {
      throw normalizeAbortError(err, control, options);
    } finally {
      control.cleanup();
    }
  }

  /**
   * Ollama implementation with metrics-aware final records and robust NDJSON
   * buffering across arbitrary network chunks.
   */
  static async _callOllama({ prompt, settings, options }) {
    const endpoint = settings.ollama?.endpoint || 'http://localhost:11434';
    const model = settings.ollama?.model || 'gemma4:12b';
    const temperature = settings.ollama?.temperature ?? 0.2;
    const configuredContext = Number(settings.ollama?.num_ctx) || 32768;
    const numCtx = positiveNumber(options.numCtx, configuredContext);
    const activeSystemPrompt = options.systemPrompt || SYSTEM_PROMPT;
    const outputReserve = positiveNumber(options.outputReserve, positiveNumber(options.numPredict));
    const estimatedTokens = estimateTokens(`${prompt || ''}\n${activeSystemPrompt || ''}`);

    if (estimatedTokens + outputReserve > numCtx) {
      throw new Error(
        `Context budget exceeded during ${requestLabel(options)}: estimated ${estimatedTokens} prompt tokens plus ${outputReserve} reserved output tokens exceeds num_ctx ${numCtx}. Reduce the batch or context requirements.`
      );
    }

    const startedAt = nowMs();
    const control = createRequestControl(options);
    const shouldStream = options.stream !== false;
    const payload = {
      model,
      prompt,
      system: activeSystemPrompt,
      format: options.responseSchema || 'json',
      stream: shouldStream,
      options: {
        temperature,
        num_ctx: numCtx
      }
    };

    if (positiveNumber(options.numPredict)) payload.options.num_predict = positiveNumber(options.numPredict);
    if (options.keepAlive) payload.keep_alive = options.keepAlive;

    try {
      const res = await fetch(`${endpoint.replace(/\/+$/, '')}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: control.signal,
        body: JSON.stringify(payload)
      });
      control.touch();

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        if (res.status === 403) {
          throw new Error('Ollama 403 Forbidden: Ollama blocked the browser origin. Reload the extension in chrome://extensions, or set OLLAMA_ORIGINS="*" in Windows environment variables and restart Ollama.');
        }
        throw new Error(`Ollama error (${res.status}): ${errText || res.statusText}`);
      }

      if (!shouldStream) {
        const record = await res.json();
        control.touch();
        return makeResult(extractJsonFromResponse(record.response || ''), PROVIDERS.OLLAMA, startedAt, options, {
          ...parseOllamaMetrics(record),
          estimatedPromptTokens: estimatedTokens,
          effectiveNumCtx: numCtx,
          model
        });
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Ollama returned an empty response stream.');
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let lineBuffer = '';
      let finalRecord = null;

      const consumeLine = (line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        let record;
        try {
          record = JSON.parse(trimmed);
        } catch {
          return;
        }
        if (record.response) {
          accumulatedText += record.response;
          options.onTokenChunk?.(record.response, accumulatedText);
        }
        if (record.done || record.total_duration !== undefined) finalRecord = record;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        control.touch();
        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split(/\r?\n/);
        lineBuffer = lines.pop() || '';
        lines.forEach(consumeLine);
      }

      lineBuffer += decoder.decode();
      if (lineBuffer.trim()) consumeLine(lineBuffer);

      return makeResult(extractJsonFromResponse(accumulatedText), PROVIDERS.OLLAMA, startedAt, options, {
        ...parseOllamaMetrics(finalRecord || {}),
        estimatedPromptTokens: estimatedTokens,
        effectiveNumCtx: numCtx,
        model
      });
    } catch (err) {
      throw normalizeAbortError(err, control, options);
    } finally {
      control.cleanup();
    }
  }

  /**
   * Chrome Built-in Prompt API implementation.
   */
  static async _callGeminiNano({ prompt, settings, options }) {
    const aiObj = globalThis.ai || (typeof LanguageModel !== 'undefined' ? { languageModel: LanguageModel } : null);
    if (!aiObj || !aiObj.languageModel) {
      throw new Error('Chrome Built-in Prompt API is not supported in this Chrome browser instance.');
    }

    const startedAt = nowMs();
    const control = createRequestControl(options);
    const session = await aiObj.languageModel.create({
      systemPrompt: options.systemPrompt || SYSTEM_PROMPT,
      temperature: settings.geminiNano?.temperature ?? 0.2,
      topK: settings.geminiNano?.topK ?? 3
    });
    const destroyOnAbort = () => session?.destroy?.();
    control.signal.addEventListener('abort', destroyOnAbort, { once: true });

    try {
      const stream = session.promptStreaming(prompt);
      let accumulatedText = '';
      let previousLength = 0;

      for await (const chunk of stream) {
        control.touch();
        accumulatedText = chunk;
        const newDelta = chunk.slice(previousLength);
        previousLength = chunk.length;
        if (newDelta) options.onTokenChunk?.(newDelta, accumulatedText);
      }

      return makeResult(extractJsonFromResponse(accumulatedText), PROVIDERS.GEMINI_NANO, startedAt, options);
    } catch (err) {
      throw normalizeAbortError(err, control, options);
    } finally {
      control.signal.removeEventListener('abort', destroyOnAbort);
      control.cleanup();
      if (session && typeof session.destroy === 'function') session.destroy();
    }
  }
}
