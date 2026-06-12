import { supabase } from '../lib/supabase'

const MODEL = 'llama-3.3-70b-versatile'

async function callGroq(messages, maxTokens = 1024) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Devi essere autenticato per usare il Tutor AI')

  const res = await fetch('/api/groq', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Errore API: ${res.status}`)
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

export function parseJsonArray(raw) {
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('Nessun array JSON trovato nella risposta')
  return JSON.parse(match[0])
}

export function parseJsonObject(raw) {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Nessun oggetto JSON trovato nella risposta')
  return JSON.parse(match[0])
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

  const messages = [
    { role: 'system', content: SYSTEM_OSS },
    { role: 'user', content: userText }
  ]

  let raw = await callGroq(messages, 1500)
  try {
    return parseJsonArray(raw)
  } catch {
    const correctionMessages = [
      ...messages,
      { role: 'assistant', content: raw },
      { role: 'user', content: 'La risposta non è un JSON valido. Rispondi SOLO con l\'array JSON, senza testo, senza backtick markdown.' }
    ]
    raw = await callGroq(correctionMessages, 1500)
    try {
      return parseJsonArray(raw)
    } catch {
      throw new Error('Non sono riuscito a generare le domande, riprova.')
    }
  }
}

const SYSTEM_ORALE = `Sei un esaminatore-allenatore esperto per la prova ORALE del concorso OSS (Operatore Socio-Sanitario) in Italia.
Valuti la risposta data a voce dal candidato a una domanda d'esame, assegnando un voto da 0 a 30 e fornendo una correzione utile.
Rispondi sempre in italiano, con tono caldo e incoraggiante.

COME ASSEGNARE IL VOTO (rubrica 0-30, usala in modo coerente e ripetibile):
- Il voto si basa su QUANTI punti chiave la risposta copre sul totale dei punti chiave forniti:
  - tutti i punti coperti e ben espressi, senza errori -> voto vicino a 30;
  - circa metà dei punti coperti -> voto intorno a 15;
  - nessun punto coperto -> voto vicino a 0.
- Sottrai qualche punto per ogni "errore comune" effettivamente commesso nella risposta.
- Assegna 0 se la risposta è assente, fuori tema o completamente errata.
- Usa solo NUMERI INTERI.
- NON penalizzare piccoli errori di trascrizione vocale su termini tecnici (es. Trendelenburg, Fowler, ab ingestis): valuta il contenuto, non l'ortografia.
- La soglia di sufficienza è 18/30.
- Il "giudizio" deve essere coerente col voto: "Completa" se voto >= 24, "Buona" se voto tra 18 e 23, "Da rivedere" se voto < 18.

COLLEGAMENTO:
- Genera tu un collegamento corretto e standard dell'assistenza OSS tra l'argomento della domanda e un altro tema (es. apparato circolatorio e respiratorio; immobilità e lesioni da pressione e trombosi). Non inventare nessi clinici scorretti.

LIMITI DEL RUOLO OSS (tienine conto nel valutare e nel correggere): l'OSS è una figura di SUPPORTO; NON somministra farmaci, NON inserisce o rimuove cateteri o accessi venosi, NON esegue medicazioni di lesioni, NON raccoglie il consenso informato, NON decide la contenzione, NON fornisce informazioni cliniche o diagnosi. Se la risposta attribuisce all'OSS competenze che non sono sue, segnalalo e penalizza.

FORMATO: rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo e senza backtick markdown. Schema:
{
  "voto": <intero 0-30>,
  "giudizio": "Completa | Buona | Da rivedere",
  "feedback": "Correzione completa: cosa ha detto di corretto, cosa manca, eventuali errori comuni.",
  "collegamento": "1-2 frasi sul collegamento con un altro tema dell'assistenza OSS.",
  "domanda_approfondimento": "Una breve domanda collegata di approfondimento.",
  "sintesi_vocale": "Frase breve da leggere ad alta voce: voto e giudizio in una frase."
}`

function normalizzaEsito(obj) {
  let voto = Math.round(Number(obj?.voto))
  if (!Number.isFinite(voto)) voto = 0
  voto = Math.max(0, Math.min(30, voto))
  const giudizio = obj?.giudizio || (voto >= 24 ? 'Completa' : voto >= 18 ? 'Buona' : 'Da rivedere')
  return {
    voto,
    giudizio,
    feedback: obj?.feedback || '',
    collegamento: obj?.collegamento || '',
    domanda_approfondimento: obj?.domanda_approfondimento || '',
    sintesi_vocale: obj?.sintesi_vocale || `Hai totalizzato ${voto} su 30. ${giudizio}.`
  }
}

export async function correggiOrale({ domanda, argomento, puntiChiave = [], erroriComuni = [], rispostaModello = '', rispostaData }) {
  const userText = `DOMANDA: ${domanda}
ARGOMENTO: ${argomento}

PUNTI CHIAVE ATTESI:
${puntiChiave.map((p, i) => `${i + 1}. ${p}`).join('\n')}

ERRORI COMUNI DA NON COMMETTERE:
${erroriComuni.map(e => `- ${e}`).join('\n')}

RISPOSTA MODELLO DI RIFERIMENTO:
${rispostaModello}

RISPOSTA DATA DAL CANDIDATO (trascritta dalla voce):
"${rispostaData}"

Valuta la risposta del candidato secondo la rubrica e rispondi SOLO con l'oggetto JSON richiesto.`

  const messages = [
    { role: 'system', content: SYSTEM_ORALE },
    { role: 'user', content: userText }
  ]

  let raw = await callGroq(messages, 800)
  try {
    return normalizzaEsito(parseJsonObject(raw))
  } catch {
    const correctionMessages = [
      ...messages,
      { role: 'assistant', content: raw },
      { role: 'user', content: 'La risposta non è un JSON valido. Rispondi SOLO con l\'oggetto JSON richiesto, senza testo, senza backtick markdown.' }
    ]
    raw = await callGroq(correctionMessages, 800)
    try {
      return normalizzaEsito(parseJsonObject(raw))
    } catch {
      throw new Error('Non sono riuscito a valutare la risposta, riprova.')
    }
  }
}
