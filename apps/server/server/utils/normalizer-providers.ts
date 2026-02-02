import type {
  NormalizeRequest,
  NormalizedResult,
  NormalizedCondition,
  ConditionGrade,
  FunctionalState,
} from '@auction-comparator/shared';
import { generateNormalizeCacheKey } from './normalizer-heuristic';
import {
  getDeterministicHints,
  parseCapacityToGb,
  resolveFunctionalState,
  resolveConditionGrade,
  computeSignatures,
  normalizeBrand,
  normalizeModel,
} from './canonicalizer';

/**
 * Interface for AI normalization providers
 */
export interface ITextNormalizer {
  /** Provider identifier */
  id: string;
  /** Check if provider is available (API key configured) */
  isAvailable(): boolean;
  /** Normalize auction title using AI */
  normalize(request: NormalizeRequest): Promise<NormalizedResult>;
}

/**
 * System prompt for AI normalization
 */
const SYSTEM_PROMPT = `You are a product title normalizer for auction listings. Your job is to clean up auction titles and extract structured product information.

RULES:
1. Remove auction boilerplate (lot numbers, reference codes, condition descriptions)
2. Identify the brand, model, and product reference
3. Detect if this is an accessory vs the main product
4. Generate a clean search query for finding the same product online
5. Return ONLY valid JSON, no explanations
6. NEVER extract or infer prices - only extract metadata about the product

IMPORTANT:
- If you can't determine a field, use null
- condition: "new", "used", or "unknown" (refurbished counts as "used")
- functional_state: "ok" if working, "broken" if for parts/not working, "unknown" if uncertain
- capacity_gb: storage/memory in GB as integer (e.g., 256 for 256GB), null if not applicable
- Confidence should be 0.0 to 1.0 based on how certain you are
- altQueries should have max 2 alternative search queries
- isAccessory = true if it's a case, cable, charger, etc. rather than the main device
- category: "product" or "vehicle"`;

/**
 * Build user prompt for normalization
 */
function buildUserPrompt(request: NormalizeRequest): string {
  // Get deterministic hints to pass to AI
  const hints = request.hints || getDeterministicHints(request.rawTitle);

  let prompt = 'Normalize this auction title and return JSON:\n\nTitle: "' + request.rawTitle + '"\nSite: ' + request.siteDomain + '\nLocale: ' + request.locale;

  if (request.brandHint) {
    prompt += '\nBrand hint: ' + request.brandHint;
  }
  if (request.modelHint) {
    prompt += '\nModel hint: ' + request.modelHint;
  }
  if (request.categoryHint) {
    prompt += '\nCategory: ' + request.categoryHint;
  }

  // Add deterministic hints
  if (hints.brokenIndicators.length > 0) {
    prompt += '\nBroken/parts indicators detected: ' + hints.brokenIndicators.join(', ');
  }
  if (hints.conditionIndicators.length > 0) {
    prompt += '\nCondition indicators detected: ' + hints.conditionIndicators.join(', ');
  }

  prompt += `

Respond with JSON only:
{
  "normalizedTitle": "cleaned title",
  "brand": "brand or null",
  "model": "model or null",
  "reference": "SKU/ref or null",
  "capacity": "size/capacity string or null",
  "capacity_gb": integer GB or null,
  "condition": "new|used|unknown",
  "functional_state": "ok|broken|unknown",
  "category": "product|vehicle",
  "isAccessory": true/false,
  "query": "main search query",
  "altQueries": ["alt query 1", "alt query 2"],
  "confidence": 0.0-1.0
}`;

  return prompt;
}

/**
 * Validate and parse AI response
 */
