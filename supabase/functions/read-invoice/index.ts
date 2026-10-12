import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Vision model for scanned/photographed invoices (images). Text model for PDF-extracted text.
const GROQ_VISION_MODEL = 'qwen/qwen3.8-27b';
const GROQ_TEXT_MODEL = 'openai/gpt-oss-120b';

// Groq periodically retires/renames a model id (e.g. qwen3.6-27b -> qwen3.8-27b).
// Cache the live replacement per isolate so we don't re-discover it on every request.
const modelCache = new Map<string, string>();

function isModelNotFound(data: any): boolean {
  const msg = (data?.error?.message || '').toLowerCase();
  return data?.error?.code === 'model_not_found'
    || msg.includes('does not exist')
    || msg.includes('decommissioned');
}

// Ask Groq what's live and pick the newest model in the same family (e.g. "qwen/").
async function discoverReplacementModel(apiKey: string, staleModel: string): Promise<string | null> {
  const familyPrefix = staleModel.split('/')[0] + '/';
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const candidates = (data.data || [])
    .filter((m: any) => m.id !== staleModel && typeof m.id === 'string' && m.id.startsWith(familyPrefix) && m.active !== false)
    .sort((a: any, b: any) => (b.created || 0) - (a.created || 0));
  return candidates[0]?.id || null;
}

async function callGroq(apiKey: string, body: string) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body,
  });
  return { res, data: await res.json() };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { rawText, base64, mediaType, systemPrompt, isImage } = await req.json();

    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: 'systemPrompt is required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    if (isImage && !base64) {
      return new Response(JSON.stringify({ error: 'base64 image data is required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    if (!isImage && !rawText) {
      return new Response(JSON.stringify({ error: 'rawText is required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Qwen reasoning model: fold system instructions into the user message (Groq
    // guidance — reasoning models perform worse with a separate system role).
    const userContent = isImage
      ? [
          { type: 'text', text: `${systemPrompt}\n\nRead this invoice/delivery note image and extract the data as specified.` },
          { type: 'image_url', image_url: { url: `data:${mediaType || 'image/jpeg'};base64,${base64}` } },
        ]
      : `${systemPrompt}\n\nRead this invoice/delivery note text and extract the data as specified:\n\n${rawText}`;

    const defaultModel = isImage ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL;
    const model = modelCache.get(defaultModel) || defaultModel;

    const buildBody = (m: string) => JSON.stringify({
      model: m,
      temperature: 0,
      max_completion_tokens: 2048,
      response_format: { type: 'json_object' },
      ...(isImage ? { reasoning_effort: 'none', reasoning_format: 'hidden' } : {}),
      messages: [
        { role: 'user', content: userContent },
      ],
    });

    // Free-tier Groq shares a tight per-minute token budget across requests.
    // A 429 here is transient — Groq's own error message tells us exactly how
    // long to wait, so retry once instead of failing a request that would
    // succeed a few seconds later.
    let { res: groqRes, data } = await callGroq(apiKey, buildBody(model));

    if (groqRes.status === 429) {
      const retryAfterHeader = parseFloat(groqRes.headers.get('retry-after') || '');
      const msgMatch = (data.error?.message || '').match(/try again in ([\d.]+)s/i);
      const waitSeconds = !isNaN(retryAfterHeader) ? retryAfterHeader
        : msgMatch ? parseFloat(msgMatch[1])
        : 5;
      await new Promise(r => setTimeout(r, Math.ceil(waitSeconds * 1000) + 500));

      ({ res: groqRes, data } = await callGroq(apiKey, buildBody(model)));
    }

    // Groq retired/renamed the model id (happens periodically) — look up its
    // live replacement in the same family and retry once before giving up.
    if (!groqRes.ok && isModelNotFound(data)) {
      const replacement = await discoverReplacementModel(apiKey, model);
      if (replacement) {
        modelCache.set(defaultModel, replacement);
        ({ res: groqRes, data } = await callGroq(apiKey, buildBody(replacement)));
      }
    }

    if (!groqRes.ok) {
      let msg = data.error?.message || 'Groq API error';
      if (data.error?.failed_generation) {
        msg += ` | raw output: ${data.error.failed_generation.slice(0, 500)}`;
      }
      return new Response(JSON.stringify({ error: msg }), {
        status: groqRes.status, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const text = data.choices?.[0]?.message?.content || '';
    if (!text) {
      return new Response(JSON.stringify({ error: 'Empty response from Groq — try a clearer document' }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Reshape into the Anthropic-style { content: [{ text }] } envelope the client already parses.
    return new Response(JSON.stringify({ content: [{ type: 'text', text }] }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
