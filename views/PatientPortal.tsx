import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Calendar, CheckCircle2, ChevronRight, ArrowLeft, 
  Loader2, Pill, ShieldCheck, HeartPulse, Microscope, 
  GraduationCap, Smoking, Sparkles, Smartphone, MapPin, 
  Clock, Check, Languages, Edit3, UserRound, ArrowRight
} from 'lucide-react';
import { MOCK_GOV_PRESCRIPTIONS, delay } from '../mockData';
import { GovPrescription, maskHkid } from '../types';

type Language = 'ZH' | 'EN';

const TRANSLATIONS = {
  ZH: {
    portalTitle: '明心大藥房',
    portalSubTitle: '社區藥房服務預約系統',
    findRx: '查詢處方紀錄',
    findRxSub: '請輸入您在醫健通(eHealth)登記的身份證明資料。',
    hkidLabel: '身份證號碼 (HKID)',
    orderRefLabel: '處方參考編號',
    locateBtn: '搜尋紀錄',
    demoAccounts: '系統示範帳戶',
    newBookingDemo: '新預約 (未處理)',
    editBookingDemo: '更改預約 (已預約)',
    rxFound: '已找到處方',
    rxVerifySub: '請核對您的處方資料。',
    existingBookingFound: '現有預約紀錄',
    existingBookingSub: '您目前已有預約。如需更改領取安排或服務，請點擊下方按鈕。',
    patientName: '病人姓名',
    readyForCollection: '可供領取',
    alreadyBooked: '已預約',
    issuedBy: '簽發機構',
    issueDate: '簽發日期',
    includedMeds: '處方藥物項目',
    back: '返回',
    continue: '確認並繼續',
    modifyBtn: '更改預約內容',
    pickupSchedule: '預約日期及時間',
    pickupScheduleSub: '請選擇到本藥房領取藥物的日期。',
    chooseTime: '選擇領取時間',
    chooseTimeSub: '請選擇一個預約時段。',
    pharmacyLocation: '藥房地址',
    locationText: '九龍觀塘海濱道163號1樓 明心大藥房',
    selectServices: '選擇增值服務',
    enhanceCare: '專業藥劑服務',
    enhanceCareSub: '您可以預約領藥時同時使用以下由專業藥劑師提供的增值服務。',
    free: '免費',
    summary: '預約總結',
    reviewBooking: '核對預約資料',
    reviewBookingSub: '請在確認前核對您的最後領藥安排。',
    scheduledPickup: '預約領藥日期',
    timeSlot: '預約時段',
    timeSlotLabel: '預約時間',
    additionalServices: '已選增值服務',
    noAdditionalServices: '未選擇增值服務。',
    estimatedPayable: '預計支付金額',
    inclCopay: '包括 $20 藥物行政費',
    confirmBooking: '確認預約',
    updateBooking: '更新預約',
    changeServices: '更改服務',
    bookingConfirmed: '預約成功',
    bookingConfirmedSub: '您的領藥時段已成功預留。',
    bookingId: '預約編號',
    done: '完成',
    modifyBooking: '更改預約內容',
    smsNotice: '確認短訊已發送到您的手機。',
    secureAccess: '安全存取',
    professionalCare: '專業護理',
    footerNote: '明心大藥房為社區藥房計劃(CPP)參與藥房。所有預約需經過醫健通核實。',
    steps: {
      search: '搜尋',
      schedule: '排期',
      vas: '服務',
      summary: '總結'
    }
  },
  EN: {
    portalTitle: 'ActiveCare Pharmacy',
    portalSubTitle: 'Self-Service Booking Portal',
    findRx: 'Find Your Prescription',
    findRxSub: 'Enter your identity details as provided on your eHealth record.',
    hkidLabel: 'Identity Number (HKID)',
    orderRefLabel: 'Prescription Reference',
    locateBtn: 'Locate Record',
    demoAccounts: 'Demo Accounts',
    newBookingDemo: 'New Booking (Unbooked)',
    editBookingDemo: 'Edit Booking (Already Booked)',
    rxFound: 'Prescription Found',
    rxVerifySub: 'Please verify your details below.',
    existingBookingFound: 'Existing Booking Found',
    existingBookingSub: 'You already have an appointment. To modify your pickup details or services, click the button below.',
    patientName: 'Patient Name',
    readyForCollection: 'Ready for Collection',
    alreadyBooked: 'Already Booked',
    issuedBy: 'Issued By',
    issueDate: 'Issue Date',
    includedMeds: 'Included Medications',
    back: 'Back',
    continue: 'Confirm & Continue',
    modifyBtn: 'Modify Booking',
    pickupSchedule: 'Schedule Date & Time',
    pickupScheduleSub: 'Select a date to collect your medication from our pharmacy.',
    chooseTime: 'Select Collection Time',
    chooseTimeSub: 'Please select a specific time slot for your visit.',
    pharmacyLocation: 'Pharmacy Location',
    locationText: 'Ming Sum Pharmacy, 163 Hoi Bun Rd, Kwun Tong',
    selectServices: 'Select Services',
    enhanceCare: 'Enhance Your Care',
    enhanceCareSub: 'Select professional pharmacist services to add to your collection visit.',
    free: 'FREE',
    summary: 'Summary',
    reviewBooking: 'Review Booking',
    reviewBookingSub: 'Verify your final collection details before confirming.',
    scheduledPickup: 'Scheduled Pickup',
    timeSlot: 'Time Slot',
    timeSlotLabel: 'Appointment Time',
    additionalServices: 'Additional Services',
    noAdditionalServices: 'No additional services selected.',
    estimatedPayable: 'Estimated Payable',
    inclCopay: 'Incl. $20 co-pay',
    confirmBooking: 'Confirm Booking',
    updateBooking: 'Update Booking',
    changeServices: 'Change Services',
    bookingConfirmed: 'Booking Confirmed',
    bookingConfirmedSub: 'Your collection slot has been reserved successfully.',
    bookingId: 'Booking ID',
    done: 'Done',
    modifyBooking: 'Modify Booking',
    smsNotice: 'A confirmation SMS has been sent to your mobile.',
    secureAccess: 'Secure Access',
    professionalCare: 'Professional Care',
    footerNote: 'ActiveCare Pharmacy is a participant of the Community Pharmacy Programme. All bookings subject to eHealth verification.',
    steps: {
      search: 'Search',
      schedule: 'Schedule',
      vas: 'Services',
      summary: 'Summary'
    }
  }
};