function parseAIResponse(text: string, request: NormalizeRequest): NormalizedResult {
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch && jsonMatch[1]) {
    jsonStr = jsonMatch[1].trim();
  }

  // Parse JSON
  const data = JSON.parse(jsonStr);

  // Validate required fields
  if (typeof data.normalizedTitle !== 'string' || !data.normalizedTitle) {
    throw new Error('Missing normalizedTitle');
  }
  if (typeof data.query !== 'string' || !data.query) {
    throw new Error('Missing query');
  }

  // Normalize condition (legacy field)
  const validConditions: NormalizedCondition[] = ['new', 'used', 'refurbished', 'unknown'];
  const condition: NormalizedCondition = validConditions.includes(data.condition)
    ? data.condition
    : 'unknown';

  // Ensure altQueries is array
  const altQueries = Array.isArray(data.altQueries)
    ? data.altQueries.filter((q: any) => typeof q === 'string').slice(0, 2)
    : [];

  // Ensure confidence is valid
  let confidence = typeof data.confidence === 'number' ? data.confidence : 0.5;
  confidence = Math.max(0, Math.min(1, confidence));

  // Get deterministic hints
  const hints = request.hints || getDeterministicHints(request.rawTitle);

  // Parse AI's functional_state
  const validFunctionalStates: FunctionalState[] = ['ok', 'broken', 'unknown'];
  const aiFunctionalState: FunctionalState = validFunctionalStates.includes(data.functional_state)
    ? data.functional_state
    : 'unknown';

  // Resolve functional state (deterministic takes precedence)
  const functional_state = resolveFunctionalState(hints, aiFunctionalState);

  // Parse AI's condition grade
  const validConditionGrades: ConditionGrade[] = ['new', 'used', 'unknown'];
  const aiConditionGrade: ConditionGrade = validConditionGrades.includes(data.condition)
    ? (data.condition === 'refurbished' ? 'used' : data.condition)
    : 'unknown';

  // Resolve condition grade
  const conditionResult = resolveConditionGrade(hints, aiConditionGrade);
  const condition_grade = conditionResult.grade;
  const conditionConfidence = conditionResult.confidence;

  // Parse capacity_gb
  let capacity_gb: number | null = null;
  if (typeof data.capacity_gb === 'number' && data.capacity_gb > 0) {
    capacity_gb = Math.round(data.capacity_gb);
  } else {
    // Try to parse from capacity string or title
    capacity_gb = parseCapacityToGb(data.capacity || request.rawTitle);
  }

  // Normalize brand and model
  const brand = normalizeBrand(data.brand ? String(data.brand) : null);
  const model = normalizeModel(data.model ? String(data.model) : null);

  // Compute signatures
  const locale = request.locale || 'fr';
  const signatures = computeSignatures(
    brand,
    model,
    data.reference ? String(data.reference) : null,
    capacity_gb,
    functional_state,
    condition_grade,
    locale
  );

  // Parse category
  const category = data.category === 'vehicle' ? 'vehicle' : (request.categoryHint || 'product');

  return {
    normalizedTitle: String(data.normalizedTitle),
    brand,
    model,
    reference: data.reference ? String(data.reference) : null,
    capacity: data.capacity ? String(data.capacity) : null,
    capacity_gb,
    condition,
    condition_grade,
    functional_state,
    isAccessory: Boolean(data.isAccessory),
    category,
    query: String(data.query),
    altQueries,
    confidence,
    conditionConfidence,
    usedAI: true,
    cacheKey: generateNormalizeCacheKey(request),
    hints,
    signatures,
  };
}

/**
 * Anthropic Claude provider
 */
export class AnthropicNormalizer implements ITextNormalizer {
  id = 'anthropic';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'claude-3-haiku-20240307') {
    this.apiKey = apiKey;
    this.model = model;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async normalize(request: NormalizeRequest): Promise<NormalizedResult> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: buildUserPrompt(request) }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error('Anthropic API error: ' + response.status + ' - ' + error);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;

    if (!text) {
      throw new Error('Empty response from Anthropic');
    }

    return parseAIResponse(text, request);
  }
}

/**
 * OpenAI provider
 */
export class OpenAINormalizer implements ITextNormalizer {
  id = 'openai';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async normalize(request: NormalizeRequest): Promise<NormalizedResult> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.apiKey,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(request) }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error('OpenAI API error: ' + response.status + ' - ' + error);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('Empty response from OpenAI');
    }

    return parseAIResponse(text, request);
  }
}

/**
 * Ollama provider (local)
 */
export class OllamaNormalizer implements ITextNormalizer {
  id = 'ollama';
  private baseUrl: string;
  private model: string;

  constructor(baseUrl = 'http://localhost:11434', model = 'llama3.2') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  isAvailable(): boolean {
    return true;
  }

  async normalize(request: NormalizeRequest): Promise<NormalizedResult> {
    const response = await fetch(this.baseUrl + '/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt: SYSTEM_PROMPT + '\n\n' + buildUserPrompt(request),
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error('Ollama API error: ' + response.status + ' - ' + error);
    }

    const data = await response.json();
    const text = data.response;

    if (!text) {
      throw new Error('Empty response from Ollama');
    }

    return parseAIResponse(text, request);
  }
}

/**
 * Get the configured normalizer provider
 */
export function getNormalizerProvider(): ITextNormalizer | null {
  const config = useRuntimeConfig();

  const provider = config.normalizerProvider || process.env.NORMALIZER_PROVIDER;

  switch (provider?.toLowerCase()) {
    case 'anthropic': {
      const anthropicKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
      if (anthropicKey) {
        return new AnthropicNormalizer(anthropicKey, config.anthropicModel);
      }
      break;
    }
    case 'openai': {
      const openaiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
      if (openaiKey) {
        return new OpenAINormalizer(openaiKey, config.openaiModel);
      }
      break;
    }
    case 'ollama': {
      const ollamaUrl = config.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
      const ollamaModel = config.ollamaModel || process.env.OLLAMA_MODEL || 'llama3.2';
      return new OllamaNormalizer(ollamaUrl, ollamaModel);
    }
  }

  return null;
}
