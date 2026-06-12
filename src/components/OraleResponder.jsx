import { useState, useEffect } from 'react'
import { correggiOrale } from '../utils/groq'
import { saveOraleAnswer } from '../utils/oraleStorage'
import { useSpeech } from '../utils/useSpeech'
import OraleEsito from './OraleEsito'
import { IconVolume, IconOrale, IconStop, IconSend, IconLoader } from './icons'

// Gestisce l'interazione su UNA domanda orale: legge la domanda, raccoglie la
// risposta (voce + fallback scritto), la fa valutare a Groq, salva e mostra l'esito.
// È condiviso tra la Prova Orale e il "Ripeti" nella sezione delle svolte.
// Props: domanda (oggetto completo dalla banca), autoSpeakQuestion, onSaved(entry)
export default function OraleResponder({ domanda, autoSpeakQuestion = true, onSaved }) {
  const {
    recognitionSupported, listening, interim, transcript, error: speechError,
    startListening, stopListening, resetTranscript, speak, stopSpeaking
  } = useSpeech()

  const [answer, setAnswer] = useState('')
  const [evaluating, setEvaluating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Reset + lettura della domanda a ogni nuova domanda (il componente è keyed per id)
  useEffect(() => {
    resetTranscript()
    setAnswer('')
    setResult(null)
    setError(null)
    if (autoSpeakQuestion) speak(domanda.domanda)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // La trascrizione vocale alimenta il campo risposta (resta modificabile a mano)
  useEffect(() => {
    if (transcript) setAnswer(transcript)
  }, [transcript])

  function toggleMic() {
    if (listening) {
      stopListening()
    } else {
      stopSpeaking()
      resetTranscript()
      setAnswer('')
      startListening()
    }
  }

  async function handleInvia() {
    const testo = answer.trim()
    if (!testo || evaluating) return
    stopListening()
    stopSpeaking()
    setEvaluating(true)
    setError(null)

    try {
      const esito = await correggiOrale({
        domanda: domanda.domanda,
        argomento: domanda.argomento,
        puntiChiave: domanda.punti_chiave,
        erroriComuni: domanda.errori_comuni,
        rispostaModello: domanda.risposta_modello,
        rispostaData: testo
      })

      const entry = {
        id: domanda.id,
        argomento: domanda.argomento,
        domanda: domanda.domanda,
        rispostaData: testo,
        voto: esito.voto,
        giudizio: esito.giudizio,
        feedback: esito.feedback,
        collegamento: esito.collegamento,
        domandaApprofondimento: esito.domanda_approfondimento,
        date: new Date().toISOString()
      }

      saveOraleAnswer(entry)
      setResult(entry)
      onSaved?.(entry)
      speak(esito.sintesi_vocale)
    } catch (e) {
      setError(e.message)
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div>
      <div className="card">
        <div className="row-between" style={{ marginBottom: '0.5rem' }}>
          <span className="badge badge-primary">{domanda.argomento}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => speak(domanda.domanda)}
            title="Rileggi la domanda"
          >
            <IconVolume size={16} />Rileggi
          </button>
        </div>
        <p style={{ fontWeight: 600, fontSize: '1.05rem', lineHeight: 1.5 }}>{domanda.domanda}</p>
      </div>

      {!result && (
        <>
          {!recognitionSupported && (
            <div className="feedback-box" style={{ background: 'var(--warning-light)', color: 'var(--warning)', border: '1px solid var(--warning)' }}>
              Il riconoscimento vocale non è disponibile su questo browser. Puoi scrivere la risposta qui sotto. Per rispondere a voce usa Chrome.
            </div>
          )}

          <button
            className={`btn mic-btn ${listening ? 'mic-on' : ''}`}
            onClick={toggleMic}
            disabled={!recognitionSupported || evaluating}
          >
            {listening
              ? <><IconStop size={18} />Ferma registrazione</>
              : <><IconOrale size={18} />Rispondi a voce</>}
          </button>

          {listening && (
            <p className="text-muted mic-hint pulse" style={{ marginTop: '0.5rem' }}>
              In ascolto... {interim}
            </p>
          )}

          {speechError && (
            <p className="text-muted" style={{ color: 'var(--warning)', marginTop: '0.5rem' }}>{speechError}</p>
          )}

          <textarea
            className="chat-input orale-textarea"
            placeholder="La tua risposta (puoi correggere o scrivere a mano)..."
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            rows={5}
            disabled={evaluating}
          />

          {error && (
            <div className="feedback-box wrong" style={{ marginTop: '0.5rem' }}>
              <strong>Errore:</strong> {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleInvia}
            disabled={evaluating || !answer.trim()}
          >
            {evaluating
              ? <><IconLoader size={18} className="spin" />Valutazione...</>
              : <><IconSend size={18} />Invia risposta</>}
          </button>
        </>
      )}

      {result && (
        <>
          <div className="card card-sm">
            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>La tua risposta</p>
            <p style={{ fontSize: '0.92rem' }}>{result.rispostaData}</p>
          </div>
          <OraleEsito esito={result} />
          <button
            className="btn btn-outline btn-sm"
            onClick={() => speak(`Hai totalizzato ${result.voto} su 30. ${result.giudizio}.`)}
          >
            <IconVolume size={16} />Riascolta sintesi
          </button>
        </>
      )}
    </div>
  )
}
