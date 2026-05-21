import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import domandeData from '../data/domande.json'
import { saveSession } from '../utils/storage'

const SEZIONI = domandeData.metadata.sezioni
const TUTTE = 'Tutte le sezioni'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

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
                  state: { domanda: q }
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
  const [sezione, setSezione] = useState(TUTTE)
  const [activeQuestions, setActiveQuestions] = useState(() => shuffle(domandeData.domande))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [sessionAnswers, setSessionAnswers] = useState([])
  const [sessionDone, setSessionDone] = useState(false)

  function changeSezione(s) {
    setSezione(s)
    const pool = s === TUTTE
      ? domandeData.domande
      : domandeData.domande.filter(d => d.sezione === s)
    setActiveQuestions(shuffle(pool))
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
      })
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
