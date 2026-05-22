import { supabase } from '../lib/supabase'

const KEY = 'quiz-oss-data'

let _syncPending = 0
let _abortSync = false
let _clearChannel = null

// Chiamato da AuthContext quando il canale Realtime è pronto
export function setClearChannel(channel) {
  _clearChannel = channel
}

function emitSync(delta, error = false) {
  _syncPending = Math.max(0, _syncPending + delta)
  window.dispatchEvent(new CustomEvent('quiz-sync', { detail: { pending: _syncPending, error } }))
}

async function retryUpsert(fn, maxAttempts = 3) {
  let lastErr
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (_abortSync) return
    try {
      const result = await fn()
      if (!result.error) return
      lastErr = result.error
    } catch (e) {
      lastErr = e
    }
    if (attempt < maxAttempts - 1) {
      await new Promise(r => setTimeout(r, 500 * (2 ** attempt)))
    }
  }
  throw lastErr
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultState()
    return { ...defaultState(), ...JSON.parse(raw) }
  } catch {
    return defaultState()
  }
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

function defaultState() {
  return {
    sessions: [],
    sectionStats: {},
    streak: { current: 0, lastStudyDate: null },
    wrongAnswers: {}
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function calcStreak(streak) {
  const today = todayStr()
  const last = streak.lastStudyDate

  if (!last) return { current: 1, lastStudyDate: today }

  if (last === today) return streak

  const lastDate = new Date(last)
  const todayDate = new Date(today)
  const diffDays = Math.round((todayDate - lastDate) / 86400000)

  if (diffDays === 1) return { current: streak.current + 1, lastStudyDate: today }
  return { current: 1, lastStudyDate: today }
}

export function rebuildSectionStats(sessions) {
  const stats = {}
  for (const session of sessions) {
    if (!Array.isArray(session.questions)) continue
    for (const q of session.questions) {
      const sec = q.sezione
      if (!stats[sec]) stats[sec] = { total: 0, correct: 0 }
      stats[sec].total += 1
      if (q.isCorrect) stats[sec].correct += 1
    }
  }
  return stats
}

export async function saveSession({ mode, sezione, questions }) {
  const data = load()

  const correct = questions.filter(q => q.isCorrect).length
  const session = {
    id: Date.now(),
    date: todayStr(),
    mode,
    sezione: sezione || 'Tutte',
    total: questions.length,
    correct,
    questions
  }

  data.sessions = [session, ...data.sessions].slice(0, 50)

  questions.forEach(q => {
    const sec = q.sezione
    if (!data.sectionStats[sec]) {
      data.sectionStats[sec] = { total: 0, correct: 0 }
    }
    data.sectionStats[sec].total += 1
    if (q.isCorrect) data.sectionStats[sec].correct += 1
  })

  data.streak = calcStreak(data.streak)

  questions.forEach(q => {
    if (!q.isCorrect) {
      const prev = data.wrongAnswers[q.id] ?? {
        id: q.id, sezione: q.sezione, count: 0, lastWrong: null, answers: [],
        recovered: false, responseTimes: [], avgResponseTime: null
      }
      const prevTimes = prev.responseTimes ?? []
      const newResponseTimes = q.responseTime != null
        ? [...prevTimes, q.responseTime].slice(-10)
        : prevTimes
      const avgResponseTime = newResponseTimes.length > 0
        ? Math.round(newResponseTimes.reduce((a, b) => a + b, 0) / newResponseTimes.length)
        : null
      data.wrongAnswers[q.id] = {
        ...prev,
        count: prev.count + 1,
        lastWrong: todayStr(),
        answers: [...prev.answers, q.selected].slice(-10),
        recovered: false,
        responseTimes: newResponseTimes,
        avgResponseTime
      }
    } else if (data.wrongAnswers[q.id]) {
      data.wrongAnswers[q.id] = { ...data.wrongAnswers[q.id], recovered: true }
    }
  })

  save(data)

  // Sync asincrono su Supabase se autenticato
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    emitSync(+1)
    retryUpsert(() => supabase.from('quiz_sessions').upsert({ ...session, user_id: user.id }))
      .then(() => emitSync(-1))
      .catch(err => { console.error('Sync Supabase fallita dopo 3 tentativi:', err); emitSync(-1, true) })

    emitSync(+1)
    retryUpsert(() => supabase.from('profiles').upsert({
      id: user.id,
      streak_current: data.streak.current,
      streak_last_study_date: data.streak.lastStudyDate,
      wrong_answers: data.wrongAnswers
    }))
      .then(() => emitSync(-1))
      .catch(err => { console.error('Sync Supabase fallita dopo 3 tentativi:', err); emitSync(-1, true) })
  }

  return session
}

export async function updateStreakToday() {
  const data = load()
  data.streak = calcStreak(data.streak)
  save(data)

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    emitSync(+1)
    retryUpsert(() => supabase.from('profiles').upsert({
      id: user.id,
      streak_current: data.streak.current,
      streak_last_study_date: data.streak.lastStudyDate
    }))
      .then(() => emitSync(-1))
      .catch(err => { console.error('Sync Supabase fallita dopo 3 tentativi:', err); emitSync(-1, true) })
  }
}

