// src/pages/ResourceBazaar.jsx

import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { Download } from 'lucide-react'

export default function ResourceBazaar() {
  const [resources, setResources] = useState([])

  useEffect(() => {
    fetch('/api/resources')
      .then(r => r.json())
      .then(data => {
        // normalize whatever shape comes back
        if (Array.isArray(data)) setResources(data)
        else if (Array.isArray(data.resources)) setResources(data.resources)
        else setResources([])
      })
      .catch(err => {
        console.error('Failed to load resources:', err)
        setResources([])
      })
  }, [])

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 text-gray-200 p-6">
        <h1 className="text-2xl font-semibold mb-4">Resource Bazaar</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.length === 0 ? (
            <p className="text-gray-400">No resources available.</p>
          ) : (
            resources.map(r => (
              <div key={r.id} className="bg-gray-800 p-4 rounded space-y-2">
                <h3 className="font-semibold text-lg">{r.title}</h3>
                <p className="text-xs text-gray-400 uppercase">{r.type}</p>
                <div className="space-y-1">
                  {Array.isArray(r.files) &&
                    r.files.map(f => (
                      <a
                        key={f.filename}
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-indigo-300 hover:underline text-sm"
                      >
                        <Download className="w-4 h-4" />
                        {f.filename}
                      </a>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  )
}
