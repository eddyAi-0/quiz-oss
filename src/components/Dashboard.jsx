import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { getProgress, clearProgress } from '../utils/storage'
import domandeData from '../data/domande.json'

const SEZIONI_BREVI = {
  'Anatomia e Fisiologia': 'Anatomia',
  'Igiene e Prevenzione': 'Igiene',
  'Assistenza alla Persona': 'Assistenza',
  'Farmacologia di Base': 'Farmacologia',
  'Legislazione Sanitaria': 'Legislazione',
  'Primo Soccorso': 'Primo Soccorso',
  'Nutrizione e Alimentazione': 'Nutrizione',
  'Salute Mentale e Relazione d\'Aiuto': 'Salute Mentale',
  'Rapporto e Comunicazione Assistenziale': 'Comunicazione'
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}

function pctColor(pct) {
  if (pct >= 80) return 'var(--success)'
  if (pct >= 60) return 'var(--warning)'
  return 'var(--error)'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [refreshKey, setRefreshKey] = useState(0)
  const data = useMemo(() => getProgress(), [refreshKey])

  const { sessions, sectionStats, streak } = data

  const totalDomande = Object.values(sectionStats).reduce((s, v) => s + v.total, 0)
  const totalCorrette = Object.values(sectionStats).reduce((s, v) => s + v.correct, 0)
  const pctGlobale = totalDomande > 0 ? Math.round((totalCorrette / totalDomande) * 100) : 0

  const sectionData = domandeData.metadata.sezioni.map(s => {
    const st = sectionStats[s] || { total: 0, correct: 0 }
    const pct = st.total > 0 ? Math.round((st.correct / st.total) * 100) : 0
    return { name: SEZIONI_BREVI[s] || s, fullName: s, pct, total: st.total, correct: st.correct }
  })

  const worstSections = [...sectionData]
    .filter(s => s.total >= 3)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3)

  function handleClear() {
    if (confirm('Cancellare tutti i progressi? L\'operazione non è reversibile.')) {
      clearProgress()
      setRefreshKey(k => k + 1)
    }
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const d = payload[0].payload
      return (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: '0.85rem' }}>
          <p style={{ fontWeight: 600 }}>{d.fullName}</p>
          <p style={{ color: pctColor(d.pct) }}>{d.pct}% ({d.correct}/{d.total})</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="page">
      <div className="page-header row-between">
        <div>
          <h1 className="page-title">Progressi</h1>
          <p className="page-subtitle">Il tuo percorso di studio</p>
        </div>
      </div>

      {/* Stats globali */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{pctGlobale}%</div>
          <div className="stat-label">Corrette globale</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalDomande}</div>
          <div className="stat-label">Domande risposte</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: streak.current > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
            {streak.current}🔥
          </div>
          <div className="stat-label">Giorni streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{sessions.length}</div>
          <div className="stat-label">Sessioni totali</div>
        </div>
      </div>

      {/* Grafico sezioni */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>📊 Performance per sezione</h3>
        {totalDomande === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <p>Fai qualche quiz per vedere le statistiche!</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sectionData} margin={{ top: 5, right: 5, left: -20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                angle={-40}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={v => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {sectionData.map((entry, i) => (
                  <Cell key={i} fill={pctColor(entry.pct)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top 3 peggiori sezioni */}
      {worstSections.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>⚠️ Sezioni dove sbagli di più</h3>
          {worstSections.map((s, i) => (
            <div key={s.fullName} className="worst-section" style={{ marginBottom: '1rem' }}>
              <div className="row-between">
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{s.fullName}</p>
                  <p className="text-muted" style={{ fontSize: '0.82rem' }}>
                    {s.correct}/{s.total} corrette
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 700, color: pctColor(s.pct), fontSize: '1.2rem' }}>
                    {s.pct}%
                  </span>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm mt-1"
                onClick={() => navigate(`/tutor/${encodeURIComponent(s.fullName)}`)}
              >
                🤖 Chiedi al Tutor AI
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Storico sessioni */}
      <div className="card">
        <h3 style={{ marginBottom: '0.75rem' }}>📅 Ultime sessioni</h3>
        {sessions.length === 0 ? (
          <p className="text-muted">Nessuna sessione ancora completata.</p>
        ) : (
          sessions.slice(0, 10).map(s => {
            const pct = Math.round((s.correct / s.total) * 100)
            return (
              <div key={s.id} className="session-item">
                <div>
                  <div className="row" style={{ gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span className={`badge ${s.mode === 'simulazione' ? 'badge-warning' : 'badge-primary'}`}>
                      {s.mode === 'simulazione' ? '⏱️ Sim.' : '📚 Quiz'}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {formatDate(s.date)}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.sezione}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontWeight: 700, color: pctColor(pct), fontSize: '1.1rem' }}>{pct}%</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {s.correct}/{s.total}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {totalDomande > 0 && (
        <button
          className="btn btn-outline"
          style={{ borderColor: 'var(--error)', color: 'var(--error)', fontSize: '0.9rem', minHeight: '44px' }}
          onClick={handleClear}
        >
          🗑️ Cancella tutti i progressi
        </button>
      )}
    </div>
  )
}
