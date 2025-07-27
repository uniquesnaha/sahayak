// src/pages/AutoEval.jsx

import React, { useEffect, useState, useRef } from 'react'
import Layout from '../components/Layout'
import {
  Loader2,
  Upload,
  CheckCircle,
  XCircle
} from 'lucide-react'

export default function AutoEval() {
  const [resources, setResources] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [levels, setLevels] = useState([])
  const [selectedLevel, setSelectedLevel] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  // Load worksheet-type resources
  useEffect(() => {
    fetch('/api/resources')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : data.resources || []
        setResources(list.filter(r => r.type === 'worksheet'))
      })
      .catch(() => setResources([]))
  }, [])

  // When a resource is selected, load its levels
  useEffect(() => {
    if (!selectedId) {
      setLevels([])
      setSelectedLevel('')
      return
    }
    fetch(`/api/resources/${selectedId}`)
      .then(r => r.json())
      .then(data => {
        const payload = typeof data.payload === 'string'
          ? JSON.parse(data.payload)
          : data.payload
        const ws = payload.worksheets || []
        const lvl = ws.map(w => w.level)
        setLevels(lvl)
        setSelectedLevel(lvl[0] || '')
        setResult(null)
      })
      .catch(() => {
        setLevels([])
        setSelectedLevel('')
      })
  }, [selectedId])

  const onFilesChange = e => setFiles(Array.from(e.target.files || []))
  const handleDrop = e => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files || []).filter(f =>
      f.type.startsWith('image/')
    )
    setFiles(prev => [...prev, ...dropped])
  }
  const handleDragOver = e => e.preventDefault()
  const removeFile = idx =>
    setFiles(prev => prev.filter((_, i) => i !== idx))

  const gradeAnswers = async () => {
    if (!selectedId || !selectedLevel || !files.length) {
      alert('Select a worksheet, level and upload images.')
      return
    }
    setLoading(true)
    setResult(null)
    const form = new FormData()
    form.append('resource_id', selectedId)
    form.append('level', selectedLevel)
    files.forEach(f => form.append('files', f))
    try {
      const res = await fetch('/api/autoeval', {
        method: 'POST',
        body: form
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResult(data)
    } catch (err) {
      alert('Grading failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 text-gray-200 p-6 space-y-6">
        <h1 className="text-2xl font-semibold">AutoEval+</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="bg-gray-800 px-3 py-2 rounded"
          >
            <option value="">Choose Worksheet</option>
            {resources.map(r => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>

          <select
            value={selectedLevel}
            onChange={e => setSelectedLevel(e.target.value)}
            disabled={!levels.length}
            className="bg-gray-800 px-3 py-2 rounded"
          >
            <option value="">Select Level</option>
            {levels.map(l => (
              <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              onClick={gradeAnswers}
              disabled={loading || !files.length || !selectedLevel}
              className="flex-1 bg-indigo-700 px-4 py-2 rounded disabled:opacity-50 flex items-center justify-center"
            >
              {loading
                ? <Loader2 className="animate-spin w-5 h-5" />
                : 'Grade Answers'}
            </button>
          </div>
        </div>

        <div
          className="border-2 border-dashed rounded p-8 text-center bg-gray-800"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <Upload className="mx-auto w-6 h-6 text-teal-400" />
          <p className="mt-2">Drag & drop answer-sheet images, or</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 px-4 py-2 bg-teal-600 rounded"
          >
            Browse Files
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

        {files.length > 0 && (
          <ul className="space-y-1">
            {files.map((f, i) => (
              <li key={i} className="flex justify-between bg-gray-800 p-2 rounded">
                <span className="truncate">{f.name}</span>
                <button onClick={() => removeFile(i)} className="text-red-400">
                  <XCircle className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {result && (
          <div className="bg-gray-800 p-4 rounded space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl">Score: {result.score}%</h2>
              {result.score >= 50
                ? <CheckCircle className="w-6 h-6 text-green-400" />
                : <XCircle className="w-6 h-6 text-red-400" />}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-700">
                  <th className="px-2 py-1">Q#</th>
                  <th className="px-2 py-1">Student Answer</th>
                  <th className="px-2 py-1">Correct</th>
                  <th className="px-2 py-1">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {result.details.map(d => (
                  <tr key={d.question} className="border-b border-gray-700">
                    <td className="px-2 py-1">{d.question}</td>
                    <td className="px-2 py-1">{d.student}</td>
                    <td className="px-2 py-1">
                      {d.correct ? '✔️' : '❌'}
                    </td>
                    <td className="px-2 py-1">{d.feedback}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
