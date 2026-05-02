const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer-core");

const app = express();
const PORT = process.env.PORT || 3001;

// Path to Playwright's Chromium — works on this machine without installing Chrome separately
const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

// ---------------------------------------------------------------------------
// Security: allowlist of permitted hostnames and path prefix
// ---------------------------------------------------------------------------
const ALLOWED_HOSTNAMES = new Set(["chatgpt.com", "chat.openai.com"]);
const REQUIRED_PATH_PREFIX = "/share/";

function validateShareUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, reason: "Invalid URL format." };
  }
  if (parsed.protocol !== "https:") {
    return { valid: false, reason: "Only HTTPS URLs are allowed." };
  }
  if (!ALLOWED_HOSTNAMES.has(parsed.hostname)) {
    return {
      valid: false,
      reason: "Only chatgpt.com and chat.openai.com URLs are allowed.",
    };
  }
  if (!parsed.pathname.startsWith(REQUIRED_PATH_PREFIX)) {
    return { valid: false, reason: "URL path must start with /share/." };
  }
  return { valid: true, reason: null };
}

// ---------------------------------------------------------------------------
// CORS — allow any localhost port in dev
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (/^http:\/\/localhost(:\d+)?$/.test(origin))
        return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
  }),
);

// ---------------------------------------------------------------------------
// GET /api/fetch-share?url=<encodedUrl>
// Uses Puppeteer to fully render the ChatGPT page and extract conversation text
// ---------------------------------------------------------------------------
app.get("/api/fetch-share", async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing url query parameter." });
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
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();

    // Block images, fonts, and media to speed up load
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "font", "media", "stylesheet"].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    );

    // Navigate and wait for the conversation content to render
    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

    // Wait for message elements to appear in the DOM
    await page
      .waitForSelector("[data-message-author-role]", { timeout: 10000 })
      .catch(() => {
        // If selector never appears, we'll still try to extract what we have
      });

    // Extract conversation messages directly from the rendered DOM
    const messages = await page.evaluate(() => {
      const results = [];

      // Strategy 1: ChatGPT's data-message-author-role attribute
      const messageEls = document.querySelectorAll(
        "[data-message-author-role]",
      );
      if (messageEls.length > 0) {
        messageEls.forEach((el) => {
          const role = el.getAttribute("data-message-author-role");
          if (role === "user") {
            const text = el.innerText.trim();
            if (text) results.push(text);
          }
        });
        return { messages: results, strategy: "data-attribute" };
      }

      // Strategy 2: look for __NEXT_DATA__ JSON in the page
      const nextDataEl = document.getElementById("__NEXT_DATA__");
      if (nextDataEl) {
        try {
          const data = JSON.parse(nextDataEl.textContent || "");
          const walk = (obj) => {
            if (!obj || typeof obj !== "object") return;
            if (obj.role === "user" && obj.content) {
              const content =
                typeof obj.content === "string"
                  ? obj.content
                  : obj.content?.parts?.join(" ") || "";
              if (content.trim()) results.push(content.trim());
            }
            Object.values(obj).forEach(walk);
          };
          walk(data);
          if (results.length > 0)
            return { messages: results, strategy: "next-data" };
        } catch {}
      }

      // Strategy 3: visible text fallback — grab all paragraph text
      const paras = document.querySelectorAll(
        'p, [class*="message"], [class*="prose"]',
      );
      paras.forEach((el) => {
        const text = el.innerText?.trim();
        if (text && text.length > 10) results.push(text);
      });

      return { messages: results, strategy: "text-fallback" };
    });

    console.log(
      `[fetch-share] Strategy: ${messages.strategy}, found ${messages.messages.length} messages`,
    );

    if (!messages.messages || messages.messages.length === 0) {
      return res.status(502).json({
        error:
          "Could not extract conversation messages. The link may be private, expired, or the page structure has changed.",
      });
    }

    // Return messages as a labeled transcript the frontend parser understands
    const transcript = messages.messages.map((m) => `You: ${m}`).join("\n\n");
    return res.json({ html: transcript });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    console.error("[fetch-share] Error:", message);
    return res.status(502).json({
      error: `Could not load the shared conversation: ${message}`,
    });
  } finally {
    if (browser) await browser.close();
  }
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`AskBetter proxy server running on http://localhost:${PORT}`);
});
