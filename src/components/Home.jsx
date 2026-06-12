import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { IconPratica, IconOrale, IconSimulazione, IconList } from './icons'

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()

  function go(path) { navigate(path) }
  function onKey(path) {
    return (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(path) } }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Preparazione OSS</h1>
        <p className="page-subtitle">Scegli come allenarti oggi</p>
      </div>

      <div className="mode-grid">
        {/* Prova Pratica */}
        <div className="mode-card" role="button" tabIndex={0} onClick={() => go('/quiz')} onKeyDown={onKey('/quiz')}>
          <div className="mode-card-icon"><IconPratica size={46} /></div>
          <div className="mode-card-title">Prova Pratica</div>
          <p className="mode-card-desc">
            Quiz a scelta multipla con spiegazioni e simulazione d'esame a tempo.
          </p>
          <div className="mode-card-actions">
            <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); go('/quiz') }}>
              <IconPratica size={16} />Quiz
            </button>
            <button className="btn btn-outline btn-sm" onClick={e => { e.stopPropagation(); go('/simulazione') }}>
              <IconSimulazione size={16} />Simulazione
            </button>
          </div>
        </div>

        {/* Prova Orale */}
        <div className="mode-card" role="button" tabIndex={0} onClick={() => go('/orale')} onKeyDown={onKey('/orale')}>
          <div className="mode-card-icon"><IconOrale size={46} /></div>
          <div className="mode-card-title">Prova Orale</div>
          <p className="mode-card-desc">
            Rispondi a voce: il tutor legge la domanda, valuta da 0 a 30 e ti corregge.
            {!user && ' (richiede accesso)'}
          </p>
          <div className="mode-card-actions">
            <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); go('/orale') }}>
              <IconOrale size={16} />Inizia
            </button>
            <button className="btn btn-outline btn-sm" onClick={e => { e.stopPropagation(); go('/orale/svolte') }}>
              <IconList size={16} />Svolte
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
