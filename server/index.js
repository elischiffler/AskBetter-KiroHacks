require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { createClient } = require("@supabase/supabase-js");

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[supabase] SUPABASE_URL or SUPABASE_ANON_KEY not set — Supabase features disabled.",
  );
}

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const app = express();
const PORT = process.env.PORT || 3001;

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
    return {
      valid: false,
      reason: "URL path must start with /share/.",
    };
  }

  return { valid: true, reason: null };
}

// ---------------------------------------------------------------------------
// CORS — allow any localhost port in dev, lock down in production
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, same-origin)
      if (!origin) return callback(null, true);
      // Allow any localhost port for local development
      if (/^http:\/\/localhost(:\d+)?$/.test(origin))
        return callback(null, true);
      // Add your production domain here when deploying:
      // if (origin === "https://yourdomain.com") return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
  }),
);

// ---------------------------------------------------------------------------
// GET /api/fetch-share?url=<encodedUrl>
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

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 10000,
      redirect: "follow",
    });

    if (!response.ok) {
      return res.status(502).json({
        error: `ChatGPT returned status ${response.status}. The link may be private or expired.`,
      });
    }

    // Validate redirect didn't go somewhere unexpected
    if (response.url) {
      const finalParsed = new URL(response.url);
      if (!ALLOWED_HOSTNAMES.has(finalParsed.hostname)) {
        return res.status(502).json({
          error: "Unexpected redirect to disallowed host.",
        });
      }
    }

    const html = await response.text();

    if (!html || html.length < 200) {
      return res.status(502).json({
        error: "Received empty or too-short response from ChatGPT.",
      });
    }

    return res.json({ html });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown fetch error.";
    console.error("[fetch-share] Error:", message);
    return res.status(502).json({
      error: `Could not fetch the shared conversation: ${message}`,
    });
  }
});

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
app.get("/", (_req, res) => {
  res.send("Hello World from AskBetter server 👋");
});

// ---------------------------------------------------------------------------
// Supabase connection check
// ---------------------------------------------------------------------------
app.get("/api/supabase-health", async (_req, res) => {
  if (!supabase) {
    return res.status(503).json({
      ok: false,
      error: "Supabase client not initialised — check SUPABASE_URL and SUPABASE_ANON_KEY env vars.",
    });
  }

  try {
    // execute_sql equivalent via the JS client — select 1 is the lightest
    // possible query that confirms the PostgREST connection is alive.
    const { error } = await supabase.rpc("version");

    // "function not found" (PGRST202) still means the connection is live
    if (error && error.code !== "PGRST202") {
      // Try an even simpler approach: list tables (will return empty array, not error)
      const { error: err2 } = await supabase.from("nonexistent_table_ping").select("id").limit(1);
      // PGRST116 = no rows, 42P01 = table doesn't exist — both mean we're connected
      if (err2 && err2.code !== "PGRST116" && err2.code !== "42P01" && !err2.message.includes("does not exist")) {
        return res.status(502).json({ ok: false, error: err2.message });
      }
    }

    return res.json({
      ok: true,
      project: SUPABASE_URL,
      message: "Connected to Supabase successfully.",
    });
  } catch (err) {
    return res.status(502).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, supabase: !!supabase });
});

app.listen(PORT, () => {
  console.log(`AskBetter proxy server running on http://localhost:${PORT}`);
});
