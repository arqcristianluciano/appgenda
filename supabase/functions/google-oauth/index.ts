import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    return json({ error: 'Google OAuth no configurado en el servidor' }, 500)
  }

  const body = await req.json() as { action?: string; code?: string; refreshToken?: string }
  const { action, code, refreshToken } = body

  const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret })

  if (action === 'exchange' && code) {
    params.set('code', code)
    params.set('grant_type', 'authorization_code')
    params.set('redirect_uri', 'postmessage')
  } else if (action === 'refresh' && refreshToken) {
    params.set('refresh_token', refreshToken)
    params.set('grant_type', 'refresh_token')
  } else {
    return json({ error: 'Parámetros inválidos' }, 400)
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  const data = await res.json() as Record<string, unknown>
  if (!res.ok) {
    return json({ error: data.error_description ?? data.error ?? 'Error OAuth' }, res.status)
  }
  return json(data)
})
