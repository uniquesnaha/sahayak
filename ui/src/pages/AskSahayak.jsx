// src/pages/AskSahayak.jsx

import React, { useState } from 'react'
import { Bot, MessageCircle, Send, Languages, RefreshCw } from 'lucide-react'
import Layout from '../components/Layout'

export default function AskSahayak() {
  const [grade, setGrade] = useState(5)
  const [locale, setLocale] = useState('tamil')
  const [question, setQuestion] = useState('')

  const [showLocal, setShowLocal] = useState(false)
  const [showAnalogy, setShowAnalogy] = useState(true)

  const [result, setResult] = useState({
    answer_en: '',
    analogy_en: '',
    answer_local: '',
    analogy_local: ''
  })

  const [loading, setLoading] = useState(false)

  const handleAsk = async () => {
    if (!question.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/agents/ask-sahayak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, grade, locale })
      })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      console.error(e)
      alert('Sorry, something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <MessageCircle className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold">Ask Sahayak</h1>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3">
          <select
            value={grade}
            onChange={e => setGrade(Number(e.target.value))}
            className="border rounded p-2 w-full md:w-auto"
          >
            {[...Array(12)].map((_, i) => (
              <option key={i} value={i + 1}>{i + 1}th Grade</option>
            ))}
          </select>

          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask your question..."
            className="flex-1 border rounded p-2"
          />

          <input
            type="text"
            value={locale}
            onChange={e => setLocale(e.target.value)}
            className="border rounded p-2 w-full md:w-40"
            placeholder="Locale (e.g., tamil)"
          />

          <button
            onClick={handleAsk}
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center"
          >
            {loading
              ? <><RefreshCw className="animate-spin mr-2 w-4 h-4" />Thinking…</>
              : <>
                  <Send className="w-4 h-4 mr-1" />
                  Ask
                </>
            }
          </button>
        </div>

        {/* Result Display */}
        {result.answer_en ? (
          <div className="bg-white p-6 rounded shadow space-y-6">
            {/* Answer */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Answer</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                { showLocal
                    ? (result.answer_local || <em>(Not available in local language)</em>)
                    : result.answer_en
                }
              </p>
            </div>

            {/* Analogy */}
            {showAnalogy && (
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-1">Analogy</h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  { showLocal
                      ? (result.analogy_local || <em>(Not available in local language)</em>)
                      : result.analogy_en
                  }
                </p>
              </div>
            )}

            {/* Toggles */}
            <div className="flex items-center gap-3 flex-wrap border-t pt-4 text-sm text-gray-600">
              <button
                onClick={() => setShowLocal(!showLocal)}
                className={`px-3 py-1.5 rounded border flex items-center gap-1 transition ${
                  showLocal ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 hover:bg-gray-100 border-gray-300'
                }`}
              >
                <Languages size={16} />
                {showLocal ? 'Local Language' : 'English'}
              </button>

              <button
                onClick={() => setShowAnalogy(!showAnalogy)}
                className={`px-3 py-1.5 rounded border transition ${
                  showAnalogy ? 'bg-green-50 border-green-400' : 'bg-gray-50 hover:bg-gray-100 border-gray-300'
                }`}
              >
                {showAnalogy ? 'Hide Analogy' : 'Show Analogy'}
              </button>
            </div>
          </div>
        ) : (
          !loading && (
            <div className="text-center text-gray-500 py-16">
              <Bot className="mx-auto w-12 h-12 mb-4 text-gray-300" />
              <p>Enter a question, pick grade & locale, and click Ask.</p>
            </div>
          )
        )}
      </div>
    </Layout>
  )
}
