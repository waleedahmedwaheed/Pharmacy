import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ArrowLeft, Search, FileText, QrCode, CheckCircle2, 
  Loader2, ClipboardCheck, Home, Activity, Cloud, RefreshCcw, 
  ShieldCheck, Calculator, Landmark, User, Hospital, UserRound,
  MessageSquareCode, HomeIcon, Info, Stethoscope, BriefcaseMedical,
  DollarSign, ShoppingCart, Minus, Plus, Equal, Boxes, Package, 
  ChevronRight, AlertTriangle, TrendingUp, GripHorizontal, 
  ArrowRight, Phone, Smartphone, MapPin, ClipboardList, AlertOctagon, 
  HeartOff, Printer, History, Tag, Clock, Pill, Edit3, Save, X, Check,
  NotebookTabs, MessageCircleMore
} from 'lucide-react';
import { Appointment, Patient, Prescription, WorkflowStage, maskHkid, MedicationDetail, ClinicalNote } from '../types';
import { MOCK_PATIENTS, MOCK_APPOINTMENTS, MOCK_GOV_PRESCRIPTIONS, MOCK_INVENTORY, getStatusColor, delay } from '../mockData';
import { MedicationIcon } from '../components/MedicationIcon';
import { odooService } from '../services/odooService';
import { govService } from '../services/govService';
import { masterDataService } from '../services/masterDataService';

interface PatientProcessProps {
  initialAppointmentId?: string;
  initialGovRxId?: string;
  initialPatientId?: string;
  onBack: () => void;
}

const STANDARD_VAS = [
  { id: 'mms', name: 'Medication Management Service (MMS)', price: 100 },
  { id: 'smoking', name: 'Smoking Cessation Service', price: 100 },
  { id: 'chronic', name: 'Chronic Disease Management', price: 100 },
  { id: 'oral', name: 'Oral Health Promotion', price: 100 }
];

const STORAGE_KEY_DOCK_HEIGHT = 'cph_inventory_dock_height';
const DEFAULT_DOCK_HEIGHT = 260;

// High-Fidelity Label Component matching the provided reference image
const DrugLabel: React.FC<{ 
  med: MedicationDetail, 
  patient: Patient | null, 
  prescriber: string, 
  issueDate: string,
  customInstructions?: string 
}> = ({ med, patient, prescriber, issueDate, customInstructions }) => {
  // Use a random but consistent batch/ref for demo
  const bn = "AB1234";
  const ref = "ABC12345";
  const hkReg = "HK-42252";
  
  // Format dates
  const formattedIssueDate = issueDate.replace(/-/g, '/');

  return (
    <div className="bg-white border-[1px] border-slate-300 p-4 font-sans text-slate-900 shadow-lg mx-auto min-h-[220px] overflow-hidden w-full max-w-[440px] leading-[1.2]">
      {/* Header - Pharmacy Identity */}
      <div className="mb-3">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <h4 className="text-[17px] font-black tracking-tighter text-slate-700 text-secondary">明心大藥房藥物管理中心</h4>
          <span className="text-[12px] font-bold text-slate-500">觀塘海濱道 163 號一樓</span>
        </div>
        <p className="text-[10.5px] font-bold text-slate-500 uppercase tracking-tighter">
          ACP Medication Management Centre. 163 Hoi Bun Rd. Tel.39762088
        </p>
      </div>

      {/* Drug Name & Quantity - Underlined */}
      <div className="mb-1">
        <h3 className="text-[18px] font-black underline uppercase leading-none text-black">
          {med.name} X {med.quantityValue}
        </h3>
      </div>

      {/* Brand & HK Registration */}
      <div className="mb-1 text-[13px] font-bold text-slate-800">
        (Augmentin 1G. {hkReg})
      </div>

      {/* Meta Line - BN, Exp, Ref */}
      <div className="flex justify-between items-center mb-3 text-[13px] font-bold text-slate-900">
        <span>BN: {bn}</span>
        <span>Exp: 2026/10</span>
        <span>Ref: {ref}</span>
      </div>

      {/* Directions - Primary (Large Bold) */}
      <div className="mb-1">
        <p className="text-[26px] font-black leading-tight tracking-tight text-black">
          {customInstructions ? customInstructions.split('.')[0] + '.' : `Take ${med.dosageValue} tablet every 12 hours.`}
        </p>
      </div>

      {/* Additional Instructions */}
      <div className="mb-1 text-[16px] font-bold text-black">
        {customInstructions && customInstructions.includes('after food') ? 'Take after food.' : 'Take after food.'}
      </div>

      {/* Course Duration */}
      <div className="mb-6 text-[16px] font-bold text-black">
        Take for 5 days to complete the course.
      </div>

      {/* Footer Info - Patient, Doctor, Date (Aligned at bottom) */}
      <div className="flex justify-between items-baseline pt-2 border-t border-slate-100 text-black">
        <span className="text-[22px] font-black uppercase tracking-tight">{patient?.name || 'CHAN Tai Man'}</span>
        <span className="text-[22px] font-black uppercase tracking-tight">{prescriber || 'Dr Fat LAM'}</span>
        <span className="text-[22px] font-black tabular-nums tracking-tighter">{formattedIssueDate || '2025/04/10'}</span>
      </div>
    </div>
  );
};

