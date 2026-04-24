import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { spiegaMeglio, chatTutor, generaDomandeExtra } from '../utils/anthropic'
import { getWorstSections } from '../utils/storage'
import domandeData from '../data/domande.json'

const SEZIONI = domandeData.metadata.sezioni

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function TypingDots() {
  return (
    <div className="chat-bubble assistant loading pulse" style={{ width: 60 }}>
      ● ● ●
    </div>
  )
}

function ExtraQuestionCard({ q, index }) {
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)

  function handleAnswer(i) {
    setSelected(i)
    setAnswered(true)
  }

  const isCorrect = answered && selected === q.risposta_corretta

  return (
    <div className="card card-sm fade-in" style={{ border: '1px solid var(--border)' }}>
      <p style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
        Domanda extra {index + 1}
      </p>
      <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{q.domanda}</p>
      {q.opzioni?.map((opt, i) => {
        let cls = 'option-btn'
        if (answered) {
          if (i === q.risposta_corretta) cls += ' correct'
          else if (i === selected) cls += ' selected-wrong'
        }
        return (
          <button key={i} className={cls} disabled={answered} onClick={() => handleAnswer(i)}
            style={{ padding: '0.7rem 1rem', minHeight: '48px', fontSize: '0.9rem' }}
          >
            <span style={{ fontWeight: 600, marginRight: '0.4rem', color: 'var(--text-muted)' }}>
              {String.fromCharCode(65 + i)})
            </span>
            {opt}
          </button>
        )
      })}
      {answered && (
        <div className={`feedback-box ${isCorrect ? 'correct' : 'wrong'} fade-in`}>
          <div className="feedback-label" style={{ fontSize: '1rem' }}>
            {isCorrect ? '✅ Corretto!' : '❌ Sbagliato'}
          </div>
          <div className="feedback-explanation" style={{ fontSize: '0.88rem' }}>{q.spiegazione}</div>
        </div>
      )}
    </div>
  )
}

export default function TutorAI() {
  const { sezione: sezioneParam } = useParams()
  const location = useLocation()
  const domandaCtx = location.state?.domanda

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedSezione, setSelectedSezione] = useState(sezioneParam ? decodeURIComponent(sezioneParam) : '')
  const [extraQuestions, setExtraQuestions] = useState([])
  const [loadingExtra, setLoadingExtra] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  const worstSections = useMemo(() => getWorstSections(3), [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (initialized) return
    setInitialized(true)

    if (domandaCtx) {
      handleSpiegaMeglio(domandaCtx)
    } else if (sezioneParam) {
      const decoded = decodeURIComponent(sezioneParam)
      const welcome = {
        role: 'assistant',
        content: `Ciao! Sono il tuo tutor OSS. Vediamo insieme la sezione **${decoded}**.\n\nCosa vuoi approfondire? Puoi chiedermi qualsiasi cosa su questo argomento, oppure clicca il pulsante per generare 3 domande di pratica.`
      }
      setMessages([welcome])
    } else {
      const welcome = {
        role: 'assistant',
        content: `Ciao! Sono il tuo tutor per il concorso OSS. 👋\n\nPosso aiutarti a:\n• Chiarire argomenti che non hai capito bene\n• Spiegare le risposte sbagliate\n• Generare domande di pratica extra\n• Rispondere a qualsiasi domanda sulle materie OSS\n\nSu cosa vuoi lavorare oggi?`
      }
      setMessages([welcome])
    }
  }, [])

  async function handleSpiegaMeglio(domanda) {
    setLoading(true)
    setError(null)

    const userMsg = `Spiegami la domanda: "${domanda.domanda}"`
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])

    try {
      const risposta = await spiegaMeglio({
        domanda: domanda.domanda,
        opzioni: domanda.opzioni,
        rispostaCorretta: domanda.risposta_corretta,
        spiegazione: domanda.spiegazione,
        rispostaData: domanda.rispostaData ?? 0
      })
      setMessages(prev => [...prev, { role: 'assistant', content: risposta }])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const sezioneHint = selectedSezione ? `[Sezione: ${selectedSezione}] ` : ''
    const userMsg = { role: 'user', content: sezioneHint + text }

    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))
      const risposta = await chatTutor(apiMessages)
      setMessages(prev => [...prev, { role: 'assistant', content: risposta }])
    } catch (e) {
      setError(e.message)
      setMessages(prev => prev.slice(0, -1))
      setInput(text)
    } finally {
      setLoading(false)
    }
  }

  async function handleGeneraExtra() {
    const target = selectedSezione || (worstSections[0]?.name ?? SEZIONI[0])
    setLoadingExtra(true)
    setExtraQuestions([])
    setError(null)

    const domandeSezSecz = domandeData.domande
      .filter(d => d.sezione === target)
      .slice(0, 5)
      .map(d => d.spiegazione)

    try {
      const qs = await generaDomandeExtra(target, domandeSezSecz)
      setExtraQuestions(qs)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingExtra(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const targetSezione = selectedSezione || (worstSections[0]?.name)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 64px)' }}>
      <div className="page" style={{ paddingBottom: '0.5rem', flexShrink: 0 }}>
        <div className="row-between">
          <div>
            <h1 className="page-title">Tutor AI</h1>
            <p className="page-subtitle">Powered by Groq · Llama 3.3</p>
          </div>
        </div>

        <div className="select-wrap" style={{ marginBottom: '0.75rem' }}>
          <select value={selectedSezione} onChange={e => setSelectedSezione(e.target.value)}>
            <option value="">Nessuna sezione specifica</option>
            {SEZIONI.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="select-arrow">▼</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleGeneraExtra}
            disabled={loadingExtra || loading}
            style={{ flex: 1 }}
          >
            {loadingExtra ? '⏳ Generando...' : '✨ Genera 3 domande extra'}
          </button>
        </div>

        {targetSezione && (
          <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            Sezione: {targetSezione}
          </p>
        )}
      </div>

      {error && (
        <div className="feedback-box wrong" style={{ margin: '0 1rem 0.75rem' }}>
          <strong>Errore:</strong> {error}
        </div>
      )}

      {/* Extra questions */}
      {extraQuestions.length > 0 && (
        <div style={{ padding: '0 1rem', overflowY: 'auto', maxHeight: '40vh', flexShrink: 0 }}>
          <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>
            ✨ Domande extra — {targetSezione}
          </h3>
          {extraQuestions.map((q, i) => (
            <ExtraQuestionCard key={i} q={q} index={i} />
          ))}
        </div>
      )}

      {/* Chat */}
      <div className="chat-messages" ref={null}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role} fade-in`}>
            {m.content}
          </div>
        ))}
        {loading && <TypingDots />}
        <div ref={chatEndRef} />
      </div>

      <div className="chat-input-row">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Fai una domanda al tutor..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={loading}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  )
}
