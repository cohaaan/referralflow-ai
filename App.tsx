import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import ReferralDetail from './components/ReferralDetail';
import KeywordsModal from './components/KeywordsModal';
import { ViewState } from './types';
import { Bell, Settings as SettingsIcon, MessageSquare, Tag } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [showKeywordsModal, setShowKeywordsModal] = useState(false);
  
  // Persist keywords at the top level so they are shared between Settings and Analyzer/ReferralDetail
  const [keywords, setKeywords] = useState<string[]>([
    "Sepsis", "Fall Risk", "Ventilator", "Dialysis", "IV Antibiotics"
  ]);

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
  };

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard onNavigate={handleNavigate} />;
      case ViewState.SETTINGS:
        return <Settings />;
      case ViewState.REFERRAL_DETAIL:
        return <ReferralDetail onBack={() => setCurrentView(ViewState.DASHBOARD)} keywords={keywords} />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex font-sans">
      {/* Sidebar Navigation */}
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />

      {/* Main Content Area */}
      <div className="flex-1 ml-20 flex flex-col min-w-0 transition-all duration-300">
        
        {/* Only show top navbar if NOT in Referral Detail (Detail view has its own header structure in screenshot) */}
        {currentView !== ViewState.REFERRAL_DETAIL && (
            <header className="bg-[#f8f9fc]/90 backdrop-blur-md z-40 px-8 py-6 flex justify-between items-center sticky top-0">
            <div className="flex items-center gap-3 text-gray-400 text-sm font-medium">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                    <HomeIcon /> 
                </div>
                <span>/</span> 
                <span className="text-gray-800 capitalize tracking-wide">{currentView.toLowerCase().replace('_', ' ')}</span>
            </div>

            <div className="flex items-center gap-6">
                <button 
                  onClick={() => setShowKeywordsModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
                >
                    <Tag size={16} />
                    Keywords
                </button>
                <div className="relative cursor-pointer text-gray-400 hover:text-[#4f35f3] transition-colors">
                    <MessageSquare size={20} />
                </div>
                <div className="relative cursor-pointer text-gray-400 hover:text-[#4f35f3] transition-colors">
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#f687b3] text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm">4</div>
                    <Bell size={20} />
                </div>
                <div 
                className="cursor-pointer text-gray-400 hover:text-[#4f35f3] transition-colors"
                onClick={() => setCurrentView(ViewState.SETTINGS)}
                >
                    <SettingsIcon size={20} />
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-100 p-0.5 cursor-pointer hover:shadow-md transition-all">
                    <img src="https://i.pravatar.cc/150?u=admin" alt="Profile" className="w-full h-full object-cover rounded-full" />
                </div>
            </div>
            </header>
        )}

        {/* Page Content */}
        <main className={`flex-1 overflow-x-hidden ${currentView === ViewState.REFERRAL_DETAIL ? 'h-screen' : ''}`}>
          {renderContent()}
        </main>
      </div>

      {/* Keywords Modal */}
      <KeywordsModal 
        isOpen={showKeywordsModal}
        onClose={() => setShowKeywordsModal(false)}
        keywords={keywords}
        setKeywords={setKeywords}
      />
    </div>
  );
};

// Small helper for the breadcrumb
const HomeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
);

export default App;