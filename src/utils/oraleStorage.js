import { supabase } from '../lib/supabase'
import { retryUpsert, emitSync, broadcastDataUpdate } from './storage'

// Persistenza delle risposte orali svolte: stesso pattern di storage.js
// (salvataggio locale + sync su profiles.oral_answers, con fallback locale se offline).
// Mappa { [idDomanda]: { id, argomento, domanda, rispostaData, voto, giudizio,
//                        feedback, collegamento, domandaApprofondimento, date } }
const KEY = 'quiz-oss-orale'

export function getOraleAnswers() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveMap(map) {
  localStorage.setItem(KEY, JSON.stringify(map))
}

// Merge per data: vince l'ultima risposta (date più recente).
function mergeByDate(local, remote) {
  const merged = { ...remote }
  let needsPush = false
  for (const [id, entry] of Object.entries(local)) {
    const r = remote[id]
    const localIsNewer = !r || (entry.date && (!r.date || entry.date > r.date))
    if (localIsNewer) {
      merged[id] = entry
      needsPush = true
    }
  }
  return { merged, needsPush }
}

// Salva (o sostituisce) una risposta orale e sincronizza su Supabase se autenticato.
export function saveOraleAnswer(entry) {
  const map = getOraleAnswers()
  map[entry.id] = entry
  saveMap(map)
  window.dispatchEvent(new CustomEvent('orale-data-updated'))

  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return
    emitSync(+1)
    retryUpsert(() => supabase.from('profiles').upsert({ id: user.id, oral_answers: getOraleAnswers() }))
      .then(() => { emitSync(-1); broadcastDataUpdate() })
      .catch(err => { console.error('[orale] salvataggio sync fallito:', err); emitSync(-1, true) })
  })

  return entry
}

// Scarica le risposte orali da Supabase e fa merge con il locale (login/realtime/poll).
export async function syncOrale(userId) {
  const local = getOraleAnswers()

  const { data, error } = await supabase
    .from('profiles')
    .select('oral_answers')
    .eq('id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[orale] lettura oral_answers fallita:', error.message)
    return
  }

  const remote = (data?.oral_answers && typeof data.oral_answers === 'object') ? data.oral_answers : {}
  const { merged, needsPush } = mergeByDate(local, remote)
  saveMap(merged)

  if (needsPush) {
    emitSync(+1)
    retryUpsert(() => supabase.from('profiles').upsert({ id: userId, oral_answers: merged }))
      .then(() => emitSync(-1))
      .catch(err => { console.error('[orale] sync upsert fallita:', err); emitSync(-1, true) })
  }

  window.dispatchEvent(new CustomEvent('orale-data-updated'))
}

// Azzera le risposte orali (locale + Supabase).
export async function clearOrale() {
  localStorage.removeItem(KEY)
  window.dispatchEvent(new CustomEvent('orale-data-updated'))

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { error } = await supabase.from('profiles').upsert({ id: user.id, oral_answers: {} })
    if (error) console.error('[orale] clear upsert fallita:', error.message)
    broadcastDataUpdate()
  }
}
