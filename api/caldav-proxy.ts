export const config = { runtime: 'edge' }

const ALLOWED_PATTERN = /^https:\/\/([\w-]+\.)*icloud\.com/

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

async function fetchFollowingRedirects(
  url: string,
  options: RequestInit,
  maxRedirects = 5,
): Promise<Response> {
  let currentUrl = url
  for (let i = 0; i < maxRedirects; i++) {
    const res = await fetch(currentUrl, { ...options, redirect: 'manual' })
    const isRedirect = res.status >= 300 && res.status < 400
    if (!isRedirect) return res
    const location = res.headers.get('Location')
    if (!location) return res
    currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href
    if (!ALLOWED_PATTERN.test(currentUrl)) {
      return new Response(JSON.stringify({ error: 'Redirect to disallowed host' }), { status: 403 })
    }
  }
  return new Response(JSON.stringify({ error: 'Too many redirects' }), { status: 502 })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders() })
  }

  const body = await req.json() as {
    url: string; caldavMethod?: string; xmlBody?: string; depth?: string; contentType?: string
  }
  const { url, caldavMethod = 'PROPFIND', xmlBody, depth = '1', contentType } = body
  const auth = req.headers.get('Authorization')

  if (!url || !auth) {
    return new Response(JSON.stringify({ error: 'Missing url or auth' }), {
      status: 400, headers: corsHeaders(),
    })
  }
  if (!ALLOWED_PATTERN.test(url)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: corsHeaders(),
    })
  }

  const upstream = await fetchFollowingRedirects(url, {
    method: caldavMethod,
    headers: {
      'Authorization': auth,
      'Content-Type': contentType || 'application/xml; charset=utf-8',
      ...(caldavMethod !== 'DELETE' ? { 'Depth': depth } : {}),
    },
    body: xmlBody || undefined,
  })

  const text = await upstream.text()
  return new Response(text, {
    status: upstream.status,
    headers: {
      ...corsHeaders(),
      'Content-Type': upstream.headers.get('Content-Type') || 'application/xml',
    },
  })
}