export const PatientProcess: React.FC<PatientProcessProps> = ({ initialAppointmentId, initialGovRxId, initialPatientId, onBack }) => {
  const [currentStage, setCurrentStage] = useState<WorkflowStage>(WorkflowStage.ENROLLMENT);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing_gov' | 'syncing_odoo' | 'success' | 'error'>('idle');
  const [processCompleted, setProcessCompleted] = useState(false);
  const [showEhr, setShowEhr] = useState(false);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [coPaymentInfo, setCoPaymentInfo] = useState<{gross: number, subsidy: number, coPay: number, txId: string} | null>(null);
  const [vasServices, setVasServices] = useState<string[]>([]);
  const [checkedMeds, setCheckedMeds] = useState<Record<number, boolean>>({});
  const [dispensingChecklist, setDispensingChecklist] = useState({ clinicalReview: false, reconciliation: false, pickingLabeling: true, storage: true });
  
  // Track focused med for console / dock
  const [focusedMedIndex, setFocusedMedIndex] = useState<number>(0);
  const [directionsOverrides, setDirectionsOverrides] = useState<Record<number, string>>({});

  // Pharmacist Note State
  const [clinicalSessionNote, setClinicalSessionNote] = useState('');
  const [noteCategory, setNoteCategory] = useState<ClinicalNote['category']>('Counseling');
  const [isLogSaved, setIsLogSaved] = useState(false);

  // High-level flow tracking: Is this the actual collection handover?
  const [isIssueFlow, setIsIssueFlow] = useState(false);

  // Intelligence Editing States
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState('');
  const [isEditingAllergies, setIsEditingAllergies] = useState(false);
  const [tempAllergies, setTempAllergies] = useState('');

  // Workflow preferences
  const skipVerificationPref = useMemo(() => {
    const val = localStorage.getItem('cph_skip_verification');
    return val === null ? true : val === 'true';
  }, []);

  const skipCoPaymentPref = useMemo(() => {
    const val = localStorage.getItem('cph_skip_copayment');
    return val === null ? true : val === 'true';
  }, []);

  const isMac = useMemo(() => /Mac|iPhone|iPod|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent), []);
  const mod = isMac ? 'Opt' : 'Alt';

  const handleKeyboardAction = () => {
    if (loading) return;
    if (currentStage === WorkflowStage.PREPARATION && Object.values(dispensingChecklist).every(v => v)) {
      handlePrepareMeds();
    } else if (currentStage === WorkflowStage.VERIFICATION) {
        setCurrentStage(WorkflowStage.DISPENSING);
    } else if (currentStage === WorkflowStage.DISPENSING) {
        const meds = prescription?.medications || [];
        const isAllChecked = meds.every((_, i) => checkedMeds[i]);
        if (isAllChecked) {
            handleCompleteDispensingStage();
        } else {
            handlePrintAndNext();
        }
    } else if (currentStage === WorkflowStage.PAYMENT) {
      handleFinalSubmitAndPayment();
    }
  };

  const handleCompleteDispensingStage = () => {
    if (isIssueFlow) {
      if (skipCoPaymentPref) {
        handleFinalSubmitAndPayment();
      } else {
        setCurrentStage(WorkflowStage.PAYMENT);
      }
    } else {
      handleFinishDispensing();
    }
  };

  /**
   * GLOBAL KEYBOARD SHORTCUT HANDLER
   * - OPT/ALT + S: Primary action (Sync, Save, Next)
   * - OPT/ALT + Q: Quick Verify (Bypass QR)
   * - OPT/ALT + H: Toggle eHealth Portal
   * - OPT/ALT + B/Backspace: Back to Queue
   */
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      const isMod = isMac ? (e.altKey || e.ctrlKey) : e.altKey;
      if (isMod) {
        if (e.code === 'KeyB' || e.code === 'Backspace' || e.code === 'ArrowLeft') {
          const isWriting = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
          if (!isWriting || e.code === 'KeyB') {
            e.preventDefault();
            onBack();
            return;
          }
        }

        if (e.code === 'KeyS' && !processCompleted) { e.preventDefault(); handleKeyboardAction(); }
        if (e.code === 'KeyQ' && currentStage === WorkflowStage.VERIFICATION) { e.preventDefault(); setCurrentStage(WorkflowStage.DISPENSING); }
        if (e.code === 'KeyH') { e.preventDefault(); setShowEhr(!showEhr); }
        if (e.code.startsWith('Digit') && prescription) {
            const idx = parseInt(e.code.replace('Digit', '')) - 1;
            if (idx >= 0 && idx < prescription.medications.length) {
                e.preventDefault();
                setFocusedMedIndex(idx);
            }
        }
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isMac, currentStage, showEhr, loading, processCompleted, prescription, checkedMeds, focusedMedIndex, isIssueFlow, skipCoPaymentPref, onBack]);

  const handlePrintAndNext = () => {
      const meds = prescription?.medications || [];
      if (!checkedMeds[focusedMedIndex]) {
          const nextChecked = {...checkedMeds, [focusedMedIndex]: true};
          setCheckedMeds(nextChecked);
          const nextIdx = meds.findIndex((_, i) => !nextChecked[i]);
          if (nextIdx !== -1) {
              setFocusedMedIndex(nextIdx);
          }
      } else {
          setCheckedMeds({...checkedMeds, [focusedMedIndex]: false});
      }
  };

  /**
   * INITIAL DATA LOADING
   * Loads patient and prescription context based on incoming props.
   * Handles both "Coming from Appointment Queue" and "Coming from Retrieval" scenarios.
   */
  useEffect(() => {
    if (initialAppointmentId) {
      const appt = MOCK_APPOINTMENTS.find(a => a.id === initialAppointmentId);
      if (appt) {
        const isCurrentlyPrepared = appt.status === WorkflowStage.PREPARED;
        setIsIssueFlow(isCurrentlyPrepared);

        let stage = isCurrentlyPrepared ? WorkflowStage.VERIFICATION : appt.status;
        if (stage === WorkflowStage.VERIFICATION && skipVerificationPref) {
          stage = WorkflowStage.DISPENSING;
        }

        setCurrentStage(stage);
        const pt = MOCK_PATIENTS.find(p => p.id === appt.patientId);
        if (pt) setPatient(pt);
        if (appt.prescription) setPrescription(appt.prescription);
      }
    } else if (initialGovRxId && initialPatientId) {
        const pt = MOCK_PATIENTS.find(p => p.id === initialPatientId);
        setIsIssueFlow(false);
        if (pt) {
            setPatient(pt);
            setCurrentStage(WorkflowStage.PREPARATION);
            const govRx = MOCK_GOV_PRESCRIPTIONS.find(r => r.id === initialGovRxId);
            if (govRx) {
                setPrescription({
                    id: initialGovRxId,
                    orderNum: govRx.orderNum,
                    medications: govRx.medications,
                    prescriber: { nameEn: govRx.pharmacist || 'Unknown', identifier: 'M000' },
                    institution: { name: govRx.hospital, identifier: 'HOSP-ID' },
                    issueDate: govRx.issueDate,
                    status: 'PENDING',
                    supplyShortage: false
                });
            }
        }
    }
  }, [initialAppointmentId, initialGovRxId, initialPatientId, skipVerificationPref]);

  useEffect(() => {
    const calculationStages = [WorkflowStage.PREPARATION, WorkflowStage.VERIFICATION, WorkflowStage.DISPENSING, WorkflowStage.PAYMENT];
    if (
      calculationStages.includes(currentStage) && 
      prescription && 
      patient && 
      !coPaymentInfo && 
      !loading && 
      syncStatus !== 'error'
    ) {
      handleCalculateCoPay();
    }
  }, [prescription, currentStage, coPaymentInfo, patient, loading, syncStatus]);

  const handleRetrieveRx = async () => {
    if (!patient) return;
    setLoading(true);
    setSyncStatus('syncing_gov');
    try {
      const rx = await govService.retrievePrescription(patient.hkid);
      setPrescription(rx);
      setSyncStatus('syncing_odoo');
      await odooService.syncLead({ id: rx.id, medications: rx.medications.map(m => m.name), hospital: rx.institution.name } as any, patient);
      setSyncStatus('success');
    } catch (e) { setSyncStatus('error'); } 
    finally { setLoading(false); }
  };

  const handleCalculateCoPay = async () => {
    if (!patient || !prescription) return;
    setLoading(true);
    setSyncStatus('syncing_gov');
    try {
      const result = await govService.calculateCoPayment(patient.hkid, prescription.medications);
      setCoPaymentInfo({ gross: result.gross, subsidy: result.subsidy, coPay: result.coPay, txId: result.transactionId });
      setSyncStatus('success');
    } catch (e) { setSyncStatus('error'); } 
    finally { setLoading(false); }
  };

  const handlePrepareMeds = async () => {
    if (!Object.values(dispensingChecklist).every(v => v) || !coPaymentInfo) return;
    setLoading(true);
    setSyncStatus('syncing_odoo');
    try {
      if (prescription && patient) {
        const dummyAppt: Appointment = {
          id: `appt-${Date.now()}`,
          patientId: patient.id,
          date: new Date().toISOString(),
          status: WorkflowStage.PREPARATION,
          prescription: prescription,
          coPaymentAmount: coPaymentInfo.coPay
        };
        await odooService.syncSalesOrder(dummyAppt, patient);
        setPrescription({ ...prescription, status: 'PREPARED' });
        setCurrentStage(skipVerificationPref ? WorkflowStage.DISPENSING : WorkflowStage.VERIFICATION);
        setSyncStatus('success');
      }
    } catch (e) { setSyncStatus('error'); }
    finally { setLoading(false); }
  };

  const handleFinalSubmitAndPayment = async () => {
    if (!patient || !prescription || !coPaymentInfo) return;
    setLoading(true);
    setSyncStatus('syncing_gov');

    const vasTotal = vasServices.reduce((sum, id) => {
      const service = STANDARD_VAS.find(s => s.id === id);
      return sum + (service?.price || 0);
    }, 0);

    const totalAmount = coPaymentInfo.coPay + vasTotal;

    try {
      await govService.submitDispensingRecord({ 
          patient, 
          prescription, 
          amount: totalAmount, 
          vas: vasServices,
      });
      setSyncStatus('success');
      setProcessCompleted(true);
    } catch (e: any) { 
        setSyncStatus('error');
        alert(`Record Submission Failed: ${e.message}`);
    }
    finally { setLoading(false); }
  };

  const handleFinishDispensing = async () => {
    if (!prescription || !patient) return;
    setLoading(true);
    await delay(1000);
    const apptIdx = MOCK_APPOINTMENTS.findIndex(a => a.id === patient.id);
    if (apptIdx !== -1) {
      MOCK_APPOINTMENTS[apptIdx].status = WorkflowStage.PREPARED;
    }
    setProcessCompleted(true);
    setLoading(false);
  };

  const startEditNotes = () => {
    setTempNotes(patient?.notes || '');
    setIsEditingNotes(true);
  };

  const saveNotes = () => {
    if (patient) {
        setPatient({ ...patient, notes: tempNotes });
    }
    setIsEditingNotes(false);
  };

  const startEditAllergies = () => {
    setTempAllergies(patient?.allergyHistory || '');
    setIsEditingAllergies(true);
  };

  const saveAllergies = () => {
    if (patient) {
        setPatient({ ...patient, allergyHistory: tempAllergies });
    }
    setIsEditingAllergies(false);
  };

  const currentFocusedMed = useMemo(() => {
    return prescription?.medications[focusedMedIndex] || null;
  }, [prescription, focusedMedIndex]);

  const activeMed = useMemo(() => {
      return prescription?.medications[focusedMedIndex] || { name: 'Unknown', quantityValue: 0, instructions: '', dosageValue: '1', dosageUnit: 'T', frequencyCode: 'QD', routeCode: 'PO', durationValue: '28', durationUnit: 'd' } as MedicationDetail;
  }, [prescription, focusedMedIndex]);

  /**
   * CLINICAL DISCREPANCY DETECTION
   * Compares current focused medication against patient's eHealth/Registry history.
   * Identifies changes in Instructions (Sig) or Quantity for safety review.
   */
  const lastEncounterForDrug = useMemo(() => {
    if (!patient?.clinicalSummary || !currentFocusedMed) return null;
    const baseName = currentFocusedMed.name.split(' ')[0].toLowerCase();
    const history = patient.clinicalSummary.prescribingHistory || [];
    const matches = history.filter(h => 
      h.prescriptionOrderNumber !== prescription?.id && (
        h.items?.some(i => i.name.toLowerCase().includes(baseName)) ||
        h.medications.some(m => m.toLowerCase().includes(baseName))
      )
    );
    return matches.length > 0 ? matches[0] : null;
  }, [patient, currentFocusedMed, prescription]);

  const historicalMedItem = useMemo(() => {
    if (!lastEncounterForDrug || !currentFocusedMed) return null;
    return lastEncounterForDrug.items?.find(i => 
      i.name.toLowerCase().includes(currentFocusedMed.name.split(' ')[0].toLowerCase())
    );
  }, [lastEncounterForDrug, currentFocusedMed]);

  const sigDifference = useMemo(() => {
    if (!lastEncounterForDrug || !currentFocusedMed) return false;
    if (historicalMedItem) {
        return historicalMedItem.instructions.trim().toLowerCase() !== currentFocusedMed.instructions.trim().toLowerCase();
    }
    const drugLine = lastEncounterForDrug.medications.find(m => 
      m.toLowerCase().includes(currentFocusedMed.name.split(' ')[0].toLowerCase())
    );
    if (!drugLine) return false;
    const lastSig = drugLine.split(': ')[1]?.trim().toLowerCase() || drugLine.toLowerCase();
    const currentSig = currentFocusedMed.instructions.trim().toLowerCase();
    return lastSig !== currentSig;
  }, [lastEncounterForDrug, currentFocusedMed, historicalMedItem]);

  const qtyDifference = useMemo(() => {
    if (!historicalMedItem || !currentFocusedMed) return false;
    return historicalMedItem.qty !== currentFocusedMed.quantityValue;
  }, [historicalMedItem, currentFocusedMed]);

  const hasAnyDiscrepancy = sigDifference || qtyDifference;

  const historicalDispensingItems = useMemo(() => {
    if (!patient?.clinicalSummary?.prescribingHistory) return [];
    return patient.clinicalSummary.prescribingHistory.flatMap(record => {
      const date = new Date(record.prescriptionDatetime).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
      return (record.items || []).map(item => ({
        date,
        name: item.name,
        sku: item.haCode ? item.haCode.replace('HA', 'HK') : 'HK-UNK',
        qty: item.qty,
        price: 20.00 
      }));
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [patient]);

  const EHRWidget = ({ title, columns, data }: any) => (
    <div className="mb-2 border border-slate-300 rounded-none bg-white overflow-hidden shadow-none">
      <div className="flex justify-between items-center bg-[#5e9a4a] text-white px-2 py-0.5">
        <span className="text-[10px] font-bold uppercase tracking-tight">{title}</span>
        <span className="text-[9px] cursor-pointer hover:underline">Details &gt;</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[10px] leading-tight border-collapse">
          <thead className="bg-[#f2f2f2] border-b border-slate-300">
            <tr>
              {columns.map((col: string, i: number) => (
                <th key={i} className="px-1.5 py-0.5 font-bold border-r last:border-0 border-slate-300 uppercase whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.length > 0 ? data.map((row: any, idx: number) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f9f9f9]'}>
                {Object.values(row).map((val: any, i: number) => (
                  <td key={i} className="px-1.5 py-1 align-top border-r last:border-0 border-slate-300">
                    {Array.isArray(val) ? (
                      <div className="space-y-0 text-[9px]">
                        {val.map((v, ki) => <div key={ki} className="font-bold text-slate-700">{v}</div>)}
                      </div>
                    ) : typeof val === 'object' && val !== null ? (
                      <div className="text-[9px]">
                        {Object.entries(val).map(([k, v]: [string, any]) => (
                          <div key={k} className="flex gap-1">
                            <span className="opacity-50 uppercase font-bold">{k}:</span>
                            <span className="font-medium">{v}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className={i === 0 ? "whitespace-nowrap font-medium" : "text-slate-600"}>{val}</span>
                    )}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length} className="px-1.5 py-2 text-center text-slate-400 italic">No record found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const getChargeableInfo = useCallback((med: MedicationDetail | null) => {
    if (!med) return { units: 1, label: 'UNIT(4w)' };
    const days = parseInt(med.durationValue) || 28;
    const units = Math.ceil(days / 28) || 1;
    const weeks = units * 4;
    return { units, label: `UNIT(${weeks}w)` };
  }, []);

  const renderContent = () => {
    if (processCompleted) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
               <CheckCircle2 size={40} className="text-success mb-2" />
               <h2 className="text-xl font-bold text-secondary uppercase tracking-tight">Service Session Closed</h2>
               <p className="text-[10px] text-slate-500 mb-4 italic">Record transmitted to DHUB successfully.</p>
               <button onClick={onBack} className="bg-primary text-white px-4 py-2 rounded-none text-xs font-bold uppercase flex items-center gap-2 border-b-2 border-orange-700 shadow-md transition-all active:scale-95"><Home size={14} /> Return to Queue <span className="opacity-60 text-[9px] font-mono">[{mod}+B]</span></button>
            </div>
          );
    }

    switch (currentStage) {
      case WorkflowStage.ENROLLMENT:
        return (
          <div className="max-w-md mx-auto py-10">
            <div className="bg-white p-4 rounded-none border border-slate-300 shadow-sm">
              <h2 className="text-xs font-bold mb-4 uppercase flex items-center gap-2 border-b border-slate-100 pb-1">Patient Pairing & Enrollment</h2>
              <div className="flex gap-2">
                <input type="text" placeholder="Scan HKID or Enter Number..." className="flex-1 p-2 border border-slate-300 rounded-none text-xs outline-none focus:border-primary" />
                <button className="bg-primary text-white px-4 py-2 rounded-none text-xs font-bold uppercase">SEARCH</button>
              </div>
              <p className="text-[9px] text-slate-400 mt-2 italic font-medium uppercase tracking-tight">Requirement: Valid HKID and eHealth enrollment required.</p>
            </div>
          </div>
        );
      case WorkflowStage.PREPARATION:
        return (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="shrink-0 space-y-2 mb-2">
                <div className="bg-[#f0f9ff] p-2 rounded-none border border-blue-200 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <Cloud size={16} className="text-blue-600"/>
                    <span className="text-[10px] font-bold text-blue-900 uppercase tracking-tight leading-none">
                      FHIR Retrieval (S14 Specification)
                    </span>
                  </div>
                  {!prescription && <button onClick={handleRetrieveRx} disabled={loading} className="bg-blue-600 text-white px-3 py-1 rounded-none text-[10px] font-bold uppercase shadow-sm">{loading ? 'XMITTING...' : 'FETCH ePRESCRIPTION'}</button>}
                  {prescription && <span className="text-success font-bold text-[10px] flex items-center gap-1 uppercase tracking-tighter"><ShieldCheck size={12}/> Rx VERIFIED #{prescription.id}</span>}
                </div>
            </div>

            {prescription && (
              <div className="flex-1 overflow-y-auto pb-4 px-3">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
                    <div className="lg:col-span-3 space-y-2">
                        <div className="bg-white p-3 rounded-none border border-slate-300 shadow-sm">
                            <div className="grid grid-cols-2 gap-4 text-[10px] border-b border-slate-100 pb-2 mb-2 uppercase">
                                <div>
                                    <p className="font-bold text-slate-400 tracking-tighter">Prescriber (SOPC/FM)</p>
                                    <p className="font-bold text-secondary text-[11px]">{prescription.prescriber.nameEn}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-slate-400 tracking-tighter">Institution</p>
                                    <p className="font-bold text-secondary text-[11px]">{prescription.institution.name}</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                              {prescription.medications.map((med, i) => {
                                const isFocused = focusedMedIndex === i;
                                const unitsInfo = getChargeableInfo(med);
                                return (
                                  <div 
                                    key={i} 
                                    onClick={() => setFocusedMedIndex(i)}
                                    className={`flex items-start border p-2 gap-3 group transition-all cursor-pointer relative ${
                                      isFocused 
                                        ? 'bg-orange-50 border-primary ring-1 ring-primary/20 border-l-4' 
                                        : 'bg-slate-50 border-slate-200 hover:border-slate-400 border-l-4 border-l-transparent'
                                    }`}
                                  >
                                    <MedicationIcon name={med.name} className="w-10 h-10 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                           <span className={`font-bold text-[11px] uppercase truncate ${isFocused ? 'text-primary' : 'text-secondary'}`}>{med.name}</span>
                                           <span className="text-[9px] font-mono bg-white border border-slate-200 px-1 rounded-none shrink-0 ml-2 text-black font-bold">Chargeable: {unitsInfo.units} {unitsInfo.label}</span>
                                        </div>
                                        <div className="flex gap-2 mt-0.5">
                                           <span className="text-[9px] font-bold text-blue-700 border border-blue-200 px-1.5 bg-white uppercase tracking-tighter">{med.dosageValue} {med.dosageUnit} {med.frequencyCode}</span>
                                           <span className="text-[9px] font-bold text-orange-700 border border-orange-200 px-1.5 bg-white uppercase tracking-tighter">QTY: {med.quantityValue}</span>
                                        </div>
                                        <div className="mt-1.5 p-1.5 bg-white border border-slate-200 border-l-2 border-l-primary/50">
                                            <p className="text-[10px] font-bold text-secondary uppercase tracking-tight leading-tight">
                                              {masterDataService.lookupDirection(med.frequencyCode).replace('{qty}', med.dosageValue)}, {masterDataService.lookupDirection(med.routeCode)} for {med.durationValue} {med.durationUnit}
                                            </p>
                                        </div>
                                    </div>
                                    {isFocused && <ChevronRight size={16} className="text-primary mt-1 shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="bg-green-50 p-2 rounded-none border border-green-200 shadow-sm">
                            <h4 className="text-[10px] font-bold text-green-900 uppercase border-b border-green-200 mb-2 pb-0.5 tracking-tight flex items-center gap-1"><Calculator size={12}/> Co-payment Calc</h4>
                            {!coPaymentInfo ? (
                                 <div className="bg-white p-2 border border-green-200 text-center">
                                    <p className="text-[9px] font-bold text-blue-600 animate-pulse uppercase tracking-widest py-1">
                                      {loading ? 'CALCULATING...' : 'AUTO-CALC IN PROGRESS...'}
                                    </p>
                                 </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <div className="bg-white p-2 border border-green-200 relative shadow-sm">
                                        <div className="flex justify-between items-center mb-1">
                                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Medication Gross</p>
                                          <p className="text-11px] font-bold text-slate-500">${coPaymentInfo.gross.toFixed(2)}</p>
                                        </div>
                                        <div className="flex justify-between items-center mb-2">
                                          <div className="flex items-center gap-1">
                                            <Minus size={8} className="text-red-500"/>
                                            <p className="text-[8px] text-red-500 font-bold uppercase tracking-widest">Gov Subsidy</p>
                                          </div>
                                          <p className="text-[11px] font-bold text-red-500">-${coPaymentInfo.subsidy.toFixed(2)}</p>
                                        </div>
                                        <div className="border-t border-dashed border-slate-300 pt-1 flex justify-between items-center">
                                          <div className="flex items-center gap-1">
                                            <Equal size={8} className="text-secondary"/>
                                            <p className="text-[9px] text-secondary font-bold uppercase tracking-widest leading-none">Net Med Co-pay</p>
                                          </div>
                                          <p className="text-[13px] font-bold text-secondary">${coPaymentInfo.coPay.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <p className="text-[7px] text-slate-400 italic text-center uppercase tracking-tighter">Auth: {coPaymentInfo.txId}</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-2 border border-slate-300 space-y-1.5 shadow-sm">
                           <h5 className="text-[10px] font-bold text-secondary uppercase border-b border-slate-100 pb-0.5 tracking-tight">Dispensing Checks</h5>
                           <div className="space-y-1">
                              {Object.keys(dispensingChecklist).map((k) => (
                                <label key={k} className="flex items-center gap-2 p-1 bg-slate-50 border border-slate-100 hover:bg-orange-50 cursor-pointer transition-colors">
                                   <input type="checkbox" checked={dispensingChecklist[k as keyof typeof dispensingChecklist]} onChange={() => setDispensingChecklist(prev => ({...prev, [k]: !prev[k as keyof typeof dispensingChecklist]}))} className="w-3.5 h-3.5 accent-primary" />
                                   <span className="text-[9px] font-bold uppercase text-slate-600">{k.replace(/([A-Z])/g, ' $1')}</span>
                                 </label>
                              ))}
                           </div>
                        </div>

                        <button onClick={handlePrepareMeds} disabled={loading || !Object.values(dispensingChecklist).every(v => v) || !coPaymentInfo} className="w-full py-2.5 bg-primary text-white rounded-none font-bold text-[10px] uppercase border-b-2 border-orange-700 shadow-md disabled:opacity-30 transition-all active:scale-95">
                            {loading ? 'SYNCING...' : <>Finalize & Post Sales Order <span className="opacity-60 ml-1">[{mod}+S]</span></>}
                        </button>
                    </div>
                </div>
              </div>
            )}
          </div>
        );
      case WorkflowStage.VERIFICATION:
        return (
          <div className="max-w-xs mx-auto text-center py-10">
            <div className="bg-white p-6 border border-secondary border-t-4 rounded-none shadow-lg">
               <QrCode className="mx-auto h-16 w-16 text-secondary mb-4 opacity-40" />
               <h2 className="text-[10px] font-bold uppercase mb-4 tracking-widest text-slate-400">Patient Identity Check</h2>
               <div className="space-y-2">
                <button onClick={() => setCurrentStage(WorkflowStage.DISPENSING)} className="bg-secondary text-white w-full py-2 rounded-none text-xs font-bold uppercase border-b-2 border-black shadow-md">SCAN eHEALTH QR <span className="opacity-60 ml-1">[{mod}+Q]</span></button>
                <p className="text-[8px] text-slate-400 italic">Tip: You can skip this step in Settings.</p>
               </div>
            </div>
          </div>
        );
      case WorkflowStage.DISPENSING:
        const currentMeds = prescription?.medications || [];
        const activeMedUnits = getChargeableInfo(activeMed);
        const isAllChecked = currentMeds.length > 0 && currentMeds.every((_, i) => checkedMeds[i]);
        const isCurrentChecked = !!checkedMeds[focusedMedIndex];

        return (
          <div className="flex flex-col h-full bg-[#f1f5f9] animate-in fade-in duration-300">
             <div className="bg-[#1e293b] text-white px-3 py-2 shrink-0 border-b border-black">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <h2 className="text-lg font-bold uppercase tracking-tight leading-none text-blue-400">
                                {patient?.name} <span className="text-slate-500 font-medium ml-1">({patient?.nameCn})</span>
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 flex items-center gap-3">
                                <span>BORN: <span className="text-white">{patient?.dob} (64y)</span></span>
                                <span>GENDER: <span className="text-white">{patient?.sex === 'M' ? 'Male' : 'Female'}</span></span>
                                <span>{patient?.icType}: <span className="text-white">{maskHkid(patient?.hkid || '')}</span></span>
                                <span>RightMed ID: <span className="text-blue-300">{patient?.rightMedId || '---'}</span></span>
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Dispensing Station 04</p>
                        <p className="text-[11px] font-mono text-blue-400">{new Date().toLocaleString()}</p>
                    </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center gap-2">
                    <MapPin size={14} className="text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-300 uppercase truncate">{patient?.address}</span>
                </div>
             </div>

             <div className="flex-1 flex overflow-hidden">
                <div className="w-56 bg-slate-200 border-r border-slate-300 flex flex-col shrink-0">
                    <div className="bg-slate-300 p-2 text-[9px] font-bold text-slate-600 uppercase tracking-widest border-b border-slate-400">Prescription Meds</div>
                    <div className="flex-1 overflow-y-auto p-1 space-y-1">
                        {currentMeds.map((m, i) => (
                            <button 
                                key={i} 
                                onClick={() => setFocusedMedIndex(i)}
                                className={`w-full text-left p-2 border transition-all flex items-start gap-2 group ${focusedMedIndex === i ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500/20' : 'bg-slate-100 border-slate-300 hover:bg-white/50'}`}
                            >
                                <div className={`shrink-0 w-4 h-4 flex items-center justify-center text-[9px] font-bold border ${checkedMeds[i] ? 'bg-green-600 text-white border-green-700' : 'bg-slate-300 text-slate-500 border-slate-400'}`}>
                                    {checkedMeds[i] ? <CheckCircle2 size={10}/> : i + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={`text-[10px] font-bold uppercase truncate ${focusedMedIndex === i ? 'text-blue-600' : 'text-slate-600'}`}>{m.name}</p>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">QTY: {m.quantityValue}</p>
                                </div>
                                {focusedMedIndex === i && <ChevronRight size={14} className="text-blue-500 mt-0.5" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-12 overflow-hidden">
                    <div className="col-span-4 bg-white border-r border-slate-300 p-3 flex flex-col space-y-3 shadow-inner overflow-y-auto">
                        <div className="space-y-1 shrink-0">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Selected Drug</label>
                            <div className="p-2 bg-blue-50 border border-blue-200 flex items-center gap-3">
                                <MedicationIcon name={activeMed.name} className="w-10 h-10 shrink-0" />
                                <div className="min-w-0">
                                    <h3 className="text-xs font-black text-secondary uppercase leading-tight">{activeMed.name}</h3>
                                    <p className="text-[9px] font-bold text-blue-600 uppercase mt-0.5">S3 Poison • {activeMed.id_rpp}</p>
                                </div>
                            </div>
                        </div>

                        <div className="border border-blue-200 bg-white overflow-hidden shadow-sm shrink-0">
                            <div className="bg-blue-50 px-2 py-1 flex items-center justify-between border-b border-blue-300">
                                <span className="text-[9px] font-black text-blue-800 uppercase tracking-widest">Current Prescription Detail</span>
                                <span className="text-[9px] font-bold text-blue-600 uppercase tabular-nums">{prescription?.issueDate}</span>
                            </div>
                            <div className="p-2 space-y-2">
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] uppercase font-bold text-slate-500">
                                    <div>
                                        <span className="text-[7px] text-slate-400 block tracking-tighter">Doctor</span>
                                        <span className="text-secondary truncate block font-bold uppercase">{prescription?.prescriber.nameEn.split('. ')[1] || prescription?.prescriber.nameEn}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[7px] text-slate-400 block tracking-tighter">Institution</span>
                                        <span className="text-secondary truncate block font-bold uppercase">{prescription?.institution.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-[7px] text-slate-400 block tracking-tighter">Order Ref</span>
                                        <span className="text-blue-600 font-mono truncate block font-bold">{prescription?.id}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[7px] text-slate-400 block tracking-tighter">Status</span>
                                        <span className="text-green-600 block font-bold">Verified HL7</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-bold text-blue-600 uppercase tracking-tighter">Direction Adjustment (Editable)</label>
                                    <textarea 
                                      className="w-full p-2 bg-slate-50 border border-blue-100 rounded-none focus:ring-1 focus:ring-primary outline-none text-[11px] font-black text-secondary h-20 uppercase resize-none shadow-inner"
                                      placeholder="Manually adjust label instructions..."
                                      value={directionsOverrides[focusedMedIndex] ?? activeMed.instructions}
                                      onChange={(e) => setDirectionsOverrides({...directionsOverrides, [focusedMedIndex]: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 shrink-0">
                            <div className="space-y-1 flex flex-col">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none block">Quantity</label>
                                <div className="flex items-end bg-[#f1f5f9] border border-slate-300 px-3 pb-2 h-14 shadow-sm">
                                    <span className="text-2xl font-black text-black leading-none">{activeMed.quantityValue}</span>
                                    <span className="text-[11px] font-black ml-2 text-slate-400 leading-none">PCS</span>
                                </div>
                            </div>
                            <div className="space-y-1 flex flex-col">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none block">Chargeable</label>
                                <div className="flex items-end bg-[#f1f5f9] border border-slate-300 px-3 pb-2 h-14 shadow-sm">
                                    <span className="text-2xl font-black text-black leading-none">{activeMedUnits.units}</span>
                                    <span className="text-[11px] font-black ml-1 text-slate-400 leading-none truncate uppercase">{activeMedUnits.label}</span>
                                </div>
                            </div>
                            <div className="space-y-1 flex flex-col">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none block">Co-pay Price</label>
                                <div className="flex items-end bg-orange-50 border border-orange-200 px-3 pb-2 h-14 shadow-sm">
                                    <span className="text-2xl font-black text-primary leading-none tracking-tight">$20.00</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 flex flex-col gap-2 shrink-0">
                            <button 
                                onClick={() => isAllChecked ? handleCompleteDispensingStage() : handlePrintAndNext()}
                                className={`w-full py-4 border-2 font-black text-sm uppercase flex items-center justify-center gap-3 transition-all ${
                                    isAllChecked 
                                    ? (isIssueFlow && !skipCoPaymentPref ? 'bg-primary border-orange-700 text-white shadow-lg' : 'bg-green-600 border-green-700 text-white shadow-lg')
                                    : (isCurrentChecked ? 'bg-green-600 border-green-700 text-white shadow-lg' : 'bg-white border-blue-500 text-blue-600 hover:bg-blue-50 shadow-md')
                                }`}
                            >
                                {isAllChecked ? (isIssueFlow && !skipCoPaymentPref ? <><ShoppingCart size={24}/> GO TO CO-PAYMENT</> : <><CheckCircle2 size={24}/> CONFIRM & ISSUE</>) : (isCurrentChecked ? <><CheckCircle2 size={24}/> {isIssueFlow ? 'VERIFIED' : 'CONFIRMED & PICKED'}</> : (isIssueFlow ? <><Check size={24}/> {isCurrentChecked ? 'VERIFIED' : 'VERIFY & NEXT'}</> : <><Printer size={24}/> PRINT LABEL</>))}
                            </button>
                        </div>

                        <div className="space-y-1 mt-4 shrink-0 border-t border-slate-100 pt-4">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                Label Preview
                                <span className="bg-slate-100 px-1 border border-slate-200 text-[8px] text-black font-bold uppercase tracking-widest">Sticker Size: 80x50mm</span>
                            </label>
                            <DrugLabel 
                              med={activeMed} 
                              patient={patient} 
                              prescriber={prescription?.prescriber.nameEn || 'Dr Fat LAM'}
                              issueDate={prescription?.issueDate || '2025-04-10'}
                              customInstructions={directionsOverrides[focusedMedIndex] ?? activeMed.instructions}
                            />
                        </div>

                    </div>

                    <div className="col-span-4 bg-slate-100 border-r border-slate-300 p-3 flex flex-col space-y-3 overflow-y-auto">
                        <div className="alert-card-blue bg-white overflow-hidden shadow-lg">
                            <div className="alert-header-blue px-2 py-1.5 flex items-center justify-between border-b border-blue-600/30">
                                <span className="text-[11px] font-black uppercase tracking-widest alert-sharp-text">Patient Notes / Flags</span>
                                <div className="flex items-center gap-2">
                                  {isEditingNotes ? (
                                    <>
                                      <button onClick={saveNotes} className="text-white hover:bg-blue-800 p-0.5 rounded transition-colors"><Save size={14}/></button>
                                      <button onClick={() => setIsEditingNotes(false)} className="text-white hover:bg-red-800 p-0.5 rounded transition-colors"><X size={14}/></button>
                                    </>
                                  ) : (
                                    <button onClick={startEditNotes} className="text-white hover:bg-blue-800 p-0.5 rounded transition-colors"><Edit3 size={14}/></button>
                                  )}
                                  <Info size={16} className="text-white" />
                                </div>
                            </div>
                            <div className="p-3 text-[12px] font-black text-black uppercase tracking-tight leading-tight">
                                {isEditingNotes ? (
                                  <textarea 
                                    className="w-full bg-slate-50 border border-blue-600 p-1 rounded-none outline-none focus:ring-1 focus:ring-blue-400 min-h-[60px]" 
                                    value={tempNotes} 
                                    onChange={(e) => setTempNotes(e.target.value)}
                                    autoFocus
                                  />
                                ) : (
                                  <>
                                    <div className="mb-2 italic alert-sharp-text">{patient?.notes || "NO CRITICAL FLAGS REGISTERED."}</div>
                                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest opacity-60">Updated: 15-NOV-2025</p>
                                  </>
                                )}
                            </div>
                        </div>

                        <div className="alert-card-red bg-white overflow-hidden shadow-lg">
                            <div className="alert-header-red px-2 py-1.5 flex items-center justify-between border-b border-red-600/30">
                                <span className="text-[11px] font-black uppercase tracking-widest alert-sharp-text">Allergies & ADRs</span>
                                <div className="flex items-center gap-2">
                                  {isEditingAllergies ? (
                                    <>
                                      <button onClick={saveAllergies} className="text-white hover:bg-red-800 p-0.5 rounded transition-colors"><Save size={14}/></button>
                                      <button onClick={() => setIsEditingAllergies(false)} className="text-white hover:bg-red-800 p-0.5 rounded transition-colors"><X size={14}/></button>
                                    </>
                                  ) : (
                                    <button onClick={startEditAllergies} className="text-white hover:bg-red-800 p-0.5 rounded transition-colors"><Edit3 size={14}/></button>
                                  )}
                                  <AlertOctagon size={16} className="text-white" />
                                </div>
                            </div>
                            <div className="p-3 text-[12px] font-black text-red-600 uppercase tracking-tight leading-tight alert-sharp-text">
                                {isEditingAllergies ? (
                                  <textarea 
                                    className="w-full bg-slate-50 border border-red-600 p-1 rounded-none outline-none focus:ring-1 focus:ring-red-400 min-h-[40px]" 
                                    value={tempAllergies} 
                                    onChange={(e) => setTempAllergies(e.target.value)}
                                    autoFocus
                                  />
                                ) : (
                                  patient?.allergyHistory || "NO KNOWN DRUG ALLERGIES REPORTED."
                                )}
                            </div>
                        </div>

                        <div className={`alert-card-yellow bg-white overflow-hidden shadow-lg`}>
                            <div className={`alert-header-yellow px-2 py-1 flex items-center justify-between border-b border-yellow-600/30`}>
                                <span className={`text-[10px] font-black uppercase tracking-widest alert-sharp-text`}>
                                  Drug Details / {hasAnyDiscrepancy ? 'CHANGED CLINICAL HISTORY' : 'LAST PRESCRIPTION'}
                                </span>
                                {hasAnyDiscrepancy && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] font-black text-black alert-bg-yellow border border-yellow-600 px-1 alert-tag">DISCREPANCY</span>
                                    <AlertTriangle size={14} className="text-black" strokeWidth={3} />
                                  </div>
                                )}
                            </div>
                            <div className="p-2 space-y-2">
                                {lastEncounterForDrug ? (
                                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                                      <div className={`flex justify-between items-center px-2 py-1 border border-yellow-600 alert-bg-yellow`}>
                                          <span className={`text-[11px] font-black uppercase alert-sharp-text`}>Last Prescription Detail</span>
                                          <span className={`text-[10px] font-black tabular-nums alert-sharp-text`}>{lastEncounterForDrug.prescriptionDatetime.split(' ')[0]}</span>
                                      </div>
                                      
                                      <div className={`px-2 py-1.5 border border-yellow-600 bg-yellow-100 flex justify-between items-center`}>
                                          <span className="text-[11px] font-black text-black uppercase leading-tight alert-sharp-text">{historicalMedItem?.name || 'Unknown Drug Brand'}</span>
                                          <span className="text-[9px] font-mono font-black bg-white px-1 border border-slate-300 text-blue-600">{historicalMedItem?.haCode ? historicalMedItem.haCode.replace('HA', 'HK') : 'HK-00000'}</span>
                                      </div>

                                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] uppercase font-black text-black">
                                          <div>
                                              <span className="text-[8px] text-slate-500 block tracking-tighter">Doctor</span>
                                              <span className="truncate block">{lastEncounterForDrug.prescriber.prefix} {lastEncounterForDrug.prescriber.fullName}</span>
                                          </div>
                                          <div className="text-right">
                                              <span className="text-[8px] text-slate-500 block tracking-tighter">Institution</span>
                                              <span className="truncate block">{lastEncounterForDrug.prescribingInstitution.longName}</span>
                                          </div>
                                          <div>
                                              <span className="text-[8px] text-slate-500 block tracking-tighter">Order Ref</span>
                                              <span className="text-blue-700 font-mono truncate block font-black">{lastEncounterForDrug.prescriptionOrderNumber}</span>
                                          </div>
                                          <div className="text-right">
                                              <span className="text-[8px] text-slate-500 block tracking-tighter">Interval</span>
                                              <span>72 Days Ago</span>
                                          </div>
                                      </div>

                                      <div className={`p-2 border border-yellow-600 text-[10px] leading-tight uppercase font-black bg-white shadow-inner`}>
                                          <div className="flex justify-between items-center mb-2">
                                            <span className="text-black font-black text-[11px] alert-sharp-text">Quantity Comparison</span>
                                            {qtyDifference && <span className="alert-bg-yellow border border-yellow-600 alert-tag text-[8px] px-1.5 py-0.5">QTY CHANGED</span>}
                                          </div>
                                          <div className="flex items-center gap-2 mb-2">
                                              <div className="flex-1 bg-slate-50 border border-slate-200 px-2 py-1.5 flex flex-col">
                                                <span className="text-[8px] text-slate-400 font-black uppercase mb-1">Historical</span>
                                                <span className="text-slate-500 font-black text-[12px]">{historicalMedItem?.qty || '0'} PCS</span>
                                              </div>
                                              <ArrowRight size={16} className="text-black shrink-0" />
                                              <div className="flex-1 alert-bg-yellow border border-yellow-600 px-2 py-1.5 flex flex-col">
                                                <span className="text-[8px] font-black uppercase mb-1">Current</span>
                                                <span className="text-black font-black text-[12px]">{activeMed.quantityValue} PCS</span>
                                              </div>
                                          </div>
                                          <div className="bg-slate-100 border border-slate-300 px-2 py-1.5 flex items-center justify-between">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Chargeable:</span>
                                            <span className="text-[11px] font-black text-secondary">{activeMedUnits.units} {activeMedUnits.label}</span>
                                          </div>
                                      </div>

                                      <div className={`p-1.5 border border-yellow-600 text-[10px] leading-tight uppercase font-black bg-white shadow-inner`}>
                                          <div className="flex justify-between items-center mb-1">
                                            <span className="text-black font-black alert-sharp-text">Previous Direction:</span>
                                            {sigDifference && <span className="alert-bg-yellow border border-yellow-600 alert-tag">NEW DIRECTION DETECTED</span>}
                                          </div>
                                          <div className="p-1 border border-dashed border-slate-300 text-black">
                                            {historicalMedItem ? historicalMedItem.instructions : (lastEncounterForDrug.medications.find(m => m.toLowerCase().includes(activeMed.name.split(' ')[0].toLowerCase())) || "Refer to label instructions.")}
                                          </div>
                                      </div>
                                  </div>
                                ) : (
                                  <div className="p-3 text-center border border-dashed border-yellow-500 bg-yellow-50 text-[10px] font-black text-yellow-700 uppercase alert-sharp-text">
                                      NO PREVIOUS PRESCRIPTION RECORD FOUND
                                  </div>
                                )}

                                <div className={`mt-2 p-1.5 border border-yellow-600 text-[10px] leading-tight uppercase font-black bg-white`}>
                                    <div className="text-black mb-1 alert-sharp-text">Current Direction:</div>
                                    <div className={`p-1.5 border border-yellow-600 alert-bg-yellow text-black alert-sharp-text`}>
                                      {activeMed.instructions}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="col-span-4 bg-slate-200 p-3 flex flex-col space-y-3 overflow-y-auto">
                        <div className="flex-[0.4] flex flex-col min-h-0 bg-white border border-slate-300 shadow-sm overflow-hidden">
                            <div className="bg-slate-100 px-2 py-1.5 text-[10px] font-black text-slate-600 uppercase tracking-widest flex justify-between items-center border-b border-slate-300">
                                <div className="flex items-center gap-1.5"><History size={14}/> Dispensing History</div>
                                <button className="text-[9px] text-blue-600 hover:underline font-bold">Full View</button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-left text-[9px] border-collapse">
                                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                        <tr className="font-black text-slate-400 uppercase">
                                            <th className="p-1.5">Date</th>
                                            <th className="p-1.5">Drug Description</th>
                                            <th className="p-1.5">SKU</th>
                                            <th className="p-1.5 text-right">Qty</th>
                                            <th className="p-1.5 text-right">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {historicalDispensingItems.length > 0 ? (
                                            historicalDispensingItems.map((h, hi) => (
                                                <tr key={hi} className="hover:bg-blue-50 transition-colors cursor-pointer group">
                                                    <td className="p-1.5 font-mono text-slate-400 group-hover:text-blue-600 whitespace-nowrap">{h.date}</td>
                                                    <td className="p-1.5 font-black text-secondary uppercase truncate max-w-[100px]">{h.name}</td>
                                                    <td className="p-1.5 font-mono text-slate-500">{h.sku}</td>
                                                    <td className="p-1.5 text-right font-black text-slate-600">{h.qty}</td>
                                                    <td className="p-1.5 text-right font-black text-primary">${h.price.toFixed(2)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-slate-400 italic">No historical dispensing found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Chronological Clinical Log History - High-Fidelity Styling matching reference image */}
                        <div className="flex-[0.4] flex flex-col min-h-0 bg-white border border-slate-300 shadow-sm overflow-hidden">
                            <div className="bg-[#f0fdf4] px-2 py-1.5 text-[10px] font-black text-green-700 uppercase tracking-widest flex justify-between items-center border-b border-green-200">
                                <div className="flex items-center gap-1.5"><NotebookTabs size={14}/> Chronological Clinical Log</div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-3">
                                {patient?.clinicalNotes && patient.clinicalNotes.length > 0 ? (
                                  patient.clinicalNotes.map(note => {
                                    // Extract initials for the "HO" box in screenshot
                                    const names = note.pharmacistName.split(' ');
                                    const initials = names.length > 1 ? (names[names.length-2][0] + names[names.length-1][0]) : names[0].substring(0, 2);
                                    
                                    return (
                                      <div key={note.id} className="border border-[#16a34a] overflow-hidden bg-white shadow-sm flex flex-col">
                                        <div className="bg-[#16a34a] px-2 py-1 flex justify-between items-center text-white">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] font-black uppercase tracking-widest alert-sharp-text">{note.category}</span>
                                            <span className="text-[10px] font-black text-white/90 tabular-nums">[{note.timestamp.split(' ')[0]}]</span>
                                          </div>
                                          <span className="text-[9px] font-black uppercase border border-white px-1 leading-tight">{initials}</span>
                                        </div>
                                        <div className="p-2.5 text-[11px] font-bold text-slate-800 leading-tight alert-sharp-text uppercase tracking-tight">
                                          {note.content}
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="h-full flex items-center justify-center text-[10px] text-slate-300 font-black uppercase tracking-widest">
                                    No previous clinical log
                                  </div>
                                )}
                            </div>
                        </div>

                        {/* Current Documentation Capture Panel */}
                        <div className="alert-card-green bg-white overflow-hidden shadow-lg border-2 shrink-0">
                             <div className="alert-header-green px-2 py-1.5 flex items-center justify-between border-b border-green-600/30">
                                 <span className="text-[11px] font-black uppercase tracking-widest alert-sharp-text flex items-center gap-2">
                                     <NotebookTabs size={14} strokeWidth={3}/> Pharmacist Clinical Log
                                 </span>
                                 <div className="flex items-center gap-2">
                                     {isLogSaved ? (
                                         <span className="text-[9px] font-black uppercase text-white bg-green-800 px-1 border border-green-200 shadow-sm alert-tag flex items-center gap-1">
                                             <CheckCircle2 size={10} strokeWidth={4}/> Saved
                                         </span>
                                     ) : clinicalSessionNote && (
                                         <span className="text-[9px] font-black uppercase text-white bg-orange-600 px-1 border border-orange-200 shadow-sm alert-tag animate-pulse">Draft</span>
                                     )}
                                     <Stethoscope size={16} className="text-white" strokeWidth={3} />
                                 </div>
                             </div>
                             <div className="p-2 space-y-3">
                                 <textarea 
                                     value={clinicalSessionNote}
                                     onChange={(e) => { setClinicalSessionNote(e.target.value); setIsLogSaved(false); }}
                                     className="w-full bg-slate-50 border-2 border-green-100 p-2 text-[12px] font-bold text-slate-700 uppercase outline-none focus:border-green-500 min-h-[140px] resize-none shadow-inner alert-sharp-text"
                                     placeholder="Pharmacist documentation for current session..."
                                 />
                                 <div className="flex justify-between items-center">
                                     <div className="flex gap-2">
                                         {['Counseling', 'Intervention', 'VAS'].map(cat => (
                                             <button 
                                                 key={cat}
                                                 onClick={() => setNoteCategory(cat as any)}
                                                 className={`text-[8px] font-black px-1.5 py-0.5 border uppercase ${noteCategory === cat ? 'bg-green-600 text-white border-green-700' : 'bg-white text-slate-400 border-slate-200'}`}
                                             >
                                                 {cat}
                                             </button>
                                         ))}
                                     </div>
                                     <button 
                                         onClick={() => setIsLogSaved(true)}
                                         className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase transition-all border-b-2 ${clinicalSessionNote ? 'bg-secondary text-white border-secondary hover:brightness-110' : 'bg-slate-100 text-slate-300 border-slate-200'}`}
                                         disabled={!clinicalSessionNote}
                                     >
                                         <Save size={14}/> Save Log
                                     </button>
                                 </div>
                             </div>
                        </div>

                    </div>
                </div>
             </div>
          </div>
        );
      case WorkflowStage.PAYMENT:
        const vasTotal = vasServices.reduce((sum, id) => {
          const service = STANDARD_VAS.find(s => s.id === id);
          return sum + (service?.price || 0);
        }, 0);
        
        const medCoPayVal = coPaymentInfo?.coPay || 0;
        const medGrossVal = coPaymentInfo?.gross || 0;
        const medSubsidyVal = coPaymentInfo?.subsidy || 0;
        const finalPayable = medCoPayVal + vasTotal;

        return (
          <div className="max-w-2xl mx-auto py-4">
            <div className="bg-white border border-slate-300 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="bg-[#451a03] p-10 text-white text-center">
                    <p className="text-[12px] font-bold uppercase opacity-70 tracking-[0.2em] mb-4">TOTAL COLLECTION REQUIRED</p>
                    <h2 className="text-7xl font-black tabular-nums tracking-tighter">${finalPayable.toFixed(2)}</h2>
                    <p className="text-[12px] font-bold text-orange-400 mt-4 uppercase tracking-[0.1em]">INCLUDES ${vasTotal.toFixed(2)} SERVICE FEES</p>
                </div>

                <div className="p-10 space-y-10">
                  <div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-6">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">STANDARD VALUE-ADDED SERVICES (PHCC)</p>
                        <span className="text-[10px] font-bold text-slate-400 italic">Self-Financed Add-ons</span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-1">
                      {STANDARD_VAS.map(s => {
                          const isSelected = vasServices.includes(s.id);
                          return (
                            <label key={s.id} className={`flex items-start justify-between p-4 transition-all cursor-pointer border ${isSelected ? 'bg-orange-50 border-primary shadow-sm' : 'bg-[#f8fafc] border-[#f1f5f9] hover:bg-slate-100'}`}>
                                <div className="flex items-start gap-4 flex-1 min-w-0 pr-4">
                                  <div className={`w-5 h-5 flex items-center justify-center shrink-0 border-2 mt-0.5 ${isSelected ? 'bg-primary border-primary' : 'bg-slate-800 border-slate-800'}`}>
                                    {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
                                  </div>
                                  <input 
                                    type="checkbox" 
                                    checked={isSelected} 
                                    onChange={e => e.target.checked ? setVasServices([...vasServices, s.id]) : setVasServices(vasServices.filter(x => x !== s.id))} 
                                    className="hidden" 
                                  />
                                  <span className={`text-[12px] font-black uppercase leading-tight whitespace-normal ${isSelected ? 'text-primary' : 'text-slate-600'}`}>{s.name}</span>
                                </div>
                                <span className={`text-[12px] font-black tabular-nums shrink-0 mt-0.5 ${s.price === 0 ? 'text-green-600' : 'text-slate-500'}`}>
                                  {s.price === 0 ? 'FREE' : `$${s.price.toFixed(2)}`}
                                </span>
                            </label>
                          );
                      })}
                    </div>
                  </div>
                  
                  <div>
                    <div className="bg-[#f0f4f8] p-8 space-y-4 rounded-none shadow-inner border border-slate-100">
                       <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-3 mb-6">CALCULATION BREAKDOWN</h5>
                       
                       <div className="flex justify-between items-center text-[12px] font-bold uppercase text-slate-500">
                          <span>MEDICATION GROSS:</span>
                          <span className="text-slate-700 font-black">${medGrossVal.toFixed(2)}</span>
                       </div>
                       
                       <div className="flex justify-between items-center text-[12px] font-bold uppercase text-red-500">
                          <span>GOVERNMENT SUBSIDY:</span>
                          <span className="font-black">-${medSubsidyVal.toFixed(2)}</span>
                       </div>
                       
                       <div className="flex justify-between items-center text-[12px] font-bold uppercase pt-2 text-secondary border-t border-slate-200">
                          <span>NET MEDICATION CO-PAY:</span>
                          <span className="font-black">${medCoPayVal.toFixed(2)}</span>
                       </div>
                       
                       <div className="flex justify-between items-center text-[12px] font-bold uppercase text-primary">
                          <span>SELECTED SERVICE FEES:</span>
                          <span className="font-black">+${vasTotal.toFixed(2)}</span>
                       </div>
                       
                       <div className="flex justify-between items-center text-[14px] border-t-2 border-[#451a03] pt-4 mt-6">
                          <span className="text-[#451a03] font-black uppercase tracking-widest">TOTAL PAYABLE:</span>
                          <span className="text-[#451a03] font-black tabular-nums text-2xl">${finalPayable.toFixed(2)}</span>
                       </div>
                    </div>

                    <button 
                      onClick={handleFinalSubmitAndPayment} 
                      disabled={loading} 
                      className="w-full bg-success text-white py-6 rounded-none font-black text-lg uppercase border-b-4 border-green-800 shadow-xl transition-all hover:brightness-105 active:translate-y-1 flex items-center justify-center gap-4 mt-10"
                    >
                        {loading ? <Loader2 className="animate-spin" size={24} /> : <><CheckCircle2 size={24}/> CONFIRM & CLOSE SESSION <span className="opacity-60 ml-2 text-[12px] font-mono">[OPT+S]</span></>}
                    </button>
                  </div>
                </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  const clinical = patient?.clinicalSummary;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="bg-[#f8fafc] border-b border-slate-300 px-4 py-2 flex items-center justify-between sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-200 text-slate-500 transition-colors" title={`Back [${mod}+Backspace] or [${mod}+ArrowLeft]`}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-sm font-bold text-secondary uppercase tracking-tight leading-none mb-1">
              {patient?.name} {patient?.nameCn && <span className="opacity-50 font-medium">({patient.nameCn})</span>}
            </h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                {patient?.icType}: {patient ? maskHkid(patient.hkid) : '---'} | ID: {patient?.internalId || '---'} | DOB: {patient?.dob || '--'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setShowEhr(!showEhr)} className={`px-3 py-1 border text-[9px] font-bold uppercase transition-all rounded-none ${showEhr ? 'bg-green-600 text-white border-green-700 shadow-inner' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 shadow-sm'}`}>
                {showEhr ? 'CLOSE eHRSS PORTAL' : 'VIEW eHEALTH CLINICAL DATA'}
                <span className="opacity-60 ml-1">[{mod}+H]</span>
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex relative">
          <div className="flex-1 overflow-y-auto p-0 bg-[#f8fafc]">
            {renderContent()}
          </div>
          
          {patient && !processCompleted && showEhr && (
            <div className="w-[85%] border-l border-slate-400 bg-white flex flex-col h-full z-50 overflow-hidden font-sans rounded-none shadow-2xl transition-all">
                <div className="bg-[#f0f0f0] border-b border-slate-400 px-2 py-1 flex items-center gap-3">
                    <HomeIcon size={12} className="text-slate-600"/>
                    <div className="h-4 w-px bg-slate-300"></div>
                    <div className="flex gap-3 text-[9px] font-bold text-slate-600">
                        {['Clinical', 'Administration', 'Standards', 'Download', 'Information'].map(tab => (
                            <span key={tab} className="hover:bg-slate-300 px-1 cursor-pointer uppercase tracking-tighter transition-colors">{tab}</span>
                        ))}
                    </div>
                </div>

                <div className="bg-white border-b border-slate-400 px-3 py-1.5 flex flex-wrap items-end justify-between gap-y-1">
                    <div className="flex items-center gap-2">
                         <div className="bg-slate-100 p-1">
                            <User size={28} className="text-slate-400"/>
                         </div>
                         <div>
                             <h3 className="text-sm font-bold text-[#2d4b24] uppercase leading-none mb-1.5">{patient.name}</h3>
                             <div className="flex gap-3 text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                                 <span>HKIC No. : <span className="text-black font-bold">{patient.hkicNum || maskHkid(patient.hkid)}</span></span>
                                 <span>EHR No. : <span className="text-black font-bold">{patient.ehrNo}</span></span>
                                 <span>DOB : <span className="text-black font-bold">{patient.dob}</span></span>
                                 <span>Sex : <span className="text-black font-bold">{patient.sex}</span></span>
                             </div>
                         </div>
                    </div>
                    <div className="flex gap-0.5">
                        <button className="bg-[#4a6ba1] text-white text-[8px] font-bold px-2 py-0.5 uppercase shadow-sm">Allergy & ADR</button>
                        <button className="bg-[#4a6ba1] text-white text-[8px] font-bold px-2 py-0.5 uppercase shadow-sm">Select Patient</button>
                        <button className="bg-red-700 text-white text-[8px] font-bold px-2 py-0.5 uppercase shadow-sm">Close Record</button>
                    </div>
                </div>

                <div className="flex-1 bg-[#efefef] p-1.5 overflow-y-auto">
                    <div className="flex gap-2 h-full">
                        <div className="w-44 flex flex-col gap-px text-[9px] font-bold text-white shrink-0">
                            <div className="bg-[#5e9a4a] p-1.5 flex items-center gap-1.5 uppercase tracking-tighter">
                                <Activity size={10}/> 醫健通 eHealth
                            </div>
                            <div className="bg-white text-success border border-slate-400 p-1 flex justify-between items-center text-[8px] mb-0.5">
                                <span>ALL LOCAL NON-LOCAL</span>
                                <Info size={10}/>
                            </div>
                            <div className="bg-[#789e69] p-1 uppercase tracking-tighter border-b border-white/20">Clinical Summary</div>
                            <div className="bg-[#789e69] p-1 uppercase tracking-tighter border-b border-white/20">Clinical Note</div>
                            <div className="bg-[#789e69] p-1 uppercase tracking-tighter border-b border-white/20">Encounter history</div>
                            <div className="bg-[#5e9a4a] p-1 uppercase tracking-tighter border-b border-white/20">Medication</div>
                            <div className="bg-[#99b98c] p-1 text-[#2d4b24] ml-2 font-bold italic underline border-b border-black/5 uppercase tracking-tighter">Prescribing History</div>
                            <div className="bg-[#99b98c] p-1 text-[#2d4b24] ml-2 uppercase tracking-tighter">Dispensing History</div>
                            <div className="bg-[#789e69] p-1 uppercase tracking-tighter">Laboratory Record</div>
                        </div>

                        <div className="flex-1 space-y-1.5">
                            <div className="bg-slate-200 p-1 text-[8px] font-bold uppercase text-slate-500 tracking-widest border border-slate-300">
                                Personnel in-charge: Dr. John Smith (Project Leader) / Lead Pharmacist: Dr. Wong
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <EHRWidget title="Problem / Diagnosis" columns={['Date', 'Description']} data={clinical?.problems || []} />
                                <EHRWidget title="Allergy & ADR" columns={['Allergen', 'Agent', 'Info']} data={clinical?.allergies || []} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <EHRWidget title="Laboratory Record" columns={['Date', 'Profile Description', 'Institution']} data={clinical?.labs || []} />
                                <EHRWidget title="Encounter / Appointment" columns={['Start Date', 'Specialty', 'HCP']} data={clinical?.encounters || []} />
                            </div>
                            <EHRWidget 
                              title="Medication - Prescribing History (9.2.1 Record Spec)" 
                              columns={['DateTime', 'Order #', 'Prescribing Institution', 'Prescriber', 'Medications']} 
                              data={clinical?.prescribingHistory.map(rec => ({
                                date: rec.prescriptionDatetime,
                                order: rec.prescriptionOrderNumber,
                                institution: { ID: rec.prescribingInstitution.id, Name: rec.prescribingInstitution.longName, Local: rec.prescribingInstitution.localName },
                                prescriber: { 
                                  ID: rec.prescriber.id, 
                                  NameEn: `${rec.prescriber.prefix} ${rec.prescriber.fullName}`,
                                  Given: rec.prescriber.givenName,
                                  NameCn: rec.prescriber.chineseFullName,
                                  Suffix: rec.prescriber.chineseNameSuffix
                                },
                                medications: rec.medications
                              })) || []} 
                            />
                        </div>
                    </div>
                </div>
            </div>
          )}
      </div>
    </div>
  );
};