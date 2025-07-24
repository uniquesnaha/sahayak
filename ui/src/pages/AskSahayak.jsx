// ui/src/pages/AskSahayak.jsx

import React, { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Send, Bot } from 'lucide-react'
import Layout from '../components/Layout'

export default function AskSahayak() {
  const [grade, setGrade]     = useState(5)
  const [locale, setLocale]   = useState('kannada')
  const [question, setQ]      = useState('')
  const [msgs, setMsgs]       = useState([])
  const [langView, setView]   = useState('both')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  // Persist or create a session ID
  const [sessionId] = useState(() => {
    let sid = localStorage.getItem('sahayak_sid')
    if (!sid) {
      sid = uuidv4()
      localStorage.setItem('sahayak_sid', sid)
    }
    return sid
  })

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  // Core API call
  const callAgent = async (action) => {
    setLoading(true)
    try {
      const body = { session_id: sessionId, action, grade, locale }
      if (action === 'ask') body.question = question.trim()

      const res = await fetch('/api/agents/ask-sahayak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()

      if (action === 'ask') {
        setMsgs(m => [
          ...m,
          { sender: 'user', text: question.trim() },
          { sender: 'bot', type: 'answer', ...data }
        ])
        setQ('')
      } else if (action === 'analogy') {
        setMsgs(m => [...m, { sender: 'bot', type: 'analogy', ...data }])
      } else if (action === 'story') {
        setMsgs(m => [...m, { sender: 'bot', type: 'story', ...data }])
      } else if (action === 'quiz') {
        setMsgs(m => [...m, { sender: 'bot', type: 'quiz', quiz_en: data.quiz_en, quiz_local: data.quiz_local }])
      }
    } catch (err) {
      console.error(err)
      setMsgs(m => [...m, { sender: 'bot', text: '⚠️ Something went wrong.' }])
    }
    setLoading(false)
  }

  const onSend = () => {
    if (!question.trim()) return
    callAgent('ask')
  }

  const onKeyDown = e => {
    if (e.key === 'Enter' && !loading) onSend()
  }

  const renderBotBubble = (m, idx) => {
    switch (m.type) {
      case 'answer': {
        const parts = []
        if (langView !== 'local')
          parts.push({ label: 'Answer', text: m.answer_en })
        if (langView !== 'en')
          parts.push({ label: 'Answer (Local)', text: m.answer_local })
        return (
          <div key={idx} className="mr-auto bg-white p-4 rounded-tr-2xl rounded-br-2xl rounded-tl-xl shadow max-w-[75%]">
            {parts.map((p,i) => (
              <p key={i} className="mb-2">
                <strong>{p.label}:</strong> {p.text}
              </p>
            ))}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => callAgent('analogy')}
                disabled={loading}
                className="text-sm bg-indigo-100 px-3 py-1 rounded-full hover:bg-indigo-200"
              >
                Analogy
              </button>
              <button
                onClick={() => callAgent('story')}
                disabled={loading}
                className="text-sm bg-indigo-100 px-3 py-1 rounded-full hover:bg-indigo-200"
              >
                Story
              </button>
              <button
                onClick={() => callAgent('quiz')}
                disabled={loading}
                className="text-sm bg-indigo-100 px-3 py-1 rounded-full hover:bg-indigo-200"
              >
                Quiz
              </button>
            </div>
          </div>
        )
      }
      case 'analogy': {
        return (
          <div key={idx} className="mr-auto bg-white p-4 rounded-tr-2xl rounded-br-2xl rounded-tl-xl shadow max-w-[75%]">
            <p className="font-semibold mb-2">Analogy:</p>
            {langView !== 'local' && <p className="mb-2">{m.analogy_en}</p>}
            {langView !== 'en' && <p>{m.analogy_local}</p>}
          </div>
        )
      }
      case 'story': {
        return (
          <div key={idx} className="mr-auto bg-white p-4 rounded-tr-2xl rounded-br-2xl rounded-tl-xl shadow max-w-[75%]">
            <p className="font-semibold mb-2">Story:</p>
            {langView !== 'local' && <p className="mb-2">{m.story_en}</p>}
            {langView !== 'en' && <p>{m.story_local}</p>}
          </div>
        )
      }
      case 'quiz': {
        return (
          <div key={idx} className="mr-auto bg-white p-4 rounded-tr-2xl rounded-br-2xl rounded-tl-xl shadow max-w-[75%] space-y-3">
            <p className="font-semibold">Quiz:</p>

            {langView !== 'local' && m.quiz_en.map((q,i) => (
              <div key={i} className="mb-4">
                <p className="font-medium">{i+1}. {q.q}</p>
                <ul className="ml-4 list-disc">
                  {['A','B','C','D'].map(k => (
                    <li key={k}>{k}. {q[k]}</li>
                  ))}
                </ul>
                <p className="italic">Answer: {q.answer}</p>
              </div>
            ))}

            {langView === 'both' && <hr className="my-2"/>}

            {langView !== 'en' && m.quiz_local.map((q,i) => (
              <div key={i} className="mb-4">
                <p className="font-medium">{i+1}. {q.q} (Local)</p>
                <ul className="ml-4 list-disc">
                  {['A','B','C','D'].map(k => (
                    <li key={k}>{k}. {q[k]}</li>
                  ))}
                </ul>
                <p className="italic">Answer: {q.answer}</p>
              </div>
            ))}
          </div>
        )
      }
      default:
        return (
          <div key={idx} className="mr-auto bg-white p-4 rounded-tr-2xl rounded-br-2xl rounded-tl-xl shadow max-w-[75%]">
            {m.text}
          </div>
        )
    }
  }

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center p-4 border-b bg-white">
          <Bot className="w-6 h-6 text-indigo-600 mr-2" />
          <h2 className="text-xl font-semibold">Ask Sahayak</h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {msgs.map((m,i) => (
            m.sender === 'user'
              ? <div key={i} className="ml-auto bg-indigo-600 text-white p-4 rounded-tl-2xl rounded-bl-2xl rounded-tr-xl max-w-[75%]">{m.text}</div>
              : renderBotBubble(m,i)
          ))}
          {loading && (
            <div className="mr-auto bg-gray-300 animate-pulse p-4 rounded-tr-2xl rounded-br-2xl rounded-tl-xl max-w-[50%]" />
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2 p-4 border-t bg-white">
          <select
            className="border px-2 py-1 rounded"
            value={grade}
            onChange={e => setGrade(+e.target.value)}
          >
            {[...Array(12)].map((_,i) =>
              <option key={i} value={i+1}>{i+1}th</option>
            )}
          </select>
          <input
            type="text"
            className="border px-2 py-1 rounded w-28"
            placeholder="locale"
            value={locale}
            onChange={e => setLocale(e.target.value)}
          />
          <input
            type="text"
            className="flex-1 border px-3 py-2 rounded focus:outline-indigo-500"
            placeholder="Type your question…"
            value={question}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
          />
          <button
            onClick={onSend}
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center"
          >
            <Send className="w-5 h-5 mr-1" /> Ask
          </button>
        </div>
      </div>
    </Layout>
  )
}
