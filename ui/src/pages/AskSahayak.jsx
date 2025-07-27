import React, { useState, useEffect, useRef } from 'react'
import { Send, X, Bot } from 'lucide-react'
import Layout from '../components/Layout'
import MicButton from '../components/MicButton'
import ReactMarkdown from 'react-markdown'

const suggestedPrompts = [
  {
  icon: "📚",
  title: "Hindi Story",
  prompt: "Generate a moral story about friendship for grade 3-4 children in Hindi",
  response: `**🌟 मित्रता की ताक़त – राम और श्याम की कहानी**

एक बार की बात है, एक गाँव में राम और श्याम नाम के दो अच्छे दोस्त रहते थे। दोनों साथ में स्कूल जाते, साथ खेलते और एक-दूसरे की मदद करते। राम बहुत होशियार था और श्याम थोड़ा धीमा सीखता था, लेकिन राम हमेशा श्याम को समझाने में मदद करता।

एक दिन गाँव में मेला लगा। दोनों दोस्तों ने मेला घूमने का फैसला किया। मेले में अचानक श्याम भीड़ में खो गया। वह डर गया और रोने लगा। राम ने तुरंत अपने दोस्त को ढूंढना शुरू किया। उसने हर जगह ढूंढा और अंत में श्याम को रोते हुए देखा।

राम ने उसका हाथ पकड़ा और कहा, *"डर मत, मैं हमेशा तुम्हारे साथ हूँ।"* श्याम मुस्कराया और बोला, *"तुम सबसे अच्छे दोस्त हो!"*

**✨ शिक्षा:**  
**सच्चा मित्र वही होता है जो मुश्किल समय में भी साथ न छोड़े।**

**🎯 गतिविधि:**  
बच्चों से कहें कि वे अपने सबसे अच्छे दोस्त के बारे में एक लाइन लिखें और बताएँ कि वे उसकी मदद कैसे करते हैं।`
}
,
  {
  icon: "🌍",
  title: "English Story",
  prompt: "Create a simple English story with moral for grade 1-2",
  response: `**🌟 The Lost Puppy**

One sunny day, a boy named Arjun was walking home from school. On the way, he saw a small puppy near a tree. The puppy looked scared and was all alone.

Arjun gently said, *"Don’t be afraid. Are you lost?"* He gave the puppy water and tied a red ribbon to its neck. Then he walked around the neighborhood asking, *"Is this your puppy?"*

After some time, an old man said, *"Yes! That’s my dog, Bruno! Thank you, little boy!"* The old man was very happy and gave Arjun a big smile.

**✨ Moral:**  
**Be kind to animals and help those in need.**

**📝 Vocabulary:**  
- Puppy = baby dog  
- Lost = not found  
- Kind = nice and helpful

**🎯 Activity:**  
Ask kids to draw the lost puppy and Arjun helping it.`
}
,
  {
  icon: "🔢",
  title: "Math Activity",
  prompt: "Create a fun math activity for grade 2-3 students using local examples",
  response: `**🧮 சந்தையில் கணிதம் - வகுப்பு 2 மற்றும் 3 மாணவர்களுக்கான பயிற்சி**

**வகுப்பு 2 (கூட்டல் மற்றும் கழித்தல்):**

- அம்மா மார்க்கெட்டில்:
  - 3 மாங்காய்கள் வாங்கினாள் 🥭🥭🥭
  - 4 வாழைப்பழங்கள் வாங்கினாள் 🍌🍌🍌🍌
  - **கேள்வி 1:** மொத்தம் எத்தனை பழங்கள்? (3 + 4 = 7)

- ரோட்டில் 2 மாங்காய்கள் விழுந்துவிட்டன:
  - **கேள்வி 2:** இப்போது எத்தனை மாங்காய்கள் இருக்கின்றன? (3 - 2 = 1)

**வகுப்பு 3 (பெருக்கல்):**

- கடைக்காரரிடம்:
  - 6 கட்டிகள் இருக்கின்றன 🧺
  - ஒவ்வொரு கட்டியிலும் 5 செம்பருத்தி பூக்கள் 🌺
  - **கேள்வி:** மொத்தம் எத்தனை பூக்கள்? (6 × 5 = 30)

**💰 உள்ளூர் விலை எடுத்துக்காட்டு:**
- ஒரு இடியாப்பம் = ₹10  
- 3 இடியாப்பம் = 10 × 3 = ₹30

**🎭 செயல்பாடு:**  
மாணவர்களை விற்பனையாளர் மற்றும் வாடிக்கையாளர் ஆக பங்கு வைக்கவும். அவர்கள் வாங்கும் பொருட்களின் விலையை கூட்டச் சொல்லுங்கள்.`
}

]

