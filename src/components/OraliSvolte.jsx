import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDomandeOrali } from '../utils/domande'
import { getOraleAnswers } from '../utils/oraleStorage'
import OraleResponder from './OraleResponder'
import OraleEsito from './OraleEsito'
import { IconArrowLeft, IconList, IconOrale, IconCheck, IconRepeat } from './icons'

export default function OraliSvolte() {
  const data = useDomandeOrali()
  const [answers, setAnswers] = useState(() => getOraleAnswers())
  const [openId, setOpenId] = useState(null)
  const [repeating, setRepeating] = useState(false)

  useEffect(() => {
    function onUpd() { setAnswers(getOraleAnswers()) }
    window.addEventListener('orale-data-updated', onUpd)
    return () => window.removeEventListener('orale-data-updated', onUpd)
  }, [])

  // Ordinate dal voto più basso al più alto (i punti deboli per primi)
  const lista = useMemo(
    () => Object.values(answers).sort((a, b) => a.voto - b.voto),
    [answers]
  )

  const bankById = useMemo(() => {
    const map = {}
    for (const d of (data?.domande ?? [])) map[d.id] = d
    return map
  }, [data])

  function apri(id) {
    setOpenId(id)
    setRepeating(false)
  }

  function handleSaved(entry) {
    // Aggiorna la lista e il suo ordinamento per voto. Restiamo in modalità "ripeti"
    // così l'esito appena prodotto e la sintesi vocale restano visibili e udibili.
    setAnswers(prev => ({ ...prev, [entry.id]: entry }))
  }

  // ─── Dettaglio ───
  if (openId != null) {
    const entry = answers[openId]
    const full = bankById[openId]

    return (
      <div className="page">
        <div className="page-header">
          <button className="btn btn-ghost btn-sm" onClick={() => { setOpenId(null); setRepeating(false) }}>
            <IconArrowLeft size={16} />Torna alla lista
          </button>
        </div>

        {!entry ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ lineHeight: 0 }}><IconList size={44} /></div>
            <p>Domanda non più disponibile.</p>
          </div>
        ) : repeating && full ? (
          <OraleResponder key={`rep-${openId}`} domanda={full} autoSpeakQuestion onSaved={handleSaved} />
        ) : (
          <>
            <div className="card">
              <span className="badge badge-primary" style={{ marginBottom: '0.5rem' }}>{entry.argomento}</span>
              <p style={{ fontWeight: 600, fontSize: '1.05rem', lineHeight: 1.5 }}>{entry.domanda}</p>
            </div>

            <div className="card card-sm">
              <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>La tua risposta</p>
              <p style={{ fontSize: '0.92rem' }}>{entry.rispostaData}</p>
            </div>

            <OraleEsito esito={entry} />

            {full?.risposta_modello && (
              <div className="card">
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)' }}>
                  <IconCheck size={18} />Risposta modello
                </h3>
                <p style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>{full.risposta_modello}</p>
              </div>
            )}

            {full && (
              <button className="btn btn-primary" onClick={() => setRepeating(true)}>
                <IconRepeat size={18} />Ripeti la domanda
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  // ─── Lista ───
  return (
    <div className="page">
      <div className="page-header row-between">
        <div>
          <h1 className="page-title">Domande orali svolte</h1>
          <p className="page-subtitle">
            {lista.length === 0 ? 'Nessuna ancora' : `${lista.length} svolte · dal voto più basso`}
          </p>
        </div>
        <Link to="/orale" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
          <IconOrale size={16} />Prova
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ lineHeight: 0 }}><IconList size={44} /></div>
          <p>Non hai ancora svolto domande orali.</p>
          <Link to="/orale" className="btn btn-primary" style={{ textDecoration: 'none', marginTop: '1rem', display: 'inline-flex' }}>
            <IconOrale size={18} />Inizia la Prova Orale
          </Link>
        </div>
      ) : (
        lista.map(entry => {
          const sufficiente = entry.voto >= 18
          return (
            <button key={entry.id} className="orale-item" onClick={() => apri(entry.id)}>
              <div className="orale-item-text">
                <span className="badge badge-primary" style={{ marginBottom: '0.35rem' }}>{entry.argomento}</span>
                <p className="orale-item-domanda">{entry.domanda}</p>
              </div>
              <span className={`voto-badge ${sufficiente ? 'voto-ok' : 'voto-ko'}`}>{entry.voto}/30</span>
            </button>
          )
        })
      )}
    </div>
  )
}
