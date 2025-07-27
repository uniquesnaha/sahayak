import React, { useState } from 'react';
import { FileText, Network, Brain, CheckCircle2, Search } from 'lucide-react';
import Layout from '../components/Layout';

export default function Home() {
  const [inputValue, setInputValue] = useState('');

  const features = [
    {
      id: 1,
      title: 'Generate Worksheet',
      description: 'Create custom worksheets for any subject',
      icon: FileText,
      endpoint: '/worksheet-builder',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 2,
      title: 'Generate Diagram',
      description: 'Visual diagrams and flowcharts made easy',
      icon: Network,
      endpoint: '/diagram-generator',
      color: 'from-green-500 to-green-600'
    },
    {
      id: 3,
      title: 'Generate Mindmap',
      description: 'Organize ideas with interactive mindmaps',
      icon: Brain,
      endpoint: '/mind-map',
      color: 'from-yellow-500 to-orange-500'
    },
    {
      id: 4,
      title: 'Evaluate Worksheet',
      description: 'Assess and grade worksheets intelligently',
      icon: CheckCircle2,
      endpoint: '/auto-eval',
      color: 'from-red-500 to-red-600'
    }
  ];

  const handleFeatureClick = (endpoint) => {
    console.log(`Navigating to: ${endpoint}`);
    window.location.href = endpoint;
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      // Redirect to AskSahayak page with prompt query
      window.location.href = `/ask-sahayak?prompt=${encodeURIComponent(trimmed)}`;
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="max-w-3xl w-full">
          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {features.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={feature.id}
                  onClick={() => handleFeatureClick(feature.endpoint)}
                  className="group bg-gray-900 rounded-lg p-6 cursor-pointer transition-all duration-200 hover:bg-gray-800 border border-gray-800 hover:border-gray-700"
                >
                  <div className={`inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r ${feature.color} rounded-md mb-3`}>
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>

                  <h3 className="text-base font-medium text-white mb-1 group-hover:text-gray-100">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Input Prompt Section */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <form onSubmit={handleInputSubmit} className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="What do you want to generate? AskSahayak"
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!inputValue.trim()}
              >
                Generate
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
