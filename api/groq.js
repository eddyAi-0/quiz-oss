export const config = { runtime: 'edge' }

// Rate limiting rimosso: le Edge Function di Vercel sono stateless — ogni invocazione
// può girare su un'istanza diversa, quindi una Map in-memory non mantiene lo stato
// tra richieste. Per un rate limiter reale servono Upstash Redis + @upstash/ratelimit.

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

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
