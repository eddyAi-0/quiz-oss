import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import domandeData from '../data/domande.json'
import { saveSession, getWrongAnswers } from '../utils/storage'
import { shuffle } from '../utils/shuffle'

const SEZIONI = domandeData.metadata.sezioni
const TUTTE = 'Tutte le sezioni'
const LIMITI = [10, 20, 30, 'Tutte']

function QuestionCard({ q, index, total, onAnswer, answered, selected }) {
  const navigate = useNavigate()
  const isCorrect = answered && selected === q.risposta_corretta
  const diffClass = `diff-${q.difficolta}`

  return (
    <div className="card fade-in">
      <div className="row-between mb-1">
        <span className={diffClass}>{q.difficolta?.toUpperCase()}</span>
        <span className="text-muted" style={{ fontSize: '0.9rem' }}>
          {index + 1} / {total}
        </span>
      </div>

      <span className="badge badge-primary" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>
        {q.sezione}
      </span>

      <p style={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.5, marginBottom: '1.25rem' }}>
        {q.domanda}
      </p>

      <div>
        {q.opzioni.map((opzione, i) => {
          let cls = 'option-btn'
          if (answered) {
            if (i === q.risposta_corretta) cls += ' correct'
            else if (i === selected) cls += ' selected-wrong'
          }
          return (
            <button
              key={i}
              className={cls}
              disabled={answered}
              onClick={() => !answered && onAnswer(i)}
            >
              <span style={{ fontWeight: 600, marginRight: '0.5rem', color: 'var(--text-muted)' }}>
                {String.fromCharCode(65 + i)})
              </span>
              {opzione}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className={`feedback-box ${isCorrect ? 'correct' : 'wrong'} fade-in`}>
          <div className="feedback-label">
            {isCorrect ? '✅ Risposta corretta!' : '❌ Risposta sbagliata'}
          </div>
          <div className="feedback-explanation">{q.spiegazione}</div>

          {!isCorrect && (
            <button
              className="btn btn-ghost btn-sm mt-2"
              onClick={() =>
                navigate(`/tutor/${encodeURIComponent(q.sezione)}`, {
                  state: { domanda: { ...q, rispostaData: selected } }
                })
              }
            >
              🤖 Spiegami meglio
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Quiz() {
  const location = useLocation()

  const [wrongAnswers, setWrongAnswers] = useState(() => getWrongAnswers())
  const [wrongOnly, setWrongOnly] = useState(location.state?.filterErrors ?? false)

  const activeWrongIds = useMemo(
    () => new Set(Object.values(wrongAnswers).filter(w => !w.recovered).map(w => w.id)),
    [wrongAnswers]
  )
  const wrongCount = activeWrongIds.size

  const [sezione, setSezione] = useState(TUTTE)
  const [limit, setLimit] = useState(20)
  const [activeQuestions, setActiveQuestions] = useState(() => {
    if (location.state?.filterErrors) {
      const wa = getWrongAnswers()
      const ids = new Set(Object.values(wa).filter(w => !w.recovered).map(w => w.id))
      return shuffle(domandeData.domande.filter(d => ids.has(d.id)))
    }
    return shuffle(domandeData.domande).slice(0, 20)
  })
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [sessionAnswers, setSessionAnswers] = useState([])
  const [sessionDone, setSessionDone] = useState(false)

  function applyFilter(s, lim, onlyWrong, wrongIds) {
    let pool = s === TUTTE ? domandeData.domande : domandeData.domande.filter(d => d.sezione === s)
    if (onlyWrong) pool = pool.filter(d => wrongIds.has(d.id))
    const shuffled = shuffle(pool)
    if (onlyWrong) return shuffled
    return lim === 'Tutte' ? shuffled : shuffled.slice(0, lim)
  }

  function changeSezione(s) {
    setSezione(s)
    setActiveQuestions(applyFilter(s, limit, wrongOnly, activeWrongIds))
    resetSession()
  }

  function changeLimit(val) {
    const lim = val === 'Tutte' ? 'Tutte' : Number(val)
    setLimit(lim)
    setActiveQuestions(applyFilter(sezione, lim, wrongOnly, activeWrongIds))
    resetSession()
  }

  function toggleWrongOnly() {
    const newVal = !wrongOnly
    const fresh = getWrongAnswers()
    const freshIds = new Set(Object.values(fresh).filter(w => !w.recovered).map(w => w.id))
    setWrongOnly(newVal)
    setWrongAnswers(fresh)
    setActiveQuestions(applyFilter(sezione, limit, newVal, freshIds))
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
    setSelected(i)
    setAnswered(true)

    const isCorrect = i === currentQ.risposta_corretta
    setSessionAnswers(prev => [
      ...prev,
      {
        id: currentQ.id,
        sezione: currentQ.sezione,
        isCorrect,
        selected: i
      }
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

  const progress = ((index) / activeQuestions.length) * 100

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
      />

      {answered && (
        <button className="btn btn-primary fade-in" onClick={handleNext}>
          {index + 1 >= activeQuestions.length ? '📊 Vedi risultati' : 'Prossima domanda →'}
        </button>
      )}
    </div>
  )
}
