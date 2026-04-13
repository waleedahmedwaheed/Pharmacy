import React, { useState, useEffect, useMemo, useRef } from 'react';
import { QrCode, Search, PackageCheck, CornerDownRight, Stethoscope, ArrowUpDown, ChevronUp, ChevronDown, Smartphone, Calendar, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { MOCK_APPOINTMENTS, MOCK_PATIENTS, DEMO_DATE_STRS } from '../mockData';
import { WorkflowStage, maskHkid, SortState, Appointment } from '../types';

interface MedicationCollectionProps {
  onStartCollection: (apptId: string) => void;
  onScanQr: () => void;
}

interface CollectionItem extends Appointment {
  patientName?: string;
  patientNameCn?: string;
  patientHkid?: string;
  patientInternalId?: string;
  patientMobile?: string;
  rxRef?: string;
}

const DEMO_TODAY = DEMO_DATE_STRS.TODAY;
const DEMO_TOMORROW = DEMO_DATE_STRS.TOMORROW;

export const MedicationCollection: React.FC<MedicationCollectionProps> = ({ onStartCollection, onScanQr }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [sortState, setSortState] = useState<SortState<any>>({ key: 'date', order: 'asc' });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isMac = useMemo(() => /Mac|iPhone|iPod|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent), []);
  const mod = isMac ? 'Opt' : 'Alt';

  const fullQueue = useMemo(() => {
    let result = MOCK_APPOINTMENTS.map(appt => {
      const patient = MOCK_PATIENTS.find(p => p.id === appt.patientId);
      return { 
        ...appt, 
        patientName: patient?.name, 
        patientNameCn: patient?.nameCn,
        patientHkid: patient?.hkid,
        patientInternalId: patient?.internalId,
        patientMobile: patient?.mobile1,
        rxRef: appt.prescription?.id || ''
      } as CollectionItem;
    }).filter(item => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch = item.patientName?.toLowerCase().includes(lowerSearch) || 
             item.patientNameCn?.includes(searchTerm) ||
             item.patientHkid?.includes(searchTerm) ||
             item.patientInternalId?.toLowerCase().includes(lowerSearch) ||
             item.patientMobile?.includes(searchTerm) ||
             item.rxRef?.toLowerCase().includes(lowerSearch);

      const itemDate = item.date.split('T')[0];
      const matchesDate = dateFilter === 'all' || itemDate === dateFilter;
      
      return matchesSearch && matchesDate;
    });

    result.sort((a, b) => {
      const aVal = (a as any)[sortState.key] || '';
      const bVal = (b as any)[sortState.key] || '';
      if (aVal === bVal) return 0;
      const factor = sortState.order === 'asc' ? 1 : -1;
      return (aVal > bVal ? 1 : -1) * factor;
    });

    return result;
  }, [searchTerm, sortState, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(fullQueue.length / itemsPerPage));
  const collectionQueue = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return fullQueue.slice(start, start + itemsPerPage);
  }, [fullQueue, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, dateFilter]);
  useEffect(() => { setSelectedIndex(0); }, [collectionQueue]);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      const isMod = isMac ? (e.altKey || e.ctrlKey) : e.altKey;
      if (isMod) {
        if (e.code === 'KeyQ') { e.preventDefault(); onScanQr(); }
        if (e.code === 'KeyF') { e.preventDefault(); searchInputRef.current?.focus(); }
        if (e.code === 'KeyT') { 
          e.preventDefault(); 
          if (dateFilter === 'all') setDateFilter(DEMO_TODAY);
          else if (dateFilter === DEMO_TODAY) setDateFilter(DEMO_TOMORROW);
          else setDateFilter('all');
        }
        return;
      }
      if (collectionQueue.length > 0) {
        if (e.code === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => (prev < collectionQueue.length - 1 ? prev + 1 : prev)); }
        else if (e.code === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0)); }
        else if (e.code === 'ArrowRight' && currentPage < totalPages) { setCurrentPage(prev => prev + 1); }
        else if (e.code === 'ArrowLeft' && currentPage > 1) { setCurrentPage(prev => prev - 1); }
        else if (e.code === 'Enter') { e.preventDefault(); onStartCollection(collectionQueue[selectedIndex].id); }
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isMac, onScanQr, collectionQueue, selectedIndex, onStartCollection, currentPage, totalPages, dateFilter]);

  const handleSort = (key: string) => {
    setSortState(prev => ({ key, order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc' }));
  };

  const SortIndicator = ({ column }: { column: string }) => {
    if (sortState.key !== column) return <ArrowUpDown size={10} className="opacity-30 ml-1" />;
    return sortState.order === 'asc' ? <ChevronUp size={10} className="text-primary ml-1" /> : <ChevronDown size={10} className="text-primary ml-1" />;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.includes('T') ? dateStr.split('T')[0].split('-') : dateStr.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-start pt-1">
        <div>
           <h2 className="text-xl font-black text-secondary flex items-center gap-2 uppercase tracking-tighter">
             <PackageCheck className="text-primary" size={24} strokeWidth={3} /> DISPENSING QUEUE
           </h2>
           <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">PHARMACY DISPENSING & PICKUP STATION</p>
        </div>
        <div className="flex gap-2">
          {/* Unified Date Filter Bar */}
          <div className="flex bg-white border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex items-center px-3 border-r border-slate-100 bg-slate-50 text-slate-400">
              <Filter size={14} strokeWidth={3} />
            </div>
            <button 
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase transition-all border-r border-slate-100 ${dateFilter === 'all' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              ALL
            </button>
            <button 
              onClick={() => setDateFilter(DEMO_TODAY)}
              className={`px-3 py-1.5 text-[10px] font-black uppercase transition-all border-r border-slate-100 ${dateFilter === DEMO_TODAY ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              TODAY
            </button>
            <button 
              onClick={() => setDateFilter(DEMO_TOMORROW)}
              className={`px-3 py-1.5 text-[10px] font-black uppercase transition-all border-r border-slate-100 ${dateFilter === DEMO_TOMORROW ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              TOMORROW
            </button>
            <div className="flex items-center px-2 py-1 gap-1.5 relative">
              <Calendar size={14} className={dateFilter !== 'all' && dateFilter !== DEMO_TODAY && dateFilter !== DEMO_TOMORROW ? 'text-primary' : 'text-slate-300'} />
              <input 
                type="date" 
                value={dateFilter === 'all' ? '' : dateFilter}
                onChange={(e) => setDateFilter(e.target.value || 'all')}
                className="bg-transparent border-none p-0 text-[10px] font-black uppercase outline-none text-slate-600 focus:ring-0 w-24 cursor-pointer"
              />
              <span className="absolute right-1 bottom-0.5 opacity-30 text-[8px] font-mono pointer-events-none">[{mod}+T]</span>
            </div>
          </div>

          <button 
            onClick={onScanQr}
            className="bg-primary text-white px-5 py-2.5 rounded-none font-black hover:bg-primary/90 shadow-md flex items-center gap-2 uppercase text-[12px] border-b-4 border-orange-700 active:translate-y-0.5 active:border-b-0"
          >
            <QrCode size={18} strokeWidth={3} /> SCAN eHEALTH QR <span className="opacity-60 text-[10px] font-mono">[{mod}+Q]</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-2.5 rounded-none border border-orange-100 shadow-sm flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder={`Search patients by name, HKID, PT ID, phone, or RX ID... [${mod}+F] | Navigate [↑↓] | Select [Enter]`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-none focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none text-[13px] font-bold text-slate-600 placeholder:text-slate-300"
          />
        </div>
      </div>

      <div className="bg-white rounded-none border border-orange-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
            <thead className="bg-[#fff7ed] border-b border-orange-100 sticky top-0 z-20">
              <tr className="text-[11px] font-black text-[#451a03] uppercase tracking-widest">
                <th className="p-3 w-20 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center">STATUS <SortIndicator column="status" /></div>
                </th>
                <th className="p-3 w-28 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('date')}>
                   <div className="flex items-center">COLLECTION <SortIndicator column="date" /></div>
                </th>
                <th className="p-3 w-36 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('patientName')}>
                   <div className="flex items-center">PATIENT <SortIndicator column="patientName" /></div>
                </th>
                <th className="p-3 w-20 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('patientInternalId')}>
                   <div className="flex items-center">PT ID <SortIndicator column="patientInternalId" /></div>
                </th>
                <th className="p-3 w-24 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('patientNameCn')}>
                   <div className="flex items-center">NAME (CN) <SortIndicator column="patientNameCn" /></div>
                </th>
                <th className="p-3 w-28 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('patientMobile')}>
                   <div className="flex items-center">PHONE <SortIndicator column="patientMobile" /></div>
                </th>
                <th className="p-3 w-28 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('rxRef')}>
                   <div className="flex items-center">RX REF <SortIndicator column="rxRef" /></div>
                </th>
                <th className="p-3 w-28">RX ORIGIN</th>
                <th className="p-3 w-[350px]">PRESCRIPTION DETAILS</th>
                <th className="p-3 text-right w-28">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-50">
              {collectionQueue.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                const isToday = item.date.startsWith(DEMO_TODAY);
                return (
                  <tr 
                    key={item.id} 
                    onClick={() => onStartCollection(item.id)}
                    className={`transition-all relative border-l-4 cursor-pointer ${isSelected ? 'bg-[#fff7ed] border-l-primary shadow-inner z-10' : 'hover:bg-slate-50 border-l-transparent'}`}
                  >
                    <td className="p-3 align-middle">
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-black uppercase border leading-none tracking-tight ${
                        item.status === WorkflowStage.VERIFICATION ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        'bg-blue-100 text-blue-700 border-blue-200'
                      }`}>
                        {item.status === WorkflowStage.VERIFICATION ? 'VERIFYING' : 'PREPARED'}
                      </span>
                    </td>
                    <td className="p-3 align-middle">
                       <div className="flex flex-col">
                            <div className={`flex items-center gap-1.5 text-[11px] font-black uppercase tabular-nums tracking-tighter ${isToday ? 'text-success' : 'text-slate-600'}`}>
                              <Calendar size={14} strokeWidth={2.5} className="opacity-60" /> {formatDateDisplay(item.date)}
                            </div>
                            {isToday && (
                                <span className="bg-success text-white text-[8px] font-black px-1.5 py-0.5 rounded-none mt-1 uppercase w-fit tracking-tighter leading-none">TODAY</span>
                            )}
                       </div>
                    </td>
                    <td className="p-3 align-middle">
                        <div className="flex flex-col min-w-0">
                           <div className="font-black text-secondary text-[12px] uppercase truncate tracking-tighter leading-none">
                             {item.patientName}
                           </div>
                           <div className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">
                             {maskHkid(item.patientHkid || '')}
                           </div>
                        </div>
                    </td>
                    <td className="p-3 align-middle">
                      <span className="font-mono text-[10px] font-bold text-slate-500">{item.patientInternalId}</span>
                    </td>
                    <td className="p-3 align-middle">
                      <div className="font-bold text-secondary text-[14px] alert-sharp-text truncate">
                        {item.patientNameCn || '--'}
                      </div>
                    </td>
                    <td className="p-3 align-middle">
                       <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-600">
                          <Smartphone size={14} className="text-slate-300" strokeWidth={2.5} />
                          {item.patientMobile}
                       </div>
                    </td>
                    <td className="p-3 align-middle">
                      <span className="font-black text-[11px] text-blue-700 tracking-tighter leading-none uppercase">{item.rxRef}</span>
                    </td>
                    <td className="p-3 align-middle">
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-secondary uppercase truncate tracking-tighter">
                          <Stethoscope size={14} strokeWidth={2.5} className="text-primary shrink-0 opacity-70" />
                          {item.prescription?.institution.name}
                      </div>
                    </td>
                    <td className="p-3 align-middle">
                      <div className="flex flex-col gap-2">
                        {item.prescription?.medications.map((med, midx) => (
                          <div key={midx} className="flex items-start gap-2">
                            <div className="w-3.5 h-3.5 bg-orange-100 border border-orange-200 text-primary font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                                {midx + 1}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[11px] font-black text-secondary uppercase leading-none truncate tracking-tighter">
                                    {med.name}
                                </span>
                                <div className="flex items-center gap-1 mt-1 leading-none">
                                    <span className="text-[10px] text-blue-700 font-black uppercase tracking-tighter">{med.dosageValue} {med.dosageUnit} {med.frequencyCode}</span>
                                    <span className="text-[10px] text-slate-300 font-bold uppercase">({med.durationValue}d)</span>
                                </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 align-middle text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onStartCollection(item.id); }}
                        className={`font-black text-[11px] uppercase px-3 py-1.5 transition-all w-full shadow-sm flex items-center justify-center gap-1.5 bg-primary text-white border-b-2 border-orange-700 active:translate-y-0.5 active:border-b-0`}
                      >
                        DISPENSE <CornerDownRight size={16} strokeWidth={3} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50 border-t border-orange-100 flex items-center justify-between shrink-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Page {currentPage} of {totalPages || 1} | Records {fullQueue.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, fullQueue.length)}
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