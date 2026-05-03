require('dotenv').config();

const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const { createClient } = require('@supabase/supabase-js');

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[supabase] SUPABASE_URL or SUPABASE_ANON_KEY not set — Supabase features disabled.'
  );
}

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Path to Playwright's Chromium — works without installing Chrome separately
const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

const app = express();
const PORT = process.env.PORT || 3001;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.1-8b-instant';
const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 4000;
const MAX_TOTAL_CONTENT = 20000;

app.use(express.json({ limit: '256kb' }));

function sendSseEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function validateChatMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: 'messages must be a non-empty array.' };
  }

  if (messages.length > MAX_MESSAGES) {
    return { ok: false, error: `messages cannot exceed ${MAX_MESSAGES} items.` };
  }

  let totalLength = 0;
  for (const item of messages) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'each message must be an object.' };
    }
    if (item.role !== 'user' && item.role !== 'assistant') {
      return { ok: false, error: 'message role must be "user" or "assistant".' };
    }
    if (typeof item.content !== 'string' || !item.content.trim()) {
      return { ok: false, error: 'message content must be a non-empty string.' };
    }
    if (item.content.length > MAX_CONTENT_LENGTH) {
      return {
        ok: false,
        error: `message content exceeds ${MAX_CONTENT_LENGTH} characters.`,
      };
    }
    totalLength += item.content.length;
  }

  if (totalLength > MAX_TOTAL_CONTENT) {
    return { ok: false, error: `total message content exceeds ${MAX_TOTAL_CONTENT} characters.` };
  }

  return { ok: true, error: null };
}

// ---------------------------------------------------------------------------
// Security: allowlist of permitted hostnames and path prefixes
// ---------------------------------------------------------------------------
const ALLOWED_HOSTNAMES = new Set([
  'chatgpt.com',
  'chat.openai.com',
  'claude.ai',
  'gemini.google.com',
  'grok.com',
  'x.com',
  'www.perplexity.ai',
  'perplexity.ai',
]);

const VALID_PATH_PREFIXES = ['/share/', '/chat/', '/app/', '/search/', '/i/grok/share/'];

function validateShareUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, reason: 'Invalid URL format.' };
  }
  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only HTTPS URLs are allowed.' };
  }
  if (!ALLOWED_HOSTNAMES.has(parsed.hostname)) {
    return {
      valid: false,
      reason: `Unsupported platform. We support ChatGPT, Claude, Gemini, Grok, and Perplexity.`,
    };
  }
  const hasValidPath = VALID_PATH_PREFIXES.some((prefix) => parsed.pathname.startsWith(prefix));
  if (!hasValidPath) {
    return { valid: false, reason: "That doesn't look like a valid share link." };
  }
  return { valid: true, reason: null };
}

// ---------------------------------------------------------------------------
// CORS — allow any localhost port in dev, lock down in production
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
      // Add your production domain here when deploying:
      // if (origin === "https://yourdomain.com") return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
  })
);

// ---------------------------------------------------------------------------
// GET /api/fetch-share?url=<encodedUrl>
// Uses Puppeteer to fully render the ChatGPT page and extract conversation text
// ---------------------------------------------------------------------------
app.get('/api/fetch-share', async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url query parameter.' });
  }

  const { valid, reason } = validateShareUrl(url);
  if (!valid) {
    return res.status(400).json({ error: reason });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROMIUM_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();

    // Block images, fonts, and media to speed up load
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'font', 'media', 'stylesheet'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

    // Wait for message elements to appear in the DOM
    await page.waitForSelector('[data-message-author-role]', { timeout: 10000 }).catch(() => {});

    // Extract conversation messages directly from the rendered DOM
    const messages = await page.evaluate(() => {
      const results = [];

      // Strategy 1: ChatGPT's data-message-author-role attribute
      const messageEls = document.querySelectorAll('[data-message-author-role]');
      if (messageEls.length > 0) {
        messageEls.forEach((el) => {
          const role = el.getAttribute('data-message-author-role');
          if (role === 'user') {
            const text = el.innerText.trim();
            if (text) results.push(text);
          }
        });
        return { messages: results, strategy: 'data-attribute' };
      }

      // Strategy 2: __NEXT_DATA__ JSON
      const nextDataEl = document.getElementById('__NEXT_DATA__');
      if (nextDataEl) {
        try {
          const data = JSON.parse(nextDataEl.textContent || '');
          const walk = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            if (obj.role === 'user' && obj.content) {
              const content =
                typeof obj.content === 'string' ? obj.content : obj.content?.parts?.join(' ') || '';
              if (content.trim()) results.push(content.trim());
            }
            Object.values(obj).forEach(walk);
          };
          walk(data);
          if (results.length > 0) return { messages: results, strategy: 'next-data' };
        } catch {}
      }

      // Strategy 3: visible text fallback
      const paras = document.querySelectorAll('p, [class*="message"], [class*="prose"]');
      paras.forEach((el) => {
        const text = el.innerText?.trim();
        if (text && text.length > 10) results.push(text);
      });

      return { messages: results, strategy: 'text-fallback' };
    });

    console.log(
      `[fetch-share] Strategy: ${messages.strategy}, found ${messages.messages.length} messages`
    );

    if (!messages.messages || messages.messages.length === 0) {
      return res.status(502).json({
        error:
          'Could not extract conversation messages. The link may be private, expired, or the page structure has changed.',
      });
    }

    const transcript = messages.messages.map((m) => `You: ${m}`).join('\n\n');
    return res.json({ html: transcript });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error.';
    console.error('[fetch-share] Error:', message);
    return res.status(502).json({
      error: `Could not load the shared conversation: ${message}`,
    });
  } finally {
    if (browser) await browser.close();
  }
});