export function getProgress() {
  return load()
}

export function getWrongAnswers() {
  return load().wrongAnswers
}

export function getUrgencyScore(entry) {
  const daysSince = entry.lastWrong
    ? Math.max(0, Math.round((new Date(todayStr()) - new Date(entry.lastWrong)) / 86400000))
    : 0
  const avgTime = entry.avgResponseTime ?? 0
  return (entry.count * 10) + (entry.recovered ? -5 : 0) + (30 / (daysSince + 1)) + (Math.min(avgTime, 60) * 0.5)
}

export async function clearProgress() {
  // Blocca tutti i retryUpsert pendenti così non riscrivono dati vecchi su Supabase
  _abortSync = true

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { error: delErr } = await supabase.from('quiz_sessions').delete().eq('user_id', user.id)
    if (delErr) console.error('[clear] quiz_sessions delete fallita:', delErr.message)

    const { error: profErr } = await supabase.from('profiles').upsert({
      id: user.id,
      streak_current: 0,
      streak_last_study_date: null,
      wrong_answers: {}
    })
    if (profErr) console.error('[clear] profiles upsert fallita:', profErr.message)
  }
  localStorage.removeItem(KEY)

  // Notifica tutti i dispositivi connessi via broadcast (non richiede Realtime sul DB)
  if (_clearChannel) {
    _clearChannel.send({ type: 'broadcast', event: 'progress-cleared', payload: {} })
      .catch(() => {})
  }

  // Riabilita la sync dopo che tutti i possibili retry (max 1500ms) sono terminati
  setTimeout(() => { _abortSync = false }, 2000)
}

