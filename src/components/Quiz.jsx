import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { saveSession, getWrongAnswers, getUrgencyScore } from '../utils/storage'
import { shuffle } from '../utils/shuffle'
import { useDomande } from '../utils/domande'
import QuestionCard from './QuestionCard'

const TUTTE = 'Tutte le sezioni'
const LIMITI = [10, 20, 30, 'Tutte']

export default function Quiz() {
  const domandeData = useDomande()
  if (!domandeData) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <p>Caricamento domande...</p>
        </div>
      </div>
    )
  }
  return <QuizInner domandeData={domandeData} />
}

function QuizInner({ domandeData }) {
  const location = useLocation()
  const SEZIONI = domandeData.metadata.sezioni

  const [wrongAnswers, setWrongAnswers] = useState(() => getWrongAnswers())
  const [wrongOnly, setWrongOnly] = useState(location.state?.filterErrors ?? false)

  const activeWrongIds = useMemo(
    () => new Set(Object.values(wrongAnswers).filter(w => !w.recovered).map(w => w.id)),
    [wrongAnswers]
  )
  const wrongCount = activeWrongIds.size

  const questionStartRef = useRef(null)

  useEffect(() => {
    questionStartRef.current = Date.now()
  }, [index])

  const [sezione, setSezione] = useState(TUTTE)
  const [limit, setLimit] = useState(20)
  const [activeQuestions, setActiveQuestions] = useState(() => {
    if (location.state?.filterErrors) {
      const wa = getWrongAnswers()
      return domandeData.domande
        .filter(d => wa[d.id] && !wa[d.id].recovered)
        .sort((a, b) => getUrgencyScore(wa[b.id]) - getUrgencyScore(wa[a.id]))
    }
    return shuffle(domandeData.domande).slice(0, 20)
  })
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [sessionAnswers, setSessionAnswers] = useState([])
  const [sessionDone, setSessionDone] = useState(false)

  function applyFilter(s, lim, onlyWrong, wrongMap) {
    let pool = s === TUTTE ? domandeData.domande : domandeData.domande.filter(d => d.sezione === s)
    if (onlyWrong) {
      return pool
        .filter(d => wrongMap[d.id] && !wrongMap[d.id].recovered)
        .sort((a, b) => getUrgencyScore(wrongMap[b.id]) - getUrgencyScore(wrongMap[a.id]))
    }
    const shuffled = shuffle(pool)
    return lim === 'Tutte' ? shuffled : shuffled.slice(0, lim)
  }

  function changeSezione(s) {
    setSezione(s)
    setActiveQuestions(applyFilter(s, limit, wrongOnly, wrongAnswers))
    resetSession()
  }

  function changeLimit(val) {
    const lim = val === 'Tutte' ? 'Tutte' : Number(val)
    setLimit(lim)
    setActiveQuestions(applyFilter(sezione, lim, wrongOnly, wrongAnswers))
    resetSession()
  }

  function toggleWrongOnly() {
    const newVal = !wrongOnly
    const fresh = getWrongAnswers()
    setWrongOnly(newVal)
    setWrongAnswers(fresh)
    setActiveQuestions(applyFilter(sezione, limit, newVal, fresh))
    resetSession()
  }

  function resetSession() {
    setIndex(0)
    setSelected(null)
    setAnswered(false)
    setSessionAnswers([])
    setSessionDone(false)
  }

  const currentQ = activeQuestions[index]

  function handleAnswer(i) {
    const responseTime = Math.round((Date.now() - questionStartRef.current) / 1000)
    setSelected(i)
    setAnswered(true)
    const isCorrect = i === currentQ.risposta_corretta
    setSessionAnswers(prev => [
      ...prev,
      { id: currentQ.id, sezione: currentQ.sezione, isCorrect, selected: i, responseTime }
    ])
  }

  function handleNext() {
    if (index + 1 >= activeQuestions.length) {
      saveSession({
        mode: 'pratica',
        sezione: sezione === TUTTE ? null : sezione,
        questions: sessionAnswers
      }).catch(err => console.error('Errore salvataggio sessione:', err))
      setWrongAnswers(getWrongAnswers())
      setSessionDone(true)
    } else {
      setIndex(prev => prev + 1)
      setSelected(null)
      setAnswered(false)
    }
  }

  if (sessionDone) {
    const correct = sessionAnswers.filter(a => a.isCorrect).length
    const pct = Math.round((correct / sessionAnswers.length) * 100)
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Risultati sessione</h1>
        </div>

        <div className={`result-circle ${pct >= 60 ? 'pass' : 'fail'}`}>
          <span className="result-circle-pct">{pct}%</span>
          <span className="result-circle-label">{correct}/{sessionAnswers.length}</span>
        </div>

        <div className="card text-center">
          <p style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {pct >= 80 ? '🌟 Ottimo lavoro!' : pct >= 60 ? '👍 Buon risultato!' : '📖 Continua a studiare!'}
          </p>
          <p className="text-muted">
            Hai risposto correttamente a {correct} domande su {sessionAnswers.length}
          </p>
        </div>

        <button className="btn btn-primary" onClick={resetSession}>
          🔄 Nuova sessione
        </button>
      </div>
    )
  }

  if (!currentQ) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <p>Nessuna domanda disponibile per questa sezione.</p>
        </div>
      </div>
    )
  }

  const progress = (index / activeQuestions.length) * 100

  return (
    <div className="page">
      <div className="page-header row-between">
        <div>
          <h1 className="page-title">Quiz</h1>
          <p className="page-subtitle">{activeQuestions.length} domande disponibili</p>
        </div>
      </div>

      <div className="select-wrap">
        <select value={sezione} onChange={e => changeSezione(e.target.value)}>
          <option>{TUTTE}</option>
          {SEZIONI.map(s => <option key={s}>{s}</option>)}
        </select>
        <span className="select-arrow">▼</span>
      </div>

      {!wrongOnly && (
        <div className="select-wrap">
          <select value={limit} onChange={e => changeLimit(e.target.value)}>
            {LIMITI.map(l => (
              <option key={l} value={l}>{l === 'Tutte' ? 'Tutte le domande' : `${l} domande`}</option>
            ))}
          </select>
          <span className="select-arrow">▼</span>
        </div>
      )}

      {(wrongCount > 0 || wrongOnly) && (
        <button
          className={`btn ${wrongOnly ? 'btn-primary' : 'btn-outline'} btn-sm`}
          style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={toggleWrongOnly}
        >
          ❌ Solo errori
          <span style={{
            background: wrongOnly ? 'rgba(255,255,255,0.25)' : 'var(--error)',
            color: '#fff',
            borderRadius: '999px',
            padding: '1px 8px',
            fontSize: '0.78rem',
            fontWeight: 700
          }}>
            {wrongCount}
          </span>
        </button>
      )}

      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>
        Domanda {index + 1} di {activeQuestions.length}
      </p>

      <QuestionCard
        q={currentQ}
        index={index}
        total={activeQuestions.length}
        onAnswer={handleAnswer}
        answered={answered}
        selected={selected}
        showFeedback
      />

      {answered && (
        <button className="btn btn-primary fade-in" onClick={handleNext}>
          {index + 1 >= activeQuestions.length ? '📊 Vedi risultati' : 'Prossima domanda →'}
        </button>
      )}
    </div>
  )
}