// ---------------------------------------------------------------------------
// POST /api/chat/stream
// Streams assistant response from Groq as SSE events
// ---------------------------------------------------------------------------
app.post('/api/chat/stream', async (req, res) => {
  console.log('[chat/stream] Received request with', req.body?.messages?.length, 'messages');
  const messages = req.body?.messages;
  const validation = validateChatMessages(messages);

  if (!validation.ok) {
    console.log('[chat/stream] Validation failed:', validation.error);
    return res.status(400).json({ error: validation.error });
  }

  if (!GROQ_API_KEY) {
    console.log('[chat/stream] GROQ_API_KEY not configured');
    return res.status(503).json({
      error: 'GROQ_API_KEY is not configured on the server.',
    });
  }

  console.log('[chat/stream] Starting stream to Groq...');

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        stream: true,
      }),
      signal: abortController.signal,
    });

    if (!groqResponse.ok) {
      console.log('[chat/stream] Groq response not OK:', groqResponse.status);
      let detail = `Groq request failed with status ${groqResponse.status}.`;
      try {
        const upstream = await groqResponse.json();
        detail = upstream?.error?.message || detail;
      } catch {}

      if (groqResponse.status === 401 || groqResponse.status === 403) {
        sendSseEvent(res, 'error', {
          code: 'INVALID_API_KEY',
          message: 'Groq API key rejected by upstream service.',
        });
      } else {
        sendSseEvent(res, 'error', { code: 'UPSTREAM_ERROR', message: detail });
      }
      return res.end();
    }

    const reader = groqResponse.body?.getReader();
    if (!reader) {
      sendSseEvent(res, 'error', {
        code: 'UPSTREAM_ERROR',
        message: 'No response stream from Groq.',
      });
      return res.end();
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let tokenCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';

      for (const eventBlock of events) {
        const lines = eventBlock.split(/\r?\n/);
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') {
            sendSseEvent(res, 'end', { done: true });
            return res.end();
          }

          try {
            const parsed = JSON.parse(data);
            const text = parsed?.choices?.[0]?.delta?.content;
            if (typeof text === 'string' && text.length > 0) {
              tokenCount++;
              sendSseEvent(res, 'token', { text });
            }
          } catch {
            // Ignore malformed chunks and continue streaming.
          }
        }
      }
    }

    console.log('[chat/stream] Stream complete. Sent', tokenCount, 'tokens');
    sendSseEvent(res, 'end', { done: true });
    return res.end();
  } catch (err) {
    if (abortController.signal.aborted) {
      return res.end();
    }
    const message = err instanceof Error ? err.message : 'Unknown streaming error.';
    sendSseEvent(res, 'error', {
      code: 'STREAM_FAILURE',
      message,
    });
    return res.end();
  }
});

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
app.get('/', (_req, res) => {
  res.send('Hello World from AskBetter server 👋');
});

// ---------------------------------------------------------------------------
// Supabase connection check
// ---------------------------------------------------------------------------
app.get('/api/supabase-health', async (_req, res) => {
  if (!supabase) {
    return res.status(503).json({
      ok: false,
      error: 'Supabase client not initialised — check SUPABASE_URL and SUPABASE_ANON_KEY env vars.',
    });
  }

  try {
    const { error } = await supabase.rpc('version');
    if (error && error.code !== 'PGRST202') {
      const { error: err2 } = await supabase.from('nonexistent_table_ping').select('id').limit(1);
      if (
        err2 &&
        err2.code !== 'PGRST116' &&
        err2.code !== '42P01' &&
        !err2.message.includes('does not exist')
      ) {
        return res.status(502).json({ ok: false, error: err2.message });
      }
    }
    return res.json({
      ok: true,
      project: SUPABASE_URL,
      message: 'Connected to Supabase successfully.',
    });
  } catch (err) {
    return res.status(502).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, supabase: !!supabase });
});

app.listen(PORT, () => {
  console.log(`AskBetter proxy server running on http://localhost:${PORT}`);
});
