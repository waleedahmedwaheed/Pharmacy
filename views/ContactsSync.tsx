import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, RefreshCw, Search, CheckCircle2, Cloud, UserPlus, 
  Loader2, AlertCircle, ExternalLink, Link, ArrowRight, X, Eye, Calendar, Pill, History, Info, ShoppingBag,
  ArrowUpDown, ChevronUp, ChevronDown, Phone, Smartphone, UserRound, MapPin, ClipboardList, AlertOctagon, HeartOff,
  Edit3, Save, RotateCcw, NotebookTabs, Stethoscope, ChevronLeft, ChevronRight
} from 'lucide-react';
import { odooService } from '../services/odooService';
import { MOCK_PATIENTS, MOCK_APPOINTMENTS, MOCK_GOV_PRESCRIPTIONS } from '../mockData';
import { Patient, Appointment, WorkflowStage, maskHkid, SortState, ClinicalNote } from '../types';
import { MedicationIcon } from '../components/MedicationIcon';

export const ContactsSync: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncingIds, setSyncingIds] = useState<string[]>([]);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [odooMap, setOdooMap] = useState<Record<string, number>>({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [sortState, setSortState] = useState<SortState<Patient>>({ key: 'name', order: 'asc' });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Detail View State
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'rx' | 'history' | 'notes'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Patient | null>(null);

  // Clinical Note Entry State
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<ClinicalNote['category']>('Counseling');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const isMac = useMemo(() => /Mac|iPhone|iPod|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent), []);
  const mod = isMac ? 'Opt' : 'Alt';

  const filteredPatients = useMemo(() => {
    let result = patients.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.nameCn && p.nameCn.includes(searchTerm)) ||
      p.hkid.includes(searchTerm) ||
      p.internalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.mobile1 && p.mobile1.includes(searchTerm))
    );

    result.sort((a, b) => {
      const aVal = a[sortState.key as keyof Patient];
      const bVal = b[sortState.key as keyof Patient];

      if (aVal === bVal) return 0;
      const factor = sortState.order === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * factor;
      }
      return (aVal && bVal && aVal > bVal ? 1 : -1) * factor;
    });

    return result;
  }, [patients, searchTerm, sortState]);

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPatients.slice(start, start + itemsPerPage);
  }, [filteredPatients, currentPage]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [paginatedPatients]);

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

      if (viewingPatient) {
        if (e.code === 'Escape') {
          if (isEditing) setIsEditing(false);
          else setViewingPatient(null);
        }
        return;
      }

      if (paginatedPatients.length > 0) {
        if (e.code === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev < paginatedPatients.length - 1 ? prev + 1 : prev));
        } else if (e.code === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.code === 'ArrowRight') {
          if (currentPage < totalPages) {
            e.preventDefault();
            setCurrentPage(prev => prev + 1);
          }
        } else if (e.code === 'ArrowLeft') {
          if (currentPage > 1) {
            e.preventDefault();
            setCurrentPage(prev => prev - 1);
          }
        } else if (e.code === 'Enter') {
          e.preventDefault();
          handleViewDetails(paginatedPatients[selectedIndex]);
        }
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isMac, paginatedPatients, selectedIndex, viewingPatient, isEditing, currentPage, totalPages]);

  const handleViewDetails = (patient: Patient) => {
    setViewingPatient(patient);
    setEditForm(patient);
    setIsEditing(false);
    setActiveTab('info');
    setNewNoteContent('');
  };

  const handleStartEdit = () => {
    setEditForm(viewingPatient);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm(viewingPatient);
  };

  const handleSavePatient = () => {
    if (!editForm || !viewingPatient) return;
    const updatedPatients = patients.map(p => p.id === viewingPatient.id ? editForm : p);
    setPatients(updatedPatients);
    setViewingPatient(editForm);
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof Patient, value: any) => {
    if (editForm) {
      setEditForm({ ...editForm, [field]: value });
    }
  };

  const handleSort = (key: keyof Patient) => {
    setSortState(prev => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ column }: { column: keyof Patient }) => {
    if (sortState.key !== column) return <ArrowUpDown size={12} className="opacity-30 ml-1" />;
    return sortState.order === 'asc' ? <ChevronUp size={12} className="ml-1 text-primary" /> : <ChevronDown size={12} className="ml-1 text-primary" />;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '---';
    const date = new Date(dateStr);
    const dd = date.getDate().toString().padStart(2, '0');
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const patientPrescriptions = viewingPatient 
    ? MOCK_GOV_PRESCRIPTIONS.filter(r => r.patientHkid === viewingPatient.hkid) 
    : [];

  const handleSaveClinicalNote = async () => {
    if (!newNoteContent || !viewingPatient) return;
    setIsSavingNote(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newNote: ClinicalNote = {
      id: `cn-new-${Date.now()}`,
      timestamp: new Date().toISOString().split('T')[0],
      pharmacistName: 'LEAD PHARMACIST',
      category: newNoteCategory,
      content: newNoteContent.toUpperCase()
    };

    const updatedPatient = {
      ...viewingPatient,
      clinicalNotes: [newNote, ...(viewingPatient.clinicalNotes || [])]
    };

    setPatients(prev => prev.map(p => p.id === viewingPatient.id ? updatedPatient : p));
    setViewingPatient(updatedPatient);
    setNewNoteContent('');
    setIsSavingNote(false);
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-300 relative overflow-hidden">
      <div className="shrink-0 flex justify-between items-center border-b border-orange-200 pb-2">
        <h2 className="text-xl font-bold text-secondary flex items-center gap-2 uppercase tracking-tight">
          <Users className="text-primary" size={20} /> Patient Registry
        </h2>
        <div className="flex gap-2">
           <button className="bg-white border border-slate-300 text-slate-600 px-4 py-1.5 rounded-none font-bold hover:bg-slate-50 transition-all text-[11px] uppercase shadow-sm">Export Registry</button>
           <button onClick={() => {}} className="bg-primary text-white px-4 py-1.5 rounded-none font-bold hover:bg-primary/90 transition-all flex items-center gap-2 text-[11px] uppercase shadow-sm"><UserPlus size={14}/> Add Patient</button>
        </div>
      </div>

      <div className={`bg-white rounded-none shadow-sm border border-orange-100 flex flex-col transition-all duration-300 ${viewingPatient ? 'h-[40%]' : 'flex-1'}`}>
        <div className="p-2 bg-orange-50/30 border-b border-orange-100 flex items-center justify-between">
           <div className="relative max-w-sm w-full">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder={`Search Registry... [↑↓] Nav | [Enter] View | [${mod}+F] Search`} 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 border border-slate-200 rounded-none focus:ring-1 focus:ring-primary outline-none text-xs font-medium"
              />
           </div>
           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
              Showing {filteredPatients.length} Records
           </div>
        </div>

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse table-fixed min-w-[1300px]">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 z-10">
              <tr>
                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary w-56" onClick={() => handleSort('name')}>
                  <div className="flex items-center">Name (EN) <SortIcon column="name" /></div>
                </th>
                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary w-40" onClick={() => handleSort('nameCn')}>
                  <div className="flex items-center">Name (CN) <SortIcon column="nameCn" /></div>
                </th>
                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary w-32" onClick={() => handleSort('sex')}>
                  <div className="flex items-center">Sex/DOB <SortIcon column="sex" /></div>
                </th>
                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary w-40" onClick={() => handleSort('mobile1')}>
                  <div className="flex items-center">Phone <SortIcon column="mobile1" /></div>
                </th>
                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary w-40" onClick={() => handleSort('hkid')}>
                  <div className="flex items-center">Identity Number <SortIcon column="hkid" /></div>
                </th>
                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary w-40" onClick={() => handleSort('enrolled')}>
                   <div className="flex items-center">Status <SortIcon column="enrolled" /></div>
                </th>
                <th className="p-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPatients.map((p, idx) => {
                const isViewing = viewingPatient?.id === p.id;
                const isSelected = selectedIndex === idx;
                return (
                  <tr 
                    key={p.id} 
                    onClick={() => handleViewDetails(p)}
                    className={`transition-colors relative border-l-4 cursor-pointer ${isSelected ? 'bg-orange-100/40 border-l-primary' : (isViewing ? 'bg-orange-50/50 border-l-primary/40' : 'hover:bg-slate-50 border-l-transparent')}`}
                  >
                    <td className="p-2">
                       <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-none flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                            {p.name[0]}
                          </div>
                          <div className="min-w-0">
                             <p className="font-bold text-secondary text-xs uppercase tracking-tight leading-tight truncate">{p.name}</p>
                          </div>
                       </div>
                    </td>
                    <td className="p-2 align-middle">
                        <p className="font-bold text-secondary text-base alert-sharp-text">{p.nameCn || '--'}</p>
                    </td>
                    <td className="p-2 align-middle">
                        <p className="text-[10px] font-black text-slate-600 uppercase leading-none mb-1">{p.sex === 'M' ? 'Male' : 'Female'}</p>
                        <p className="text-[9px] font-bold text-slate-400 tabular-nums uppercase">{formatDateDisplay(p.dob)}</p>
                    </td>
                    <td className="p-2 align-middle">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 tabular-nums">
                            <Smartphone size={14} className="text-slate-300 shrink-0" />
                            {p.mobile1 || '---'}
                        </div>
                    </td>
                    <td className="p-2">
                        <div className="flex items-center gap-1.5">
                           <span className="text-[8px] font-bold bg-slate-100 px-1 border border-slate-200 text-slate-500 rounded-none shrink-0">{p.icType}</span>
                           <span className="text-[10px] font-mono font-bold text-slate-600">{maskHkid(p.hkid)}</span>
                        </div>
                    </td>
                    <td className="p-2">
                       <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[9px] font-bold uppercase border ${p.enrolled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                         {p.enrolled ? 'CPP ENROLLED' : 'PENDING'}
                       </span>
                    </td>
                    <td className="p-2 text-right">
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleViewDetails(p); }}
                         className={`px-3 py-1 rounded-none text-[10px] font-bold uppercase transition-all border ${isSelected ? 'bg-secondary text-white border-secondary shadow-sm' : (isViewing ? 'bg-secondary text-white border-secondary' : 'bg-white border-slate-300 text-slate-600 hover:border-secondary hover:text-secondary')}`}
                       >
                         <Eye size={12} className="inline mr-1" /> {isSelected ? 'VIEW ⏎' : 'View'}
                       </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="p-3 bg-slate-50 border-t border-orange-100 flex items-center justify-between shrink-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Page {currentPage} of {totalPages || 1}
          </div>
          <div className="flex items-center gap-1">
             <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-1.5 border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={16} /></button>
             {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
               <button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-1 text-[10px] font-black border ${currentPage === page ? 'bg-primary text-white' : 'bg-white text-slate-400 hover:text-primary'}`}>{page}</button>
             ))}
             <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {viewingPatient && (
        <div className="flex-1 bg-white border border-slate-300 shadow-2xl flex flex-col min-h-0 animate-in slide-in-from-bottom duration-300">
          <div className="bg-secondary text-white px-4 py-3 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/20 flex items-center justify-center border border-primary/40">
                   <Users size={20} className="text-primary" />
                </div>
                <div className="flex flex-col">
                   <h3 className="text-sm font-black uppercase tracking-widest leading-none mb-1">
                      {viewingPatient.name} <span className="opacity-50 font-bold ml-1">({viewingPatient.nameCn})</span>
                   </h3>
                   <p className="text-[10px] opacity-60 font-mono font-bold uppercase tracking-tighter">
                      Identity: {viewingPatient.icType} {maskHkid(viewingPatient.hkid)} | Ref: <span className="text-white opacity-100">{viewingPatient.internalId}</span>
                   </p>
                </div>
             </div>
             <div className="flex items-center gap-3">
                {isEditing ? (
                  <>
                    <button onClick={handleSavePatient} className="bg-success hover:bg-success/90 text-white px-4 py-2 text-[11px] font-black uppercase flex items-center gap-2 shadow-lg border-b-2 border-green-800"><Save size={16} /> Save Record</button>
                    <button onClick={handleCancelEdit} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-[11px] font-black uppercase flex items-center gap-2"><RotateCcw size={16} /> Cancel</button>
                  </>
                ) : (
                  <button onClick={handleStartEdit} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 text-[11px] font-black uppercase flex items-center gap-2 shadow-lg border-b-2 border-orange-700"><Edit3 size={16} /> Edit Record</button>
                )}
                <div className="w-px h-8 bg-white/20 mx-1"></div>
                <button onClick={() => setViewingPatient(null)} className="p-2 hover:bg-white/10 rounded-none transition-colors"><X size={24} /></button>
             </div>
          </div>

          <div className="flex border-b border-slate-200 bg-slate-100 shrink-0">
             {[
               { id: 'info', label: 'Patient Data', icon: Info },
               { id: 'rx', label: 'ePrescriptions', icon: Pill },
               { id: 'history', label: 'Dispensing History', icon: History },
               { id: 'notes', label: 'Clinical Notes', icon: NotebookTabs }
             ].map(tab => (
               <button
                 key={tab.id}
                 disabled={isEditing && tab.id !== 'info'}
                 onClick={() => setActiveTab(tab.id as any)}
                 className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] border-r border-slate-200 flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white text-primary border-b-4 border-b-primary shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 disabled:opacity-30'}`}
               >
                 <tab.icon size={14} strokeWidth={3}/> {tab.label}
               </button>
             ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-white">
             {activeTab === 'info' && (
                <div className="space-y-10 animate-in fade-in duration-300">
                  <div>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-50 pb-2">IDENTITY & DEMOGRAPHICS</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="p-3 bg-slate-50 border border-slate-200 flex flex-col h-16">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Full Name</span>
                          {isEditing ? <input type="text" value={editForm?.name || ''} onChange={e => handleInputChange('name', e.target.value)} className="w-full bg-white border-2 border-primary/20 px-2 py-0.5 text-[13px] font-black uppercase outline-none focus:border-primary" autoFocus /> : <span className="text-[14px] font-black text-secondary uppercase truncate block leading-tight">{viewingPatient.name}</span>}
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 flex flex-col h-16">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Chinese Name</span>
                          {isEditing ? <input type="text" value={editForm?.nameCn || ''} onChange={e => handleInputChange('nameCn', e.target.value)} className="w-full bg-white border-2 border-primary/20 px-2 py-0.5 text-[13px] font-black outline-none focus:border-primary" /> : <span className="text-[14px] font-black text-secondary truncate block leading-tight">{viewingPatient.nameCn || '---'}</span>}
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 flex flex-col h-16">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Identity</span>
                          {isEditing ? <input type="text" value={editForm?.hkid || ''} onChange={e => handleInputChange('hkid', e.target.value)} className="w-full bg-white border-2 border-primary/20 px-2 py-0.5 text-[13px] font-black font-mono outline-none focus:border-primary" /> : <span className="text-[14px] font-black text-secondary font-mono block leading-tight">{maskHkid(viewingPatient.hkid)}</span>}
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 flex flex-col h-16">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">RightMedID</span>
                          {isEditing ? <input type="text" value={editForm?.rightMedId || ''} onChange={e => handleInputChange('rightMedId', e.target.value)} className="w-full bg-white border-2 border-primary/20 px-2 py-0.5 text-[13px] font-black font-mono outline-none focus:border-primary" /> : <span className="text-[14px] font-black text-slate-300 font-mono block leading-tight">{viewingPatient.rightMedId || '---'}</span>}
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 flex flex-col h-16">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Pharmacy ID</span>
                          {isEditing ? <input type="text" value={editForm?.internalId || ''} onChange={e => handleInputChange('internalId', e.target.value)} className="w-full bg-white border-2 border-primary/20 px-2 py-0.5 text-[13px] font-black font-mono outline-none focus:border-primary" /> : <span className="text-[14px] font-black text-secondary font-mono block leading-tight">{viewingPatient.internalId}</span>}
                        </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="p-4 border-2 border-red-50 bg-white">
                        <h4 className="text-[11px] font-black text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertOctagon size={18}/> Allergy History</h4>
                        {isEditing ? <textarea value={editForm?.allergyHistory || ''} onChange={e => handleInputChange('allergyHistory', e.target.value)} className="w-full bg-slate-50 border-2 border-red-100 p-3 text-[13px] font-black text-red-800 uppercase outline-none focus:border-red-500 min-h-[100px] resize-none" /> : <div className="min-h-[80px] p-4 bg-slate-50/50 border border-red-100 text-[13px] font-black text-red-800 uppercase whitespace-pre-wrap leading-tight alert-sharp-text">{viewingPatient.allergyHistory || 'No reported allergies'}</div>}
                     </div>
                     <div className="p-4 border border-orange-100 bg-white">
                        <h4 className="text-[11px] font-black text-secondary uppercase tracking-widest mb-4 flex items-center gap-2"><ClipboardList size={18} className="text-primary"/> Patient Notes</h4>
                        {isEditing ? <textarea value={editForm?.notes || ''} onChange={e => handleInputChange('notes', e.target.value)} className="w-full bg-slate-50 border-2 border-primary/10 p-3 text-[13px] text-slate-600 italic font-bold outline-none focus:border-primary min-h-[100px] resize-none" /> : <div className="min-h-[80px] p-4 bg-slate-50/50 border border-orange-50 text-[13px] text-slate-600 italic font-bold whitespace-pre-wrap leading-tight alert-sharp-text">{viewingPatient.notes || 'No notes on file'}</div>}
                     </div>
                  </div>
                </div>
             )}

             {activeTab === 'notes' && (
                <div className="grid grid-cols-12 gap-8 animate-in fade-in duration-300">
                   <div className="col-span-12 lg:col-span-7 space-y-4">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 border-b border-slate-50 pb-2">CHRONOLOGICAL CLINICAL LOG</h4>
                      {viewingPatient.clinicalNotes && viewingPatient.clinicalNotes.length > 0 ? (
                        viewingPatient.clinicalNotes.map(note => {
                          const names = note.pharmacistName.split(' ');
                          const initials = names.length > 1 ? (names[names.length-2][0] + names[names.length-1][0]) : names[0].substring(0, 2);
                          return (
                            <div key={note.id} className="border border-[#16a34a] overflow-hidden bg-white shadow-sm flex flex-col mb-4">
                              <div className="bg-[#16a34a] px-2 py-1 flex justify-between items-center text-white">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-black uppercase tracking-widest alert-sharp-text">{note.category}</span>
                                  <span className="text-[10px] font-black text-white/90 tabular-nums">[{note.timestamp.split(' ')[0]}]</span>
                                </div>
                                <span className="text-[9px] font-black uppercase border border-white px-1 leading-tight">{initials}</span>
                              </div>
                              <div className="p-3 text-[11px] font-bold text-slate-800 leading-tight alert-sharp-text uppercase tracking-tight">
                                {note.content}
                              </div>
                            </div>
                          );
                        })
                      ) : <div className="p-12 text-center text-slate-300 font-black uppercase tracking-[0.4em] text-[10px] border border-dashed border-slate-200">No longitudinal clinical records</div>}
                   </div>

                   <div className="col-span-12 lg:col-span-5">
                      <div className="alert-card-green bg-white shadow-xl sticky top-4 border-2">
                         <div className="alert-header-green px-4 py-2.5 flex justify-between items-center text-white">
                            <span className="text-[11px] font-black uppercase tracking-[0.1em] alert-sharp-text flex items-center gap-2"><NotebookTabs size={16} strokeWidth={3}/> Capture Clinical Service</span>
                            <Stethoscope size={18} strokeWidth={3}/>
                         </div>
                         <div className="p-4 space-y-4">
                            <textarea value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)} className="w-full bg-slate-50 border-2 border-green-100 p-3 text-[12px] font-bold text-slate-700 uppercase outline-none focus:border-green-500 min-h-[180px] resize-none alert-sharp-text" placeholder="Log interventions, counseling, or clinical observations for this patient..." />
                            <div className="flex justify-between items-center pt-2">
                               <div className="flex gap-1.5">
                                  {['Counseling', 'Intervention', 'VAS', 'Follow-up'].map(cat => (
                                    <button key={cat} onClick={() => setNewNoteCategory(cat as any)} className={`text-[8px] font-black px-2 py-1 border uppercase transition-all ${newNoteCategory === cat ? 'bg-green-600 text-white border-green-700 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}>{cat}</button>
                                  ))}
                               </div>
                               <button onClick={handleSaveClinicalNote} disabled={!newNoteContent || isSavingNote} className={`flex items-center gap-2 px-5 py-2 text-[11px] font-black uppercase transition-all border-b-2 shadow-lg ${newNoteContent && !isSavingNote ? 'bg-secondary text-white border-secondary hover:brightness-110 active:translate-y-0.5' : 'bg-slate-100 text-slate-300 border-slate-200'}`}>
                                  {isSavingNote ? <Loader2 size={14} className="animate-spin"/> : <Save size={14} strokeWidth={3}/>} Commit Record
                               </button>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};