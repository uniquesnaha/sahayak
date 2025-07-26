import React, { useState, useEffect, useRef } from 'react'
import { Send, X, Bot, Mic, MicOff } from 'lucide-react'
import Layout from '../components/Layout'
import MicButton from '../components/MicButton'

export default function AskSahayak() {
  const [question, setQuestion] = useState('')
  const [msgs, setMsgs] = useState([
    { sender: 'bot', text: 'Hello! I\'m Sahayak, your AI assistant. How can I help you today?' },
  ])
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // session persistence
  const [sessionId] = useState(() => {
    let sid = localStorage.getItem('sahayak_sid')
    if (!sid) {
      sid = crypto.randomUUID()
      localStorage.setItem('sahayak_sid', sid)
    }
    return sid
  })

  // Suggested prompts
  const suggestedPrompts = [
    {
      icon: "💡",
      title: "Creative Ideas",
      prompt: "Give me some creative project ideas for web development"
    },
    {
      icon: "🚀",
      title: "Productivity Tips",
      prompt: "How can I improve my daily productivity as a developer?"
    },
    {
      icon: "🎨",
      title: "UI/UX Design",
      prompt: "What are the latest trends in UI/UX design for 2024?"
    },
    {
      icon: "⚡",
      title: "Code Optimization",
      prompt: "How can I optimize my React application for better performance?"
    },
    {
      icon: "🔧",
      title: "Best Practices",
      prompt: "What are the JavaScript best practices I should follow?"
    },
    {
      icon: "📱",
      title: "Mobile Development",
      prompt: "Guide me through creating responsive mobile-first designs"
    }
  ]

  // scroll on new msg
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  // interim & final voice text -> input
  const handleVoice = text => {
    setQuestion(text)
    inputRef.current?.focus()
  }

  const callAgent = async (customPrompt = null) => {
    const promptToSend = customPrompt || question.trim()
    if (!promptToSend) return

    setLoading(true)
    setIsTyping(true)
    setShowSuggestions(false)
    setMsgs(m => [...m, { sender: 'user', text: promptToSend }])
    setQuestion('')

    try {
      const res = await fetch('/api/agents/ask-sahayak', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ session_id: sessionId, prompt: promptToSend })
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setMsgs(m => [...m, { sender: 'bot', text: data.response }])
    } catch (err) {
      console.error(err)
      setMsgs(m => [...m, { sender: 'bot', text: '⚠️ Something went wrong.' }])
    }

    setLoading(false)
    setIsTyping(false)
  }

  const handleSuggestionClick = (prompt) => {
    setQuestion(prompt)
    callAgent(prompt)
  }

  const onKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault()
      callAgent()
    }
  }

  // Suggested Prompts Component
  const SuggestedPrompts = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-2">✨ Try asking me about:</h3>
        <p className="text-gray-400 text-sm">Click on any suggestion to get started</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl mx-auto">
        {suggestedPrompts.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => handleSuggestionClick(suggestion.prompt)}
            className="group p-4 bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl hover:bg-gray-700/40 hover:border-purple-500/50 transition-all duration-300 text-left transform hover:scale-105 hover:shadow-lg"
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                {suggestion.icon}
              </span>
              <div className="flex-1">
                <h4 className="font-medium text-white group-hover:text-purple-300 transition-colors duration-300">
                  {suggestion.title}
                </h4>
                <p className="text-sm text-gray-400 mt-1 group-hover:text-gray-300 transition-colors duration-300">
                  {suggestion.prompt}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const TypingIndicator = () => (
    <div className="flex items-center space-x-2 p-4 bg-gray-800/50 backdrop-blur-sm rounded-2xl rounded-bl-lg max-w-xs">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100"></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200"></div>
      </div>
      <span className="text-sm text-gray-400">Sahayak is typing...</span>
    </div>
  )

  return (
    <Layout>
      <div className="flex flex-col h-screen bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50 bg-gray-800/30 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Ask Sahayak</h2>
              <p className="text-sm text-gray-400">Always ready to help</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-400">Online</span>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {msgs.length === 1 && showSuggestions && (
            <div className="flex justify-center items-center min-h-[60%]">
              <SuggestedPrompts />
            </div>
          )}
          
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              {m.sender === 'user' ? (
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-2xl rounded-br-lg max-w-[75%] shadow-lg">
                  <p className="leading-relaxed">{m.text}</p>
                </div>
              ) : (
                <div className="flex items-end space-x-3 max-w-[75%]">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-800/50 backdrop-blur-sm text-white p-4 rounded-2xl rounded-bl-lg shadow-lg border border-gray-700/30">
                    <p className="leading-relaxed">{m.text}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {loading && isTyping && (
            <div className="flex justify-start animate-fade-in">
              <div className="flex items-end space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Section */}
        <div className="p-6 border-t border-gray-700/50 bg-gray-800/30 backdrop-blur-sm">
          {/* Quick suggestions when input is focused but empty */}
          {question === '' && !loading && msgs.length > 1 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-400 mb-2 block w-full">💫 Quick suggestions:</span>
                {suggestedPrompts.slice(0, 3).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion.prompt)}
                    className="px-3 py-1.5 bg-gray-700/50 hover:bg-purple-600/30 text-xs text-gray-300 hover:text-white rounded-full border border-gray-600/50 hover:border-purple-500/50 transition-all duration-200 hover:scale-105"
                  >
                    {suggestion.icon} {suggestion.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex items-end space-x-3">
            <MicButton lang="en-US" onResult={handleVoice} />
            
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl px-4 py-3 pr-12 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 max-h-32"
                placeholder="Ask me anything..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={loading}
                rows={1}
                style={{ minHeight: '48px' }}
              />
              {question && (
                <button
                  onClick={() => setQuestion('')}
                  className="absolute right-3 top-3 p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => callAgent()}
              disabled={loading || !question.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white p-3 rounded-2xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center justify-center mt-3 space-x-2 text-xs text-gray-500">
            <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
            <span>Press Enter to send • Shift+Enter for new line</span>
            <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        textarea {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
        }
        
        textarea::-webkit-scrollbar {
          width: 4px;
        }
        
        textarea::-webkit-scrollbar-track {
          background: transparent;
        }
        
        textarea::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.3);
          border-radius: 2px;
        }
      `}</style>
    </Layout>
  )
}