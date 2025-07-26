import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Image, Download, RefreshCw, ZoomIn, ZoomOut, RotateCcw, Eye, Edit3, Trash2, Plus } from 'lucide-react';
import Layout from '../components/Layout';

const MindmapGenerator = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [files, setFiles] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [plantUMLCode, setPlantUMLCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mindmapGenerated, setMindmapGenerated] = useState(false);
  const [fileContents, setFileContents] = useState({});
  const [zoom, setZoom] = useState(100);
  const [showCode, setShowCode] = useState(false);
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  // Sample PlantUML code for demonstration
  const samplePlantUML = `@startmindmap
* Central Topic
** Branch 1
*** Sub-branch 1.1
*** Sub-branch 1.2
** Branch 2
*** Sub-branch 2.1
**** Detail 2.1.1
**** Detail 2.1.2
*** Sub-branch 2.2
** Branch 3
*** Sub-branch 3.1
*** Sub-branch 3.2
@endmindmap`;

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf' || file.type === 'text/plain'
    );
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      const fileId = Date.now() + Math.random();
      
      if (file.type === 'text/plain') {
        reader.onload = (e) => {
          setFileContents(prev => ({
            ...prev,
            [fileId]: e.target.result
          }));
        };
        reader.readAsText(file);
      } else if (file.type.startsWith('image/')) {
        reader.onload = (e) => {
          setFileContents(prev => ({
            ...prev,
            [fileId]: e.target.result
          }));
        };
        reader.readAsDataURL(file);
      }
      
      setFiles(prev => [...prev, {
        file,
        id: fileId,
        type: file.type,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      }]);
    });
  }, []);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf' || file.type === 'text/plain'
    );
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      const fileId = Date.now() + Math.random();
      
      if (file.type === 'text/plain') {
        reader.onload = (e) => {
          setFileContents(prev => ({
            ...prev,
            [fileId]: e.target.result
          }));
        };
        reader.readAsText(file);
      } else if (file.type.startsWith('image/')) {
        reader.onload = (e) => {
          setFileContents(prev => ({
            ...prev,
            [fileId]: e.target.result
          }));
        };
        reader.readAsDataURL(file);
      }
      
      setFiles(prev => [...prev, {
        file,
        id: fileId,
        type: file.type,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      }]);
    });
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setFileContents(prev => {
      const newContents = { ...prev };
      delete newContents[id];
      return newContents;
    });
  };

  const generateMindmap = async () => {
    setIsProcessing(true);
    
    // Prepare data for backend
    const requestData = {
      files: files.map(f => ({
        name: f.file.name,
        type: f.file.type,
        content: fileContents[f.id] || null
      })),
      textInput: textInput.trim(),
      timestamp: new Date().toISOString()
    };
    
    console.log('Sending to backend:', requestData);
    
    // Simulate API call with realistic delay
    setTimeout(() => {
      setPlantUMLCode(samplePlantUML);
      setMindmapGenerated(true);
      setIsProcessing(false);
    }, 2000);
  };

  const regenerateMindmap = () => {
    generateMindmap();
  };

  const downloadMindmap = (format) => {
    // Simulate download
    const element = document.createElement('a');
    const content = format === 'plantuml' ? plantUMLCode : `Mindmap exported as ${format}`;
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `mindmap.${format}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleZoom = (direction) => {
    setZoom(prev => {
      if (direction === 'in') return Math.min(prev + 25, 200);
      if (direction === 'out') return Math.max(prev - 25, 25);
      return 100; // reset
    });
  };

  const formatText = (type) => {
    // Function removed - no longer needed
  };

  return (
    <Layout>
      <div className="p-6 h-full overflow-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Mindmap Generator</h1>
          <p className="text-lg text-gray-300">Transform your text into simple mind maps </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Input Section */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-6">Input Content</h2>
            
            {/* Tab Navigation */}
            <div className="flex mb-6 bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'upload' 
                    ? 'bg-gray-600 text-purple-400 shadow-sm' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload Files
              </button>
              <button
                onClick={() => setActiveTab('text')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'text' 
                    ? 'bg-gray-600 text-purple-400 shadow-sm' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Text Input
              </button>
            </div>

            {/* Upload Tab */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    dragActive ? 'border-purple-400 bg-purple-900/20' : 'border-gray-600 hover:border-purple-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-200 mb-2">
                    Drag & drop your files here
                  </p>
                  <p className="text-sm text-gray-400 mb-4">
                    Support for images (JPG, PNG), PDF files, and text documents
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Choose Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* File Preview */}
                {files.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-200">Uploaded Files:</h3>
                    {files.map((fileItem) => (
                      <div key={fileItem.id} className="border border-gray-600 bg-gray-700 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {fileItem.preview ? (
                              <img src={fileItem.preview} alt="" className="w-12 h-12 object-cover rounded" />
                            ) : (
                              <div className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center">
                                <FileText className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-200">{fileItem.file.name}</p>
                              <p className="text-sm text-gray-400">
                                {(fileItem.file.size / 1024).toFixed(1)} KB • {fileItem.file.type}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(fileItem.id)}
                            className="text-red-400 hover:text-red-300 p-2 hover:bg-red-900/20 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* File Content Preview */}
                        {fileContents[fileItem.id] && (
                          <div className="mt-3 border-t border-gray-600 pt-3">
                            {fileItem.type === 'text/plain' ? (
                              <div>
                                <p className="text-sm font-medium text-gray-300 mb-2">Content Preview:</p>
                                <div className="bg-gray-800 p-3 rounded text-sm text-gray-300 max-h-32 overflow-y-auto">
                                  {fileContents[fileItem.id].slice(0, 500)}
                                  {fileContents[fileItem.id].length > 500 && '...'}
                                </div>
                              </div>
                            ) : fileItem.type.startsWith('image/') ? (
                              <div>
                                <p className="text-sm font-medium text-gray-300 mb-2">Image Preview:</p>
                                <img 
                                  src={fileContents[fileItem.id]} 
                                  alt="Preview" 
                                  className="max-w-full h-32 object-contain rounded border border-gray-600"
                                />
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400">
                                PDF content will be processed when generating the mindmap
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Text Tab */}
            {activeTab === 'text' && (
              <div className="space-y-4">
                <textarea
                  id="textInput"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Enter your content here..."
                  className="w-full h-64 p-4 bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
                
                <div className="text-sm text-gray-400">
                  <p>Tips: Use clear headings and bullet points for better mindmap structure</p>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="mt-6">
              <button
                onClick={generateMindmap}
                disabled={isProcessing || (activeTab === 'upload' && files.length === 0) || (activeTab === 'text' && !textInput.trim())}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    Generating Mindmap...
                  </div>
                ) : (
                  'Generate Mindmap'
                )}
              </button>
            </div>
          </div>

          {/* Output Section */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">Generated Mindmap</h2>
              {mindmapGenerated && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowCode(!showCode)}
                    className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Toggle Code View"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={regenerateMindmap}
                    className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {!mindmapGenerated ? (
              <div className="h-96 border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Your mindmap will appear here</p>
                  <p className="text-sm">Upload content and click generate to get started</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Zoom Controls */}
                <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleZoom('out')}
                      className="p-2 hover:bg-gray-600 rounded text-gray-200"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-gray-200 min-w-16 text-center">
                      {zoom}%
                    </span>
                    <button
                      onClick={() => handleZoom('in')}
                      className="p-2 hover:bg-gray-600 rounded text-gray-200"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleZoom('reset')}
                      className="p-2 hover:bg-gray-600 rounded ml-2 text-gray-200"
                      title="Reset Zoom"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Download Options */}
                  <div className="flex items-center space-x-2">
                    <select
                      onChange={(e) => downloadMindmap(e.target.value)}
                      className="text-sm bg-gray-600 border border-gray-500 text-gray-200 rounded px-3 py-1 focus:ring-2 focus:ring-purple-500"
                      value=""
                    >
                      <option value="" disabled>Download as...</option>
                      <option value="png">PNG Image</option>
                      <option value="svg">SVG Vector</option>
                      <option value="pdf">PDF Document</option>
                      <option value="plantuml">PlantUML Code</option>
                    </select>
                    <Download className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* Mindmap Display */}
                {showCode ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-200">PlantUML Code</h3>
                      <button
                        onClick={() => navigator.clipboard.writeText(plantUMLCode)}
                        className="text-sm text-purple-400 hover:text-purple-300"
                      >
                        Copy Code
                      </button>
                    </div>
                    <textarea
                      value={plantUMLCode}
                      onChange={(e) => setPlantUMLCode(e.target.value)}
                      className="w-full h-80 p-4 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                ) : (
                  <div 
                    className="border border-gray-600 rounded-lg overflow-auto bg-gray-900"
                    style={{ height: '400px', transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
                  >
                    {/* Simulated Mindmap Visualization */}
                    <div className="p-8 min-w-full min-h-full">
                      <div className="flex items-center justify-center h-full">
                        <div className="relative">
                          {/* Central Node */}
                          <div className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold text-center shadow-lg">
                            Central Topic
                          </div>
                          
                          {/* Branch Lines and Nodes */}
                          <div className="absolute top-1/2 left-full ml-8 transform -translate-y-1/2">
                            <div className="flex flex-col space-y-8">
                              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">Branch 1</div>
                              <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">Branch 2</div>
                              <div className="bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg">Branch 3</div>
                            </div>
                          </div>
                          
                          {/* Additional sub-branches */}
                          <div className="absolute top-1/2 right-full mr-8 transform -translate-y-1/2">
                            <div className="flex flex-col space-y-4">
                              <div className="bg-pink-600 text-white px-3 py-2 rounded text-sm shadow-lg">Sub-branch A</div>
                              <div className="bg-indigo-600 text-white px-3 py-2 rounded text-sm shadow-lg">Sub-branch B</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MindmapGenerator;