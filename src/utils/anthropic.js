const MODEL = 'llama-3.3-70b-versatile'
const BASE = 'https://api.groq.com/openai/v1/chat/completions'

function getKey() {
  return import.meta.env.VITE_GROQ_API_KEY
}

async function callGroq(messages, maxTokens = 1024) {
  const key = getKey()
  if (!key || key === 'YOUR_GROQ_KEY_HERE') {
    throw new Error('VITE_GROQ_API_KEY non configurata. Ottieni la key gratis su console.groq.com e aggiungila nel file .env.local')
  }

  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages
    })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Errore API Groq: ${res.status}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

const SYSTEM_OSS = `Sei un tutor esperto per il concorso OSS (Operatore Socio-Sanitario) in Italia.
Rispondi sempre in italiano, in modo chiaro e semplice, adatto a chi studia per l'esame.
Sii incoraggiante e didattico. Usa esempi pratici quando utile.
Mantieni le risposte concise ma complete.`

export async function spiegaMeglio({ domanda, opzioni, rispostaCorretta, spiegazione, rispostaData }) {
  const userText = `L'utente ha risposto in modo errato alla seguente domanda OSS:

DOMANDA: ${domanda}
OPZIONI:
${opzioni.map((o, i) => `${i === rispostaCorretta ? '✓' : ' '} ${String.fromCharCode(65 + i)}) ${o}`).join('\n')}

RISPOSTA DATA: ${String.fromCharCode(65 + rispostaData)}) ${opzioni[rispostaData]}
RISPOSTA CORRETTA: ${String.fromCharCode(65 + rispostaCorretta)}) ${opzioni[rispostaCorretta]}

SPIEGAZIONE UFFICIALE: ${spiegazione}

Spiega in modo approfondito e didattico perché la risposta corretta è quella giusta,
chiarendo anche l'errore comune che ha portato alla risposta sbagliata.
Aggiungi dettagli utili per ricordare il concetto.`

  return callGroq([
    { role: 'system', content: SYSTEM_OSS },
    { role: 'user', content: userText }
  ], 800)
}

export async function chatTutor(messages) {
  return callGroq([
    { role: 'system', content: SYSTEM_OSS },
    ...messages
  ], 1024)
}

export async function generaDomandeExtra(sezione, spiegazioni) {
  const userText = `Genera esattamente 3 domande a scelta multipla (4 opzioni ciascuna) sulla sezione "${sezione}" dell'esame OSS.
Ispirati a questi argomenti dove l'utente ha difficoltà: ${spiegazioni.join('; ')}

Per ogni domanda usa questo formato JSON:
{
  "domanda": "...",
  "opzioni": ["A", "B", "C", "D"],
  "risposta_corretta": 0,
  "spiegazione": "..."
}

Restituisci solo un array JSON valido con le 3 domande, senza altro testo.`

  const raw = await callGroq([
    { role: 'system', content: SYSTEM_OSS },
    { role: 'user', content: userText }
  ], 1500)

  try {
    const match = raw.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}
