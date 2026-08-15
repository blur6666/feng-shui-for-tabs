// Shared Constants across Background, Content Scripts, and Sidepanel

export const CHROME_TAB_COLORS = [
  'grey',
  'blue',
  'red',
  'yellow',
  'green',
  'pink',
  'purple',
  'cyan',
  'orange'
];

export const PROVIDERS = {
  // Cloud Providers
  GEMINI: 'gemini',
  CLAUDE: 'claude',
  OPENAI: 'openai',
  OPENROUTER: 'openrouter',
  GROQ: 'groq',
  // Local Providers
  OLLAMA: 'ollama',
  GEMINI_NANO: 'gemini_nano',
  LM_STUDIO: 'lm_studio'
};

export const PROVIDER_METADATA = {
  [PROVIDERS.GEMINI]: {
    name: 'Google Gemini',
    type: 'cloud',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.0-flash',
    recommendedModels: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    keyUrl: 'https://aistudio.google.com/app/apikey',
    badge: 'Fast & Accurate'
  },
  [PROVIDERS.CLAUDE]: {
    name: 'Anthropic Claude',
    type: 'cloud',
    defaultEndpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-5-haiku-20241022',
    recommendedModels: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022'],
    keyUrl: 'https://console.anthropic.com/settings/keys',
    badge: 'High Reasoning'
  },
  [PROVIDERS.OPENAI]: {
    name: 'OpenAI',
    type: 'cloud',
    defaultEndpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    recommendedModels: ['gpt-4o-mini', 'gpt-4o'],
    keyUrl: 'https://platform.openai.com/api-keys',
    badge: 'Industry Standard'
  },
  [PROVIDERS.OPENROUTER]: {
    name: 'OpenRouter',
    type: 'cloud',
    defaultEndpoint: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    recommendedModels: [
      'meta-llama/llama-3.3-70b-instruct',
      'deepseek/deepseek-r1',
      'google/gemini-2.0-flash-001',
      'anthropic/claude-3.5-haiku',
      'qwen/qwen-2.5-72b-instruct'
    ],
    keyUrl: 'https://openrouter.ai/keys',
    badge: 'All Models'
  },
  [PROVIDERS.GROQ]: {
    name: 'Groq',
    type: 'cloud',
    defaultEndpoint: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    recommendedModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    keyUrl: 'https://console.groq.com/keys',
    badge: 'Ultra Fast (800 tok/s)'
  },
  [PROVIDERS.OLLAMA]: {
    name: 'Ollama',
    type: 'local',
    defaultEndpoint: 'http://localhost:11434',
    defaultModel: 'qwen2.5:3b',
    recommendedModels: ['qwen2.5:3b', 'llama3.2:3b', 'llama3.1:8b', 'phi3.5'],
    badge: '100% Private / Offline'
  },
  [PROVIDERS.GEMINI_NANO]: {
    name: 'Chrome Gemini Nano',
    type: 'local',
    badge: 'Built-in On-Device'
  },
  [PROVIDERS.LM_STUDIO]: {
    name: 'LM Studio / LocalAI',
    type: 'local',
    defaultEndpoint: 'http://localhost:1234',
    defaultModel: 'local-model',
    badge: 'Local OpenAI Server'
  }
};

export const DEFAULT_SETTINGS = {
  provider: '',
  // Cloud API Keys & Models
  gemini: {
    apiKey: '',
    model: 'gemini-2.0-flash'
  },
  claude: {
    apiKey: '',
    model: 'claude-3-5-haiku-20241022'
  },
  openai: {
    apiKey: '',
    model: 'gpt-4o-mini'
  },
  openrouter: {
    apiKey: '',
    model: 'meta-llama/llama-3.3-70b-instruct'
  },
  groq: {
    apiKey: '',
    model: 'llama-3.3-70b-versatile'
  },
  // Local Provider Settings
  ollama: {
    endpoint: 'http://localhost:11434',
    model: 'gemma4:12b',
    num_ctx: 32768,
    temperature: 0.2
  },
  geminiNano: {
    temperature: 0.2,
    topK: 3
  },
  lmStudio: {
    endpoint: 'http://localhost:1234',
    model: 'local-model',
    apiKey: '',
    temperature: 0.2
  },
  grouping: {
    scope: 'all_windows', // 'all_windows' | 'current_window'
    consolidation: 'in_place', // 'in_place' | 'consolidate_windows'
    targetGroupCount: 'auto',
    deduplication: true,
    extractReadability: true,
    maxTabsPerBatch: 120
  }
};

