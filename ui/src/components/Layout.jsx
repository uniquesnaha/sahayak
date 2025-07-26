import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  MessageCircle,
  BookOpen,
  Settings,
  HelpCircle,
  Menu,
  Terminal
} from 'lucide-react'

const navLinks = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/ask-sahayak', icon: MessageCircle, label: 'Chat' },
  { to: '/resource-bazaar', icon: BookOpen, label: 'Resources' }
]
const bottomLinks = [
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/help', icon: HelpCircle, label: 'Help' }
]

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const navItem = (to, Icon, label) => (
    <Link
      key={to}
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg
        transition-colors duration-200
        ${pathname === to
          ? 'bg-[#191b20] text-blue-400 border border-blue-900/40'
          : 'text-gray-400 hover:text-white hover:bg-[#23242a]'
        }`}
      style={{ fontWeight: 500, letterSpacing: '-0.01em', fontSize: '1rem' }}
    >
      <Icon size={20} className="shrink-0" />
      {sidebarOpen && <span>{label}</span>}
    </Link>
  )

  return (
    <div className="min-h-screen flex bg-[#131417] font-sans">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-14'} transition-all duration-200 bg-[#16171c] border-r border-[#23242a] flex flex-col h-screen`}>
        <div className="flex items-center justify-between px-4 py-6 border-b border-[#23242a]">
          <div className={`${sidebarOpen ? 'flex items-center gap-3' : 'justify-center w-full'}`}>
            <div className="w-9 h-9 bg-[#232842] rounded flex items-center justify-center">
              <Terminal size={20} className="text-blue-400" />
            </div>
            {sidebarOpen && (
              <div>
                <h2 className="text-lg font-semibold text-gray-100 tracking-tight">Sahayak</h2>
                <span className="text-xs text-gray-500">AI Assistant</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="p-2 rounded-md bg-[#191b20] text-gray-400 hover:text-white hover:bg-[#23242a] transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu size={19} />
          </button>
        </div>
        <nav className="flex-1 flex flex-col gap-2 py-6">
          {navLinks.map(({ to, icon, label }) => navItem(to, icon, label))}
        </nav>
        {sidebarOpen && (
          <section className="border-t border-[#23242a] py-3 px-4">
            <h3 className="text-xs text-gray-500 tracking-wider mb-3 font-semibold uppercase">Recent</h3>
            <div className="flex flex-col gap-1">
              <div className="text-gray-400 hover:bg-[#23242a] px-2 py-2 rounded text-sm cursor-pointer">Optimize React...</div>
              <div className="text-gray-400 hover:bg-[#23242a] px-2 py-2 rounded text-sm cursor-pointer">JS best practices</div>
              <div className="text-gray-400 hover:bg-[#23242a] px-2 py-2 rounded text-sm cursor-pointer">UI/UX tips</div>
            </div>
          </section>
        )}
        <nav className="border-t border-[#23242a] py-4 flex flex-col gap-2 px-2">
          {bottomLinks.map(({ to, icon, label }) => navItem(to, icon, label))}
        </nav>
      </aside>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  )
}
