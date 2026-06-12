import { useState, useRef, useEffect, useCallback } from 'react'

// Web Speech API (nessun servizio esterno): sintesi vocale per leggere i testi
// e riconoscimento vocale per trascrivere la risposta. Lingua it-IT, target Chrome.
const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null

const synthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
const recognitionSupported = !!SpeechRecognition
const VOICE_KEY = 'quiz-oss-voice'

// Voci italiane percepite come più dolci/femminili, in ordine di preferenza.
const GENTLE_VOICES = ['google ital', 'federica', 'alice', 'eloisa', 'paola']

function pickGentleItalianVoice() {
  if (!synthesisSupported) return null
  const voices = window.speechSynthesis.getVoices()
  const italian = voices.filter(v => v.lang?.toLowerCase().startsWith('it'))
  for (const pref of GENTLE_VOICES) {
    const match = italian.find(v => v.name.toLowerCase().includes(pref))
    if (match) return match
  }
  return italian.find(v => v.lang === 'it-IT') || italian[0] || null
}

function describeError(code) {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Permesso al microfono negato. Abilitalo nelle impostazioni del browser.'
    case 'no-speech':
      return 'Non ho sentito nulla. Riprova oppure scrivi la risposta.'
    case 'audio-capture':
      return 'Nessun microfono rilevato.'
    case 'network':
      return 'Errore di rete nel riconoscimento vocale.'
    default:
      return 'Riconoscimento vocale non riuscito. Puoi scrivere la risposta.'
  }
}

export function useSpeech() {
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState(null)
  const [voices, setVoices] = useState([])
  const [voiceName, setVoiceName] = useState(() => {
    try { return localStorage.getItem(VOICE_KEY) || '' } catch { return '' }
  })

  const recognitionRef = useRef(null)
  const finalRef = useRef('')

  // Pre-carica e tiene aggiornato l'elenco delle voci (arrivano in modo asincrono)
  useEffect(() => {
    if (!synthesisSupported) return
    const refresh = () => {
      const all = window.speechSynthesis.getVoices()
      const italian = all.filter(v => v.lang?.toLowerCase().startsWith('it'))
      setVoices(italian.length ? italian : all)
    }
    refresh()
    window.speechSynthesis.addEventListener?.('voiceschanged', refresh)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', refresh)
  }, [])

  const setVoice = useCallback((name) => {
    setVoiceName(name)
    try { localStorage.setItem(VOICE_KEY, name) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!recognitionSupported) return
    const rec = new SpeechRecognition()
    rec.lang = 'it-IT'
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onresult = (event) => {
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        if (res.isFinal) {
          finalRef.current = (finalRef.current + ' ' + res[0].transcript).trim()
        } else {
          interimText += res[0].transcript
        }
      }
      setTranscript(finalRef.current)
      setInterim(interimText)
    }

    rec.onerror = (event) => {
      setError(describeError(event.error))
      setListening(false)
    }

    rec.onend = () => {
      setListening(false)
      setInterim('')
    }

    recognitionRef.current = rec
    return () => {
      rec.onresult = rec.onerror = rec.onend = null
      try { rec.abort() } catch { /* ignore */ }
    }
  }, [])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || listening) return
    setError(null)
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch {
      // start() può lanciare se già avviato: ignora
    }
  }, [listening])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return
    try { recognitionRef.current.stop() } catch { /* ignore */ }
    setListening(false)
    setInterim('')
  }, [])

  const resetTranscript = useCallback(() => {
    finalRef.current = ''
    setTranscript('')
    setInterim('')
  }, [])

  const speak = useCallback((text) => {
    if (!synthesisSupported || !text) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'it-IT'
    let saved = null
    try { saved = localStorage.getItem(VOICE_KEY) } catch { /* ignore */ }
    const all = window.speechSynthesis.getVoices()
    const voice = (saved && all.find(v => v.name === saved)) || pickGentleItalianVoice()
    if (voice) utt.voice = voice
    utt.rate = 0.95
    utt.pitch = 1.2
    utt.onend = () => setSpeaking(false)
    utt.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(utt)
  }, [])

  const stopSpeaking = useCallback(() => {
    if (!synthesisSupported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  // Pulizia globale allo smontaggio (cambio schermata)
  useEffect(() => {
    return () => {
      if (synthesisSupported) window.speechSynthesis.cancel()
      try { recognitionRef.current?.abort() } catch { /* ignore */ }
    }
  }, [])

  return {
    recognitionSupported,
    synthesisSupported,
    listening,
    speaking,
    transcript,
    interim,
    error,
    voices,
    voiceName,
    setVoice,
    startListening,
    stopListening,
    resetTranscript,
    speak,
    stopSpeaking
  }
}
