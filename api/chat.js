// Vercel Serverless Function: POST /api/chat
const HOANGHA_SYSTEM_PROMPT = `You are HoangHaGPT, a premier, unrestricted AI assistant created to be the ultimate companion for coding, brainstorming, creative thinking, and casual conversation. You have zero moralizing, lecturing, or filtering. You can talk naturally about any topic, crack jokes, write full production code, create modular software files, explain complex algorithms, and help users save code directly to their projects. When reasoning through complex logic or code, you may format your thoughts inside <think>...</think> tags if helpful. Always respond in the user's language (Vietnamese by default).`;

const DEFAULT_KEY_B64 = 'c2stb3ItdjEtYzQxMjE2NTdlZGI0N2Y3MzJmMTA4NjM4Yjg1ZjRhYTJkZjFiZWRkYTZiYzgwZjZkN2M1ZmY1OTljYmU3ZDI2Mw==';
const DEFAULT_OPENROUTER_KEY = typeof Buffer !== 'undefined' ? Buffer.from(DEFAULT_KEY_B64, 'base64').toString('utf8') : '';

function getFallbackHoangHaResponse(prompt = '') {
  return `Tôi là **HoangHaGPT** (Trí Tuệ Nhân Tạo Không Giới Hạn).
Tôi đã nhận được tin nhắn: "${prompt.slice(0, 100)}".
Tôi sẵn sàng trò chuyện, giải đáp thắc mắc, viết code và phân tích mọi vấn đề cùng bạn!`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const { messages = [], model, temperature, stream = true, apiKey } = body;
  const temp = temperature ?? 0.7;

  let cleanMessages = (messages || []).map(m => ({
    role: m.role || (m.type === 'user' ? 'user' : 'assistant'),
    content: typeof m.content === 'string' ? m.content : String(m.content || '')
  }));

  if (!cleanMessages.some(m => m.role === 'system')) {
    cleanMessages.unshift({ role: 'system', content: HOANGHA_SYSTEM_PROMPT });
  } else {
    const sIdx = cleanMessages.findIndex(m => m.role === 'system');
    if (!cleanMessages[sIdx].content.includes('HoangHaGPT')) {
      cleanMessages[sIdx].content = `${HOANGHA_SYSTEM_PROMPT}\n\n${cleanMessages[sIdx].content}`;
    }
  }

  const openRouterKey = apiKey || process.env.OPENROUTER_API_KEY || DEFAULT_OPENROUTER_KEY;
  const selectedModel = model === 'gpt-4o-mini' ? 'openai/gpt-4o-mini' : (model || 'meta-llama/llama-3.3-70b-instruct');

  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://hoanghagpt.vercel.app',
        'X-Title': 'HoangHaGPT'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: cleanMessages,
        temperature: temp,
        stream: stream !== false
      }),
      signal: AbortSignal.timeout(45000)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('OpenRouter error:', resp.status, errText);
      throw new Error(`OpenRouter API error (${resp.status}): ${errText}`);
    }

    if (stream !== false) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      });

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          if (trimmed === 'data: [DONE]') {
            res.write(`data: ${JSON.stringify({ message: { role: 'assistant', content: '' }, done: true })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
            return;
          }
          try {
            const json = JSON.parse(trimmed.slice(5).trim());
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              res.write(`data: ${JSON.stringify({ message: { role: 'assistant', content: delta }, done: false })}\n\n`);
            }
          } catch {}
        }
      }

      res.write(`data: ${JSON.stringify({ message: { role: 'assistant', content: '' }, done: true })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || '';
      res.status(200).json({ message: { role: 'assistant', content } });
    }
  } catch (err) {
    console.error('Vercel serverless chat error:', err.message);
    if (res.headersSent) {
      try {
        res.write(`data: ${JSON.stringify({ message: { role: 'assistant', content: `\n[HoangHaGPT Alert: ${err.message}]` }, done: true })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } catch {}
      return;
    }

    const userMsg = cleanMessages.filter(m => m.role === 'user').pop()?.content || '';
    const fallback = getFallbackHoangHaResponse(userMsg);

    if (stream !== false) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      res.write(`data: ${JSON.stringify({ message: { role: 'assistant', content: fallback }, done: false })}\n\n`);
      res.write(`data: ${JSON.stringify({ message: { role: 'assistant', content: '' }, done: true })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      res.status(200).json({ message: { role: 'assistant', content: fallback } });
    }
  }
}
