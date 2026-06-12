import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Mostra l'esito di una valutazione orale (voto, giudizio, feedback, collegamento).
// esito: { voto, giudizio, feedback, collegamento, domandaApprofondimento }
export default function OraleEsito({ esito }) {
  const sufficiente = esito.voto >= 18
  return (
    <div className={`feedback-box ${sufficiente ? 'correct' : 'wrong'} fade-in`}>
      <div className="row-between" style={{ marginBottom: '0.5rem' }}>
        <span className={`voto-badge ${sufficiente ? 'voto-ok' : 'voto-ko'}`}>{esito.voto}/30</span>
        <span style={{ fontWeight: 700 }}>{esito.giudizio}</span>
      </div>

      {esito.feedback && (
        <div className="feedback-explanation orale-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{esito.feedback}</ReactMarkdown>
        </div>
      )}

      {esito.collegamento && (
        <p className="orale-extra"><strong>🔗 Collegamento:</strong> {esito.collegamento}</p>
      )}

      {esito.domandaApprofondimento && (
        <p className="orale-extra"><strong>💡 Approfondisci:</strong> {esito.domandaApprofondimento}</p>
      )}
    </div>
  )
}
