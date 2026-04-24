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

function calcStreak(streak) {
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

export function saveSession({ mode, sezione, questions }) {
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
  return session
}

export function updateStreakToday() {
  const data = load()
  data.streak = calcStreak(data.streak)
  save(data)
}

export function getProgress() {
  return load()
}

export function clearProgress() {
  localStorage.removeItem(KEY)
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
