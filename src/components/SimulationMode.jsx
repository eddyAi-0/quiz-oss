import { useState, useEffect, useRef, useCallback } from 'react'
import domandeData from '../data/domande.json'
import { saveSession } from '../utils/storage'

const TOTAL_Q = 15
const TOTAL_SEC = 25 * 60

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function TimerDisplay({ seconds }) {
  const cls = seconds < 60 ? 'danger' : seconds < 300 ? 'warning' : 'normal'
  return (
    <div className={`timer ${cls}`}>
      ⏱️ {formatTime(seconds)}
    </div>
  )
}

function StartScreen({ onStart }) {
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Simulazione Esame</h1>
        <p className="page-subtitle">Modalità esame realistica</p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>📋 Regole della simulazione</h3>
        <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, color: 'var(--text)' }}>
          <li><strong>15 domande</strong> casuali da tutte le sezioni</li>
          <li>Tempo totale: <strong>25 minuti</strong></li>
          <li>Nessun feedback durante il quiz</li>
          <li>I risultati vengono mostrati alla fine</li>
          <li>Il timer scade automaticamente</li>
        </ul>
      </div>

      <div className="card" style={{ background: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
        <p style={{ color: 'var(--primary-dark)', fontWeight: 500 }}>
          💡 Tip: Per superare l'esame OSS serve generalmente il <strong>60%</strong> delle risposte corrette (9 su 15).
        </p>
      </div>

      <button className="btn btn-primary" onClick={onStart}>
        🚀 Inizia simulazione
      </button>
    </div>
  )
}

