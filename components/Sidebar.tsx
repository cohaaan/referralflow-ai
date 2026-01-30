import React from 'react';
import { ViewState } from '../types';
import {
  LayoutGrid,
  Users,
  Settings as SettingsIcon,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const navItemClass = (isActive: boolean) => 
    `w-10 h-10 rounded-xl mb-6 cursor-pointer transition-all duration-200 flex items-center justify-center ${
      isActive 
        ? 'bg-white/10 text-white' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`;

  return (
    <aside className="w-20 h-screen bg-[#0f0b29] flex flex-col items-center py-6 fixed left-0 top-0 z-50 rounded-r-2xl shadow-xl">
      {/* Logo */}
      <div className="mb-12 text-white font-bold text-2xl cursor-pointer" onClick={() => onChangeView(ViewState.DASHBOARD)}>
        <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
          <span className="font-serif italic text-lg">C</span>
        </div>
      </div>

      <nav className="flex-1 flex flex-col items-center w-full">
        <div 
          className={navItemClass(currentView === ViewState.DASHBOARD)}
          onClick={() => onChangeView(ViewState.DASHBOARD)}
          title="Dashboard"
        >
          <LayoutGrid size={20} />
        </div>

        <div
          className={navItemClass(currentView === ViewState.REFERRAL_DETAIL)}
          onClick={() => onChangeView(ViewState.REFERRAL_DETAIL)}
          title="Residents / Referrals"
        >
          <Users size={20} />
        </div>
      </nav>

      <div className="mt-auto flex flex-col items-center gap-2 pb-4">
        <div 
          className={navItemClass(currentView === ViewState.SETTINGS)}
          onClick={() => onChangeView(ViewState.SETTINGS)}
          title="Settings"
        >
          <SettingsIcon size={20} />
        </div>
        
        <div className="w-8 h-[1px] bg-white/10 my-2"></div>
        
        <div className="text-gray-500 hover:text-red-400 cursor-pointer p-2 transition-colors">
            <LogOut size={18} />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;