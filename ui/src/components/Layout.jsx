import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home as HomeIcon,
  MessageCircle,
  BookOpen,
  FileText,
  Network,
  Brain,
  CheckCircle2,
  Menu,
  Terminal
} from 'lucide-react'

const navLinks = [
  { to: '/', icon: HomeIcon, label: 'Home' },
  { to: '/ask-sahayak', icon: MessageCircle, label: 'Chat' },
  { to: '/resource-bazaar', icon: BookOpen, label: 'Resources' },
  { to: '/worksheet-builder', icon: FileText, label: 'Worksheet Builder' },
  { to: '/diagram-generator', icon: Network, label: 'Diagram Generator' },
  { to: '/mind-map', icon: Brain, label: 'Mindmap' },
  { to: '/auto-eval', icon: CheckCircle2, label: 'Auto Eval' }
]

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(true)

  const navItem = ({ to, icon: Icon, label }) => {
    const active = pathname === to
    return (
      <Link
        key={to}
        to={to}
        className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${
          active
            ? 'bg-[#1f2126] text-blue-400 border-l-4 border-blue-500'
            : 'text-gray-400 hover:text-white hover:bg-[#23242a]'
        }`}
        style={{ fontWeight: 500 }}
      >
        <Icon size={20} className="shrink-0" />
        {open && <span className="truncate">{label}</span>}
      </Link>
    )
  }

  return (
    <div className="flex h-screen font-sans bg-[#121217]">
      {/* Sidebar */}
      <aside className={`${open ? 'w-56' : 'w-16'} bg-[#1a1c21] border-r border-[#23242a] transition-all duration-200 flex flex-col`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#23242a]">
          <div className="flex items-center gap-3">
            <Terminal size={24} className="text-blue-400" />
            {open && <h1 className="text-lg font-semibold text-white">Sahayak</h1>}
          </div>
          <button
            onClick={() => setOpen(o => !o)}
            className="p-2 rounded hover:bg-[#23242a] text-gray-400 hover:text-white transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-2">
          {navLinks.map(link => navItem(link))}
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-auto px-6 py-6">
        {children}
      </main>
    </div>
  )
}
