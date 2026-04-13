import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Boxes, RefreshCw, Search, AlertTriangle, Package, DollarSign, 
  Loader2, CheckCircle2, Plus, ArrowUpRight, ArrowDownLeft, 
  Edit3, Save, X, Info, TrendingUp, ChevronLeft, ChevronRight
} from 'lucide-react';
import { odooService, OdooProduct } from '../services/odooService';
import { MOCK_INVENTORY } from '../mockData';

export const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<OdooProduct[]>(MOCK_INVENTORY);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [pushingStock, setPushingStock] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', price: 0 });
  const [pushingCatalog, setPushingCatalog] = useState(false);

  const isMac = useMemo(() => /Mac|iPhone|iPod|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent), []);
  const mod = isMac ? 'Opt' : 'Alt';

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.default_code && item.default_code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [inventory, searchTerm]);

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  
  const paginatedInventory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInventory.slice(start, start + itemsPerPage);
  }, [filteredInventory, currentPage]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [paginatedInventory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      const isMod = isMac ? (e.altKey || e.ctrlKey) : e.altKey;
      if (isMod) {
        if (e.code === 'KeyY') { e.preventDefault(); fetchInventory(); }
        if (e.code === 'KeyN') { e.preventDefault(); setShowAddModal(true); }
        if (e.code === 'KeyF') { e.preventDefault(); searchInputRef.current?.focus(); }
        return;
      }

      if (editingId !== null || showAddModal) return;

      if (paginatedInventory.length > 0) {
        if (e.code === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev < paginatedInventory.length - 1 ? prev + 1 : prev));
        } else if (e.code === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.code === 'ArrowRight') {
          if (currentPage < totalPages) { e.preventDefault(); setCurrentPage(prev => prev + 1); }
        } else if (e.code === 'ArrowLeft') {
          if (currentPage > 1) { e.preventDefault(); setCurrentPage(prev => prev - 1); }
        } else if (e.code === 'Enter') {
          e.preventDefault();
          handleStartEdit(paginatedInventory[selectedIndex]);
        }
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isMac, paginatedInventory, selectedIndex, editingId, showAddModal, currentPage, totalPages]);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await odooService.fetchInventory();
      if (data && data.length > 0) {
        setInventory(data);
      }
      setLastSynced(new Date());
    } catch (e: any) {
      setError(e.message || "Failed to pull inventory.");
    } finally {
      setLoading(false);
    }
  };

  // REMOVED: Auto-fetch on mount
  // useEffect(() => {
  //   fetchInventory();
  // }, []);

  const handleStartEdit = (item: OdooProduct) => {
    setEditingId(item.id);
    setEditQty(item.qty_available);
  };

  const handleSaveStock = async (id: number) => {
    setPushingStock(true);
    try {
      await odooService.pushStockUpdate(id, editQty);
      setInventory(prev => prev.map(item => item.id === id ? { ...item, qty_available: editQty } : item));
      setEditingId(null);
    } catch (e: any) {
      setError(`Push failed: ${e.message}`);
    } finally {
      setPushingStock(false);
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <div className="flex justify-between items-end border-b pb-1 border-orange-200">
        <div>
          <h2 className="text-lg font-bold text-secondary flex items-center gap-2 uppercase">
            <Boxes className="text-primary" size={18} /> Pharmaceutical Inventory
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Real-time Stock Tracking (Odoo Connector)</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-3 py-1 bg-white border border-slate-300 text-secondary hover:bg-slate-50 text-[10px] font-bold uppercase rounded-none"
          >
            <Plus size={14} className="text-primary" /> NEW ENTRY <span className="opacity-40 ml-1">[{mod}+N]</span>
          </button>
          <button 
            onClick={fetchInventory}
            disabled={loading}
            className="flex items-center gap-1 px-4 py-1 bg-secondary text-white text-[10px] font-bold uppercase hover:bg-secondary/90 disabled:opacity-50 rounded-none"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            {loading ? 'SYNCING...' : 'SYNC CATALOG'}
            <span className="opacity-40 ml-1 text-[8px]">[{mod}+Y]</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-2 flex items-start gap-2 text-red-800 text-[10px] font-bold uppercase">
          <AlertTriangle className="shrink-0" size={14} />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)}><X size={14}/></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-3">
          <div className="bg-white p-2 rounded-none border border-orange-200 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder={`Search SKU... [↑↓] Nav | [Enter] Edit | [${mod}+F] Focus`} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 border border-slate-200 rounded-none focus:ring-1 focus:ring-primary outline-none text-xs font-bold"
              />
            </div>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-2 flex items-center gap-2">
           <TrendingUp size={16} className="text-primary" />
           <span className="text-[10px] font-bold uppercase text-slate-500">{inventory.length} SKUs ACTIVE</span>
        </div>
      </div>

      <div className="bg-white border border-orange-200 rounded-none overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-orange-50 border-b border-orange-200">
                <th className="p-2 font-bold text-secondary text-[10px] uppercase">Item Name</th>
                <th className="p-2 font-bold text-secondary text-[10px] uppercase w-28">SKU / Ref</th>
                <th className="p-2 font-bold text-secondary text-[10px] uppercase w-20">SRP ($)</th>
                <th className="p-2 font-bold text-secondary text-[10px] uppercase w-32">Stock Level</th>
                <th className="p-2 font-bold text-secondary text-[10px] uppercase text-right w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedInventory.map((item, idx) => {
                const isOut = item.qty_available === 0;
                const isSelected = selectedIndex === idx;
                return (
                  <tr 
                    key={item.id} 
                    className={`transition-colors border-l-4 ${isSelected ? 'bg-orange-100/40 border-l-primary' : 'hover:bg-slate-50 border-l-transparent'} ${isOut ? 'bg-red-50/10' : ''}`}
                  >
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Package className={isSelected ? 'text-primary' : (isOut ? 'text-red-400' : 'text-slate-400')} size={14} />
                        <span className="font-bold text-secondary text-[11px] uppercase truncate">{item.name}</span>
                      </div>
                    </td>
                    <td className="p-2 font-mono text-[10px] text-slate-500 uppercase truncate">
                      {item.default_code || '---'}
                    </td>
                    <td className="p-2 text-[10px] font-bold text-slate-600">
                      ${item.list_price.toFixed(2)}
                    </td>
                    <td className="p-2">
                      {editingId === item.id ? (
                        <div className="flex items-center gap-1">
                           <input 
                             type="number" 
                             value={editQty} 
                             onChange={(e) => setEditQty(parseInt(e.target.value) || 0)} 
                             className="w-16 p-1 border border-primary text-[10px] font-bold outline-none" 
                             autoFocus 
                             onKeyDown={(e) => {
                               if (e.code === 'Enter') handleSaveStock(item.id);
                               if (e.code === 'Escape') setEditingId(null);
                             }}
                           />
                           <button onClick={() => handleSaveStock(item.id)} className="bg-green-600 text-white p-1 hover:bg-green-700" title="Save"><Save size={12} /></button>
                           <button onClick={() => setEditingId(null)} className="bg-slate-300 text-slate-600 p-1 hover:bg-slate-400"><X size={12} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-xs ${isOut ? 'text-red-600 underline' : 'text-secondary'}`}>{item.qty_available}</span>
                          <span className={`text-[8px] font-bold uppercase border px-1 ${isOut ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{isOut ? 'EMPTY' : 'OK'}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      {editingId !== item.id && (
                        <button 
                          onClick={() => handleStartEdit(item)} 
                          className={`text-[9px] font-bold uppercase border px-1.5 py-0.5 transition-colors ${isSelected ? 'bg-primary text-white border-primary shadow-sm' : 'border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-secondary'}`}
                        >
                          {isSelected ? 'EDIT ⏎' : 'Adjust'}
                        </button>
                      )}
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
            Page {currentPage} of {totalPages || 1} | Records {filteredInventory.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredInventory.length)}
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