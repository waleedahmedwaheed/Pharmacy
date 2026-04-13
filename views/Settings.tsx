import React, { useState, useEffect, useMemo } from 'react';
import { Database, ShieldCheck, Globe, Key, Save, Wifi, WifiOff, Loader2, Info, CheckCircle2, AlertTriangle, Shield, Link2, Zap, Cloud, Landmark, X, Settings2, UserCheck, ToggleLeft, ToggleRight, CreditCard, Eye, Layout, Clock } from 'lucide-react';
import { OdooConfig } from '../types';
import { odooService } from '../services/odooService';

export const Settings: React.FC = () => {
  const [config, setConfig] = useState<OdooConfig>({
    url: 'https://a21inventory.odoo.com',
    db: 'a21inventory',
    username: 'mtsui@app2one.com',
    apiKey: 'da4052cdf828352c98db6b12969dc3c397864fa4',
    proxyUrl: 'https://proxy.stg.jiralog.com/jsonrpc',
    connected: false
  });
  
  const [govConfig, setGovConfig] = useState({
    hcpId: '9006662656',
    serviceName: 'XYSysES',
    target: 'apim-xs-ehrss-eif-dhub-gateway',
    certName: 'gov_client_cert_2025.pem'
  });

  const [workflowConfig, setWorkflowConfig] = useState({
    skipVerification: (() => {
      const val = localStorage.getItem('cph_skip_verification');
      return val === null ? true : val === 'true';
    })(),
    skipCoPayment: (() => {
      const val = localStorage.getItem('cph_skip_copayment');
      return val === null ? true : val === 'true';
    })(),
    bookingInterval: parseInt(localStorage.getItem('cph_booking_interval') || '15')
  });

  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const isMac = useMemo(() => /Mac|iPhone|iPod|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent), []);
  const mod = isMac ? 'Opt' : 'Alt';

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      const isMod = isMac ? (e.altKey || e.ctrlKey) : e.altKey;
      if (isMod && e.code === 'KeyS') { e.preventDefault(); handleSave(); }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isMac, config, workflowConfig]);

  const handleSave = async () => {
    setTesting(true);
    setStatus('idle');
    setErrorMessage('');
    
    localStorage.setItem('cph_skip_verification', workflowConfig.skipVerification.toString());
    localStorage.setItem('cph_skip_copayment', workflowConfig.skipCoPayment.toString());
    localStorage.setItem('cph_booking_interval', workflowConfig.bookingInterval.toString());

    window.dispatchEvent(new Event('storage'));
    
    odooService.setConfig(config);
    try {
      await odooService.authenticate();
      setStatus('success');
      setConfig(prev => ({ ...prev, connected: true }));
    } catch (e: any) {
      setStatus('error');
      setErrorMessage(e.message || 'Odoo connection failed.');
      setConfig(prev => ({ ...prev, connected: false }));
    } finally {
      setTesting(false);
    }
  };

  const toggleSkipVerification = () => {
    setWorkflowConfig(prev => ({ ...prev, skipVerification: !prev.skipVerification }));
  };

  const toggleSkipCoPayment = () => {
    setWorkflowConfig(prev => ({ ...prev, skipCoPayment: !prev.skipCoPayment }));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-6 animate-in fade-in duration-300">
      <div className="border-b border-orange-200 pb-2">
        <h2 className="text-xl font-bold text-secondary flex items-center gap-2 uppercase tracking-tight">
          <Zap className="text-primary" size={20} /> Settings
        </h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase">DHUB Gateways & ERP Connectors</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-blue-600 rounded-none shadow-md border border-blue-400 overflow-hidden text-white">
          <div className="p-4 space-y-4">
              <div className="flex justify-between items-center border-b border-blue-400 pb-2">
                  <h3 className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                    <Cloud size={16} className="text-blue-200"/> Gov eHealth DHUB (CPP)
                  </h3>
                  <span className="bg-blue-500 text-[8px] font-bold px-1.5 py-0.5 border border-blue-300 uppercase">HL7 FHIR R4</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <label className="text-[9px] font-bold opacity-70 uppercase tracking-widest">Healthcare Provider ID</label>
                      <input type="text" value={govConfig.hcpId} className="w-full p-2 bg-blue-700 border border-blue-400 rounded-none outline-none font-bold text-xs" readOnly />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[9px] font-bold opacity-70 uppercase tracking-widest">Service Interface</label>
                      <input type="text" value={govConfig.serviceName} className="w-full p-2 bg-blue-700 border border-blue-400 rounded-none outline-none font-bold text-xs" readOnly />
                  </div>
              </div>

              <div className="p-2 bg-blue-800/40 rounded-none flex items-center gap-3 border border-blue-400">
                  <ShieldCheck className="text-blue-200" size={18} />
                  <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase Client Certificate Identity Attached">Client Certificate Identity Attached</p>
                      <p className="text-[9px] opacity-50 font-mono tracking-tighter">{govConfig.certName}</p>
                  </div>
                  <button className="text-[9px] font-bold bg-white text-blue-600 px-2 py-1 rounded-none shadow-sm uppercase">Refresh</button>
              </div>
          </div>
        </div>

        <div className="bg-white rounded-none shadow-sm border border-slate-200 p-4">
          <h3 className="text-xs font-bold text-secondary flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">
            <Settings2 size={16} className="text-primary"/> Workflow Config
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-none ${workflowConfig.skipVerification ? 'bg-orange-100 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                  <UserCheck size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-secondary uppercase leading-none mb-1">Skip Identity Check</p>
                  <p className="text-[9px] text-slate-400 font-medium">Auto-bypass QR scan stage</p>
                </div>
              </div>
              <button 
                onClick={toggleSkipVerification}
                className="focus:outline-none"
              >
                {workflowConfig.skipVerification ? (
                  <ToggleRight size={32} className="text-primary" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-300" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-none ${workflowConfig.skipCoPayment ? 'bg-orange-100 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-secondary uppercase leading-none mb-1">Skip Co-payment Stage</p>
                  <p className="text-[9px] text-slate-400 font-medium">Bypass calculation screen</p>
                </div>
              </div>
              <button 
                onClick={toggleSkipCoPayment}
                className="focus:outline-none"
              >
                {workflowConfig.skipCoPayment ? (
                  <ToggleRight size={32} className="text-primary" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-300" />
                )}
              </button>
            </div>

            <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 text-slate-400 rounded-none">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-secondary uppercase leading-none mb-1">Booking Interval</p>
                        <p className="text-[9px] text-slate-400 font-medium">Minutes per time slot</p>
                    </div>
                </div>
                <select 
                    value={workflowConfig.bookingInterval} 
                    onChange={e => setWorkflowConfig({...workflowConfig, bookingInterval: parseInt(e.target.value)})}
                    className="w-full p-2 border border-slate-200 text-xs font-bold uppercase outline-none focus:border-primary"
                >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">60 Minutes (1 Hour)</option>
                </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-none shadow-sm border border-orange-100 overflow-hidden">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-orange-100 pb-2">
             <h3 className="text-xs font-bold text-secondary flex items-center gap-2 uppercase tracking-widest">
               <Landmark size={16} className="text-primary"/> Odoo ERP API Connector
             </h3>
             {config.connected ? 
                <span className="text-[9px] text-green-600 font-bold flex items-center gap-1 uppercase border border-green-200 px-1.5 bg-green-50"><Wifi size={12}/> Connection Active</span> : 
                <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1 uppercase border border-slate-200 px-1.5 bg-slate-50"><WifiOff size={12}/> Disconnected</span>
             }
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            <div className="space-y-3">
               <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Database</label>
                <input type="text" value={config.db} onChange={e => setConfig({...config, db: e.target.value})} className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-none focus:ring-1 focus:ring-primary outline-none text-xs font-bold" />
              </div>
               <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Login Username</label>
                <input type="email" value={config.username} onChange={e => setConfig({...config, username: e.target.value})} className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-none focus:ring-1 focus:ring-primary outline-none text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">API Key / Secret</label>
                <input type="password" value={config.apiKey} onChange={e => setConfig({...config, apiKey: e.target.value})} className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-none focus:ring-1 focus:ring-primary outline-none text-xs font-bold" />
              </div>
            </div>
            <div className="space-y-3">
               <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">JSON-RPC Proxy (CORS)</label>
                <input type="text" value={config.proxyUrl} onChange={e => setConfig({...config, proxyUrl: e.target.value})} className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-none focus:ring-1 focus:ring-primary outline-none text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Instance Base URL</label>
                <input type="text" value={config.url} onChange={e => setConfig({...config, url: e.target.value})} className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-none focus:ring-1 focus:ring-primary outline-none text-xs font-bold" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex-1 mr-4">
            {status === 'success' && <div className="text-green-600 text-[10px] font-bold flex items-center gap-1 uppercase"><CheckCircle2 size={14} /> Credentials validated. Ready for sync.</div>}
            {status === 'error' && <div className="text-red-600 text-[10px] font-bold flex items-center gap-1 uppercase"><AlertTriangle size={14} /> {errorMessage}</div>}
          </div>
          <button onClick={handleSave} disabled={testing} className="flex items-center gap-2 bg-secondary text-white px-5 py-2 rounded-none font-bold hover:bg-secondary/90 transition-all shadow-sm disabled:opacity-50 text-[11px] uppercase relative">
            {testing ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            {testing ? 'Saving...' : 'Save Settings'}
            {!testing && <span className="opacity-40 ml-1 text-[8px] font-mono">[{mod}+S]</span>}
          </button>
        </div>
      </div>
      
      <div className="bg-orange-50 p-3 border border-orange-100">
        <h4 className="text-[10px] font-bold text-orange-800 uppercase flex items-center gap-1.5 mb-1">
          <Info size={14} /> Architecture Note
        </h4>
        <p className="text-[10px] text-orange-700 leading-tight">
          Settings are applied globally to this browser instance. Enable "Skip Identity Check" for faster processing when patient identity has already been verified manually at the collection counter. Enable "Skip Co-payment Stage" to bypass the detailed calculation screen during issuance. High Contrast Mode can be toggled at the bottom of the side menu.
        </p>
      </div>
    </div>
  );
};