import OpenAI from 'openai';

// Cache OpenAI client and parsed model map to avoid re-creation per request
let cachedClient = null;
let cachedApiKey = null;
let cachedModelMap = null;
let cachedModelMapRaw = null;

export function getOpenAIClient(env) {
  if (cachedClient && cachedApiKey === env.OPENAI_API_KEY) {
    return cachedClient;
  }
  cachedApiKey = env.OPENAI_API_KEY;
  cachedClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return cachedClient;
}

export function mapModel(claudeModel, env) {
  const raw = env.MODEL_MAP || '';
  if (raw !== cachedModelMapRaw) {
    cachedModelMapRaw = raw;
    cachedModelMap = Object.fromEntries(
      raw.split(',').filter(Boolean).map((p) => {
        const trimmed = p.trim();
        const idx = trimmed.indexOf(':');
        return idx > 0 ? [trimmed.slice(0, idx), trimmed.slice(idx + 1)] : [trimmed, trimmed];
      })
    );
  }
  return cachedModelMap[claudeModel] || claudeModel;
}
