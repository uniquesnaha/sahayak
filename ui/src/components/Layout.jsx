import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Bot, RefreshCw, Settings, HelpCircle, Menu, Sparkles } from 'lucide-react'

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const navItem = (to, Icon, label) => (
    <Link
      key={to}
      to={to}
      className={`group relative flex items-center p-3 rounded-xl transition-all duration-300 ${
        pathname === to
          ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-white border border-purple-500/30'
          : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
      }`}
    >
      <Icon className={`w-5 h-5 mr-3 transition-colors duration-300 ${
        pathname === to ? 'text-purple-400' : 'group-hover:text-purple-400'
      }`} />
      {sidebarOpen && <span className="font-medium">{label}</span>}
      {pathname === to && (
        <div className="absolute right-2 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
      )}
    </Link>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Sidebar */}
      <aside className={`relative z-10 ${sidebarOpen ? 'w-72' : 'w-20'} bg-gray-900/80 backdrop-blur-xl border-r border-gray-700/50 transition-all duration-300 flex flex-col`}>
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${sidebarOpen ? 'space-x-3' : 'justify-center'}`}>
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              {sidebarOpen && (
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Sahayak
                  </h2>
                  <p className="text-xs text-gray-400">AI Assistant</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItem('/', Home, 'Home')}
          {navItem('/ask-sahayak', Bot, 'Chat')}
          {navItem('/resource-bazaar', RefreshCw, 'Resources')}
          
          {sidebarOpen && (
            <div className="mt-8 pt-6 border-t border-gray-700/50">
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-3 px-3">
                Recent Chats
              </h3>
              <div className="space-y-1">
                <div className="p-2 rounded-lg text-sm text-gray-500 hover:bg-gray-800/30 cursor-pointer transition-colors">
                  How to optimize React...
                </div>
                <div className="p-2 rounded-lg text-sm text-gray-500 hover:bg-gray-800/30 cursor-pointer transition-colors">
                  JavaScript best practices
                </div>
                <div className="p-2 rounded-lg text-sm text-gray-500 hover:bg-gray-800/30 cursor-pointer transition-colors">
                  UI/UX design tips
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Bottom navigation */}
        <nav className="p-4 space-y-2 border-t border-gray-700/50">
          {navItem('/settings', Settings, 'Settings')}
          {navItem('/help', HelpCircle, 'Help')}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 relative z-10">
        {children}
      </main>
    </div>
  )
}