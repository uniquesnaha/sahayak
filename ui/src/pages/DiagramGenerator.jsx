import React, { useState, useEffect } from 'react'
import { Loader2, Download, Upload, RefreshCw, Zap, Palette, Sparkles } from 'lucide-react'
import Layout from '../components/Layout'

export default function DiagramGenerator() {
  const [prompt, setPrompt] = useState('')
  const [type, setType] = useState('line-art')
  const [grade, setGrade] = useState(5)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const generateDiagram = async () => {
    if (!prompt.trim()) {
      setError('Please enter a diagram prompt')
      return
    }

    setLoading(true)
    setResult(null)
    setError('')
    setProgress(0)
    
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 15
      })
    }, 800)

    try {
      // Get auth token from localStorage or cookies
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      
      const headers = {
        'Content-Type': 'application/json',
      }
      
      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/agents/diagram-generator', {
        method: 'POST',
        headers,
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          prompt: prompt.trim(),
          diagram_type: type,
          grade: grade
        })
      })

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorText = await response.text()
          console.error('Backend error response:', errorText)
          
          // Try to parse as JSON for better error messages
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.detail || errorJson.message || errorText
          } catch {
            errorMessage = errorText || errorMessage
          }
        } catch (e) {
          console.error('Could not read error response:', e)
        }
        
        throw new Error(errorMessage)
      }

      // Backend returns image file directly
      const imageBlob = await response.blob()
      const imageUrl = URL.createObjectURL(imageBlob)
      
      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition')
      let filename = 'diagram.png'
      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition.split('filename=')[1].replace(/"/g, '')
      }
      
      clearInterval(progressInterval)
      setProgress(100)
      
      setTimeout(() => {
        setResult({
          imageUrl,
          filename,
          id: Date.now()
        })
        setLoading(false)
        setProgress(0)
      }, 500)

    } catch (err) {
      clearInterval(progressInterval)
      console.error('Generation error:', err)
      
      // Handle specific error cases
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        setError('Authentication required. Please log in.')
      } else if (err.message.includes('422')) {
        setError('Invalid request. Please check your inputs.')
      } else {
        setError(err.message || 'Failed to generate diagram')
      }
      
      setLoading(false)
      setProgress(0)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Submitting request:', {
      prompt: prompt.trim(),
      diagram_type: type,
      grade: grade
    })
    generateDiagram()
  }

  const handleRegenerate = () => {
    if (result?.imageUrl) {
      URL.revokeObjectURL(result.imageUrl)
    }
    generateDiagram()
  }

  const handleDownload = (imageUrl, filename = 'diagram.png') => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePublish = (imageId) => {
    window.open(`/resource-bazaar?highlight=${imageId}`, '_blank')
  }

  useEffect(() => {
    return () => {
      if (result?.imageUrl) {
        URL.revokeObjectURL(result.imageUrl)
      }
    }
  }, [result])

  const typeOptions = [
    { value: 'line-art', label: 'Line Art', icon: Zap },
    { value: 'sketch', label: 'Sketch', icon: Palette },
    { value: 'full-color', label: 'Full Color', icon: Sparkles }
  ]

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900/20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-white mb-2">Diagram Generator</h1>
            <p className="text-gray-400">Create educational diagrams with AI</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Side - Form */}
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-xl p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your diagram..."
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Style
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {typeOptions.map((option) => {
                      const IconComponent = option.icon
                      return (
                        <label key={option.value} className="cursor-pointer">
                          <input
                            type="radio"
                            name="type"
                            value={option.value}
                            checked={type === option.value}
                            onChange={(e) => setType(e.target.value)}
                            className="sr-only"
                            disabled={loading}
                          />
                          <div className={`
                            p-3 rounded-lg border text-center transition-all duration-200
                            ${type === option.value
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-gray-600/50 bg-gray-800/30 hover:border-gray-500'
                            }
                          `}>
                            <IconComponent className={`w-4 h-4 mx-auto mb-1 ${
                              type === option.value ? 'text-purple-400' : 'text-gray-400'
                            }`} />
                            <span className="text-xs text-white">{option.label}</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Grade Level
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    disabled={loading}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1} className="bg-gray-800">
                        Grade {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                {loading && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-300">Generating...</span>
                      <span className="text-xs text-purple-400">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-700/50 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-purple-600 to-purple-400 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium py-2.5 px-4 rounded-lg hover:from-purple-700 hover:to-purple-800 focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Diagram'
                  )}
                </button>
              </form>
            </div>

            {/* Right Side - Image Display */}
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Preview</h3>
                {result && (
                  <button
                    onClick={handleRegenerate}
                    disabled={loading}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-800/50 border border-gray-600/50 text-gray-300 rounded-lg hover:bg-gray-700/50 hover:text-white text-sm transition-all duration-200"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate
                  </button>
                )}
              </div>

              <div className="aspect-square bg-gray-800/30 border-2 border-dashed border-gray-600/50 rounded-lg flex items-center justify-center mb-4">
                {result ? (
                  <img
                    src={result.imageUrl}
                    alt="Generated diagram"
                    className="max-w-full max-h-full object-contain rounded"
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Your diagram will appear here</p>
                  </div>
                )}
              </div>

              {result && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(result.imageUrl, result.filename)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-all duration-200 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    
                    <button
                      onClick={() => handlePublish(result.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-all duration-200 text-sm"
                    >
                      <Upload className="w-4 h-4" />
                      Publish
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}