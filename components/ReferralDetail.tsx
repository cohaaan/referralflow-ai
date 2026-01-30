import React, { useState } from 'react';
import { 
  ArrowLeft, ThumbsUp, ThumbsDown, HelpCircle, Copy, Trash2, 
  MoreVertical, Check, MessageSquare, Plus, FileText, Send, 
  Paperclip, Smile, Building2, Brain, Activity, DollarSign, 
  AlertTriangle, CheckCircle2, TrendingUp
} from 'lucide-react';
import { ViewState, AIRecommendation, ClinicalData } from '../types';
import PacketAnalyzer from './PacketAnalyzer';

interface ReferralDetailProps {
  onBack: () => void;
  keywords: string[];
}

const ReferralDetail: React.FC<ReferralDetailProps> = ({ onBack, keywords }) => {
  const [activeTab, setActiveTab] = useState('Overview'); // Default to Overview to show AI insights
  const [chatMessage, setChatMessage] = useState('');
  
  // Mock AI Data based on the architecture prompt
  const aiRecommendation: AIRecommendation = {
    recommendation: 'accept',
    confidence: 0.92,
    summary: "Patient is a strong clinical match with high revenue potential. Primary diagnosis fits facility capabilities. Insurance verified (Medicare A).",
    scores: {
      clinical: 88,
      financial: 95,
      operational: 90
    },
    estimatedRevenue: 40400, // Monthly uplift mentioned in prompt
    flags: [
      { text: "High Fall Risk (BIMS: 11)", severity: 'warning' },
      { text: "Requires Wound Care (Stage 2)", severity: 'info' }
    ],
    positiveFactors: [
      "High reimbursement rate (PDPM)",
      "Rehab potential: High",
      "Family support available"
    ]
  };

  const clinicalData: ClinicalData = {
    primaryDiagnosis: "I50.9 - Heart failure, unspecified",
    bimsScore: 11,
    mobilityStatus: "Requires 1-person assist",
    fallRisk: "High",
    medications: ["Metoprolol", "Lasix", "Eliquis", "Atorvastatin"]
  };

  const [messages, setMessages] = useState([
    { id: 1, user: 'John Smith', role: 'Admissions', time: '11:12am', date: '10/12/2021', text: "Is this resident covered under part B medicare? I can't find any documentation on the casefile.", isSystem: false, avatar: 'https://i.pravatar.cc/150?u=1' },
    { id: 2, user: 'Tom Cook', role: 'Admissions', time: '11:12am', date: '10/12/2021', text: "Should be covered. I'll check with UHC", isSystem: false, avatar: 'https://i.pravatar.cc/150?u=2' },
    { id: 3, user: 'Melanie Harris', role: 'Admissions', time: '11:12am', date: '10/12/2021', text: "Completed Benefits and Eligibility Check", isSystem: false, avatar: 'https://i.pravatar.cc/150?u=3' },
    { id: 4, type: 'separator', text: '3 New Messages' },
    { id: 5, user: 'John Smith', role: 'Admissions', time: '11:12am', date: '10/12/2021', text: "Changed referral status to Accepted", isSystem: true, avatar: 'https://i.pravatar.cc/150?u=1' },
    { id: 6, user: 'John Smith', role: 'Admissions', time: '11:12am', date: '10/12/2021', text: "Changed referral status to Pending Admit\nPatient will admit on 10/12/2022", isSystem: true, avatar: 'https://i.pravatar.cc/150?u=1' },
    { id: 7, user: 'John Smith', role: 'Admissions', time: '11:12am', date: '10/12/2021', text: "I am working on the backgrounds now\nThis message has been shared across all facilities", isSystem: false, avatar: 'https://i.pravatar.cc/150?u=1' },
  ]);

  const tabs = ['Overview', 'Profile', 'Docs', 'Admission', 'Financials', 'Clinicals'];

  // Helper component for Score Cards
  const ScoreCard = ({ title, score, icon: Icon, colorClass }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-1 truncate">{title}</p>
        <div className="text-2xl font-bold text-gray-800">{score}/100</div>
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={24} />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f8f9fc] animate-fade-in overflow-hidden">
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Breadcrumb & Header */}
        <div className="px-8 pt-6 pb-2 shrink-0">
            <button 
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6 font-medium"
            >
                <ArrowLeft size={16} />
                All In Review Referrals
            </button>

            {/* Patient Header Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-6 min-w-0">
                    <div className="w-16 h-16 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                         <img src="https://i.pravatar.cc/150?u=5" alt="Patient" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">Beachwood</span>
                            <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">
                                <Brain size={10} /> AI Analyzed
                            </span>
                        </div>
                        <h1 className="text-2xl font-serif text-[#0f0b29] font-bold truncate">Ronald Richards</h1>
                        <p className="text-xs text-gray-400 font-medium">DOB: <span className="text-gray-600">08/16/1946</span> - 72yrs</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 cursor-pointer hover:bg-green-100 transition-colors">
                         <ThumbsUp size={16} className="text-green-600" />
                         <span className="text-xs font-bold text-green-700">Accept</span>
                    </div>
                    <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100 cursor-pointer hover:bg-yellow-100 transition-colors">
                         <HelpCircle size={16} className="text-yellow-600" />
                    </div>
                    <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 cursor-pointer hover:bg-red-100 transition-colors">
                         <ThumbsDown size={16} className="text-red-600" />
                    </div>
                    <div className="w-px h-6 bg-gray-200 mx-2 hidden lg:block"></div>
                    <div className="flex items-center gap-1 ml-auto lg:ml-0">
                        <button className="text-gray-400 hover:text-gray-600 p-2"><Copy size={18} /></button>
                        <button className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={18} /></button>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 mb-6 gap-8 overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-medium transition-all relative whitespace-nowrap ${
                            activeTab === tab 
                            ? 'text-[#4f35f3]' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#4f35f3] rounded-t-full"></div>
                        )}
                    </button>
                ))}
            </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
            
            {/* OVERVIEW TAB - AI DECISION ENGINE */}
            {activeTab === 'Overview' && (
                <div className="space-y-6 animate-fade-in max-w-5xl">
                    {/* Recommendation Banner */}
                    <div className={`p-6 rounded-3xl border flex flex-col md:flex-row gap-6 ${
                        aiRecommendation.recommendation === 'accept' 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100' 
                        : 'bg-gray-50'
                    }`}>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-green-800 font-bold text-lg flex items-center gap-2 mb-2">
                                <CheckCircle2 className="text-green-600 shrink-0" />
                                AI Recommendation: ACCEPT
                            </h2>
                            <p className="text-green-900/70 text-sm leading-relaxed">
                                {aiRecommendation.summary}
                            </p>
                        </div>
                        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 shrink-0 md:text-right border-t md:border-t-0 md:border-l border-green-200/50 pt-4 md:pt-0 md:pl-6">
                            <div className="text-3xl font-bold text-green-700">{Math.round(aiRecommendation.confidence * 100)}%</div>
                            <div className="text-xs text-green-600 font-medium uppercase tracking-wide">Confidence</div>
                        </div>
                    </div>

                    {/* Scores Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <ScoreCard 
                            title="Clinical Fit" 
                            score={aiRecommendation.scores.clinical} 
                            icon={Activity} 
                            colorClass="bg-blue-100 text-blue-600" 
                        />
                        <ScoreCard 
                            title="Financial Fit" 
                            score={aiRecommendation.scores.financial} 
                            icon={DollarSign} 
                            colorClass="bg-emerald-100 text-emerald-600" 
                        />
                        <ScoreCard 
                            title="Operational Fit" 
                            score={aiRecommendation.scores.operational} 
                            icon={Building2} 
                            colorClass="bg-purple-100 text-purple-600" 
                        />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Positive Factors */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <TrendingUp size={18} className="text-[#4f35f3]" />
                                Positive Indicators
                            </h3>
                            <ul className="space-y-3">
                                {aiRecommendation.positiveFactors.map((factor, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                                            <Check size={12} className="text-green-600" />
                                        </div>
                                        <span className="leading-tight">{factor}</span>
                                    </li>
                                ))}
                                <li className="flex items-start gap-3 text-sm text-gray-600 pt-2 border-t border-gray-50 mt-2">
                                     <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                                            <DollarSign size={12} className="text-emerald-600" />
                                     </div>
                                     <span className="font-bold text-emerald-700">
                                        Est. Revenue Uplift: ${aiRecommendation.estimatedRevenue.toLocaleString()}/mo
                                     </span>
                                </li>
                            </ul>
                        </div>

                        {/* Flags / Risks */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <AlertTriangle size={18} className="text-amber-500" />
                                Attention Items
                            </h3>
                            <ul className="space-y-3">
                                {aiRecommendation.flags.map((flag, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                            flag.severity === 'hard_stop' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                                        }`}>
                                            <AlertTriangle size={12} />
                                        </div>
                                        <span className={`leading-tight ${flag.severity === 'hard_stop' ? 'text-red-700 font-medium' : ''}`}>
                                            {flag.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'Financials' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in max-w-6xl">
                    {/* Primary Payer */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="text-xs text-gray-400 uppercase tracking-wider">Primary</span>
                                <h3 className="text-xl font-bold text-gray-800 mt-1">United Healthcare</h3>
                            </div>
                            <button><MoreVertical size={20} className="text-gray-300" /></button>
                        </div>
                        
                        <div className="border-t border-gray-100 pt-4">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-sm text-gray-800">Benefits and Eligibility</h4>
                                <Plus size={16} className="text-gray-400 cursor-pointer" />
                            </div>
                            <div className="grid grid-cols-2 gap-y-4 text-sm mb-4">
                                <div className="text-gray-400">Member ID</div>
                                <div className="text-gray-800 font-medium truncate">876568765</div>
                                <div className="text-gray-400">Payer Type</div>
                                <div className="text-[#4f35f3] font-medium cursor-pointer hover:underline truncate">+ Set Payer Type</div>
                            </div>
                            
                            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-gray-200 text-gray-500 shrink-0">
                                    U
                                </div>
                                <span className="text-xs text-gray-600 truncate min-w-0 flex-1">WaystarEligibilityCheck-03/13/2023.pdf</span>
                            </div>

                            <button className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                                Add Authorization
                            </button>
                        </div>
                    </div>

                     {/* Secondary Payer */}
                     <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 opacity-80">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="text-xs text-gray-400 uppercase tracking-wider">Secondary</span>
                                <h3 className="text-xl font-bold text-gray-800 mt-1">Cigna</h3>
                            </div>
                            <button><MoreVertical size={20} className="text-gray-300" /></button>
                        </div>
                         <div className="border-t border-gray-100 pt-4">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-sm text-gray-800">Benefits and Eligibility</h4>
                                <Plus size={16} className="text-gray-400" />
                            </div>
                            <div className="grid grid-cols-2 gap-y-4 text-sm mb-4">
                                <div className="text-gray-400">Member ID</div>
                                <div className="text-gray-800 font-medium truncate">876568765</div>
                            </div>
                            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-gray-200 text-gray-500 shrink-0">
                                    C
                                </div>
                                <span className="text-xs text-gray-600 truncate min-w-0 flex-1">WaystarEligibilityCheck.pdf</span>
                            </div>
                             <div className="text-xs text-gray-400 italic">No Auth Needed!</div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'Clinicals' && (
                 <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 animate-fade-in max-w-6xl">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Activity className="text-[#4f35f3]" size={20} />
                        Extracted Clinical Data
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                             <h4 className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Primary Diagnosis</h4>
                             <div className="bg-gray-50 p-4 rounded-xl text-gray-800 font-medium text-sm border border-gray-100 break-words leading-relaxed">
                                {clinicalData.primaryDiagnosis}
                             </div>
                        </div>

                        <div>
                             <h4 className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Cognitive Status</h4>
                             <div className="flex flex-wrap items-center gap-4">
                                <div className="bg-purple-50 px-4 py-2 rounded-xl text-purple-700 font-bold border border-purple-100 whitespace-nowrap">
                                    BIMS: {clinicalData.bimsScore}
                                </div>
                                <span className="text-sm text-gray-500">Moderate Impairment</span>
                             </div>
                        </div>

                        <div>
                             <h4 className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Mobility & Safety</h4>
                             <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-gray-500 mb-1 sm:mb-0">Mobility</span>
                                    <span className="font-medium text-gray-800 text-right">{clinicalData.mobilityStatus}</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-gray-500 mb-1 sm:mb-0">Fall Risk</span>
                                    <span className="font-medium text-amber-600 font-bold flex items-center gap-1 sm:justify-end">
                                        <AlertTriangle size={14} /> {clinicalData.fallRisk}
                                    </span>
                                </div>
                             </div>
                        </div>

                        <div>
                             <h4 className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Key Medications</h4>
                             <div className="flex flex-wrap gap-2">
                                {clinicalData.medications.map(med => (
                                    <span key={med} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium border border-gray-200">
                                        {med}
                                    </span>
                                ))}
                             </div>
                        </div>
                    </div>
                 </div>
            )}

            {activeTab === 'Docs' && (
                <div className="h-full">
                    <PacketAnalyzer keywords={keywords} />
                </div>
            )}
            
            {activeTab !== 'Financials' && activeTab !== 'Docs' && activeTab !== 'Overview' && activeTab !== 'Clinicals' && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <FileText size={48} className="mb-4 text-gray-200" />
                    <p>Content for {activeTab} would go here.</p>
                </div>
            )}
        </div>
      </div>

      {/* Right Sidebar - Internal Chat */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-[0_0_15px_rgba(0,0,0,0.02)] z-10 shrink-0 hidden xl:flex">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h3 className="font-bold text-gray-800">Internal Chat</h3>
            <div className="flex gap-2 text-gray-400">
                <MessageSquare size={18} className="text-[#4f35f3]" />
                <Building2 size={18} />
                <Check size={18} />
            </div>
        </div>

        {/* Toggle Log */}
        <div className="px-4 py-3 bg-[#f8f9fc] flex items-center gap-3 shrink-0">
             <div className="relative w-8 h-4 bg-[#4f35f3] rounded-full cursor-pointer">
                <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
             </div>
             <span className="text-xs font-medium text-gray-600">View Activity Log in Chat</span>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {messages.map((msg: any) => {
                if (msg.type === 'separator') {
                    return (
                        <div key={msg.id} className="flex items-center gap-4 my-6">
                            <div className="h-px bg-red-200 flex-1"></div>
                            <span className="text-[10px] text-red-400 font-medium uppercase tracking-wide">{msg.text}</span>
                            <div className="h-px bg-red-200 flex-1"></div>
                        </div>
                    );
                }

                return (
                    <div key={msg.id} className="mb-6 group">
                        <div className="flex items-baseline justify-between mb-1">
                            <div className="flex items-baseline gap-2">
                                <span className="font-bold text-xs text-gray-800">{msg.user}</span>
                                <span className="text-[10px] text-gray-400">{msg.role}</span>
                            </div>
                            <div className="text-[10px] text-gray-400 font-medium">{msg.date} <span className="text-gray-600">{msg.time}</span></div>
                        </div>

                        <div className="flex gap-3">
                            <img src={msg.avatar} alt="User" className="w-8 h-8 rounded-full object-cover shrink-0" />
                            
                            {msg.isSystem ? (
                                <div className="text-xs text-gray-800 bg-gray-50 p-3 rounded-lg rounded-tl-none w-full border border-gray-100">
                                    <p className="font-medium whitespace-pre-line leading-relaxed break-words">
                                        {msg.text.split("Accepted").map((part: string, i: number, arr: any[]) => 
                                            i < arr.length -1 ? <>{part}<span className="font-bold">Accepted</span></> : part
                                        )}
                                        {msg.text.includes("Pending Admit") && (
                                            <>Changed referral status to <span className="font-bold">Pending Admit</span></>
                                        )}
                                        {!msg.text.includes("Accepted") && !msg.text.includes("Pending Admit") && msg.text}
                                    </p>
                                </div>
                            ) : (
                                <div className="text-xs text-gray-600 bg-white p-3 rounded-lg rounded-tl-none w-full border border-gray-100 shadow-sm leading-relaxed whitespace-pre-line break-words">
                                    {msg.text}
                                    {msg.text.includes('@TomCook') && <span className="text-[#4f35f3] font-medium"> @TomCook @MelanieHarris</span>}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-[#4f35f3]/20 transition-all">
                <input 
                    type="text" 
                    placeholder="Send a Message" 
                    className="w-full text-xs p-2 outline-none text-gray-700 placeholder-gray-400"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                    <button className="bg-[#4f35f3] text-white p-1.5 rounded-full hover:bg-[#3c28c2] transition-colors">
                        <Send size={14} />
                    </button>
                </div>
            </div>
            
            <div className="flex items-center gap-2 mt-3">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#4f35f3] focus:ring-[#4f35f3]" />
                <span className="text-xs text-gray-600">Send message to all facilities</span>
            </div>

            <div className="flex gap-4 mt-4 text-gray-400 px-1">
                <Plus size={16} className="cursor-pointer hover:text-gray-600" />
                <div className="w-px h-4 bg-gray-300"></div>
                <Paperclip size={16} className="cursor-pointer hover:text-gray-600" />
                <Smile size={16} className="cursor-pointer hover:text-gray-600" />
                <span className="font-bold text-xs cursor-pointer hover:text-gray-600">@</span>
                <span className="font-bold text-xs cursor-pointer hover:text-gray-600">#</span>
                <FileText size={16} className="cursor-pointer hover:text-gray-600" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralDetail;