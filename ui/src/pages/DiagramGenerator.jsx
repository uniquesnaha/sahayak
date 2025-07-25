import React, { useState } from 'react'
import { Loader2, Download, RefreshCw } from 'lucide-react'
import Layout from '../components/Layout'

export default function DiagramGenerator() {
  const [prompt, setPrompt] = useState('')
  const [type, setType]     = useState('line-art')
  const [grade, setGrade]   = useState(5)
  const [subject, setSubject] = useState('Science')
  const [n, setN]           = useState(1)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const generate = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/agents/diagram-generator', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          prompt, diagram_type: type,
          grade, subject, regenerate: n
        })
      })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      alert("Error: " + e.message)
    }
    setLoading(false)
  }

  const download = url => {
    const a = document.createElement('a')
    a.href = url
    a.download = url.split('/').pop()
    a.click()
  }

  return (
    <Layout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Diagram Generator</h1>

        <textarea
          rows={2}
          placeholder="Enter your diagram prompt"
          value={prompt}
          onChange={e=>setPrompt(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <div className="flex flex-wrap gap-2">
          <select
            value={type}
            onChange={e=>setType(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="line-art">Line-Art</option>
            <option value="sketch">Sketch</option>
            <option value="full-color">Full-Color</option>
          </select>
          <select
            value={grade}
            onChange={e=>setGrade(+e.target.value)}
            className="border px-2 py-1 rounded"
          >
            {[...Array(12)].map((_,i)=>
              <option key={i} value={i+1}>{i+1}th</option>
            )}
          </select>
          <input
            value={subject}
            onChange={e=>setSubject(e.target.value)}
            className="border px-2 py-1 rounded"
            placeholder="Subject (Science, Math…)"
          />
          <select
            value={n}
            onChange={e=>setN(+e.target.value)}
            className="border px-2 py-1 rounded"
          >
            {[1,2,3,4,5].map(i=>
              <option key={i} value={i}>{i} variant</option>
            )}
          </select>
          <button
            onClick={generate}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center"
            disabled={loading}
          >
            {loading
              ? <Loader2 className="animate-spin w-5 h-5"/>
              : "Generate"}
          </button>
        </div>

        {result && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <h2 className="text-xl font-semibold">Captions:</h2>
              <span>{result.caption_en}</span>
            </div>
            <div className="flex gap-2">
              <h2 className="text-xl font-semibold">Local:</h2>
              <span>{result.caption_local}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.images.map(img=>(
                <div key={img.img_id} className="border p-2 rounded bg-white">
                  <img src={img.url} alt="diagram" className="w-full"/>
                  <button
                    onClick={()=>download(img.url)}
                    className="mt-2 flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    <Download className="w-4 h-4"/> Download
                  </button>
                  <button
                    onClick={()=>window.open(`/resource-bazaar?highlight=${img.img_id}`, "_blank")}
                    className="mt-2 ml-2 flex items-center gap-1 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    <RefreshCw className="w-4 h-4"/> Published
                  </button>
                  <div className="mt-2 text-sm">
                    <strong>Labels:</strong> {img.labels.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