export default function AskSahayak() {
  const [question, setQuestion] = useState('')
  const [msgs, setMsgs] = useState([
    { sender: 'bot', text: 'Hello! I\'m Sahayak, your AI assistant. How can I help you today?' }
  ])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  const callAgent = async (customPrompt = null, usePresetResponse = false) => {
    const prompt = customPrompt || question.trim()
    if (!prompt) return

    setMsgs(m => [...m, { sender: 'user', text: prompt }])
    setQuestion('')
    setLoading(true)

    if (usePresetResponse) {
      const matched = suggestedPrompts.find(p => p.prompt === prompt)
      if (matched?.response) {
        setTimeout(() => {
          setMsgs(m => [...m, { sender: 'bot', text: matched.response, markdown: true }])
          setLoading(false)
        }, 800)
        return
      }
    }

    try {
      const res = await fetch('/api/agents/ask-sahayak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await res.json()
      setMsgs(m => [...m, { sender: 'bot', text: data.response, markdown: true }])
    } catch {
      setMsgs(m => [...m, { sender: 'bot', text: "⚠️ Something went wrong. Please try again." }])
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionClick = (prompt) => {
    setQuestion(prompt)
    callAgent(prompt, true)
  }

  const handleVoice = (text, isFinal = false) => {
    if (text && text.trim()) {
      setQuestion(text)
      if (inputRef.current) inputRef.current.focus()
      if (isFinal && text.trim().length > 3) {
        setTimeout(() => { callAgent(text.trim()) }, 500)
      }
    }
  }

  return (
    <Layout>
      <div className="flex flex-col h-screen bg-[#1e1e1e] text-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 bg-gray-900">
          <div className="flex items-center space-x-3">
            <Bot className="text-white w-5 h-5" />
            <h2 className="text-lg font-semibold">Ask Sahayak</h2>
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {msgs.length === 1 && (
            <div className="space-y-3">
              <h3 className="text-gray-300 text-sm mb-1">✨ Try asking me:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestedPrompts.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s.prompt)}
                    className="text-left p-4 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 transition"
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-xl">{s.icon}</span>
                      <div>
                        <p className="font-semibold text-white">{s.title}</p>
                        <p className="text-sm text-gray-400">{s.prompt}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3 max-w-[75%] rounded-xl shadow-sm ${m.sender === 'user' ? 'bg-gray-700' : 'bg-gray-800'}`}>
                {m.markdown ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.text}</p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-sm text-gray-400">Sahayak is typing...</div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Section */}
        <div className="p-4 border-t border-gray-700 bg-gray-900">
          <div className="flex items-end space-x-2">
            <MicButton lang="en-US" onResult={handleVoice} disabled={loading} />
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                className="w-full resize-none bg-gray-800 text-white rounded-xl px-4 py-3 focus:outline-none"
                rows={1}
                placeholder="Ask a question..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    callAgent()
                  }
                }}
              />
              {question && (
                <button onClick={() => setQuestion('')} className="absolute right-3 top-3 text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => callAgent()}
              disabled={loading || !question.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .prose code {
          background: #2d2d2d;
          padding: 0.2em 0.4em;
          border-radius: 4px;
          color: #FFDD57;
        }
      `}</style>
    </Layout>
  )
}
