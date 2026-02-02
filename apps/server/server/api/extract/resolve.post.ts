/**
 * AI-based extraction resolution endpoint
 * Called when heuristic extraction has low confidence
 */

export interface ExtractResolveRequest {
  domain: string;
  url: string;
  titleCandidates: Array<{
    text: string;
    context: string;
    score: number;
    cssPath: string;
  }>;
  priceCandidates: Array<{
    text: string;
    context: string;
    value: number | null;
    score: number;
    priceType: string;
    cssPath: string;
  }>;
  config?: {
    id: string;
    name: string;
    locale: string;
    currency: string;
  };
}

export interface ExtractResolveResponse {
  success: boolean;
  title?: string;
  titleCssPath?: string;
  priceCssPath?: string;
  priceType?: 'current_bid' | 'starting_price' | 'estimate' | 'sold' | 'unknown';
  matchedKeywords?: string[];
  error?: string;
}

const SYSTEM_PROMPT = `You are an auction page data extractor. Your job is to identify the correct title and current bid price from a list of candidates extracted from an auction page.

RULES:
1. For TITLE: Select the candidate that best describes the lot/item being auctioned
   - Prefer specific product descriptions over navigation or category names
   - Avoid generic text like "Home", "Auction", "Search results"
   - The title should describe the actual item

2. For PRICE: Select the candidate that represents the CURRENT BID or CURRENT PRICE
   - Look for keywords like: "current bid", "prix actuel", "enchère actuelle", "offre actuelle", "winning bid"
   - AVOID: estimates, starting prices, reserve prices, sold/hammer prices, fees/commissions
   - Keywords to avoid: "estimation", "mise à prix", "prix de départ", "adjugé", "vendu", "frais"

3. Return ONLY valid JSON, no explanations
4. If you cannot determine a field with confidence, return null for that field

IMPORTANT:
- priceType must be one of: "current_bid", "starting_price", "estimate", "sold", "unknown"
- Return the cssPath from the candidate you select (don't modify it)`;

function buildUserPrompt(request: ExtractResolveRequest): string {
  let prompt = `Analyze this auction page and select the best candidates.

Domain: ${request.domain}
URL: ${request.url}
${request.config ? `Site: ${request.config.name} (${request.config.locale})` : ''}

TITLE CANDIDATES:
`;

  request.titleCandidates.forEach((c, i) => {
    prompt += `${i + 1}. Text: "${c.text.slice(0, 150)}"\n`;
    prompt += `   Context: "${c.context.slice(0, 100)}"\n`;
    prompt += `   Score: ${c.score}, Path: ${c.cssPath}\n\n`;
  });

  prompt += `
PRICE CANDIDATES:
`;

  request.priceCandidates.forEach((c, i) => {
    prompt += `${i + 1}. Text: "${c.text}"\n`;
    prompt += `   Value: ${c.value ?? 'unknown'}, Type: ${c.priceType}\n`;
    prompt += `   Context: "${c.context.slice(0, 100)}"\n`;
    prompt += `   Score: ${c.score}, Path: ${c.cssPath}\n\n`;
  });

  prompt += `
Respond with JSON only:
{
  "titleCssPath": "css path of selected title or null",
  "priceCssPath": "css path of selected price or null",
  "priceType": "current_bid|starting_price|estimate|sold|unknown",
  "reasoning": "brief explanation"
}`;

  return prompt;
}

function parseAIResponse(text: string): {
  titleCssPath: string | null;
  priceCssPath: string | null;
  priceType: 'current_bid' | 'starting_price' | 'estimate' | 'sold' | 'unknown';
} {
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch && jsonMatch[1]) {
    jsonStr = jsonMatch[1].trim();
  }

  const data = JSON.parse(jsonStr);

  const validPriceTypes = ['current_bid', 'starting_price', 'estimate', 'sold', 'unknown'] as const;
  const priceType = validPriceTypes.includes(data.priceType) ? data.priceType : 'unknown';

  return {
    titleCssPath: data.titleCssPath || null,
    priceCssPath: data.priceCssPath || null,
    priceType,
  };
}

export default defineEventHandler(async (event): Promise<ExtractResolveResponse> => {
  const body = await readBody<ExtractResolveRequest>(event);

  if (!body.domain || !body.url) {
    throw createError({
      statusCode: 400,
      message: 'Missing domain or url',
    });
  }

  if (!body.titleCandidates?.length && !body.priceCandidates?.length) {
    throw createError({
      statusCode: 400,
      message: 'No candidates provided',
    });
  }

  // Get AI provider (prefer Ollama for local processing)
  const config = useRuntimeConfig();
  const ollamaUrl = config.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
  const ollamaModel = config.ollamaModel || process.env.OLLAMA_MODEL || 'llama3.2';

  try {
    // Try Ollama first (local, fast)
    const response = await fetch(ollamaUrl + '/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: SYSTEM_PROMPT + '\n\n' + buildUserPrompt(body),
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[ExtractResolve] Ollama error:', error);

      // Fall back to cloud provider if configured
      const cloudResult = await tryCloudProvider(body);
      if (cloudResult) {
        return cloudResult;
      }

      return {
        success: false,
        error: 'AI resolution failed: ' + error,
      };
    }

    const data = await response.json();
    const aiResult = parseAIResponse(data.response);

    // Find the selected candidates
    const selectedTitle = body.titleCandidates.find(c => c.cssPath === aiResult.titleCssPath);
    const selectedPrice = body.priceCandidates.find(c => c.cssPath === aiResult.priceCssPath);

    return {
      success: true,
      title: selectedTitle?.text,
      titleCssPath: aiResult.titleCssPath ?? undefined,
      priceCssPath: aiResult.priceCssPath ?? undefined,
      priceType: aiResult.priceType,
      matchedKeywords: [], // Could extract from AI reasoning
    };
  } catch (error) {
    console.error('[ExtractResolve] Error:', error);

    // Try cloud provider as fallback
    const cloudResult = await tryCloudProvider(body);
    if (cloudResult) {
      return cloudResult;
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

/**
 * Try cloud AI providers as fallback
 */
async function tryCloudProvider(body: ExtractResolveRequest): Promise<ExtractResolveResponse | null> {
  const config = useRuntimeConfig();

  // Try Anthropic
  const anthropicKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildUserPrompt(body) }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text;
        if (text) {
          const aiResult = parseAIResponse(text);
          const selectedTitle = body.titleCandidates.find(c => c.cssPath === aiResult.titleCssPath);

          return {
            success: true,
            title: selectedTitle?.text,
            titleCssPath: aiResult.titleCssPath ?? undefined,
            priceCssPath: aiResult.priceCssPath ?? undefined,
            priceType: aiResult.priceType,
          };
        }
      }
    } catch (e) {
      console.error('[ExtractResolve] Anthropic fallback failed:', e);
    }
  }

  // Try OpenAI
  const openaiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + openaiKey,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 500,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(body) },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          const aiResult = parseAIResponse(text);
          const selectedTitle = body.titleCandidates.find(c => c.cssPath === aiResult.titleCssPath);

          return {
            success: true,
            title: selectedTitle?.text,
            titleCssPath: aiResult.titleCssPath ?? undefined,
            priceCssPath: aiResult.priceCssPath ?? undefined,
            priceType: aiResult.priceType,
          };
        }
      }
    } catch (e) {
      console.error('[ExtractResolve] OpenAI fallback failed:', e);
    }
  }

  return null;
}