const STANDARD_VAS = [
  { 
    id: 'mms', 
    name: { ZH: '藥物管理服務 (MMS)', EN: 'Medication Management Service (MMS)' },
    price: 100, 
    icon: Microscope,
    description: { 
      ZH: '由合資格藥劑師全面檢視您的用藥情況，確保用藥安全及成效。', 
      EN: 'Comprehensive review of your medication by a pharmacist to ensure safety and effectiveness.' 
    }
  },
  { 
    id: 'smoking', 
    name: { ZH: '戒煙諮詢服務', EN: 'Smoking Cessation Service' },
    price: 100, 
    icon: HeartPulse,
    description: { 
      ZH: '專業藥劑師提供的戒煙支援及指導，助您成功戒除煙癮。', 
      EN: 'Professional support and guidance to help you quit smoking successfully.' 
    }
  },
  { 
    id: 'chronic', 
    name: { ZH: '慢性疾病管理', EN: 'Chronic Disease Management' },
    price: 100, 
    icon: GraduationCap,
    description: { 
      ZH: '針對高血壓或糖尿病等長期病患提供的專業支援及衛教。', 
      EN: 'Targeted support for managing long-term conditions like Hypertension or Diabetes.' 
    }
  },
  { 
    id: 'oral', 
    name: { ZH: '口腔健康推廣', EN: 'Oral Health Promotion' },
    price: 100, 
    icon: Sparkles,
    description: { 
      ZH: '口腔衛生預防護理及教育，助您維持良好的義齒健康。', 
      EN: 'Preventive care and education for maintaining excellent oral hygiene.' 
    }
  }
];

type BookingStep = 'search' | 'verify' | 'schedule' | 'vas' | 'summary' | 'confirmed';