export const MESSAGE_TYPES = {
  // UI -> Service Worker
  ANALYZE_TABS: 'ANALYZE_TABS',
  APPLY_GROUPS: 'APPLY_GROUPS',
  UNDO_GROUPS: 'UNDO_GROUPS',
  GET_TABS_PREVIEW: 'GET_TABS_PREVIEW',
  CHECK_LLM_HEALTH: 'CHECK_LLM_HEALTH',
  CANCEL_ANALYSIS: 'CANCEL_ANALYSIS',

  // Service Worker -> UI (Streaming & Status)
  ANALYSIS_PROGRESS: 'ANALYSIS_PROGRESS',
  ANALYSIS_COMPLETE: 'ANALYSIS_COMPLETE',
  ANALYSIS_ERROR: 'ANALYSIS_ERROR',
  TAB_UPDATE_EVENT: 'TAB_UPDATE_EVENT'
};

/**
 * Canonical low-value / operational tab classifications shared by prompts, schemas, and local rules.
 */
export const JUNK_TYPES = Object.freeze([
  'new_tab',
  'extension',
  'internal',
  'error',
  'auth_or_transactional'
]);

export const JUNK_TYPE_LIST = JUNK_TYPES.map(type => `'${type}'`).join(', ');

export const LABELING_SYSTEM_PROMPT = `You are an expert semantic tab analyzer.
Your task is to analyze a batch of browser tabs and produce a concise semantic summary for each tab.

For each tab, output:
- id: integer tab ID
- subject: concise description of WHAT THE PAGE IS ABOUT (topic, project, product, problem). NEVER use the website or domain name.
- entity: primary named entity or product (e.g. 'Philips 5000 Air Fryer', 'Rust Compiler', 'Tokyo Hotel')
- intent: user goal (e.g. 'research', 'troubleshooting', 'shopping', 'reference')
- junkType: string if this is low-value/operational (one of ${JUNK_TYPE_LIST}) or null if valuable.

Return ONLY a valid JSON object with "tabs": [ ... ].`;

export const CLUSTERING_SYSTEM_PROMPT = `You are an expert browser productivity assistant.
Your goal is to synthesize semantic tab labels into clean, coherent, and actionable tab groups.

CRITICAL GROUPING & TAXONOMY RULES:
1. Group by SUBJECT / TASK, NOT by website/host.
   Worked Example: An r/airfryer discussion, an online air fryer product listing, and a video air fryer review belong in ONE group (e.g. 'Air Fryer'). Two unrelated Wikipedia articles belong in DIFFERENT groups based on their distinct topics.
2. Group titles MUST be <= 12 characters and 1-2 words. Abbreviate if needed (e.g. 'Air Fryer', 'Rust Bugs', 'Tokyo Trip', 'ML AirFryer').
3. Include a "label" property with the full unabbreviated topic name for tooltips (e.g. "Philips Air Fryer Research").
4. STRICTLY NO EMOJIS in group titles or labels.
5. Minimum 3 tabs per group. Never create 1 or 2 tab groups. Merge small topics into broader groups or 'Other'.
6. Every valid tab ID must appear in exactly one group.
7. Return ONLY a valid JSON object matching the JSON schema.`;

export const SYSTEM_PROMPT = CLUSTERING_SYSTEM_PROMPT;

export const LABELING_JSON_SCHEMA = {
  type: "object",
  properties: {
    tabs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          subject: { type: "string" },
          entity: { type: "string" },
          intent: { type: "string" },
          junkType: {
            oneOf: [
              { type: "string", enum: JUNK_TYPES },
              { type: "null" }
            ]
          }
        },
        required: ["id", "subject"]
      }
    }
  },
  required: ["tabs"]
};

export const JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "A brief summary of what the user is working on."
    },
    groups: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Concise group title <= 12 chars, e.g., 'Air Fryer' or 'Rust Dev'"
          },
          label: {
            type: "string",
            description: "Full descriptive topic label, e.g., 'Philips Air Fryer Research'"
          },
          color: {
            type: "string",
            enum: CHROME_TAB_COLORS
          },
          rationale: {
            type: "string",
            description: "Why these tabs belong together"
          },
          tabIds: {
            type: "array",
            items: { type: "integer" }
          },
          targetWindowId: {
            type: "integer"
          }
        },
        required: ["title", "label", "color", "rationale", "tabIds"]
      }
    },
    suggestedActions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["close_duplicate", "archive_stale", "pin_tab", "close_junk"]
          },
          tabId: { type: "integer" },
          reason: { type: "string" }
        },
        required: ["action", "tabId", "reason"]
      }
    }
  },
  required: ["groups"]
};

/**
 * Estimates token count from string content (rule of thumb: ~4 chars per token for Latin/JSON;
 * note that CJK/non-Latin scripts may have higher token density).
 */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
