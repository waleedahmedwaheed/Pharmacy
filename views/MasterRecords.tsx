import React, { useState, useMemo, useEffect } from 'react';
import { Database, Search, Edit3, Save, X, RotateCcw, Pill, ScrollText, CheckCircle2, AlertCircle, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { masterDataService } from '../services/masterDataService';
import { MasterDirection, MasterDrug } from '../types';

export const MasterRecords: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'directions' | 'drugs'>('directions');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [directions, setDirections] = useState<MasterDirection[]>(masterDataService.getDirections());
  const [drugs, setDrugs] = useState<MasterDrug[]>(masterDataService.getDrugs());

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSaveDirection = (code: string) => {
    masterDataService.updateDirectionOverride(code, editValue || undefined);
    setDirections(masterDataService.getDirections());
    setEditingKey(null);
  };

  const handleSaveDrug = (name: string) => {
    masterDataService.updateDrugOverride(name, editValue || undefined);
    setDrugs(masterDataService.getDrugs());
    setEditingKey(null);
  };

  const filteredData = useMemo(() => {
    if (activeTab === 'directions') {
      return directions.filter(d => 
        d.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.translation.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      return drugs.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
  }, [activeTab, directions, drugs, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  return (
    <div className="space-y-3 animate-in fade-in duration-300 max-h-full overflow-hidden flex flex-col">
      <div className="shrink-0 border-b border-orange-200 pb-2">
        <h2 className="text-xl font-bold text-secondary flex items-center gap-2 uppercase tracking-tight">
          <Database className="text-primary" size={20} /> Master Data
        </h2>
      </div>

      <div className="flex gap-2 border-b border-orange-100 shrink-0">
        <button 
          onClick={() => { setActiveTab('directions'); setSearchTerm(''); setEditingKey(null); }}
          className={`pb-2 px-3 font-bold text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'directions' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}
        >
          <ScrollText size={14} /> Directions ({directions.length})
        </button>
        <button 
          onClick={() => { setActiveTab('drugs'); setSearchTerm(''); setEditingKey(null); }}
          className={`pb-2 px-3 font-bold text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'drugs' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}
        >
          <Pill size={14} /> Drugs ({drugs.length})
        </button>
      </div>

      <div className="bg-white p-2 rounded-none shadow-sm border border-orange-100 flex justify-between items-center shrink-0">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Search master data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-none focus:ring-1 focus:ring-primary outline-none text-xs font-medium"
          />
        </div>
        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 border border-slate-200">
            <CheckCircle2 size={12} className="text-success" /> SYNCED
        </div>
      </div>

      <div className="bg-white rounded-none shadow-sm border border-orange-100 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 z-10 bg-orange-50">
              <tr className="border-b border-orange-100">
                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-28">Code/Item</th>
                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-40">Master Default</th>
                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pharmacy Override</th>
                <th className="p-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTab === 'directions' ? (paginatedData as MasterDirection[]).map(d => (
                <tr key={d.code} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-2 align-middle">
                      <span className="font-mono font-bold text-primary bg-orange-50 px-1.5 py-0.5 border border-orange-100 text-[10px]">{d.code}</span>
                  </td>
                  <td className="p-2 text-[10px] text-slate-400 font-bold uppercase truncate">{d.translation}</td>
                  <td className="p-2">
                    {editingKey === d.code ? (
                      <div className="flex gap-1">
                        <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} className="flex-1 p-1 border border-primary rounded-none outline-none text-[11px] font-bold shadow-sm" autoFocus />
                        <button onClick={() => handleSaveDirection(d.code)} className="p-1 bg-green-600 text-white hover:bg-green-700"><Save size={14} /></button>
                        <button onClick={() => setEditingKey(null)} className="p-1 bg-slate-200 text-slate-600"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold uppercase ${d.customTranslation ? 'text-success' : 'text-secondary'}`}>{d.customTranslation || d.translation}</span>
                        {d.customTranslation && <span className="text-[8px] font-bold bg-green-600 text-white px-1 rounded-none uppercase">LOCAL</span>}
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    <button onClick={() => { setEditingKey(d.code); setEditValue(d.customTranslation || d.translation); }} className="p-1.5 text-slate-400 hover:text-primary transition-all"><Edit3 size={14} /></button>
                  </td>
                </tr>
              )) : (paginatedData as MasterDrug[]).map(d => (
                <tr key={d.name} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-2 align-middle">
                      <div className="flex items-center gap-2">
                        <Pill size={14} className="text-slate-300" />
                        <span className="font-bold text-secondary text-[10px] uppercase truncate">{d.name}</span>
                      </div>
                  </td>
                  <td className="p-2 text-[10px] text-slate-400 font-bold uppercase truncate">{d.strength}</td>
                  <td className="p-2">
                    {editingKey === d.name ? (
                      <div className="flex gap-1">
                        <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} className="flex-1 p-1 border border-primary rounded-none outline-none text-[11px] font-bold shadow-sm" autoFocus />
                        <button onClick={() => handleSaveDrug(d.name)} className="p-1 bg-green-600 text-white hover:bg-green-700"><Save size={14} /></button>
                        <button onClick={() => setEditingKey(null)} className="p-1 bg-slate-200 text-slate-600"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                         <span className={`text-[11px] font-bold uppercase ${d.customStrength ? 'text-blue-600' : 'text-secondary'}`}>{d.customStrength || d.strength}</span>
                         {d.customStrength && <span className="text-[8px] font-bold bg-blue-600 text-white px-1 rounded-none uppercase">LOCAL</span>}
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    <button onClick={() => { setEditingKey(d.name); setEditValue(d.customStrength || d.strength); }} className="p-1.5 text-slate-400 hover:text-primary transition-all"><Edit3 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {paginatedData.length === 0 && (
              <div className="p-10 text-center text-slate-300 uppercase text-[10px] font-bold">No results</div>
          )}
        </div>
        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50 border-t border-orange-100 flex items-center justify-between shrink-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Page {currentPage} of {totalPages || 1} | Records {filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredData.length)}
          </div>
          <div className="flex items-center gap-1">
             <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-secondary disabled:opacity-30 transition-all"
             >
                <ChevronLeft size={16} strokeWidth={3} />
             </button>
             {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
               <button 
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-[10px] font-black border transition-all ${currentPage === page ? 'bg-primary border-primary text-white shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:border-primary hover:text-primary'}`}
               >
                  {page}
               </button>
             ))}
             <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-secondary disabled:opacity-30 transition-all"
             >
                <ChevronRight size={16} strokeWidth={3} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};