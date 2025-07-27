// src/pages/WorksheetBuilder.jsx

import React, { useState, useRef } from 'react'
import { jsPDF } from 'jspdf'
import {
  Upload,
  Loader2,
  FileText,
  Trash2,
  Plus
} from 'lucide-react'
import Layout from '../components/Layout'

export default function WorksheetBuilder() {
  // Worksheet builder state
  const [grade, setGrade] = useState(5)
  const [subject, setSubject] = useState('')
  const [numQuestions, setNumQuestions] = useState(5)
  const [files, setFiles] = useState([])
  const [worksheets, setWorksheets] = useState(null)
  const [loading, setLoading] = useState(false)

  // Publish form state
  const [showPublishForm, setShowPublishForm] = useState(false)
  const [publishTitle, setPublishTitle] = useState('')
  const [publishDesc, setPublishDesc] = useState('')

  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  // Build worksheets JSON
  const buildWorksheets = async () => {
    if (!files.length) return alert('Upload at least one page.')
    if (!subject.trim()) return alert('Enter a subject.')

    setLoading(true)
    try {
      const form = new FormData()
      form.append('grade', grade)
      form.append('subject', subject)
      form.append('num_questions', numQuestions)
      files.forEach(f => form.append('files', f))

      const res = await fetch('/api/worksheets/json', {
        method: 'POST',
        body: form
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setWorksheets(data.worksheets)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Create a jsPDF Blob from one worksheet
  const makePdfBlob = (ws, mode) => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' })
    doc.setFontSize(16)
    doc.text(`${mode === 'questions' ? 'Questions' : 'Answers'} – ${ws.level}`, 40, 60)
    doc.setFontSize(12)
    const items = mode === 'questions' ? ws.questions : ws.answers
    items.forEach((text, i) => {
      let y = 90 + i * 18
      if (y > 750) {
        doc.addPage()
        doc.setFontSize(12)
        y = 80
      }
      doc.text(`${i + 1}. ${text}`, 40, y)
    })
    return doc.output('blob')
  }

  // Handle final publish
  const confirmPublish = async () => {
    if (!publishTitle.trim()) return alert('Enter a publish title.')
    if (!publishDesc.trim()) return alert('Enter a description.')

    const payload = { worksheets }
    const form = new FormData()
    form.append('title', publishTitle)
    form.append('type', 'worksheet')
    form.append('payload', JSON.stringify({ ...payload, description: publishDesc }))

    // generate and append PDFs
    worksheets.forEach(ws => {
      const qBlob = makePdfBlob(ws, 'questions')
      const aBlob = makePdfBlob(ws, 'answers')
      form.append(
        'files',
        new File(
          [qBlob],
          `${subject}_G${grade}_${ws.level}_Qs.pdf`,
          { type: 'application/pdf' }
        )
      )
      form.append(
        'files',
        new File(
          [aBlob],
          `${subject}_G${grade}_${ws.level}_As.pdf`,
          { type: 'application/pdf' }
        )
      )
    })

    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        body: form
      })
      if (!res.ok) throw new Error(await res.text())
      alert('Published successfully!')
      // reset publish form
      setShowPublishForm(false)
      setPublishTitle('')
      setPublishDesc('')
    } catch (err) {
      alert('Publish failed: ' + err.message)
    }
  }

  // File upload handlers
  const onFilesChange = e => setFiles(Array.from(e.target.files || []))
  const removeFile = idx => setFiles(prev => prev.filter((_, i) => i !== idx))
  const handleDrop = e => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith('image/')
    )
    setFiles(prev => [...prev, ...dropped])
  }
  const handleDragOver = e => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = e => { e.preventDefault(); setDragOver(false) }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 text-gray-200 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-400" />
          <h1 className="text-2xl font-semibold">Worksheet Builder</h1>
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <select
            value={grade}
            onChange={e => setGrade(+e.target.value)}
            className="bg-gray-800 px-2 py-1 rounded"
          >
            {[...Array(12)].map((_, i) => (
              <option key={i} value={i + 1}>
                Grade {i + 1}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject"
            className="bg-gray-800 px-2 py-1 rounded"
          />
          <input
            type="number"
            min="1"
            value={numQuestions}
            onChange={e => setNumQuestions(+e.target.value)}
            className="bg-gray-800 px-2 py-1 rounded"
          />
        </div>

        {/* File Upload */}
        <div>
          <div
            className={`border-2 border-dashed rounded p-8 text-center ${
              dragOver ? 'border-teal-400 bg-gray-800' : 'border-gray-700'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <p>Drag &amp; drop page images, or</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 px-3 py-1 bg-teal-600 rounded"
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
            <div className="mt-2 space-y-1">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex justify-between bg-gray-800 px-2 py-1 rounded"
                >
                  <span className="truncate">{f.name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={buildWorksheets}
            disabled={loading || !files.length}
            className="flex-1 bg-indigo-700 px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin inline w-4 h-4" />
            ) : (
              'Build Worksheets'
            )}
          </button>

          {worksheets && !showPublishForm && (
            <button
              onClick={() => setShowPublishForm(true)}
              className="flex-1 bg-green-600 px-4 py-2 rounded hover:bg-green-700 flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-1" /> Publish to Bazaar
            </button>
          )}
        </div>

        {/* Publish Form */}
        {showPublishForm && (
          <div className="bg-gray-800 p-4 rounded space-y-4">
            <h2 className="text-lg font-semibold">Publish Details</h2>
            <input
              type="text"
              value={publishTitle}
              onChange={e => setPublishTitle(e.target.value)}
              placeholder="Resource Title"
              className="w-full bg-gray-700 px-2 py-1 rounded"
            />
            <textarea
              value={publishDesc}
              onChange={e => setPublishDesc(e.target.value)}
              placeholder="Description"
              className="w-full bg-gray-700 px-2 py-1 rounded h-20"
            />
            <div className="flex gap-2">
              <button
                onClick={confirmPublish}
                className="flex-1 bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
              >
                Confirm Publish
              </button>
              <button
                onClick={() => setShowPublishForm(false)}
                className="flex-1 bg-red-600 px-4 py-2 rounded hover:bg-red-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Preview */}
        {worksheets && (
          <div className="space-y-6">
            {worksheets.map((ws, idx) => (
              <div
                key={idx}
                className="bg-gray-800 rounded p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold capitalize">{ws.level} Level</h2>
                  <button
                    onClick={() => {
                      const blob = makePdfBlob(ws, 'questions')
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `${subject}_G${grade}_${ws.level}_Qs.pdf`
                      a.click()
                    }}
                    className="text-teal-300"
                  >
                    Download Qs
                  </button>
                </div>
                <ol className="list-decimal list-inside space-y-1">
                  {ws.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
