import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, List, BookOpen, FileText, Compass, RefreshCw, Calendar, CheckCircle } from 'lucide-react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow p-6">
        <h2 className="text-2xl font-bold text-indigo-600 mb-8">Sahayak</h2>
        <nav className="space-y-4">
          <Link to="/ask-sahayak" className="flex items-center p-2 text-gray-700 hover:bg-gray-200 rounded">
            <Bot className="w-5 h-5 mr-2" /> Ask
          </Link>
          <Link to="/diagram-generator" className="flex items-center p-2 text-gray-700 hover:bg-gray-200 rounded">
            <List className="w-5 h-5 mr-2" /> Diagrams
          </Link>
          <Link to="/preparation-coach" className="flex items-center p-2 text-gray-700 hover:bg-gray-200 rounded">
            <BookOpen className="w-5 h-5 mr-2" /> Prep Coach
          </Link>
          <Link to="/reflection-coach" className="flex items-center p-2 text-gray-700 hover:bg-gray-200 rounded">
            <Compass className="w-5 h-5 mr-2" /> Reflection
          </Link>
          <Link to="/worksheet-builder" className="flex items-center p-2 text-gray-700 hover:bg-gray-200 rounded">
            <FileText className="w-5 h-5 mr-2" /> Worksheets
          </Link>
          <Link to="/auto-eval" className="flex items-center p-2 text-gray-700 hover:bg-gray-200 rounded">
            <CheckCircle className="w-5 h-5 mr-2" /> AutoEval
          </Link>
          <Link to="/lesson-planner" className="flex items-center p-2 text-gray-700 hover:bg-gray-200 rounded">
            <Calendar className="w-5 h-5 mr-2" /> Lesson Plan
          </Link>
          <Link to="/resource-bazaar" className="flex items-center p-2 text-gray-700 hover:bg-gray-200 rounded">
            <RefreshCw className="w-5 h-5 mr-2" /> Resources
          </Link>
        </nav>
      </aside>
      {/* Main content */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
);
}