export const PatientPortal: React.FC = () => {
  const [lang, setLang] = useState<Language>('ZH');
  const [step, setStep] = useState<BookingStep>('search');
  const [hkid, setHkid] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundRx, setFoundRx] = useState<GovPrescription | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedVas, setSelectedVas] = useState<string[]>([]);

  const bookingInterval = useMemo(() => {
    return parseInt(localStorage.getItem('cph_booking_interval') || '15');
  }, []);

  const t = TRANSLATIONS[lang];

  const isEditingExisting = useMemo(() => {
    return foundRx?.bookingStatus === 'BOOKED' || !!foundRx?.collectionDate;
  }, [foundRx]);

  const handleSearch = async (preFilledHkid?: string, preFilledOrderId?: string) => {
    setLoading(true);
    await delay(1000);
    const searchHkid = preFilledHkid || hkid;
    const searchOrderId = preFilledOrderId || orderId;

    if (searchHkid.length >= 4 && (searchOrderId.length >= 4 || preFilledOrderId)) {
      const rx = MOCK_GOV_PRESCRIPTIONS.find(r => r.patientHkid === searchHkid || r.id === searchOrderId) || MOCK_GOV_PRESCRIPTIONS[0];
      setFoundRx(rx);
      
      if (rx.collectionDate) {
        setSelectedDate(rx.collectionDate);
        setSelectedTime('10:00'); 
      } else {
        setSelectedDate('');
        setSelectedTime('');
      }
      if (rx.selectedVas) {
        setSelectedVas(rx.selectedVas);
      } else {
        setSelectedVas([]);
      }
      
      setStep('verify');
    } else {
      alert(lang === 'ZH' ? "請輸入有效的身份證及參考編號" : "Please enter valid credentials");
    }
    setLoading(false);
  };

  const handleConfirmRx = () => setStep('schedule');
  const handleConfirmDate = () => {
    if (!selectedDate || !selectedTime) {
      alert(lang === 'ZH' ? "請選擇預約日期及時間。" : "Please select both a collection date and time.");
      return;
    }
    setStep('vas');
  };

  const toggleVas = (id: string) => {
    setSelectedVas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleConfirmVas = () => setStep('summary');

  const handleFinalBooking = async () => {
    setLoading(true);
    await delay(1500);
    setStep('confirmed');
    setLoading(false);
  };

  const nextFortnight = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() !== 0) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    return dates;
  }, []);

  const timeSlots = useMemo(() => {
    const slots = [];
    const startHour = 9;
    const endHour = 19;
    
    let currentTotalMinutes = startHour * 60;
    const endTotalMinutes = endHour * 60;

    while (currentTotalMinutes < endTotalMinutes) {
      const h = Math.floor(currentTotalMinutes / 60);
      const m = currentTotalMinutes % 60;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      currentTotalMinutes += bookingInterval;
    }
    return slots;
  }, [bookingInterval]);

  const totalVasPrice = useMemo(() => {
    return selectedVas.reduce((sum, id) => {
      const service = STANDARD_VAS.find(s => s.id === id);
      return sum + (service?.price || 0);
    }, 0);
  }, [selectedVas]);

  const renderProgress = () => {
    const stepsArr: BookingStep[] = ['search', 'schedule', 'vas', 'summary'];
    const currentIdx = stepsArr.indexOf(step === 'verify' ? 'search' : step === 'confirmed' ? 'summary' : step);
    
    return (
      <div className="flex items-center justify-between mb-8 px-4">
        {stepsArr.map((s, idx) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                idx <= currentIdx ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-300'
              }`}>
                {idx < currentIdx ? <Check size={14} strokeWidth={4}/> : idx + 1}
              </div>
              <span className={`text-[9px] font-black uppercase mt-2 tracking-widest ${idx <= currentIdx ? 'text-primary' : 'text-slate-300'}`}>
                {(t.steps as any)[s]}
              </span>
            </div>
            {idx < stepsArr.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 -mt-6 ${idx < currentIdx ? 'bg-primary' : 'bg-slate-100'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const demoRecords = useMemo(() => {
    const unbooked = MOCK_GOV_PRESCRIPTIONS.find(p => p.bookingStatus === 'UNBOOKED') || MOCK_GOV_PRESCRIPTIONS[1];
    const booked = MOCK_GOV_PRESCRIPTIONS.find(p => p.bookingStatus === 'BOOKED') || MOCK_GOV_PRESCRIPTIONS[0];
    return { unbooked, booked };
  }, []);

  return (
    <div className="min-h-full bg-white font-sans text-slate-900 overflow-x-hidden">
      <div className="bg-primary text-white px-6 py-8 md:py-12 flex flex-col items-center text-center relative">
        <button 
          onClick={() => setLang(lang === 'ZH' ? 'EN' : 'ZH')}
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 px-3 py-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all border border-white/30"
        >
          <Languages size={14} />
          {lang === 'ZH' ? 'English' : '繁體中文'}
        </button>
        <HeartPulse size={48} className="mb-4 opacity-90" />
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-none mb-2">{t.portalTitle}</h1>
        <p className="text-sm md:text-base font-bold text-orange-100 uppercase tracking-widest">{t.portalSubTitle}</p>
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-8 pb-20">
        <div className="bg-white rounded-none border border-slate-200 shadow-2xl overflow-hidden p-8 md:p-12">
          
          {step !== 'confirmed' && renderProgress()}

          {step === 'search' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="text-center">
                <h2 className="text-xl font-black uppercase text-secondary mb-2">{t.findRx}</h2>
                <p className="text-sm text-slate-500 font-medium">{t.findRxSub}</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.hkidLabel}</label>
                  <input 
                    type="text" 
                    placeholder="e.g. D123456(7)" 
                    value={hkid}
                    onChange={e => setHkid(e.target.value.toUpperCase())}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 focus:border-primary outline-none text-lg font-black transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.orderRefLabel}</label>
                  <input 
                    type="text" 
                    placeholder="e.g. RX-GOV-XXXX" 
                    value={orderId}
                    onChange={e => setOrderId(e.target.value.toUpperCase())}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 focus:border-primary outline-none text-lg font-black transition-all"
                  />
                </div>
                <button 
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="w-full bg-secondary text-white py-5 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95 shadow-xl border-b-4 border-black"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Search size={20} strokeWidth={3} />}
                  {t.locateBtn}
                </button>
              </div>

              <div className="pt-8 border-t border-slate-100">
                <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                  <UserRound size={12}/> {t.demoAccounts}
                </p>
                <div className="flex flex-col md:flex-row gap-3">
                  <button 
                    onClick={() => {
                      setHkid(demoRecords.unbooked.patientHkid);
                      setOrderId(demoRecords.unbooked.id);
                      handleSearch(demoRecords.unbooked.patientHkid, demoRecords.unbooked.id);
                    }}
                    className="flex-1 p-4 border border-slate-200 hover:border-primary hover:bg-orange-50 transition-all group text-left relative overflow-hidden"
                  >
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight size={14} className="text-primary" />
                    </div>
                    <p className="text-[9px] font-black text-slate-400 group-hover:text-primary uppercase tracking-tighter mb-1">{t.newBookingDemo}</p>
                    <p className="text-xs font-black text-secondary uppercase leading-none mb-1">{demoRecords.unbooked.patientName}</p>
                    <p className="text-[10px] font-mono text-slate-400">Rx: {demoRecords.unbooked.id}</p>
                  </button>
                  <button 
                    onClick={() => {
                      setHkid(demoRecords.booked.patientHkid);
                      setOrderId(demoRecords.booked.id);
                      handleSearch(demoRecords.booked.patientHkid, demoRecords.booked.id);
                    }}
                    className="flex-1 p-4 border border-slate-200 hover:border-primary hover:bg-orange-50 transition-all group text-left relative overflow-hidden"
                  >
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight size={14} className="text-primary" />
                    </div>
                    <p className="text-[9px] font-black text-slate-400 group-hover:text-primary uppercase tracking-tighter mb-1">{t.editBookingDemo}</p>
                    <p className="text-xs font-black text-secondary uppercase leading-none mb-1">{demoRecords.booked.patientName}</p>
                    <p className="text-[10px] font-mono text-slate-400">Rx: {demoRecords.booked.id}</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'verify' && foundRx && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
               <div className="text-center">
                <h2 className="text-xl font-black uppercase text-secondary mb-2">
                  {isEditingExisting ? t.existingBookingFound : t.rxFound}
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  {isEditingExisting ? t.existingBookingSub : t.rxVerifySub}
                </p>
              </div>

              <div className="bg-[#f0f9ff] border-2 border-blue-100 p-6 space-y-4">
                 <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{t.patientName}</p>
                       <p className="text-lg font-black text-secondary uppercase truncate">{foundRx.patientName}</p>
                    </div>
                    <div className="text-right shrink-0">
                       <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter text-white ${isEditingExisting ? 'bg-orange-600' : 'bg-blue-600'}`}>
                         {isEditingExisting ? t.alreadyBooked : t.readyForCollection}
                       </span>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-50">
                    <div className="min-w-0">
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{t.issuedBy}</p>
                       <p className="text-xs font-black text-secondary uppercase truncate">{foundRx.hospital}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{t.issueDate}</p>
                       <p className="text-xs font-black text-secondary">{foundRx.issueDate}</p>
                    </div>
                 </div>
              </div>

              <div className="space-y-3">
                 <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">{t.includedMeds}</p>
                 {foundRx.medications.map((med, i) => (
                   <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-100">
                      <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-primary shrink-0">
                         <Pill size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                         <p className="text-xs font-black text-secondary uppercase leading-none truncate">{med.name}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{med.dosageValue} {med.dosageUnit} • {med.frequencyCode}</p>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="flex gap-4">
                 <button onClick={() => setStep('search')} className="flex-1 py-4 border-2 border-slate-100 font-black uppercase text-xs text-slate-400 hover:bg-slate-50">{t.back}</button>
                 <button onClick={handleConfirmRx} className="flex-[2] py-4 bg-primary text-white font-black uppercase text-xs shadow-lg border-b-4 border-orange-700 active:translate-y-1 active:border-b-0">
                   {isEditingExisting ? t.modifyBtn : t.continue}
                 </button>
              </div>
            </div>
          )}

          {step === 'schedule' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
               <div className="text-center">
                <h2 className="text-xl font-black uppercase text-secondary mb-2">{t.pickupSchedule}</h2>
                <p className="text-sm text-slate-500 font-medium">{t.pickupScheduleSub}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                 {nextFortnight.map(date => {
                   const d = new Date(date);
                   const isSelected = selectedDate === date;
                   return (
                     <button 
                       key={date}
                       onClick={() => setSelectedDate(date)}
                       className={`p-4 border-2 transition-all flex flex-col items-center ${isSelected ? 'bg-primary border-primary text-white shadow-lg scale-105 z-10' : 'bg-white border-slate-100 text-slate-500 hover:border-orange-200'}`}
                     >
                       <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                         {d.toLocaleDateString(lang === 'ZH' ? 'zh-HK' : 'en-GB', { weekday: 'short' })}
                       </span>
                       <span className="text-2xl font-black leading-none">{d.getDate()}</span>
                       <span className="text-[10px] font-black uppercase tracking-widest mt-1">
                         {d.toLocaleDateString(lang === 'ZH' ? 'zh-HK' : 'en-GB', { month: 'short' })}
                       </span>
                     </button>
                   );
                 })}
              </div>

              {selectedDate && (
                <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                   <div className="text-center border-t border-slate-100 pt-6">
                    <h3 className="text-lg font-black uppercase text-secondary mb-2">{t.chooseTime}</h3>
                    <p className="text-xs text-slate-500 font-medium">{t.chooseTimeSub}</p>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-100">
                    {timeSlots.map(time => {
                      const isSelected = selectedTime === time;
                      return (
                        <button 
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`p-2 border-2 text-xs font-black transition-all ${isSelected ? 'bg-secondary text-white border-secondary shadow-md' : 'bg-white border-slate-100 text-slate-500 hover:border-primary/30'}`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-slate-50 p-4 flex items-center gap-4">
                 <div className="w-10 h-10 bg-white border border-slate-200 flex items-center justify-center text-primary shrink-0">
                    <MapPin size={20} strokeWidth={3}/>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.pharmacyLocation}</p>
                    <p className="text-xs font-black text-secondary uppercase">{t.locationText}</p>
                 </div>
              </div>

              <div className="flex gap-4">
                 <button onClick={() => setStep('verify')} className="flex-1 py-4 border-2 border-slate-100 font-black uppercase text-xs text-slate-400 hover:bg-slate-50">{t.back}</button>
                 <button 
                  onClick={handleConfirmDate} 
                  disabled={!selectedDate || !selectedTime}
                  className="flex-[2] py-4 bg-primary text-white font-black uppercase text-xs shadow-lg border-b-4 border-orange-700 active:translate-y-1 active:border-b-0 disabled:opacity-30 disabled:border-slate-300"
                 >
                    {t.selectServices}
                 </button>
              </div>
            </div>
          )}

          {step === 'vas' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
               <div className="text-center">
                <h2 className="text-xl font-black uppercase text-secondary mb-2">{t.enhanceCare}</h2>
                <p className="text-sm text-slate-500 font-medium">{t.enhanceCareSub}</p>
              </div>

              <div className="space-y-3">
                 {STANDARD_VAS.map(s => {
                   const active = selectedVas.includes(s.id);
                   const Icon = s.icon;
                   return (
                     <button 
                       key={s.id}
                       onClick={() => toggleVas(s.id)}
                       className={`w-full text-left p-5 border-2 transition-all flex items-start gap-4 relative group ${active ? 'bg-orange-50 border-primary shadow-md' : 'bg-white border-slate-100 hover:border-orange-200'}`}
                     >
                        <div className={`w-12 h-12 flex items-center justify-center shrink-0 border-2 ${active ? 'bg-primary border-primary text-white' : 'bg-slate-50 border-slate-100 text-slate-400 group-hover:text-primary'}`}>
                           <Icon size={24} strokeWidth={2.5}/>
                        </div>
                        <div className="flex-1 min-w-0 pr-10">
                           <div className="flex justify-between items-start mb-1 gap-4">
                              <h3 className={`text-[13px] font-black uppercase tracking-tight leading-tight ${active ? 'text-primary' : 'text-secondary'}`}>{s.name[lang]}</h3>
                              <span className={`text-sm font-black tabular-nums shrink-0 ${s.price === 0 ? 'text-success' : (active ? 'text-primary' : 'text-slate-400')}`}>
                                {s.price === 0 ? t.free : `$${s.price.toFixed(2)}`}
                              </span>
                           </div>
                           <p className="text-[11px] text-slate-500 leading-snug font-medium">{s.description[lang]}</p>
                        </div>
                        <div className={`absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 border-2 flex items-center justify-center transition-all ${active ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-transparent'}`}>
                           <Check size={16} strokeWidth={4}/>
                        </div>
                     </button>
                   );
                 })}
              </div>

              <div className="flex gap-4">
                 <button onClick={() => setStep('schedule')} className="flex-1 py-4 border-2 border-slate-100 font-black uppercase text-xs text-slate-400 hover:bg-slate-50">{t.back}</button>
                 <button onClick={handleConfirmVas} className="flex-[2] py-4 bg-primary text-white font-black uppercase text-xs shadow-lg border-b-4 border-orange-700 active:translate-y-1 active:border-b-0">{t.summary}</button>
              </div>
            </div>
          )}

          {step === 'summary' && foundRx && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
               <div className="text-center">
                <h2 className="text-xl font-black uppercase text-secondary mb-2">{t.reviewBooking}</h2>
                <p className="text-sm text-slate-500 font-medium">{t.reviewBookingSub}</p>
              </div>

              <div className="space-y-4">
                 <div className="bg-slate-50 p-6 space-y-6">
                    <div className="flex items-center gap-4">
                       <Calendar size={24} className="text-primary shrink-0" />
                       <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.scheduledPickup}</p>
                          <p className="text-lg font-black text-secondary uppercase truncate">
                            {new Date(selectedDate).toLocaleDateString(lang === 'ZH' ? 'zh-HK' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                       <Clock size={24} className="text-primary shrink-0" />
                       <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.timeSlotLabel}</p>
                          <p className="text-lg font-black text-secondary uppercase">{selectedTime}</p>
                       </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t.additionalServices}</p>
                       <div className="space-y-2">
                          {selectedVas.length > 0 ? selectedVas.map(id => (
                            <div key={id} className="flex justify-between items-center bg-white border border-slate-200 p-3 gap-4">
                               <span className="text-xs font-black text-secondary uppercase flex-1 truncate">
                                  {STANDARD_VAS.find(s => s.id === id)?.name[lang]}
                               </span>
                               <span className="text-xs font-black text-primary shrink-0">
                                  ${STANDARD_VAS.find(s => s.id === id)?.price.toFixed(2)}
                               </span>
                            </div>
                          )) : (
                            <p className="text-xs font-bold text-slate-300 italic">{t.noAdditionalServices}</p>
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="bg-secondary p-6 text-white flex justify-between items-center shadow-xl">
                    <p className="text-[12px] font-black uppercase tracking-[0.2em] opacity-60">{t.estimatedPayable}</p>
                    <div className="text-right shrink-0">
                       <p className="text-3xl font-black tabular-nums tracking-tighter">${(totalVasPrice + 20).toFixed(2)}</p>
                       <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">{t.inclCopay}</p>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col gap-4">
                 <button 
                  onClick={handleFinalBooking} 
                  disabled={loading}
                  className="w-full bg-primary text-white py-6 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-2xl border-b-4 border-orange-700 active:translate-y-1 active:border-b-0"
                 >
                    {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={24} strokeWidth={3} />}
                    {isEditingExisting ? t.updateBooking : t.confirmBooking}
                 </button>
                 <button onClick={() => setStep('vas')} className="w-full py-4 text-xs font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">{t.changeServices}</button>
              </div>
            </div>
          )}

          {step === 'confirmed' && (
            <div className="text-center space-y-8 animate-in zoom-in-95 duration-500 py-10">
               <div className="relative mx-auto w-32 h-32">
                  <div className="absolute inset-0 bg-success/20 rounded-full animate-ping" />
                  <div className="relative bg-success text-white rounded-full w-full h-full flex items-center justify-center shadow-xl">
                     <CheckCircle2 size={64} strokeWidth={3} />
                  </div>
               </div>

               <div>
                  <h2 className="text-3xl font-black uppercase text-secondary tracking-tight mb-2">{t.bookingConfirmed}</h2>
                  <p className="text-slate-500 font-medium">{t.bookingConfirmedSub}</p>
               </div>

               <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-6 rounded-none">
                  <div className="flex justify-between items-center mb-4">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.bookingId}</span>
                     <span className="text-sm font-black text-primary font-mono">BKS-{Math.floor(Math.random()*100000)}</span>
                  </div>
                  <div className="space-y-4 text-left">
                     <div className="flex items-center gap-4">
                        <Calendar size={18} className="text-slate-400 shrink-0" />
                        <span className="text-sm font-black text-secondary uppercase">
                          {new Date(selectedDate).toLocaleDateString(lang === 'ZH' ? 'zh-HK' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} @ {selectedTime}
                        </span>
                     </div>
                     <div className="flex items-center gap-4">
                        <MapPin size={18} className="text-slate-400 shrink-0" />
                        <span className="text-sm font-black text-secondary uppercase">{t.locationText}</span>
                     </div>
                  </div>
               </div>

               <div className="pt-6 space-y-4">
                  <button onClick={() => setStep('search')} className="w-full bg-slate-100 text-slate-600 py-4 font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">{t.done}</button>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                     <Smartphone size={12} /> {t.smsNotice}
                  </p>
               </div>
            </div>
          )}

        </div>

        {step !== 'confirmed' && (
          <div className="mt-8 text-center space-y-4">
            <div className="flex items-center justify-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
               <div className="flex items-center gap-2"><ShieldCheck size={14}/> {t.secureAccess}</div>
               <div className="flex items-center gap-2"><HeartPulse size={14}/> {t.professionalCare}</div>
            </div>
            <p className="text-[10px] text-slate-300 font-bold max-w-sm mx-auto leading-relaxed">
              {t.footerNote}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};