export function exportProgress() {
  const data = load()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `quiz-oss-progressi-${todayStr()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importProgress(jsonString) {
  try {
    const parsed = JSON.parse(jsonString)
    if (!parsed.sessions || !parsed.sectionStats) throw new Error('Formato non valido')
    save({ ...defaultState(), ...parsed })
    return true
  } catch {
    return false
  }
}

export function getWorstSections(n = 3) {
  const { sectionStats } = load()
  return Object.entries(sectionStats)
    .filter(([, s]) => s.total >= 3)
    .map(([name, s]) => ({
      name,
      pct: Math.round((s.correct / s.total) * 100),
      total: s.total,
      correct: s.correct
    }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, n)
}

// Ricava wrongAnswers dalle sessioni (fallback se profiles.wrong_answers non esiste)
function buildWrongAnswersFromSessions(sessions) {
  const result = {}
  const sorted = [...sessions].sort((a, b) => a.id - b.id)
  for (const session of sorted) {
    if (!Array.isArray(session.questions)) continue
    for (const q of session.questions) {
      if (!q.isCorrect) {
        const prev = result[q.id] ?? {
          id: q.id, sezione: q.sezione, count: 0,
          lastWrong: null, answers: [], recovered: false,
          responseTimes: [], avgResponseTime: null
        }
        const newTimes = q.responseTime != null
          ? [...(prev.responseTimes ?? []), q.responseTime].slice(-10)
          : (prev.responseTimes ?? [])
        result[q.id] = {
          ...prev,
          count: prev.count + 1,
          lastWrong: session.date ?? prev.lastWrong,
          answers: [...prev.answers, q.selected].slice(-10),
          recovered: false,
          responseTimes: newTimes,
          avgResponseTime: newTimes.length > 0
            ? Math.round(newTimes.reduce((a, b) => a + b, 0) / newTimes.length)
            : null
        }
      } else if (result[q.id]) {
        result[q.id] = { ...result[q.id], recovered: true }
      }
    }
  }
  return result
}

// Carica le sessioni localStorage su Supabase (chiamato al login)
export async function syncToSupabase(userId) {
  const { sessions, streak, wrongAnswers } = load()

  if (sessions.length > 0) {
    const { error: sessErr } = await supabase.from('quiz_sessions').upsert(
      sessions.map(s => ({ ...s, user_id: userId })),
      { onConflict: 'id' }
    )
    if (sessErr) console.error('[sync] quiz_sessions upsert fallita:', sessErr.message)
  }

  const { error: profErr } = await supabase.from('profiles').upsert({
    id: userId,
    streak_current: streak.current,
    streak_last_study_date: streak.lastStudyDate,
    wrong_answers: wrongAnswers
  })
  if (profErr) console.error('[sync] profiles upsert fallita:', profErr.message)
}

// Scarica le sessioni Supabase e fa merge con localStorage (chiamato al login)
export async function syncFromSupabase(userId) {
  const local = load()

  const [sessResult, profResult] = await Promise.all([
    supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false }),
    supabase
      .from('profiles')
      .select('streak_current, streak_last_study_date, wrong_answers')
      .eq('id', userId)
      .single()
  ])

  if (sessResult.error) console.error('[sync] lettura quiz_sessions fallita:', sessResult.error.message)
  if (profResult.error && profResult.error.code !== 'PGRST116') console.error('[sync] lettura profiles fallita:', profResult.error.message)

  const remoteSessions = sessResult.data ?? []
  const profile = profResult.data

  // Rileva clearProgress chiamato su un altro dispositivo.
  // Segnale 1: quiz_sessions vuota su Supabase ma locale ha sessioni
  //   (il DELETE in clearProgress è andato a buon fine)
  // Segnale 2: profiles.wrong_answers esplicitamente {} ma locale ha errori
  //   (fallback per quando il DELETE fallisce per RLS mancante)
  // Basta uno dei due segnali per azzerare il localStorage.
  const sessionsCleared = !sessResult.error &&
    remoteSessions.length === 0 &&
    local.sessions.length > 0
  const profileExplicitlyEmpty = !profResult.error &&
    profile !== null &&
    profile.wrong_answers !== null &&
    typeof profile.wrong_answers === 'object' &&
    Object.keys(profile.wrong_answers).length === 0 &&
    Object.keys(local.wrongAnswers).length > 0
  if (sessionsCleared || profileExplicitlyEmpty) {
    save(defaultState())
    window.dispatchEvent(new CustomEvent('quiz-data-updated'))
    return
  }

  // Sessioni: deduplica per id, priorità al remoto
  const localById = Object.fromEntries(local.sessions.map(s => [s.id, s]))
  const remoteById = Object.fromEntries(remoteSessions.map(s => [s.id, s]))
  const mergedSessions = Object.values({ ...localById, ...remoteById })
    .sort((a, b) => b.id - a.id)
    .slice(0, 50)

  // wrongAnswers: usa profiles se disponibile, altrimenti ricostruisce dalle sessioni
  const profileWrong = profile?.wrong_answers
  const remoteWrong = (profileWrong && Object.keys(profileWrong).length > 0)
    ? profileWrong
    : buildWrongAnswersFromSessions(remoteSessions)

  const mergedWrong = { ...local.wrongAnswers }
  for (const [id, remote] of Object.entries(remoteWrong)) {
    const loc = mergedWrong[id]
    if (!loc) {
      mergedWrong[id] = remote
    } else {
      const useRemote = remote.count > loc.count
      mergedWrong[id] = {
        ...loc,
        count: Math.max(loc.count, remote.count),
        lastWrong: (!loc.lastWrong || (remote.lastWrong && remote.lastWrong > loc.lastWrong))
          ? remote.lastWrong : loc.lastWrong,
        recovered: loc.recovered && remote.recovered,
        responseTimes: useRemote ? (remote.responseTimes ?? []) : (loc.responseTimes ?? []),
        avgResponseTime: useRemote ? (remote.avgResponseTime ?? null) : (loc.avgResponseTime ?? null)
      }
    }
  }

  // Streak: prendi il valore più alto
  const remoteStreak = profile
    ? { current: profile.streak_current ?? 0, lastStudyDate: profile.streak_last_study_date ?? null }
    : { current: 0, lastStudyDate: null }
  const streak = local.streak.current >= remoteStreak.current ? local.streak : remoteStreak

  save({
    sessions: mergedSessions,
    sectionStats: rebuildSectionStats(mergedSessions),
    streak,
    wrongAnswers: mergedWrong
  })

  window.dispatchEvent(new CustomEvent('quiz-data-updated'))
}
