import React, { useMemo } from 'react';
import { CloudDownload, Package, ClipboardList, Activity, Settings, Boxes, Users, Database, Sun, Moon, Eye, Smartphone } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const isMac = useMemo(() => {
    return /Mac|iPhone|iPod|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent);
  }, []);
  
  const modifierKey = isMac ? 'Opt' : 'Alt';

  const menuItems = [
    { id: 'gov_queue', label: 'ePrescription', icon: CloudDownload, key: '1' },
    { id: 'medication_collection', label: 'Dispensing', icon: Package, key: '2' },
    { id: 'patient_sync', label: 'Patients', icon: Users, key: '3' },
    { id: 'inventory', label: 'Inventory', icon: Boxes, key: '4' },
    { id: 'issued_records', label: 'Issued Records', icon: ClipboardList, key: '5' },
    { id: 'master_records', label: 'Master Records', icon: Database, key: '6' },
    { id: 'settings', label: 'Settings', icon: Settings, key: '7' },
    { id: 'patient_portal', label: 'Booking Portal', icon: Smartphone, key: '8' },
  ];

  return (
    <div className="w-56 bg-secondary text-white flex flex-col h-screen fixed left-0 top-0 border-r border-orange-900/30 z-50">
      <div className="p-4 flex items-center gap-2 border-b border-orange-900/10 bg-accent text-secondary">
        <Activity className="h-5 w-5 text-secondary" />
        <div>
          <h1 className="font-bold text-base leading-none uppercase tracking-tighter">ActiveCare</h1>
          <span className="text-[10px] font-bold opacity-75">PHARMACY PORTAL</span>
        </div>
      </div>
      
      <nav className="flex-1 p-1 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full group flex items-center justify-between text-left px-3 py-2 transition-colors text-sm rounded-none ${
                isActive 
                  ? 'bg-primary text-white font-bold border-r-4 border-white/30' 
                  : 'text-orange-100/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={16} className="shrink-0" />
                <span>{item.label}</span>
              </div>
              <span className={`text-[9px] font-mono px-1 border border-white/20 opacity-30 group-hover:opacity-60 transition-opacity ${isActive ? 'opacity-60' : ''}`}>
                {modifierKey}+{item.key}
              </span>
            </button>
          );
        })}
      </nav>
      
      <div className="p-2 text-[9px] text-orange-200/40 text-center uppercase tracking-widest border-t border-white/5 bg-black/10">
        CPP v0.1.0
      </div>
    </div>
  );
};