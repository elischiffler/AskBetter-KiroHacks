// Vercel serverless function for proxying AI chat share links
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Security: only allow HTTPS requests to supported AI platforms
  try {
    const targetUrl = new URL(url);
    const allowedHosts = [
      'chatgpt.com',
      'chat.openai.com',
      'claude.ai',
      'gemini.google.com',
      'grok.com',
      'x.com',
      'perplexity.ai',
      'www.perplexity.ai',
    ];

    if (targetUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only HTTPS URLs are allowed' });
    }

    if (!allowedHosts.includes(targetUrl.hostname)) {
      return res.status(400).json({ error: 'Unsupported AI platform' });
    }

    // Validate path patterns for each platform
    const validPaths = ['/share/', '/chat/', '/app/', '/search/', '/i/grok/share/'];

    const hasValidPath = validPaths.some((path) => targetUrl.pathname.includes(path));
    if (!hasValidPath) {
      return res.status(400).json({ error: 'Invalid share link path' });
    }

    // Fetch the share link
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch: ${response.statusText}`,
      });
    }

    const html = await response.text();
    return res.status(200).json({ html });
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      error: 'Failed to fetch the share link',
      details: error.message,
    });
  }
}
