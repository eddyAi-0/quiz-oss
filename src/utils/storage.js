import { supabase } from '../lib/supabase'

const KEY = 'quiz-oss-data'

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
    streak: { current: 0, lastStudyDate: null }
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

  save(data)

  // Sync asincrono su Supabase se autenticato
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    supabase.from('quiz_sessions')
      .upsert({ ...session, user_id: user.id })
      .then()

    supabase.from('profiles')
      .upsert({
        id: user.id,
        streak_current: data.streak.current,
        streak_last_study_date: data.streak.lastStudyDate
      })
      .then()
  }

  return session
}

export async function updateStreakToday() {
  const data = load()
  data.streak = calcStreak(data.streak)
  save(data)

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    supabase.from('profiles')
      .upsert({
        id: user.id,
        streak_current: data.streak.current,
        streak_last_study_date: data.streak.lastStudyDate
      })
      .then()
  }
}

export function getProgress() {
  return load()
}

export async function clearProgress() {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase.from('quiz_sessions').delete().eq('user_id', user.id)
    await supabase.from('profiles').upsert({
      id: user.id,
      streak_current: 0,
      streak_last_study_date: null
    })
  }
  localStorage.removeItem(KEY)
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

// Carica le sessioni localStorage su Supabase (chiamato al login)
export async function syncToSupabase(userId) {
  const { sessions, streak } = load()

  if (sessions.length > 0) {
    await supabase.from('quiz_sessions').upsert(
      sessions.map(s => ({ ...s, user_id: userId })),
      { onConflict: 'id' }
    )
  }

  await supabase.from('profiles').upsert({
    id: userId,
    streak_current: streak.current,
    streak_last_study_date: streak.lastStudyDate
  })
}

// Scarica tutte le sessioni Supabase e ricostruisce localStorage (chiamato al login)
export async function syncFromSupabase(userId) {
  const [{ data: sessions }, { data: profile }] = await Promise.all([
    supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false }),
    supabase
      .from('profiles')
      .select('streak_current, streak_last_study_date')
      .eq('id', userId)
      .single()
  ])

  if (!sessions) return

  const sectionStats = rebuildSectionStats(sessions)

  const streak = profile
    ? { current: profile.streak_current ?? 0, lastStudyDate: profile.streak_last_study_date ?? null }
    : { current: 0, lastStudyDate: null }

  // Mantieni cap a 50 in localStorage per performance UI
  save({
    sessions: sessions.slice(0, 50),
    sectionStats,
    streak
  })
}
