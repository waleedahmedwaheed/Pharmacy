import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FileClock, Search, CheckCircle2, Calendar, FileText, Filter, Download, Send, Loader2, Database, XCircle, ArrowUpDown, ChevronUp, ChevronDown, ClipboardList, User, Stethoscope, ChevronLeft, ChevronRight } from 'lucide-react';
import { MOCK_APPOINTMENTS, MOCK_PATIENTS, delay } from '../mockData';
import { WorkflowStage, Appointment, SortState } from '../types';
import { MedicationIcon } from '../components/MedicationIcon';

export const IssuedRecords: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [submittingIds, setSubmittingIds] = useState<string[]>([]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [refresh, setRefresh] = useState(0); 
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [sortState, setSortState] = useState<SortState<any>>({ key: 'date', order: 'desc' });

  // Pagination State for Archives
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isMac = useMemo(() => /Mac|iPhone|iPod|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent), []);
  const mod = isMac ? 'Opt' : 'Alt';

  const allRecords = useMemo(() => {
    let result = MOCK_APPOINTMENTS.map(appt => {
      const patient = MOCK_PATIENTS.find(p => p.id === appt.patientId);
      return { 
        ...appt, 
        patientName: patient?.name, 
        patientHkid: patient?.hkid,
        patientInternalId: patient?.internalId,
        rxId: appt.prescription?.id || '',
        doctorName: appt.prescription?.prescriber.nameEn || 'DR. WONG KA KEUNG'
      };
    }).filter(item => 
      item.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.patientHkid?.includes(searchTerm) ||
      item.patientInternalId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.rxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    result.sort((a, b) => {
      const aVal = (a as any)[sortState.key] || '';
      const bVal = (b as any)[sortState.key] || '';
      if (aVal === bVal) return 0;
      const factor = sortState.order === 'asc' ? 1 : -1;
      return (aVal > bVal ? 1 : -1) * factor;
    });

    return result;
  }, [searchTerm, refresh, sortState]);

  const pendingSubmission = useMemo(() => allRecords.filter(a => a.status === WorkflowStage.SUBMISSION), [allRecords]);
  const completedHistory = useMemo(() => allRecords.filter(a => a.status === WorkflowStage.COMPLETED || a.status === WorkflowStage.PAYMENT || a.status === WorkflowStage.DISPENSING), [allRecords]);

  const totalPages = Math.ceil(completedHistory.length / itemsPerPage);
  const paginatedArchives = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return completedHistory.slice(start, start + itemsPerPage);
  }, [completedHistory, currentPage]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [pendingSubmission]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      const isMod = isMac ? (e.altKey || e.ctrlKey) : e.altKey;
      if (isMod) {
        if (e.code === 'KeyF') { e.preventDefault(); searchInputRef.current?.focus(); }
        return;
      }

      if (pendingSubmission.length > 0) {
        if (e.code === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev < pendingSubmission.length - 1 ? prev + 1 : prev));
        } else if (e.code === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.code === 'Enter') {
          e.preventDefault();
          const record = pendingSubmission[selectedIndex];
          if (record && !submittingIds.includes(record.id)) {
            handleSubmitToGov(record);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isMac, pendingSubmission, selectedIndex, submittingIds]);

  const handleSubmitToGov = async (appt: any) => {
    setSubmittingIds(prev => [...prev, appt.id]);
    try {
      await delay(800);
      const idx = MOCK_APPOINTMENTS.findIndex(a => a.id === appt.id);
      if (idx >= 0) { MOCK_APPOINTMENTS[idx].status = WorkflowStage.COMPLETED; }
    } catch (e: any) {
      alert(`Close failed: ${e.message}`);
    } finally {
      setSubmittingIds(prev => prev.filter(pid => pid !== appt.id));
      setRefresh(prev => prev + 1);
    }
  };

  const handleBulkSubmit = async () => {
    if (pendingSubmission.length === 0) return;
    setIsBulkSubmitting(true);
    const ids = pendingSubmission.map(r => r.id);
    setSubmittingIds(ids);
    for (const record of pendingSubmission) {
      try {
        const idx = MOCK_APPOINTMENTS.findIndex(a => a.id === record.id);
        if (idx >= 0) { MOCK_APPOINTMENTS[idx].status = WorkflowStage.COMPLETED; }
      } catch (e) {}
    }
    setSubmittingIds([]);
    setIsBulkSubmitting(false);
    setRefresh(prev => prev + 1);
  };

  const handleSort = (key: string) => {
    setSortState(prev => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIndicator = ({ column }: { column: string }) => {
    if (sortState.key !== column) return <ArrowUpDown size={12} className="opacity-30 ml-2" />;
    return sortState.order === 'asc' ? <ChevronUp size={12} className="text-primary ml-2" /> : <ChevronDown size={12} className="text-primary ml-2" />;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '---';
    const date = new Date(dateStr);
    const dd = date.getDate().toString().padStart(2, '0');
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 px-2 py-4">
      <div className="border-b border-orange-100 pb-4">
        <div className="flex items-center gap-3">
           <FileClock className="text-primary" size={28} />
           <h2 className="text-2xl font-black text-[#451a03] uppercase tracking-tight">
             Issued Records
           </h2>
        </div>
      </div>

      <div className="bg-white p-4 border border-orange-50 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
           <div className="relative w-full max-w-xl">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
             <input 
               ref={searchInputRef}
               type="text" 
               placeholder={`Search Records by PT ID, Name, Rx ID or Doctor... [↑↓] Nav | [Enter] Close | [${mod}+F] Search`} 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none text-sm font-medium text-slate-600 placeholder:text-slate-300 transition-all"
             />
           </div>
      </div>

      {pendingSubmission.length > 0 && (
          <div className="bg-white border border-orange-100 border-l-4 border-l-orange-500 shadow-sm overflow-hidden animate-in slide-in-from-top-2">
             <div className="px-4 py-3 bg-orange-50/30 border-b border-orange-100 flex justify-between items-center">
                <h3 className="font-black text-secondary text-[11px] flex items-center gap-2 uppercase tracking-widest">
                   <div className="w-1.5 h-1.5 bg-orange-500 animate-pulse"></div>
                   Ready to Finalize
                </h3>
                <button 
                    onClick={handleBulkSubmit}
                    disabled={isBulkSubmitting || submittingIds.length > 0}
                    className="flex items-center gap-2 px-4 py-1.5 bg-[#451a03] text-white text-[10px] font-black hover:bg-secondary/90 transition-all uppercase shadow-sm"
                >
                    {isBulkSubmitting ? <Loader2 size={12} className="animate-spin" /> : <><CheckCircle2 size={12} /> Close All Records</>}
                </button>
             </div>
             <div className="divide-y divide-orange-50">
               {pendingSubmission.map((record, idx) => {
                 const isSelected = selectedIndex === idx;
                 return (
                   <div key={record.id} className={`p-4 transition-colors border-l-4 ${isSelected ? 'bg-orange-50/50 border-l-primary' : 'hover:bg-slate-50 border-l-transparent'}`}>
                      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                         <div className="flex gap-4 items-start flex-1">
                            <div className={`w-10 h-10 flex items-center justify-center shrink-0 border ${isSelected ? 'bg-primary text-white border-primary shadow-md' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                              <Send size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                               <h4 className="font-black text-secondary text-base uppercase truncate tracking-tight mb-0.5 flex items-center gap-2">
                                  {record.patientName}
                                  <span className="bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono text-slate-500 border border-slate-200 flex items-center gap-1"><User size={10}/> {record.patientInternalId}</span>
                               </h4>
                               <p className="text-[10px] text-slate-400 font-mono font-bold mb-2 uppercase">{record.patientHkid}</p>
                               <div className="flex flex-wrap gap-1.5">
                                 {record.prescription?.medications.map((med: any, midx: number) => (
                                     <div key={midx} className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 shadow-sm">
                                        <MedicationIcon name={med.name} className="w-4 h-4" />
                                        <span className="text-[10px] text-slate-600 font-black uppercase truncate max-w-[120px]">{med.name}</span>
                                     </div>
                                 ))}
                               </div>
                            </div>
                         </div>
                         <button 
                           onClick={() => handleSubmitToGov(record)}
                           disabled={submittingIds.includes(record.id)}
                           className={`flex items-center gap-2 px-6 py-2.5 font-black text-[11px] uppercase transition-all min-w-[160px] justify-center border shadow-sm ${isSelected ? 'bg-primary text-white border-orange-700' : 'bg-secondary text-white border-secondary hover:bg-secondary/90'}`}
                         >
                           {submittingIds.includes(record.id) ? <Loader2 size={12} className="animate-spin" /> : <><CheckCircle2 size={14} /> {isSelected ? 'CLOSE ⏎' : 'CLOSE RECORD'}</>}
                         </button>
                      </div>
                   </div>
                 );
               })}
             </div>
          </div>
      )}

      <div className="space-y-4 pt-2">
        <h3 className="font-black text-slate-400 text-[12px] ml-1 uppercase tracking-[0.2em]">Recent Archives</h3>
        <div className="bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1">
            <table className="w-full text-left">
              <thead className="bg-[#f8fafc] border-b border-slate-200">
                <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-4 w-64 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('patientName')}>
                    <div className="flex items-center">Patient <SortIndicator column="patientName" /></div>
                  </th>
                  <th className="p-4 w-40 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('date')}>
                    <div className="flex items-center">Date <SortIndicator column="date" /></div>
                  </th>
                  <th className="p-4 w-48 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('rxId')}>
                    <div className="flex items-center">Rx ID / Doctor <SortIndicator column="rxId" /></div>
                  </th>
                  <th className="p-4 w-80">Medications</th>
                  <th className="p-4 text-right w-40">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedArchives.length > 0 ? (
                  paginatedArchives.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4">
                        <div className="flex gap-3 items-center">
                          <div className="w-8 h-8 bg-green-50 flex items-center justify-center text-green-600 shrink-0 border border-green-100 shadow-sm">
                            <CheckCircle2 size={14} />
                          </div>
                          <div>
                            <h4 className="font-black text-secondary text-[13px] uppercase tracking-tight leading-none mb-1 flex items-center gap-2">
                              {record.patientName}
                              <span className="text-[9px] font-mono text-slate-400 font-bold">{record.patientInternalId}</span>
                            </h4>
                            <span className="font-mono font-bold text-[10px] text-slate-400 uppercase">{record.patientHkid}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 font-black text-[12px] text-slate-600">
                          <Calendar size={12} className="text-slate-300" /> {formatDateDisplay(record.date)}
                        </div>
                      </td>
                      <td className="p-4">
                          <div className="flex flex-col">
                              <span className="font-mono font-black text-blue-600 text-[11px] uppercase tracking-tighter leading-none mb-1.5">{record.rxId}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><Stethoscope size={10}/> {record.doctorName}</span>
                          </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {record.prescription?.medications.map((med: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 shadow-sm">
                                 <MedicationIcon name={med.name} className="w-3.5 h-3.5" />
                                 <span className="text-[10px] font-black text-slate-500 uppercase truncate max-w-[120px]">{med.name}</span>
                              </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="px-2 py-0.5 text-[9px] font-black bg-green-600 text-white border border-green-700 uppercase tracking-widest shadow-sm">ARCHIVED</span>
                          <span className="text-[8px] text-slate-400 font-black uppercase mt-1 tracking-tighter">transmitted</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-20 text-center text-slate-300">
                      <div className="flex flex-col items-center gap-3">
                        <Database size={48} className="opacity-10" />
                        <p className="text-[12px] uppercase font-black tracking-[0.3em] opacity-40">Records Archive Empty</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Footer */}
          {completedHistory.length > 0 && (
            <div className="p-3 bg-slate-50 border-t border-orange-100 flex items-center justify-between shrink-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Page {currentPage} of {totalPages || 1} | Records {completedHistory.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, completedHistory.length)}
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
          )}
        </div>
      </div>
    </div>
  );
};