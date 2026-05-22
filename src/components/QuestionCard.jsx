import { useNavigate } from 'react-router-dom'

export default function QuestionCard({
  q,
  index,
  total = null,
  onAnswer,
  answered,
  selected,
  showFeedback = true
}) {
  const navigate = useNavigate()
  const isCorrect = answered && selected === q.risposta_corretta

  return (
    <div className="card fade-in">
      <div className="row-between mb-1">
        <span className={`diff-${q.difficolta}`}>{q.difficolta?.toUpperCase()}</span>
        {total != null && (
          <span className="text-muted" style={{ fontSize: '0.9rem' }}>
            {index + 1} / {total}
          </span>
        )}
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
          if (showFeedback && answered) {
            if (i === q.risposta_corretta) cls += ' correct'
            else if (i === selected) cls += ' selected-wrong'
          } else if (!showFeedback && selected === i) {
            cls += ' selected'
          }
          return (
            <button
              key={i}
              className={cls}
              disabled={showFeedback && answered}
              onClick={() => onAnswer(i)}
            >
              <span style={{ fontWeight: 600, marginRight: '0.5rem', color: 'var(--text-muted)' }}>
                {String.fromCharCode(65 + i)})
              </span>
              {opzione}
            </button>
          )
        })}
      </div>

      {showFeedback && answered && (
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