function ResultScreen({ questions, answers, elapsed, onRestart }) {
  const correct = answers.filter((a, i) => a === questions[i].risposta_corretta).length
  const total = questions.length
  const pct = Math.round((correct / total) * 100)
  const passed = pct >= 60

  const saved = useRef(false)
  useEffect(() => {
    if (saved.current) return
    saved.current = true
    saveSession({
      mode: 'simulazione',
      sezione: null,
      questions: questions.map((q, i) => ({
        id: q.id,
        sezione: q.sezione,
        isCorrect: answers[i] === q.risposta_corretta,
        selected: answers[i]
      }))
    })
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Risultati Simulazione</h1>
        <p className="page-subtitle">Tempo usato: {formatTime(elapsed)}</p>
      </div>

      <div className={`result-circle ${passed ? 'pass' : 'fail'}`}>
        <span className="result-circle-pct">{pct}%</span>
        <span className="result-circle-label">{correct}/{total}</span>
      </div>

      <div className="card text-center mb-2">
        <p style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          {passed ? '🎉 PROMOSSO!' : '❌ NON SUPERATO'}
        </p>
        <p className="text-muted">
          {passed
            ? `Ottimo! Hai risposto correttamente a ${correct} domande su ${total}`
            : `Ti servono almeno 9 risposte corrette. Ne hai azzeccate ${correct}.`}
        </p>
      </div>

      <div className="card card-sm">
        <h3 style={{ marginBottom: '0.75rem' }}>Dettaglio risposte</h3>
        {questions.map((q, i) => {
          const isRight = answers[i] === q.risposta_corretta
          const userAns = answers[i]
          return (
            <div key={q.id} style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: i < questions.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="row" style={{ marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{isRight ? '✅' : '❌'}</span>
                <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>{q.sezione}</span>
              </div>
              <p style={{ fontWeight: 500, marginBottom: '0.4rem', fontSize: '0.95rem' }}>{q.domanda}</p>
              {!isRight && userAns !== null && (
                <p style={{ fontSize: '0.88rem', color: 'var(--error)' }}>
                  Tua risposta: {String.fromCharCode(65 + userAns)}) {q.opzioni[userAns]}
                </p>
              )}
              {!isRight && userAns === null && (
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Non risposta</p>
              )}
              <p style={{ fontSize: '0.88rem', color: 'var(--success)', fontWeight: 600 }}>
                Corretta: {String.fromCharCode(65 + q.risposta_corretta)}) {q.opzioni[q.risposta_corretta]}
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                {q.spiegazione}
              </p>
            </div>
          )
        })}
      </div>

      <button className="btn btn-primary" onClick={onRestart}>
        🔄 Nuova simulazione
      </button>
    </div>
  )
}

export default function SimulationMode() {
  const [phase, setPhase] = useState('start')
  const [questions] = useState(() => shuffle(domandeData.domande).slice(0, TOTAL_Q))
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState(Array(TOTAL_Q).fill(null))
  const [selected, setSelected] = useState(null)
  const [timeLeft, setTimeLeft] = useState(TOTAL_SEC)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  const submit = useCallback((finalAnswers, elapsedSec) => {
    clearInterval(timerRef.current)
    setElapsed(elapsedSec)
    setPhase('result')
  }, [])

  useEffect(() => {
    if (phase !== 'quiz') return

    const start = Date.now() - (TOTAL_SEC - timeLeft) * 1000

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000)
      const remaining = TOTAL_SEC - elapsed
      if (remaining <= 0) {
        setTimeLeft(0)
        setAnswers(prev => {
          submit(prev, TOTAL_SEC)
          return prev
        })
      } else {
        setTimeLeft(remaining)
      }
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [phase])

  function startQuiz() {
    setPhase('quiz')
    setCurrentIdx(0)
    setAnswers(Array(TOTAL_Q).fill(null))
    setSelected(null)
    setTimeLeft(TOTAL_SEC)
  }

  function handleSelect(i) {
    setSelected(i)
    const newAnswers = [...answers]
    newAnswers[currentIdx] = i
    setAnswers(newAnswers)
  }

  function handleNext() {
    const newAnswers = [...answers]
    newAnswers[currentIdx] = selected
    setAnswers(newAnswers)

    if (currentIdx + 1 >= TOTAL_Q) {
      submit(newAnswers, TOTAL_SEC - timeLeft)
    } else {
      setCurrentIdx(prev => prev + 1)
      setSelected(newAnswers[currentIdx + 1])
    }
  }

  function restart() {
    clearInterval(timerRef.current)
    setPhase('start')
    setCurrentIdx(0)
    setAnswers(Array(TOTAL_Q).fill(null))
    setSelected(null)
    setTimeLeft(TOTAL_SEC)
    setElapsed(0)
  }

  if (phase === 'start') return <StartScreen onStart={startQuiz} />
  if (phase === 'result') return <ResultScreen questions={questions} answers={answers} elapsed={elapsed} onRestart={restart} />

  const q = questions[currentIdx]
  const progress = ((currentIdx) / TOTAL_Q) * 100

  return (
    <div className="page">
      <div className="row-between mb-2">
        <TimerDisplay seconds={timeLeft} />
        <span className="text-muted" style={{ fontSize: '0.9rem' }}>
          {currentIdx + 1}/{TOTAL_Q}
        </span>
      </div>

      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="card fade-in" style={{ marginTop: '1rem' }}>
        <div className="row mb-1">
          <span className="badge badge-primary">{q.sezione}</span>
          <span className={`diff-${q.difficolta}`}>{q.difficolta?.toUpperCase()}</span>
        </div>

        <p style={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.5, marginBottom: '1.25rem' }}>
          {q.domanda}
        </p>

        {q.opzioni.map((opzione, i) => (
          <button
            key={i}
            className={`option-btn${selected === i ? ' correct' : ''}`}
            onClick={() => handleSelect(i)}
            style={selected === i ? { borderColor: 'var(--primary)', background: 'var(--primary-light)', color: 'var(--primary-dark)' } : {}}
          >
            <span style={{ fontWeight: 600, marginRight: '0.5rem', color: 'var(--text-muted)' }}>
              {String.fromCharCode(65 + i)})
            </span>
            {opzione}
          </button>
        ))}
      </div>

      <button
        className="btn btn-primary"
        onClick={handleNext}
      >
        {currentIdx + 1 >= TOTAL_Q ? '📊 Termina e vedi risultati' : 'Prossima →'}
      </button>

      <button
        className="btn btn-outline mt-1"
        onClick={() => submit(answers, TOTAL_SEC - timeLeft)}
        style={{ fontSize: '0.9rem', minHeight: '44px' }}
      >
        Consegna anticipata
      </button>
    </div>
  )
}
