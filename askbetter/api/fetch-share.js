// Vercel serverless function for proxying ChatGPT share links
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

  // Security: only allow HTTPS requests to chatgpt.com or chat.openai.com
  try {
    const targetUrl = new URL(url);
    const allowedHosts = ['chatgpt.com', 'chat.openai.com'];

    if (targetUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only HTTPS URLs are allowed' });
    }

    if (!allowedHosts.includes(targetUrl.hostname)) {
      return res.status(400).json({ error: 'Only chatgpt.com and chat.openai.com are allowed' });
    }

    if (!targetUrl.pathname.includes('/share/')) {
      return res.status(400).json({ error: 'Only /share/ paths are allowed' });
    }

    // Fetch the share link
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AskBetter/1.0)',
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
