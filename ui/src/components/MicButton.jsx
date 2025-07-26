// ui/src/components/MicButton.jsx
import React, { useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'
import useSpeechRecognition from '../hooks/useSpeechRecognition.js'

/**
 * Props:
 *  - lang (string) — BCP-47 locale, default 'en-US'
 *  - onResult(text: string) — called with interim+final transcripts
 */
export default function MicButton({ lang, onResult, className = '' }) {
  const { listening, transcript, start, stop } =
    useSpeechRecognition({ lang })

  // send every interim result up
  useEffect(() => {
    if (transcript) {
      onResult(transcript)
    }
  }, [transcript, onResult])

  return (
    <button
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={stop}
      className={`relative p-1 rounded-full ${className}`}
      aria-label={listening ? 'Release to stop' : 'Hold to talk'}
    >
      <span
        className={`
          flex items-center justify-center w-10 h-10 
          rounded-full bg-white border-2
          ${listening 
            ? 'border-red-500 animate-ping' 
            : 'border-gray-300 hover:border-emerald-500'}
        `}
      >
        {listening
          ? <MicOff className="w-6 h-6 text-red-500" />
          : <Mic    className="w-6 h-6 text-emerald-600" />}
      </span>
      {listening && (
        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
      )}
    </button>
  )
}
