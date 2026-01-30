import React from 'react';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { ReferralData, ViewState } from '../types';
import { Activity } from 'lucide-react';

interface DashboardProps {
  onNavigate: (view: ViewState, data?: any) => void;
}

interface StatCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, children, className = "" }) => (
  <div className={`bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col ${className}`}>
    <h3 className="text-gray-500 font-medium mb-4 text-xs uppercase tracking-wider">{title}</h3>
    <div className="flex-1 flex items-center justify-center w-full min-h-0">
      {children}
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  // --- Mock Data ---
  const donutData = [
    { name: 'Pending Admit', value: 121, color: '#4f35f3' }, // Blue
    { name: 'Accepted', value: 80, color: '#4fd1c5' }, // Teal
    { name: 'In Review', value: 45, color: '#1a202c' }, // Dark
    { name: 'New', value: 30, color: '#cbd5e0' }, // Grey
  ];

  const barData = [
    { name: 'Elevate', val1: 20, val2: 10 },
    { name: 'Mt. Sinai', val1: 15, val2: 60 },
    { name: 'Sinai West', val1: 35, val2: 45 },
    { name: 'Sinai East', val1: 18, val2: 40 },
  ];

  const paymentData = [
    { name: 'Medicaid', value: 80, fill: '#f687b3' },
    { name: 'Medicare', value: 100, fill: '#f6ad55' },
    { name: 'HMO', value: 65, fill: '#63b3ed' },
    { name: 'Private', value: 20, fill: '#4fd1c5' },
  ];

  const tableData: ReferralData[] = [
    { id: '1', facility: 'Element Care', patientName: 'Ronald Richards', conversionRate: 94, total: 78, unopened: 12, pending: 12, lost: 8, denied: 44, admitted: 22, aiScore: 92 },
    { id: '2', facility: 'Springdale', patientName: 'Jerome Bell', conversionRate: 89, total: 88, unopened: 17, pending: 121, lost: 19, denied: 21, admitted: 13, aiScore: 45 },
    { id: '3', facility: 'Northwood', patientName: 'Darrell Steward', conversionRate: 88, total: 78, unopened: 12, pending: 12, lost: 8, denied: 44, admitted: 22, aiScore: 78 },
    { id: '4', facility: 'Element', patientName: 'Dianne Russell', conversionRate: 84, total: 88, unopened: 17, pending: 17, lost: 19, denied: 21, admitted: 13, aiScore: 88 },
    { id: '5', facility: 'Pointer Care', patientName: 'Cody Fisher', conversionRate: 78, total: 78, unopened: 12, pending: 12, lost: 8, denied: 44, admitted: 22, aiScore: 65 },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl text-[#0f0b29] mb-2 font-serif">Welcome in, Ronald</h1>
        <p className="text-gray-400 text-sm">Here's what's happening with your referrals today.</p>
      </div>

      {/* Top Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8 h-80">
        
        {/* Total Pending Referrals - Donut */}
        <StatCard title="Total Pending Referrals">
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="relative w-44 h-44 sm:w-48 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    innerRadius={64}
                    outerRadius={86}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-[#0f0b29]">121</span>
              </div>
            </div>

            <div className="w-full mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[10px] text-gray-500 uppercase tracking-wide font-medium">
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#cbd5e0]"></div> New</span>
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#1a202c]"></div> Review</span>
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#4fd1c5]"></div> Accepted</span>
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#4f35f3]"></div> Pending</span>
            </div>
          </div>
        </StatCard>

        {/* Conversion Per Accounts - Bar */}
        <StatCard title="Conversion per Accounts">
           <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barSize={16}>
                 <XAxis dataKey="name" tick={{fontSize: 10, fill: '#a0aec0'}} axisLine={false} tickLine={false} interval={0} />
                 <YAxis hide />
                 <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                 <Bar dataKey="val1" stackId="a" fill="#4fd1c5" radius={[0, 0, 4, 4]} />
                 <Bar dataKey="val2" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
           </ResponsiveContainer>
        </StatCard>

        {/* Denied Referrals - Grid Layout */}
        <StatCard title="Denied Referrals Reasons">
          <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-2 text-[10px] font-semibold text-gray-700">
             <div className="bg-red-50 p-1 col-span-1 row-span-2 flex flex-col justify-center items-center text-center rounded-xl border border-red-100/50">Clinical <span className="text-lg text-red-400">6</span></div>
             <div className="bg-red-100 p-1 col-span-2 flex flex-col justify-center items-center text-center rounded-xl border border-red-200/50">Out of Network <span className="text-lg text-red-500">8</span></div>
             <div className="bg-red-50 p-1 flex flex-col justify-center items-center text-center rounded-xl border border-red-100/50">Expired <span className="text-gray-400 font-normal">4</span></div>
             <div className="bg-red-200 p-1 flex flex-col justify-center items-center text-center rounded-xl border border-red-300/50">Waitlist <span className="text-gray-500 font-normal">3</span></div>
             <div className="bg-red-100 p-1 col-span-2 row-span-2 flex flex-col justify-center items-center text-center rounded-xl border border-red-200/50">Declined <span className="text-2xl text-red-500">9</span></div>
             <div className="bg-red-50 p-1 flex flex-col justify-center items-center text-center rounded-xl border border-red-100/50">Other <span className="text-gray-400 font-normal">2</span></div>
          </div>
        </StatCard>

        {/* Payment Sources - Bar */}
        <StatCard title="Payment Sources">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentData} barSize={24} layout="vertical">
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" width={60} tick={{fontSize: 10, fill: '#a0aec0'}} axisLine={false} tickLine={false} />
                 <Tooltip cursor={{fill: 'transparent'}} />
                 <Bar dataKey="value" radius={[0, 4, 4, 0]} background={{ fill: '#f7fafc', radius: [0, 4, 4, 0] }}>
                    {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                 </Bar>
              </BarChart>
           </ResponsiveContainer>
        </StatCard>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-x-auto">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center min-w-[800px]">
            <h3 className="font-bold text-gray-800">All Referrals</h3>
            <button className="text-sm text-[#4f35f3] font-medium hover:underline">View All</button>
        </div>
        <table className="w-full text-left text-sm text-gray-600 min-w-[800px]">
            <thead className="text-xs text-gray-400 uppercase tracking-wider bg-gray-50/50">
                <tr>
                    <th className="py-5 pl-8 font-medium">Facility / Patient</th>
                    <th className="py-5 font-medium">Status</th>
                    <th className="py-5 font-medium text-center">AI Score</th>
                    <th className="py-5 font-medium text-center">Docs</th>
                    <th className="py-5 font-medium text-center">Conv. Rate</th>
                    <th className="py-5 font-medium text-right pr-8">Admitted</th>
                </tr>
            </thead>
            <tbody>
                {tableData.map((row, idx) => (
                    <tr 
                        key={idx} 
                        onClick={() => onNavigate(ViewState.REFERRAL_DETAIL)}
                        className="border-b border-gray-50 hover:bg-[#f8f9fc] cursor-pointer transition-colors group"
                    >
                        <td className="py-5 pl-8">
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-800 text-base">{row.patientName}</span>
                                <span className="text-xs text-gray-400">{row.facility}</span>
                            </div>
                        </td>
                        <td className="py-5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 whitespace-nowrap">
                                In Review
                            </span>
                        </td>
                        <td className="py-5 text-center">
                            {row.aiScore && (
                                <div className="flex items-center justify-center gap-1">
                                    <div className={`px-2 py-0.5 rounded-md text-xs font-bold ${getScoreColor(row.aiScore)}`}>
                                        {row.aiScore}
                                    </div>
                                    <Activity size={12} className="text-gray-300" />
                                </div>
                            )}
                        </td>
                        <td className="py-5 text-center text-gray-400">
                             {row.unopened > 0 ? (
                                 <span className="text-orange-500 font-bold whitespace-nowrap">{row.unopened} New</span>
                             ) : (
                                 <span className="whitespace-nowrap">All Read</span>
                             )}
                        </td>
                        <td className="py-5 text-center font-medium">
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-400 rounded-full" style={{width: `${row.conversionRate}%`}}></div>
                                </div>
                                <span className="text-xs">{row.conversionRate}%</span>
                            </div>
                        </td>
                        <td className="py-5 pr-8 text-right font-bold text-gray-800">{row.admitted}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;