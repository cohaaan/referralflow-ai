import React, { useState, useRef } from 'react';
import { Upload, FileText, Search, Loader2, AlertCircle, CheckCircle, Maximize2, Brain } from 'lucide-react';
import { analyzePacket, analyzeReferralComprehensive, fileToBase64 } from '../services/geminiService';
import { AnalysisResult, FullAnalysisResult } from '../types';

interface PacketAnalyzerProps {
  keywords: string[];
  onFullAnalysis?: (analysis: FullAnalysisResult) => void;
}

const PacketAnalyzer: React.FC<PacketAnalyzerProps> = ({ keywords, onFullAnalysis }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFullAnalyzing, setIsFullAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const startAnalysis = async () => {
    if (!file) return;
    if (keywords.length === 0) {
      setError("Please add keywords in Settings.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const base64 = await fileToBase64(file);
      const analysisData = await analyzePacket(base64, file.type, keywords, file.name);
      setResult(analysisData);
    } catch (err: any) {
      setError(err.message || "Something went wrong during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startFullAnalysis = async () => {
    if (!file) return;

    setIsFullAnalyzing(true);
    setError(null);

    try {
      const base64 = await fileToBase64(file);
      const fullAnalysis = await analyzeReferralComprehensive(base64, file.type, file.name);
      if (onFullAnalysis) {
        onFullAnalysis(fullAnalysis);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong during full analysis.");
    } finally {
      setIsFullAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      {/* Header for Analyzer */}
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-xl font-bold text-gray-800">Referral Packet Analysis</h2>
            <p className="text-xs text-gray-500">AI-powered OCR for keyword detection.</p>
        </div>
        <div className="flex gap-2">
            {keywords.slice(0, 3).map(k => (
                <span key={k} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600 font-medium">
                    {k}
                </span>
            ))}
            {keywords.length > 3 && <span className="text-xs text-gray-400 self-center">+{keywords.length-3}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 min-h-0">
        
        {/* Upload Area */}
        <div className="flex flex-col gap-4">
            <div 
                className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all p-8
                ${file ? 'border-[#4f35f3] bg-purple-50/50' : 'border-gray-300 hover:border-[#4f35f3] bg-white'}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange} 
                    accept="application/pdf"
                    className="hidden" 
                />
                
                {file ? (
                    <div className="animate-fade-in">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-[#4f35f3]">
                            <FileText size={32} />
                        </div>
                        <p className="font-bold text-gray-800 mb-1">{file.name}</p>
                        <p className="text-xs text-gray-500 mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        <div className="flex justify-center gap-4">
                            <button 
                                onClick={() => { setFile(null); setResult(null); }}
                                className="text-red-500 text-xs hover:underline font-medium"
                            >
                                Remove
                            </button>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="text-[#4f35f3] text-xs hover:underline font-medium"
                            >
                                Change
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Upload size={24} className="text-gray-400" />
                        </div>
                        <p className="font-medium text-gray-600 mb-2">Drag & Drop Packet</p>
                        <p className="text-xs text-gray-400 mb-4">Support for PDF up to 100 pages</p>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            Browse Files
                        </button>
                    </>
                )}
            </div>

            <div className="flex gap-3">
              <button
                  onClick={startAnalysis}
                  disabled={!file || isAnalyzing || isFullAnalyzing || keywords.length === 0}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all
                  ${!file || isAnalyzing || isFullAnalyzing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                      : 'bg-[#4f35f3] text-white hover:bg-[#3c28c2]'}`}
              >
                  {isAnalyzing ? (
                      <>
                          <Loader2 className="animate-spin" size={16} /> Processing...
                      </>
                  ) : (
                      <>
                          <Search size={16} /> Scan Keywords
                      </>
                  )}
              </button>
              
              <button
                  onClick={startFullAnalysis}
                  disabled={!file || isAnalyzing || isFullAnalyzing}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all
                  ${!file || isAnalyzing || isFullAnalyzing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
              >
                  {isFullAnalyzing ? (
                      <>
                          <Loader2 className="animate-spin" size={16} /> Analyzing...
                      </>
                  ) : (
                      <>
                          <Brain size={16} /> Full Analysis
                      </>
                  )}
              </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-xs">
                    <AlertCircle size={14} className="shrink-0" />
                    {error}
                </div>
            )}
        </div>

        {/* Results Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden h-[500px] xl:h-auto">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-sm">Findings</h3>
                {result && <span className="bg-[#4f35f3] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{result.totalMatches} Matches</span>}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {!result && !isAnalyzing && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                        <FileText size={40} />
                        <p className="text-xs">Results appear here</p>
                    </div>
                )}

                {isAnalyzing && (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-20 bg-gray-100 rounded-xl"></div>
                        <div className="h-20 bg-gray-100 rounded-xl"></div>
                        <div className="h-20 bg-gray-100 rounded-xl"></div>
                    </div>
                )}

                {result && (
                    <div className="space-y-4">
                        <div className="bg-[#f8f9fc] p-3 rounded-xl border border-gray-100">
                            <h4 className="text-[#4f35f3] text-[10px] font-bold uppercase mb-1">AI Summary</h4>
                            <p className="text-gray-600 text-xs leading-relaxed">{result.summary}</p>
                        </div>

                        {result.matches.map((match, idx) => (
                            <div key={idx} className="border border-gray-100 rounded-xl p-3 hover:bg-gray-50 transition-colors group cursor-pointer">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                            Pg {match.pageNumber}
                                        </span>
                                        <span className="font-bold text-gray-800 text-sm">
                                            "{match.keyword}"
                                        </span>
                                    </div>
                                    <Maximize2 size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-gray-500 text-xs pl-2 border-l-2 border-gray-200 italic">
                                    "...{match.contextSnippet}..."
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PacketAnalyzer;