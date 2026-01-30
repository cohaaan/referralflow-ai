import React, { useState } from 'react';
import { User, Bell, Shield, Building2, CreditCard, HelpCircle, LogOut, ChevronRight, Moon, Globe, Mail } from 'lucide-react';

const Settings: React.FC = () => {
  const [notifications, setNotifications] = useState({
    emailReferrals: true,
    emailDecisions: true,
    pushAlerts: true,
    dailyDigest: false
  });

  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in">
      <h2 className="text-4xl font-serif text-[#0f0b29] mb-2">Settings</h2>
      <p className="text-gray-500 mb-8">Manage your account preferences and application settings.</p>

      {/* Profile Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-4">
          <img 
            src="https://i.pravatar.cc/150?u=admin" 
            alt="Profile" 
            className="w-16 h-16 rounded-full object-cover border-2 border-purple-100"
          />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800">Sarah Johnson</h3>
            <p className="text-gray-500">Admissions Coordinator</p>
            <p className="text-sm text-gray-400">sarah.johnson@sunrisesnf.com</p>
          </div>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
            Edit Profile
          </button>
        </div>
      </div>

      {/* Account Settings */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <h3 className="text-lg font-bold text-gray-800 px-6 pt-6 pb-4 flex items-center gap-2">
          <User className="text-[#4f35f3]" size={20} />
          Account
        </h3>
        
        <SettingsRow icon={<Mail size={18} />} label="Email Address" value="sarah.johnson@sunrisesnf.com" />
        <SettingsRow icon={<Shield size={18} />} label="Password" value="••••••••••" action="Change" />
        <SettingsRow icon={<Globe size={18} />} label="Language" value="English (US)" />
        <SettingsRow icon={<Building2 size={18} />} label="Organization" value="Sunrise Healthcare Group" />
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <h3 className="text-lg font-bold text-gray-800 px-6 pt-6 pb-4 flex items-center gap-2">
          <Bell className="text-[#4f35f3]" size={20} />
          Notifications
        </h3>
        
        <ToggleRow 
          label="Email for new referrals" 
          description="Get notified when new referrals arrive"
          enabled={notifications.emailReferrals}
          onChange={() => setNotifications({...notifications, emailReferrals: !notifications.emailReferrals})}
        />
        <ToggleRow 
          label="Email for decisions" 
          description="Get notified when decisions are made"
          enabled={notifications.emailDecisions}
          onChange={() => setNotifications({...notifications, emailDecisions: !notifications.emailDecisions})}
        />
        <ToggleRow 
          label="Push notifications" 
          description="Receive browser push alerts"
          enabled={notifications.pushAlerts}
          onChange={() => setNotifications({...notifications, pushAlerts: !notifications.pushAlerts})}
        />
        <ToggleRow 
          label="Daily digest" 
          description="Receive a daily summary email"
          enabled={notifications.dailyDigest}
          onChange={() => setNotifications({...notifications, dailyDigest: !notifications.dailyDigest})}
        />
      </div>

      {/* Appearance */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <h3 className="text-lg font-bold text-gray-800 px-6 pt-6 pb-4 flex items-center gap-2">
          <Moon className="text-[#4f35f3]" size={20} />
          Appearance
        </h3>
        
        <ToggleRow 
          label="Dark mode" 
          description="Switch to dark theme"
          enabled={darkMode}
          onChange={() => setDarkMode(!darkMode)}
        />
      </div>

      {/* Billing & Plan */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <h3 className="text-lg font-bold text-gray-800 px-6 pt-6 pb-4 flex items-center gap-2">
          <CreditCard className="text-[#4f35f3]" size={20} />
          Plan & Billing
        </h3>
        
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800">Enterprise Plan</p>
            <p className="text-sm text-gray-500">Unlimited referrals, all AI features</p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Active</span>
        </div>
        <div className="px-6 py-4 flex items-center justify-between text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors">
          <span>View billing history</span>
          <ChevronRight size={18} />
        </div>
      </div>

      {/* Support & Logout */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <button className="w-full px-6 py-4 flex items-center gap-3 text-gray-600 hover:bg-gray-50 transition-colors border-b border-gray-50">
          <HelpCircle size={18} />
          <span>Help & Support</span>
          <ChevronRight size={18} className="ml-auto" />
        </button>
        <button className="w-full px-6 py-4 flex items-center gap-3 text-red-500 hover:bg-red-50 transition-colors">
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

// Helper Components
const SettingsRow: React.FC<{ icon: React.ReactNode; label: string; value: string; action?: string }> = ({ icon, label, value, action }) => (
  <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between hover:bg-gray-50 transition-colors">
    <div className="flex items-center gap-3">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-600">{label}</span>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-gray-800 font-medium">{value}</span>
      {action && (
        <button className="text-[#4f35f3] text-sm font-medium hover:underline">{action}</button>
      )}
    </div>
  </div>
);

const ToggleRow: React.FC<{ label: string; description: string; enabled: boolean; onChange: () => void }> = ({ label, description, enabled, onChange }) => (
  <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
    <div>
      <p className="font-medium text-gray-800">{label}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <button
      onClick={onChange}
      className={`w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-[#4f35f3]' : 'bg-gray-200'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

export default Settings;