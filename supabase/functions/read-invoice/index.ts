import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Vision model for scanned/photographed invoices (images). Text model for PDF-extracted text.
const GROQ_VISION_MODEL = 'qwen/qwen3.6-27b';
const GROQ_TEXT_MODEL = 'llama-3.3-70b-versatile';

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

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: isImage ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL,
        temperature: 0,
        max_completion_tokens: 2048,
        response_format: { type: 'json_object' },
        ...(isImage ? { reasoning_effort: 'none', reasoning_format: 'hidden' } : {}),
        messages: [
          { role: 'user', content: userContent },
        ],
      }),
    });

    const data = await groqRes.json();

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
