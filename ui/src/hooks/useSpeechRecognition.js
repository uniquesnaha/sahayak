// ui/src/hooks/useSpeechRecognition.js
import { useState, useRef, useCallback, useEffect } from 'react'

export default function useSpeechRecognition({ lang = 'en-US' } = {}) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      console.warn('SpeechRecognition not supported')
      return
    }
    const recog = new SR()
    recog.lang = lang
    recog.continuous = false      // single utterance
    recog.interimResults = true   // get partials
    recog.maxAlternatives = 1

    recog.onstart = () => setListening(true)
    recog.onend   = () => setListening(false)
    recog.onerror = (e) => {
      console.error('SpeechRecognition error', e)
      setListening(false)
    }
    recog.onresult = (e) => {
      // build up full + interim text
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        interim += e.results[i][0].transcript
      }
      setTranscript(interim.trim())
    }

    recognitionRef.current = recog
  }, [lang])

  const start = useCallback(() => {
    if (recognitionRef.current && !listening) {
      setTranscript('')            // clear previous
      recognitionRef.current.start()
    }
  }, [listening])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { listening, transcript, start, stop }
}
