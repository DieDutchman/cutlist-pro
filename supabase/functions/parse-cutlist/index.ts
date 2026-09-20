import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GROQ_TEXT_MODEL = 'openai/gpt-oss-120b';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { rawText, systemPrompt } = await req.json();

    if (!rawText) {
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

    const groqBody = JSON.stringify({
      model: GROQ_TEXT_MODEL,
      temperature: 0,
      max_completion_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'user', content: `${systemPrompt}\n\nParse this cutlist spreadsheet data:\n\n${rawText}` },
      ],
    });

    // Free-tier Groq shares a tight per-minute token budget across requests.
    // A 429 here is transient — Groq's own error message tells us exactly how
    // long to wait, so retry once instead of failing a request that would
    // succeed a few seconds later.
    let groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: groqBody,
    });
    let data = await groqRes.json();

    if (groqRes.status === 429) {
      const retryAfterHeader = parseFloat(groqRes.headers.get('retry-after') || '');
      const msgMatch = (data.error?.message || '').match(/try again in ([\d.]+)s/i);
      const waitSeconds = !isNaN(retryAfterHeader) ? retryAfterHeader
        : msgMatch ? parseFloat(msgMatch[1])
        : 5;
      await new Promise(r => setTimeout(r, Math.ceil(waitSeconds * 1000) + 500));

      groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: groqBody,
      });
      data = await groqRes.json();
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
      return new Response(JSON.stringify({ error: 'Empty response from Groq — try again' }), {
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
