import React, { useState, useRef } from 'react'
import { Upload, Loader2, Download, FileText, BookOpen, Globe, Trash2, Eye, Settings, CheckCircle, AlertCircle, Image, Plus } from 'lucide-react'
import Layout from '../components/Layout'

export default function WorksheetBuilder() {
  const [grade, setGrade] = useState(5)
  const [locale, setLocale] = useState('tamil')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [worksheets, setWorksheets] = useState(null)
  const [worksheetId, setWorksheetId] = useState(null)
  const [langView, setLangView] = useState('both')
  const [dragOver, setDragOver] = useState(false)
  const [showPreview, setShowPreview] = useState({})
  const fileInputRef = useRef(null)

  const localeOptions = [
    { value: 'tamil', label: 'Tamil (தமிழ்)', flag: '🇮🇳' },
    { value: 'kannada', label: 'Kannada (ಕನ್ನಡ)', flag: '🇮🇳' },
    { value: 'hindi', label: 'Hindi (हिंदी)', flag: '🇮🇳' },
    { value: 'bengali', label: 'Bengali (বাংলা)', flag: '🇮🇳' },
    { value: 'telugu', label: 'Telugu (తెలుగు)', flag: '🇮🇳' },
    { value: 'marathi', label: 'Marathi (मराठी)', flag: '🇮🇳' },
  ]

  const onFilesChange = e => setFiles(Array.from(e.target.files))

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    )
    setFiles(prev => [...prev, ...droppedFiles])
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const build = async () => {
    if (!files.length) {
      alert("Please upload at least one page.")
      return
    }
    setLoading(true)
    const fd = new FormData()
    fd.append("grade", grade)
    fd.append("locale", locale)
    files.forEach(f => fd.append("files", f))
    
    try {
      const res = await fetch("/api/agents/worksheet-builder", {
        method: "POST",
        body: fd
      })
      if (!res.ok) throw await res.text()
      const data = await res.json()
      setWorksheets(data.worksheets)
      setWorksheetId(data.worksheet_id)
    } catch (e) {
      alert("Error: " + e)
    }
    setLoading(false)
  }

  const downloadJSON = (obj, filename) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], {
      type: "application/json"
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const onDownloadWorksheets = () => {
    downloadJSON({worksheets}, `worksheets_${worksheetId}.json`)
  }

  const onDownloadAnswers = () => {
    const answerKey = worksheets.map(ws => ({
      level: ws.level,
      answers_en: ws.answers_en,
      answers_local: ws.answers_local
    }))
    downloadJSON({answerKey}, `answers_${worksheetId}.json`)
  }

  const togglePreview = (index) => {
    setShowPreview(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  return (
    <Layout>
      <div className="min-h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Worksheet Builder</h1>
                <p className="text-sm text-gray-600">Create multi-level educational worksheets from your content</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          {/* Configuration Panel */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
              <div className="flex items-center gap-2 text-white">
                <Settings className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Configuration</h2>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Grade Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Grade Level
                  </label>
                  <select
                    value={grade}
                    onChange={e => setGrade(+e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i} value={i + 1}>
                        Grade {i + 1} {i === 0 ? '(Ages 6-7)' : i === 4 ? '(Ages 10-11)' : i === 8 ? '(Ages 14-15)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Language Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Local Language
                  </label>
                  <select
                    value={locale}
                    onChange={e => setLocale(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  >
                    {localeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.flag} {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-teal-600 px-6 py-4">
              <div className="flex items-center gap-2 text-white">
                <Upload className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Upload Content Pages</h2>
              </div>
            </div>

            <div className="p-6">
              {/* Drag & Drop Area */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  dragOver 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className={`p-4 rounded-full ${dragOver ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                    <Image className={`w-8 h-8 ${dragOver ? 'text-indigo-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      Drag and drop your images here
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      or click to browse files
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Choose Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={onFilesChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Uploaded Files ({files.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="flex-shrink-0 p-1 text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Build Button */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={build}
                  disabled={loading || !files.length}
                  className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Build Worksheets
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results Section */}
          {worksheets && (
            <>
              {/* Download Section */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4">
                  <div className="flex items-center gap-2 text-white">
                    <Download className="w-5 h-5" />
                    <h2 className="text-lg font-semibold">Download Resources</h2>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={onDownloadWorksheets}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      Complete Worksheets
                    </button>
                    <button
                      onClick={onDownloadAnswers}
                      className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      Answer Keys Only
                    </button>
                  </div>
                </div>
              </div>

              {/* Language Toggle */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
                  <div className="flex items-center gap-2 text-white">
                    <Globe className="w-5 h-5" />
                    <h2 className="text-lg font-semibold">Display Options</h2>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex gap-2">
                    {[
                      { value: 'en', label: 'English Only', icon: '🇺🇸' },
                      { value: 'local', label: 'Local Language Only', icon: '🌍' },
                      { value: 'both', label: 'Both Languages', icon: '🌐' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setLangView(option.value)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                          langView === option.value
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span>{option.icon}</span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Worksheets Display */}
              <div className="space-y-6">
                {worksheets.map((ws, idx) => (
                  <div key={idx} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white">
                          <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                            <span className="font-bold text-sm">{idx + 1}</span>
                          </div>
                          <h2 className="text-xl font-semibold capitalize">
                            {ws.level} Level Worksheet
                          </h2>
                        </div>
                        <button
                          onClick={() => togglePreview(idx)}
                          className="flex items-center gap-2 px-3 py-1 bg-white bg-opacity-20 rounded-lg text-white hover:bg-opacity-30 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          {showPreview[idx] ? 'Hide' : 'Preview'}
                        </button>
                      </div>
                    </div>

                    {(showPreview[idx] !== false) && (
                      <div className="p-6 space-y-6">
                        {/* Questions Section */}
                        <div className="grid md:grid-cols-2 gap-6">
                          {(langView !== 'local') && (
                            <div className="bg-blue-50 rounded-lg p-4">
                              <h3 className="flex items-center gap-2 font-semibold text-blue-900 mb-3">
                                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                Questions (English)
                              </h3>
                              <ol className="space-y-2">
                                {ws.questions_en.map((q, i) => (
                                  <li key={i} className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                                      {i + 1}
                                    </span>
                                    <span className="text-gray-700">{q}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {(langView !== 'en') && (
                            <div className="bg-green-50 rounded-lg p-4">
                              <h3 className="flex items-center gap-2 font-semibold text-green-900 mb-3">
                                <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                                Questions (Local Language)
                              </h3>
                              <ol className="space-y-2">
                                {ws.questions_local.map((q, i) => (
                                  <li key={i} className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-medium">
                                      {i + 1}
                                    </span>
                                    <span className="text-gray-700">{q}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>

                        {/* Answers Section */}
                        <div className="border-t pt-6">
                          <div className="flex items-center gap-2 mb-4">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            <h3 className="font-semibold text-gray-900">Answer Key</h3>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-6">
                            {(langView !== 'local') && (
                              <div className="bg-amber-50 rounded-lg p-4">
                                <h4 className="font-medium text-amber-900 mb-3">English Answers</h4>
                                <ol className="space-y-2">
                                  {ws.answers_en.map((a, i) => (
                                    <li key={i} className="flex gap-3">
                                      <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center text-sm font-medium">
                                        {i + 1}
                                      </span>
                                      <span className="text-gray-700 font-medium">{a}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}

                            {(langView !== 'en') && (
                              <div className="bg-purple-50 rounded-lg p-4">
                                <h4 className="font-medium text-purple-900 mb-3">Local Language Answers</h4>
                                <ol className="space-y-2">
                                  {ws.answers_local.map((a, i) => (
                                    <li key={i} className="flex gap-3">
                                      <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-sm font-medium">
                                        {i + 1}
                                      </span>
                                      <span className="text-gray-700 font-medium">{a}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}