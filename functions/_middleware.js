// ═══════════════════════════════════════════════════════════════
// Cloudflare Pages Function – UA Based SEO Router
// GitHub repo + Cloudflare Pages ile çalışır
// ═══════════════════════════════════════════════════════════════

const INDEXING_PATTERN = /Googlebot\/\d+\.\d+|Googlebot-Image|Googlebot-Video|Storebot-Google|bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Sogou|Applebot|PetalBot|Bytespider|SeznamBot|NaverBot/i;

const EXCLUDE_PATTERN = /GoogleOther|AdsBot-Google|Mediapartners-Google|APIs-Google|FeedFetcher-Google|Google-Safety|Google-CloudVertexBot|Google-Extended|Google-Site-Verification|Google-Read-Aloud|Google\s?Favicon|DuplexWeb-Google|GoogleProducer|Google-InspectionTool|Google-Agent|GoogleMessages|Google-NotebookLM|Google-Pinpoint|Google-CWS|BingPreview|YandexAccessibilityBot|YandexScreenshotBot/i;

const DECISION = {
  INDEX: 'index.html',
  EN:    'en.html',
  TR:    'tr.html',
};

function decide(userAgent) {
  if (EXCLUDE_PATTERN.test(userAgent)) {
    return { page: DECISION.EN, reason: 'excluded_bot' };
  }
  if (INDEXING_PATTERN.test(userAgent)) {
    return { page: DECISION.INDEX, reason: 'indexing_bot' };
  }
  return { page: DECISION.TR, reason: 'default' };
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // Sadece ana sayfa için routing yap
  if (url.pathname !== '/' && url.pathname !== '/index.html') {
    return next();
  }

  // GET dışındaki istekleri olduğu gibi bırak
  if (request.method !== 'GET') {
    return next();
  }

  const ua = request.headers.get('user-agent') || '';
  const decision = decide(ua);

  // Hedef dosyayı ASSETS üzerinden sun
  const targetUrl = new URL(`/${decision.page}`, url.origin);
  const originRequest = new Request(targetUrl.toString(), {
    method: 'GET',
    headers: request.headers,
  });

  const response = await env.ASSETS.fetch(originRequest);

  // Cache’i kapat + Vary ekle
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  newHeaders.set('Pragma', 'no-cache');
  newHeaders.set('Expires', '0');
  newHeaders.set('Vary', 'User-Agent');

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  });
}
