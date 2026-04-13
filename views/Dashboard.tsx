import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Clock, FileCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { Appointment, WorkflowStage } from '../types';
import { MOCK_APPOINTMENTS, getStatusColor } from '../mockData';

interface DashboardProps {
  onNavigateToPatient: (apptId: string) => void;
}

const data = [
  { name: 'Mon', visits: 12 },
  { name: 'Tue', visits: 19 },
  { name: 'Wed', visits: 15 },
  { name: 'Thu', visits: 22 },
  { name: 'Fri', visits: 28 },
  { name: 'Sat', visits: 10 },
  { name: 'Sun', visits: 5 },
];

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToPatient }) => {
  const stats = [
    { label: 'Pending Preparation', value: 4, icon: Clock, color: 'bg-accent' },
    { label: 'Collection Today', value: 12, icon: Users, color: 'bg-primary' },
    { label: 'Claims to Submit', value: 8, icon: FileCheck, color: 'bg-secondary' },
    { label: 'Supply Alerts', value: 1, icon: AlertCircle, color: 'bg-danger' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-3 rounded-none border border-orange-200 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-2xl font-bold text-secondary">{stat.value}</h3>
            </div>
            <div className={`${stat.color} p-2 rounded-none`}>
              <stat.icon className="text-white h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white p-4 rounded-none border border-orange-200">
          <h2 className="text-xs font-bold text-secondary uppercase mb-4 border-b pb-1">Weekly Dispensing Volume</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <Tooltip 
                  contentStyle={{borderRadius: '0px', border: '1px solid #e2e8f0', fontSize: '10px'}} 
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="visits" fill="#f97316" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-none border border-orange-200">
          <h2 className="text-xs font-bold text-secondary uppercase mb-4 border-b pb-1">Urgent Actions</h2>
          <div className="space-y-2">
            {MOCK_APPOINTMENTS.filter(a => a.status !== WorkflowStage.COMPLETED).slice(0, 5).map((appt) => (
              <div key={appt.id} className="p-2 border border-slate-100 rounded-none hover:bg-slate-50 transition-colors group">
                <div className="flex justify-between items-start mb-1">
                  <span className={`px-1.5 py-0.5 text-[9px] font-bold ${getStatusColor(appt.status)}`}>
                    {appt.status}
                  </span>
                  <button 
                    onClick={() => onNavigateToPatient(appt.id)}
                    className="text-primary hover:scale-110"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-secondary font-bold text-xs">Patient: {appt.patientId}</p>
                    <p className="text-slate-500 text-[10px]">Due: {new Date(appt.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
            <button className="w-full py-1.5 text-center text-primary text-[10px] font-bold border border-transparent hover:border-primary transition-colors">
              VIEW ALL TASKS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};