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

// ---------------------------------------------------------------------------
// Security: allowlist of permitted hostnames and path prefix
// ---------------------------------------------------------------------------
const ALLOWED_HOSTNAMES = new Set(['chatgpt.com', 'chat.openai.com']);
const REQUIRED_PATH_PREFIX = '/share/';

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
      reason: 'Only chatgpt.com and chat.openai.com URLs are allowed.',
    };
  }
  if (!parsed.pathname.startsWith(REQUIRED_PATH_PREFIX)) {
    return { valid: false, reason: 'URL path must start with /share/.' };
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
