import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDomandeOrali } from '../utils/domande'
import { getOraleAnswers } from '../utils/oraleStorage'
import RobotIcon from './RobotIcon'
import OraleResponder from './OraleResponder'
import { IconList, IconTrophy, IconArrowRight, IconOrale } from './icons'

export default function ProvaOrale() {
  const data = useDomandeOrali()
  const [done, setDone] = useState(() => getOraleAnswers())
  const [current, setCurrent] = useState(null)
  const [resultReady, setResultReady] = useState(false)

  // Aggiorna le svolte se arriva una sync da un altro dispositivo
  useEffect(() => {
    function onUpd() { setDone(getOraleAnswers()) }
    window.addEventListener('orale-data-updated', onUpd)
    return () => window.removeEventListener('orale-data-updated', onUpd)
  }, [])

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

  const domande = data.domande
  const svolteCount = Object.keys(done).length
  const tutteSvolte = svolteCount >= domande.length

  function pescaProssima() {
    const nonSvolte = domande.filter(d => !done[d.id])
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
          <p className="page-subtitle">{svolteCount} / {domande.length} domande svolte</p>
        </div>
        <Link to="/orale/svolte" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
          <IconList size={16} />Svolte
        </Link>
      </div>

      {!current && (
        tutteSvolte ? (
          <div className="card text-center">
            <div className="empty-state-icon" style={{ lineHeight: 0, color: 'var(--warning)' }}><IconTrophy size={48} /></div>
            <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              Hai svolto tutte le domande!
            </p>
            <p className="text-muted" style={{ marginBottom: '1rem' }}>
              Ripassa partendo dalle più deboli: sono già in cima alla lista delle svolte.
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
          </div>
        )
      )}

      {current && (
        <>
          <OraleResponder key={current.id} domanda={current} autoSpeakQuestion onSaved={handleSaved} />
          {resultReady && (
            <button className="btn btn-primary" onClick={pescaProssima}>
              {svolteCount >= domande.length
                ? <><IconTrophy size={18} />Hai finito! Vedi le svolte</>
                : <>Prossima domanda<IconArrowRight size={18} /></>}
            </button>
          )}
        </>
      )}
    </div>
  )
}
