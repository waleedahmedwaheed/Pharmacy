import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, CloudDownload, RefreshCw, CornerDownRight, Stethoscope, ArrowUpDown, ChevronUp, ChevronDown, Smartphone, Calendar, Check, X, Info, Clock, CheckCircle2, LayoutList, User, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { MOCK_GOV_PRESCRIPTIONS, MOCK_PATIENTS, delay, DEMO_DATE_STRS } from '../mockData';
import { GovPrescription, maskHkid, SortState } from '../types';

interface GovPrescriptionsProps {
  onProcess: (rxId: string) => void;
}

const DEMO_TODAY = DEMO_DATE_STRS.TODAY;
const DEMO_TOMORROW = DEMO_DATE_STRS.TOMORROW;

const STANDARD_VAS = [
  { id: 'mms', name: 'Medication Management Service (MMS)', price: 100 },
  { id: 'smoking', name: 'Smoking Cessation Service', price: 100 },
  { id: 'chronic', name: 'Chronic Disease Management', price: 100 },
  { id: 'oral', name: 'Oral Health Promotion', price: 100 }
];

export const GovPrescriptions: React.FC<GovPrescriptionsProps> = ({ onProcess }) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all'); // 'all', 'YYYY-MM-DD'
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [sortState, setSortState] = useState<SortState<GovPrescription>>({ key: 'issueDate', order: 'desc' });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [detailRxId, setDetailRxId] = useState<string | null>(null);
  const [selectedVas, setSelectedVas] = useState<string[]>([]);
  const [tempBookingDate, setTempBookingDate] = useState<string>(DEMO_TODAY);
  const [displayBookingDate, setDisplayBookingDate] = useState<string>('');

  const [prescriptions, setPrescriptions] = useState<GovPrescription[]>(MOCK_GOV_PRESCRIPTIONS);

  const isMac = useMemo(() => /Mac|iPhone|iPod|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent), []);
  const mod = isMac ? 'Opt' : 'Alt';

  const filteredData = useMemo(() => {
    let result = prescriptions.map(item => {
      const patient = MOCK_PATIENTS.find(p => p.hkid === item.patientHkid);
      return {
        ...item,
        patientNameCn: patient?.nameCn || '',
        patientInternalId: patient?.internalId || '',
        patientPhones: [patient?.mobile1, patient?.mobile2, patient?.homePhone].filter(Boolean) as string[],
        patientSortName: patient?.name || item.patientName,
        phoneDisplay: [patient?.mobile1, patient?.mobile2, patient?.homePhone].filter(Boolean).join(', ')
      };
    }).filter(item => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch = item.patientName.toLowerCase().includes(lowerSearch) || 
                          (item.patientNameCn && item.patientNameCn.includes(searchTerm)) ||
                          item.patientHkid.includes(searchTerm) ||
                          item.id.includes(searchTerm) ||
                          item.patientInternalId.toLowerCase().includes(lowerSearch) ||
                          item.patientPhones.some(phone => phone.replace(/\s/g, '').includes(searchTerm.replace(/\s/g, '')));
      
      const matchesDate = dateFilter === 'all' || item.collectionDate === dateFilter;
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
  }, [prescriptions, searchTerm, sortState, dateFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const detailRx = useMemo(() => paginatedData.find(r => r.id === detailRxId), [detailRxId, paginatedData]);

  useEffect(() => {
    if (detailRx) {
      setSelectedVas(detailRx.selectedVas || []);
      if (detailRx.collectionDate) {
        setTempBookingDate(detailRx.collectionDate);
        const parts = detailRx.collectionDate.split('-');
        if (parts.length === 3) {
          setDisplayBookingDate(`${parts[0].slice(2)}${parts[1]}${parts[2]}`);
        }
      } else {
        setTempBookingDate(DEMO_TODAY);
        const parts = DEMO_TODAY.split('-');
        setDisplayBookingDate(`${parts[0].slice(2)}${parts[1]}${parts[2]}`);
      }
    }
  }, [detailRxId, detailRx]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [paginatedData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter]);

  const handleSaveDetail = async () => {
    if (!detailRxId) return;
    setLoading(true);
    await delay(600);
    setPrescriptions(prev => prev.map(p => {
      if (p.id === detailRxId) {
        return { 
          ...p, 
          bookingStatus: 'BOOKED', 
          collectionDate: tempBookingDate,
          selectedVas: selectedVas
        };
      }
      return p;
    }));
    setDetailRxId(null);
    setLoading(false);
  };

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      const isMod = isMac ? (e.altKey || e.ctrlKey) : e.altKey;
      if (isMod) {
        if (e.code === 'KeyY') { e.preventDefault(); handleRefresh(); }
        if (e.code === 'KeyF') { e.preventDefault(); searchInputRef.current?.focus(); }
        if (e.code === 'KeyT') { 
          e.preventDefault(); 
          if (dateFilter === 'all') setDateFilter(DEMO_TODAY);
          else if (dateFilter === DEMO_TODAY) setDateFilter(DEMO_TOMORROW);
          else setDateFilter('all');
        }
        return;
      }
      
      if (detailRxId) {
        if (e.code === 'Escape') setDetailRxId(null);
        if (e.code === 'Enter') handleSaveDetail();
        return;
      }

      if (e.code === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < paginatedData.length - 1 ? prev + 1 : prev));
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.code === 'ArrowRight') {
        if (currentPage < totalPages) { e.preventDefault(); setCurrentPage(prev => prev + 1); }
      } else if (e.code === 'ArrowLeft') {
        if (currentPage > 1) { e.preventDefault(); setCurrentPage(prev => prev - 1); }
      } else if (e.code === 'Enter') {
        const item = paginatedData[selectedIndex];
        if (item) setDetailRxId(item.id);
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isMac, paginatedData, selectedIndex, detailRxId, tempBookingDate, selectedVas, currentPage, totalPages, dateFilter]);

  const handleRefresh = async () => {
    setLoading(true);
    await delay(1000);
    setLoading(false);
  };

  const handleSort = (key: string) => {
    setSortState(prev => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortState.key !== column) return <ArrowUpDown size={10} className="opacity-30 ml-1" />;
    return sortState.order === 'asc' ? <ChevronUp size={10} className="ml-1 text-primary" /> : <ChevronDown size={10} className="ml-1 text-primary" />;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
    return dateStr;
  };

  const handleBookingDateInputChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').substring(0, 6);
    setDisplayBookingDate(cleaned);
    if (cleaned.length === 6) {
      const yy = cleaned.substring(0, 2);
      const mm = cleaned.substring(2, 4);
      const dd = cleaned.substring(4, 6);
      setTempBookingDate(`20${yy}-${mm}-${dd}`);
    }
  };

  const toggleVas = (id: string) => {
    setSelectedVas(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const totalPayable = useMemo(() => {
    if (!detailRx) return 0;
    const medCost = detailRx.medications.length * 20;
    const vasCost = selectedVas.reduce((sum, id) => {
      const service = STANDARD_VAS.find(s => s.id === id);
      return sum + (service?.price || 0);
    }, 0);
    return medCost + vasCost;
  }, [detailRx, selectedVas]);

  return (
    <div className="space-y-4 font-sans animate-in fade-in duration-300 h-full overflow-hidden flex flex-col">
      <div className="flex justify-between items-start pt-1 shrink-0 px-2">
        <div>
           <h2 className="text-xl font-black text-secondary flex items-center gap-2 uppercase tracking-tighter">
             <CloudDownload className="text-primary" size={24} strokeWidth={3} /> EPRESCRIPTION QUEUE
           </h2>
           <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">SOURCE: EHEALTH DHUB (S14 SPECIFICATION)</p>
        </div>
        <div className="flex gap-2">
          {/* Enhanced Date Filter Bar */}
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
            onClick={handleRefresh}
            className="group flex items-center gap-2 px-4 py-1.5 bg-secondary text-white text-[10px] font-black uppercase hover:bg-secondary/90 transition-colors rounded-none"
          >
            <RefreshCw size={16} strokeWidth={2.5} className={loading ? 'animate-spin' : ''} /> 
            SYNC NOW
            <span className="ml-1 opacity-40 text-[9px] font-mono">[{mod}+Y]</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-2.5 rounded-none border border-orange-100 shadow-sm shrink-0 mx-2">
        <div className="relative">
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

      <div className="bg-white rounded-none border border-orange-100 overflow-hidden shadow-sm flex-1 flex flex-col overflow-y-auto mx-2">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
            <thead className="bg-[#fff7ed] border-b border-orange-100 sticky top-0 z-20">
              <tr className="text-[11px] font-black text-[#451a03] uppercase tracking-widest">
                <th className="p-3 w-20 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center">STATUS <SortIcon column="status" /></div>
                </th>
                <th className="p-3 w-28 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('collectionDate')}>
                   <div className="flex items-center">COLLECTION <SortIcon column="collectionDate" /></div>
                </th>
                <th className="p-3 w-36 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('patientSortName')}>
                   <div className="flex items-center">PATIENT <SortIcon column="patientSortName" /></div>
                </th>
                <th className="p-3 w-20 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('patientInternalId')}>
                   <div className="flex items-center">PT ID <SortIcon column="patientInternalId" /></div>
                </th>
                <th className="p-3 w-24 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('patientNameCn')}>
                   <div className="flex items-center">NAME (CN) <SortIcon column="patientNameCn" /></div>
                </th>
                <th className="p-3 w-28 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('phoneDisplay')}>
                   <div className="flex items-center">PHONE <SortIcon column="phoneDisplay" /></div>
                </th>
                <th className="p-3 w-28 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('id')}>
                   <div className="flex items-center">RX REF <SortIcon column="id" /></div>
                </th>
                <th className="p-3 w-28 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('hospital')}>
                   <div className="flex items-center">RX ORIGIN <SortIcon column="hospital" /></div>
                </th>
                <th className="p-3 w-[350px]">PRESCRIPTION DETAILS</th>
                <th className="p-3 text-right w-28">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-50">
              {paginatedData.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                const isToday = item.collectionDate === DEMO_TODAY;
                return (
                  <tr 
                    key={item.id} 
                    onClick={() => setDetailRxId(item.id)}
                    className={`transition-all relative border-l-4 cursor-pointer ${isSelected ? 'bg-[#fff7ed] border-l-primary shadow-inner z-10' : 'hover:bg-slate-50 border-l-transparent'}`}
                  >
                    <td className="p-3 align-middle">
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-black uppercase border leading-none tracking-tight ${
                        item.status === 'QUEUING' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        item.status === 'DISPENSED' ? 'bg-slate-100 text-slate-400 border-slate-200' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 align-middle">
                       {item.collectionDate ? (
                         <div className="flex flex-col">
                            <div className={`flex items-center gap-2 text-[11px] font-black uppercase tabular-nums tracking-tighter ${isToday ? 'text-success' : 'text-slate-600'}`}>
                              <Calendar size={14} strokeWidth={2.5} className="opacity-60" /> {formatDateDisplay(item.collectionDate)}
                            </div>
                            {isToday && (
                                <span className="bg-success text-white text-[8px] font-black px-1.5 py-0.5 rounded-none mt-1 uppercase w-fit tracking-tighter leading-none">TODAY</span>
                            )}
                         </div>
                       ) : (
                         <span className="text-[10px] font-bold text-slate-300 italic uppercase">Not Booked</span>
                       )}
                    </td>
                    <td className="p-3 align-middle">
                        <div className="flex flex-col min-w-0">
                           <div className="font-black text-secondary text-[12px] uppercase truncate tracking-tighter leading-none">
                             {item.patientName}
                           </div>
                           <div className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">
                             {maskHkid(item.patientHkid)}
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
                          {item.patientPhones.length > 0 ? (
                            <>
                              <Smartphone size={14} className="text-slate-300" strokeWidth={2.5} />
                              {item.patientPhones[0]}
                            </>
                          ) : (
                            <span className="opacity-30">--</span>
                          )}
                       </div>
                    </td>
                    <td className="p-3 align-middle">
                        <span className="font-black text-[11px] text-blue-700 tracking-tighter leading-none uppercase">{item.id}</span>
                    </td>
                    <td className="p-3 align-middle">
                      <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px] font-black text-secondary uppercase truncate tracking-tighter">
                              <Stethoscope size={14} strokeWidth={2.5} className="text-primary shrink-0 opacity-70" />
                              {item.hospital}
                          </div>
                      </div>
                    </td>
                    <td className="p-3 align-middle">
                      <div className="flex flex-col gap-2">
                        {item.medications.map((med, midx) => (
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
                          onClick={(e) => { e.stopPropagation(); setDetailRxId(item.id); }}
                          className={`font-black text-[11px] uppercase px-3 py-1.5 transition-all w-full shadow-sm flex items-center justify-center gap-1.5 bg-primary text-white border-b-2 border-orange-700 active:translate-y-0.5 active:border-b-0`}
                      >
                          DETAIL <CornerDownRight size={14} strokeWidth={3} />
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

      {detailRx && (
        <div className="fixed inset-0 bg-secondary/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
           <div className="bg-white w-full max-w-5xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 rounded-none border-t-8 border-primary">
              
              <div className="bg-white px-6 py-5 flex justify-between items-start border-b border-slate-100">
                  <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                          <LayoutList className="text-primary" size={28} strokeWidth={3} />
                          <h2 className="text-2xl font-black text-secondary uppercase tracking-tight">Prescription Review</h2>
                          <span className="bg-blue-600 text-white px-2 py-0.5 text-[11px] font-black uppercase tracking-widest">{detailRx.id}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                         <p className="text-[14px] font-black text-secondary uppercase flex items-center gap-2">
                            {detailRx.patientName} <span className="text-slate-400 font-bold">({detailRx.patientNameCn})</span>
                            <span className="bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 border border-slate-200 flex items-center gap-1"><User size={10}/> {detailRx.patientInternalId}</span>
                         </p>
                         <div className="h-4 w-px bg-slate-200"></div>
                         <p className="text-[12px] font-bold text-slate-400 uppercase tracking-tighter">
                            HKID: {maskHkid(detailRx.patientHkid)}
                         </p>
                      </div>
                  </div>
                  <button onClick={() => setDetailRxId(null)} className="p-2 hover:bg-slate-50 text-slate-400 transition-colors">
                    <X size={28} strokeWidth={3} />
                  </button>
              </div>

              <div className="p-8 grid grid-cols-10 gap-10">
                  
                  <div className="col-span-5 space-y-8">
                      <div className="space-y-4">
                          <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-3">CLINICAL ORDER DETAILS</h4>
                          <div className="space-y-3">
                             {detailRx.medications.map((med, idx) => (
                                <div key={idx} className="bg-slate-50/50 border border-slate-200 p-4 flex gap-5">
                                   <div className="w-9 h-9 bg-white border border-slate-200 text-primary flex items-center justify-center font-black text-[14px] shrink-0">
                                      {idx + 1}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <h5 className="text-[15px] font-black text-secondary uppercase leading-none truncate mb-1.5">{med.name}</h5>
                                      <div className="flex items-center gap-4">
                                          <span className="text-[11px] font-black text-blue-700 uppercase tracking-tighter bg-blue-50 px-2 py-0.5 border border-blue-100">{med.dosageValue} {med.dosageUnit} {med.frequencyCode}</span>
                                          <span className="text-[11px] font-bold text-slate-400 uppercase">Quantity: {med.quantityValue} PCS</span>
                                      </div>
                                      <p className="text-[12px] font-bold text-slate-500 uppercase mt-3 italic leading-tight border-l-2 border-orange-300 pl-3">
                                         {med.instructions}
                                      </p>
                                   </div>
                                </div>
                             ))}
                          </div>
                      </div>

                      <div className="bg-[#eff6ff] border border-[#bfdbfe] p-6">
                         <div className="flex items-center gap-3 mb-4">
                            <Info size={20} className="text-blue-600" strokeWidth={3} />
                            <h4 className="text-[12px] font-black text-blue-900 uppercase tracking-widest">Prescriber Information</h4>
                         </div>
                         <div className="grid grid-cols-3 gap-6">
                            <div>
                               <p className="text-[9px] font-black text-blue-400 uppercase mb-1.5">Prescriber / Doctor</p>
                               <p className="text-[13px] font-black text-secondary uppercase truncate leading-none">{detailRx.prescriberName || 'DR. WONG KA KEUNG'}</p>
                            </div>
                            <div>
                               <p className="text-[9px] font-black text-blue-400 uppercase mb-1.5">Clinic / Hospital</p>
                               <p className="text-[13px] font-black text-secondary uppercase truncate leading-none">{detailRx.hospital}</p>
                            </div>
                            <div>
                               <p className="text-[9px] font-black text-blue-400 uppercase mb-1.5">Issue Date</p>
                               <p className="text-[13px] font-black text-secondary leading-none">{formatDateDisplay(detailRx.issueDate)}</p>
                            </div>
                         </div>
                      </div>
                  </div>

                  <div className="col-span-5 space-y-8">
                      <div className="bg-white border border-orange-100 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                          <h4 className="text-[12px] font-black text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                             <Clock size={18} className="text-primary" strokeWidth={3} /> COLLECTION BOOKING
                          </h4>
                          <div className="flex gap-3">
                             <div className="relative flex-1">
                                <label className="absolute -top-2.5 left-2 bg-white px-2 text-[9px] font-black text-slate-400 uppercase z-10">Date (YYMMDD)</label>
                                <input 
                                  type="text" 
                                  maxLength={6}
                                  value={displayBookingDate}
                                  onChange={(e) => handleBookingDateInputChange(e.target.value)}
                                  className="w-full px-4 py-4 border-2 border-slate-200 focus:border-primary outline-none text-2xl font-black font-mono tracking-widest text-center transition-all bg-white"
                                />
                             </div>
                             <div className="flex flex-col items-center justify-center bg-orange-50 border border-orange-100 min-w-[120px] px-3">
                                <span className="text-[9px] font-black text-primary uppercase mb-1 opacity-70">Confirmed</span>
                                <span className="text-[15px] font-black text-secondary tabular-nums">{formatDateDisplay(tempBookingDate)}</span>
                             </div>
                          </div>
                          <p className={`text-[11px] font-bold uppercase mt-3 flex items-center gap-2 ${tempBookingDate === DEMO_TODAY ? 'text-success' : 'text-slate-400'}`}>
                             <CheckCircle2 size={14} strokeWidth={3}/> {tempBookingDate === DEMO_TODAY ? 'BOOKING SET FOR TODAY.' : `BOOKING SET FOR ${tempBookingDate}`}
                          </p>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-100 p-5 shadow-inner">
                          <h4 className="text-[12px] font-black text-secondary uppercase tracking-widest mb-5">VALUE-ADDED SERVICES</h4>
                          <div className="space-y-2">
                             {STANDARD_VAS.map(v => {
                                const active = selectedVas.includes(v.id);
                                return (
                                  <button 
                                    key={v.id}
                                    onClick={() => toggleVas(v.id)}
                                    className={`w-full text-left p-4 border transition-all flex items-start justify-between group bg-white shadow-sm hover:shadow-md ${active ? 'border-primary' : 'border-slate-200'}`}
                                  >
                                     <div className="flex items-start gap-4 flex-1 min-w-0 pr-4">
                                        <div className={`w-5 h-5 border transition-colors flex items-center justify-center shrink-0 mt-0.5 ${active ? 'bg-primary border-primary text-white' : 'bg-slate-50 border-slate-200'}`}>
                                           {active && <Check size={14} strokeWidth={4} />}
                                        </div>
                                        <span className={`text-[11px] font-black uppercase leading-tight whitespace-normal ${active ? 'text-primary' : 'text-slate-500'}`}>
                                          {v.name}
                                        </span>
                                     </div>
                                     <span className={`text-[11px] font-black tabular-nums transition-colors shrink-0 mt-0.5 ${active ? 'text-primary' : 'text-success'}`}>
                                        ${v.price}.00
                                     </span>
                                  </button>
                                );
                             })}
                          </div>
                      </div>

                      <div className="bg-[#1e293b] p-6 text-white shadow-2xl">
                          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-5">
                             <p className="text-[12px] font-black uppercase tracking-[0.2em] opacity-50">ESTIMATED PAYABLE</p>
                             <p className="text-4xl font-black tabular-nums tracking-tighter">
                                ${totalPayable.toFixed(2)}
                             </p>
                          </div>
                          <button 
                            onClick={handleSaveDetail}
                            className="w-full bg-primary hover:bg-primary/90 text-white py-5 font-black uppercase text-[15px] border-b-4 border-orange-700 active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center gap-3 shadow-lg"
                          >
                             SAVE CHANGES <CornerDownRight size={22} strokeWidth={3} />
                          </button>
                      </div>

                  </div>
              </div>

           </div>
        </div>
      )}
    </div>
  );
};