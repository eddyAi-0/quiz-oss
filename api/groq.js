export const config = { runtime: 'edge' }

const RATE_LIMIT = 30
const rateMap = new Map()

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const now = Date.now()
  const window = now - 60_000
  const timestamps = (rateMap.get(ip) ?? []).filter(t => t > window)
  if (timestamps.length >= RATE_LIMIT) {
    return new Response(
      JSON.stringify({ error: { message: 'Troppe richieste. Riprova tra un minuto.' } }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }
  rateMap.set(ip, [...timestamps, now])

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: { message: 'Body non valido' } }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify(body)
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' }
  })
}
