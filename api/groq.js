import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const config = { runtime: 'edge' }

const MODEL = 'llama-3.3-70b-versatile'
const MAX_TOKENS = 1500
const APP_TOKEN = process.env.APP_TOKEN ?? 'quiz-oss-2026-v1'

let _ratelimit = null

function getRatelimit() {
  if (_ratelimit) return _ratelimit
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  _ratelimit = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(30, '1 h'),
    analytics: false,
    prefix: 'quiz-oss'
  })
  return _ratelimit
}

function err(status, msg) {
  return new Response(JSON.stringify({ error: { message: msg } }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Verifica token applicazione
  if (req.headers.get('x-app-token') !== APP_TOKEN) {
    return err(401, 'Non autorizzato')
  }

  // Rate limiting per IP (attivo solo se Upstash è configurato)
  const rl = getRatelimit()
  if (rl) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    const { success } = await rl.limit(ip)
    if (!success) {
      return err(429, 'Troppe richieste. Riprova tra qualche minuto.')
    }
  }

  let body
  try {
    body = await req.json()
  } catch {
    return err(400, 'Body non valido: JSON malformato')
  }

  // Valida campo messages
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return err(400, 'Il campo messages deve essere un array non vuoto')
  }
  for (const msg of body.messages) {
    if (typeof msg.role !== 'string' || typeof msg.content !== 'string') {
      return err(400, 'Ogni messaggio deve avere role e content di tipo stringa')
    }
  }

  // Forza model e max_tokens, scarta tutti gli altri campi
  const maxTokens = body.max_tokens
    ? Math.min(Math.max(1, Number(body.max_tokens)), MAX_TOKENS)
    : MAX_TOKENS

  const payload = {
    model: MODEL,
    max_tokens: maxTokens,
    messages: body.messages.map(m => ({ role: m.role, content: m.content }))
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify(payload)
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' }
  })
}
