import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDomandeOrali } from '../utils/domande'
import { getOraleAnswers } from '../utils/oraleStorage'
import { useSpeech } from '../utils/useSpeech'
import RobotIcon from './RobotIcon'
import OraleResponder from './OraleResponder'
import { IconList, IconTrophy, IconArrowRight, IconOrale, IconVolume } from './icons'

const INFO_TOPIC = 'Informatica di base'
const SCOPES = {
  generale: { label: 'Generale', test: d => d.argomento !== INFO_TOPIC },
  informatica: { label: 'Informatica', test: d => d.argomento === INFO_TOPIC },
  tutto: { label: 'Tutto', test: () => true },
}
const SCOPE_ORDER = ['generale', 'informatica', 'tutto']
const SCOPE_KEY = 'quiz-oss-orale-scope'

export default function ProvaOrale() {
  const data = useDomandeOrali()
  const { synthesisSupported, voices, voiceName, setVoice, speak } = useSpeech()
  const [done, setDone] = useState(() => getOraleAnswers())
  const [scope, setScope] = useState(() => {
    try { const s = localStorage.getItem(SCOPE_KEY); return SCOPES[s] ? s : 'tutto' } catch { return 'tutto' }
  })
  const [current, setCurrent] = useState(null)
  const [resultReady, setResultReady] = useState(false)

  // Aggiorna le svolte se arriva una sync da un altro dispositivo
  useEffect(() => {
    function onUpd() { setDone(getOraleAnswers()) }
    window.addEventListener('orale-data-updated', onUpd)
    return () => window.removeEventListener('orale-data-updated', onUpd)
  }, [])

  function changeScope(key) {
    setScope(key)
    try { localStorage.setItem(SCOPE_KEY, key) } catch { /* ignore */ }
  }

  if (!data) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon" style={{ lineHeight: 0 }}><IconOrale size={44} /></div>
          <p>Caricamento banca orale...</p>
        </div>
      </div>
    )
  }

  // Filtro per sezione scelta dall'utente
  const domandeScope = data.domande.filter(SCOPES[scope].test)
  const svolteCount = Object.values(done).filter(SCOPES[scope].test).length
  const tutteSvolte = svolteCount >= domandeScope.length

  function pescaProssima() {
    const nonSvolte = domandeScope.filter(d => !done[d.id])
    if (nonSvolte.length === 0) {
      setCurrent(null)
      return
    }
    const pick = nonSvolte[Math.floor(Math.random() * nonSvolte.length)]
    setResultReady(false)
    setCurrent(pick)
  }

  function handleSaved(entry) {
    setDone(prev => ({ ...prev, [entry.id]: entry }))
    setResultReady(true)
  }

  return (
    <div className="page">
      <div className="page-header row-between">
        <div>
          <h1 className="page-title">Prova Orale</h1>
          <p className="page-subtitle">{svolteCount} / {domandeScope.length} domande svolte</p>
        </div>
        <Link to="/orale/svolte" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
          <IconList size={16} />Svolte
        </Link>
      </div>

      {!current && (
        <>
          <div className="orale-scope">
            <label className="orale-voice-label">Su cosa esercitarti</label>
            <div className="chip-row">
              {SCOPE_ORDER.map(key => (
                <button
                  key={key}
                  className={`chip${scope === key ? ' active' : ''}`}
                  onClick={() => changeScope(key)}
                >
                  {SCOPES[key].label}
                </button>
              ))}
            </div>
          </div>

          {tutteSvolte ? (
            <div className="card text-center">
              <div className="empty-state-icon" style={{ lineHeight: 0, color: 'var(--warning)' }}><IconTrophy size={48} /></div>
              <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                Hai svolto tutte le domande di questa sezione!
              </p>
              <p className="text-muted" style={{ marginBottom: '1rem' }}>
                Ripassa partendo dalle più deboli, oppure scegli un'altra sezione qui sopra.
              </p>
              <Link to="/orale/svolte" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                <IconList size={18} />Vai al ripasso
              </Link>
            </div>
          ) : (
            <div className="orale-start">
              <button className="robot-btn" onClick={pescaProssima} aria-label="Pesca una domanda">
                <RobotIcon size={120} className="robot-bob" />
              </button>
              <p className="text-muted text-center" style={{ marginTop: '1rem' }}>
                Tocca il robot: ti leggerà una domanda d'esame a voce.
              </p>

              {synthesisSupported && voices.length > 0 && (
                <div className="orale-voice">
                  <label className="orale-voice-label">Voce del tutor</label>
                  <div className="select-wrap" style={{ marginBottom: '0.5rem' }}>
                    <select value={voiceName} onChange={e => setVoice(e.target.value)}>
                      <option value="">Automatica (consigliata)</option>
                      {voices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                    </select>
                    <span className="select-arrow">▼</span>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => speak('Ciao! Sarò io a leggerti le domande della prova orale.')}
                  >
                    <IconVolume size={16} />Prova voce
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {current && (
        <>
          <OraleResponder key={current.id} domanda={current} autoSpeakQuestion onSaved={handleSaved} />
          {resultReady && (
            <button className="btn btn-primary" onClick={pescaProssima}>
              {tutteSvolte
                ? <><IconTrophy size={18} />Hai finito! Vedi le svolte</>
                : <>Prossima domanda<IconArrowRight size={18} /></>}
            </button>
          )}
        </>
      )}
    </div>
  )
}
