import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { Star, Upload, Edit } from 'lucide-react'

export default function ResourceBazaar() {
  const [resources, setResources] = useState([])
  const [title, setTitle]         = useState('')
  const [description, setDesc]    = useState('')
  const [tags, setTags]           = useState('')
  const [type, setType]           = useState('worksheet')
  const [sourceId, setSourceId]   = useState('')
  const [rating, setRating]       = useState(0)

  // 1️⃣ Fetch on mount
  useEffect(() => {
    fetch('/api/agents/resources')
      .then(r=>r.json())
      .then(setResources)
  }, [])

  // 2️⃣ Publish
  const publish = async () => {
    await fetch('/api/agents/resources', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        type, source_id: sourceId,
        title, description,
        tags: tags.split(',').map(t=>t.trim()).filter(Boolean)
      })
    })
    .then(r=>r.json())
    .then(({id}) => {
      alert(`Published with ID ${id}`)
      // reload list
      return fetch('/api/agents/resources').then(r=>r.json()).then(setResources)
    })
  }

  // 3️⃣ Rate
  const rate = async (rid, stars) => {
    await fetch(`/api/agents/resources/${rid}/rate`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({rating: stars})
    })
    .then(r=>r.json())
    .then(({avg_rating}) => {
      setResources(rs =>
        rs.map(r => r.id===rid ? {...r, avg_rating} : r)
      )
    })
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">📚 Resource Bazaar</h1>

        {/* Publish form */}
        <div className="border p-4 rounded space-y-2 bg-white">
          <h2 className="font-medium">Publish New Resource</h2>
          <div className="flex gap-2">
            <select value={type} onChange={e=>setType(e.target.value)}
              className="border px-2 py-1 rounded"
            >
              <option value="worksheet">Worksheet</option>
              <option value="diagram">Diagram</option>
              {/* add more types later */}
            </select>
            <input
              placeholder="Source ID"
              value={sourceId}
              onChange={e=>setSourceId(e.target.value)}
              className="border px-2 py-1 rounded flex-1"
            />
          </div>
          <input
            placeholder="Title"
            value={title}
            onChange={e=>setTitle(e.target.value)}
            className="border px-2 py-1 rounded w-full"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={e=>setDesc(e.target.value)}
            className="border px-2 py-1 rounded w-full"
          />
          <input
            placeholder="Tags (comma separated)"
            value={tags}
            onChange={e=>setTags(e.target.value)}
            className="border px-2 py-1 rounded w-full"
          />
          <button
            onClick={publish}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            <Upload className="inline w-4 h-4 mr-1"/> Publish
          </button>
        </div>

        {/* Resource list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map(r => (
            <div key={r.id} className="border p-4 rounded bg-white space-y-2">
              <h3 className="font-semibold">{r.title}</h3>
              <p className="text-sm">{r.description}</p>
              <div className="flex gap-1 items-center">
                {[1,2,3,4,5].map(i=>(
                  <Star
                    key={i}
                    className={`w-4 h-4 cursor-pointer ${
                      i <= Math.round(r.avg_rating) ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                    onClick={()=>rate(r.id, i)}
                  />
                ))}
                <span className="text-sm ml-2">({r.avg_rating.toFixed(1)})</span>
              </div>
              <p className="text-xs text-gray-500">
                Type: {r.type} | Source: {r.source_id}
              </p>
              <p className="text-xs text-gray-500">Tags: {r.tags.join(', ')}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
