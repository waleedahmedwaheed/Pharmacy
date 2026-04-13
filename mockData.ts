import { Patient, Appointment, WorkflowStage, Prescription, GovPrescription, MedicationDetail, MasterDirection, MasterDrug, EHRClinicalSummary, EHRPrescribingRecord, EHRPrescribingItem, ClinicalNote } from './types';

// Helper to get formatted dates relative to now
const getDateOffset = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const DEMO_DATE_STRS = {
  TODAY: getDateOffset(0),
  TOMORROW: getDateOffset(1),
  OTHER: getDateOffset(3)
};

export const MASTER_DIRECTIONS: MasterDirection[] = [
  { code: '*DIAR', translation: 'Stop if severe diarrhoea or stomach upset occurs', translationCn: '如出現嚴重腹瀉或胃部不適，請停止服用', category: 'Warning' },
  { code: '*STOM', translation: 'Stop if severe stomach upset occurs', translationCn: '如出現嚴重胃部不適，請停止服用', category: 'Warning' },
  { code: '_A', translation: 'Shake well and inhale {qty} puff(s)', translationCn: '搖勻並吸入 {qty} 次', category: 'Administration' },
  { code: '_C', translation: 'Take {qty} capsule(s)', translationCn: '每次服 {qty} 粒(膠囊)', category: 'Administration' },
  { code: '_T', translation: 'Take {qty} tablet(s)', translationCn: '每次服 {qty} 粒', category: 'Administration' },
  { code: 'BD', translation: 'twice daily', translationCn: '每日服 2 次', category: 'Timing' },
  { code: 'TDS', translation: 'three times a day', translationCn: '每日服 3 次', category: 'Timing' },
  { code: 'QID', translation: 'four times daily', translationCn: '每日服 4 次', category: 'Timing' },
  { code: 'QD', translation: 'Once daily', translationCn: '每日服 1 次', category: 'Timing' },
  { code: 'QN', translation: 'Nightly', translationCn: '每晚服用', category: 'Timing' },
  { code: 'PC', translation: 'after food', translationCn: '飯後服用', category: 'Timing' },
  { code: 'AC', translation: 'before food', translationCn: '飯前服用', category: 'Timing' },
  { code: 'PRN', translation: 'when necessary', translationCn: '需要時服用', category: 'Timing' },
  { code: 'PO', translation: 'Oral', translationCn: '口服', category: 'Administration' },
];

export const MASTER_DRUGS: MasterDrug[] = [
  { name: 'Metformin 500mg (Glucophage)', strength: '500MG', id_rpp: 'RPP-44291' },
  { name: 'Lisinopril 10mg (Zestril)', strength: '10MG', id_rpp: 'RPP-106' },
  { name: 'Amlodipine 5mg (Norvasc)', strength: '5MG', id_rpp: 'RPP-11202' },
  { name: 'Atorvastatin 20mg (Lipitor)', strength: '20MG', id_rpp: 'RPP-103' },
  { name: 'Gliclazide 80mg (Diamicron)', strength: '80MG', id_rpp: 'RPP-221' },
  { name: 'Losartan 50mg (Cozaar)', strength: '50MG', id_rpp: 'RPP-334' },
  { name: 'Simvastatin 20mg (Zocor)', strength: '20MG', id_rpp: 'RPP-401' },
  { name: 'Metoprolol 50mg (Betaloc)', strength: '50MG', id_rpp: 'RPP-552' },
  { name: 'Gabapentin 300mg (Neurontin)', strength: '300MG', id_rpp: 'RPP-882' },
  { name: 'Omeprazole 20mg (Losec)', strength: '20MG', id_rpp: 'RPP-991' },
];

export const MOCK_INVENTORY = MASTER_DRUGS.map((d, i) => ({
  id: i + 1,
  name: d.name,
  default_code: d.id_rpp || `SKU-${i}`,
  qty_available: Math.floor(Math.random() * 200),
  list_price: 15.0 + Math.random() * 30
}));

const sampleAddresses = [
  "FLAT A, 15/F, BLOCK 2, CITY ONE SHATIN, SHATIN, NT",
  "ROOM 1204, LOK WAH SOUTH ESTATE, KWUN TONG, KLN",
  "SUITE 8B, TOWER 1, THE ARCH, KOWLOON STATION, KLN",
  "HOUSE 12, MARINA COVE STAGE 1, SAI KUNG, NT",
  "FLAT 4, 3/F, WINNER BUILDING, 27 D'AGUILAR STREET, CENTRAL, HK",
  "UNIT 902, TRENDY PLAZA, 421 CASTLE PEAK ROAD, LAI CHI KOK, KLN",
  "ROOM 412, HENG ON ESTATE, MA ON SHAN, NT",
  "FLAT B, 28/F, TAIKOO SHING, QUARRY BAY, HK",
  "HOUSE 72, FAIRVIEW PARK, YUEN LONG, NT",
  "FLAT C, 12/F, LUNG POON COURT, DIAMOND HILL, KLN"
];

const sampleNotes = [
  "NO CRITICAL FLAGS REGISTERED.",
  "PATIENT REQUESTS LARGE PRINT LABELS.",
  "POOR COMPLIANCE REPORTED BY PRESCRIBER.",
  "FALL RISK - USE CAUTION WITH SEDATIVES.",
  "CHRONIC RENAL IMPAIRMENT - CHECK DOSAGES.",
  "LANGUAGE: CANTONESE ONLY.",
  "HEARING IMPAIRED - SPEAK LOUDLY.",
  "RESTRICTED MOBILITY - DELIVER TO HOME."
];

const sampleAllergies = [
  "NO KNOWN DRUG ALLERGIES REPORTED.",
  "PENICILLINS - SEVERE ANAPHYLAXIS.",
  "SULFA DRUGS - SKIN RASH.",
  "ASPIRIN - GASTRITIS / GI UPSET.",
  "CODEINE - SEVERE NOUSEA.",
  "NSAIDS - ASTHMA EXACERBATION.",
  "CONTRAST MEDIA - PREVIOUS REACTION."
];

const generateClinicalSummary = (index: number): EHRClinicalSummary => {
  const historyDrugs = MASTER_DRUGS.slice(0, 5).concat(MASTER_DRUGS.slice(5, 10));
  const records: EHRPrescribingRecord[] = [
    {
      recordKey: `RK-${8000 + index}-1`,
      episodeNumber: `EP-${8000 + index}-1`,
      attendanceInstitutionId: 'HA-UCH',
      prescriptionDatetime: '2025-10-15 10:20:00',
      prescribingInstitution: { id: 'HA-UCH', longName: 'United Christian Hospital', localName: '聯合醫院' },
      prescriptionOrderNumber: `RX-GOV-${8000 + index}A`,
      prescriber: { id: 'M1234', prefix: 'Dr.', fullName: 'Wong Ka Keung', chineseFullName: '黃家強醫生' },
      medications: historyDrugs.slice(0, 3).map(d => d.name),
      items: historyDrugs.slice(0, 3).map(d => ({ name: d.name, qty: 28, instructions: 'Take one tablet daily PO', haCode: `HA-${Math.floor(Math.random() * 90000 + 10000)}` }))
    }
  ];
  return {
    problems: [{ date: '2023-01-15', description: 'Hypertension' }],
    allergies: [{ allergen: 'Penicillins', agent: 'Amoxicillin', info: 'Skin Rash' }],
    labs: [{ date: '2025-08-20', description: 'Lipid Profile', institution: 'UCH' }],
    encounters: [{ date: '2025-10-15', specialty: 'Medical (SOPC)', hcp: 'Dr. Wong Ka Keung' }],
    prescribingHistory: records
  };
};

const surnames = ['LIN', 'LEE', 'WONG', 'CHAN', 'LAU', 'CHEUNG', 'HO', 'NG', 'TAM', 'LAM', 'CHU', 'IP', 'PANG', 'LI', 'LEUNG', 'TSANG', 'KO', 'CHUI', 'MAK', 'YU'];
const surnamesCn = ['連', '李', '黃', '陳', '劉', '張', '何', '吳', '譚', '林', '朱', '葉', '彭', '李', '梁', '曾', '高', '徐', '麥', '余'];
const firstNames = ['MAN HO', 'SIU LING', 'KA YAN', 'TAI MAN', 'CHI KEUNG', 'MEI MEI', 'SIU MING', 'WAI LUN', 'KA WAI', 'CHUN KIT', 'YEE MAN', 'HOI YAN', 'WING CHI', 'TSZ HIN', 'LOK YI', 'KWOK WAI', 'HO LAM', 'KIN FAI', 'MEI YEE', 'SHING CHI'];
const firstNamesCn = ['文豪', '小鈴', '嘉欣', '大文', '志強', '美美', '小明', '偉倫', '嘉慧', '俊傑', '綺雯', '海欣', '穎芝', '子軒', '樂兒', '國威', '皓琳', '健輝', '美儀', '誠智'];

const generateMobile = () => `6${Math.floor(Math.random() * 8999999 + 1000000)}`;
const generateHkid = (i: number) => {
    const seeds = [107442, 221903, 108551, 304229, 107992, 501223, 108112, 107661, 402334, 108005, 607112, 107223, 108442, 107005, 809221];
    const base = seeds[i % seeds.length] || (100000 + (i * 1331) % 899999);
    const check = (base % 9);
    return `D${base}(${check})`;
};

const generateClinicalNotes = (i: number): ClinicalNote[] => {
  const notes: ClinicalNote[] = [];
  if (i % 2 === 0) {
    notes.push({
      id: `cn-${i}-1`,
      timestamp: '2025-12-01 14:30',
      pharmacistName: 'DR. WONG KA KEUNG',
      category: 'Counseling',
      content: 'COUNSELED PATIENT ON METFORMIN ADHERENCE. PATIENT REPORTED OCCASIONAL FORGETFULNESS. RECOMMENDED USING A PILL BOX. PATIENT VERBALIZED UNDERSTANDING.'
    });
  }
  if (i % 3 === 0) {
    notes.push({
      id: `cn-${i}-2`,
      timestamp: '2025-11-15 10:15',
      pharmacistName: 'DR. CHENG MAN HO',
      category: 'VAS',
      content: 'MMS SERVICE COMPLETED. RECONCILIATION WITH EHRSS SHOWS CONSISTENCY. PATIENT COMPLIANT. LIFESTYLE ADVICE ON LOW GLYCEMIC INDEX DIET REINFORCED.'
    });
  }
  if (i === 1) {
    notes.push({
      id: `cn-ref-image`,
      timestamp: '2025-11-15 09:30',
      pharmacistName: 'DR. CHENG MAN HO',
      category: 'VAS',
      content: 'MMS SERVICE COMPLETED. RECONCILIATION WITH EHRSS SHOWS CONSISTENCY. PATIENT COMPLIANT.'
    });
  }
  return notes;
};

export const MOCK_PATIENTS: Patient[] = Array.from({ length: 15 }).map((_, i) => {
  const sIdx = i % surnames.length;
  const fIdx = (i + 5) % firstNames.length; 

  return {
    id: `p${i + 1}`,
    internalId: `PT-${String(i + 1).padStart(4, '0')}`,
    icType: 'HKID',
    hkid: generateHkid(i),
    name: `${surnames[sIdx]} ${firstNames[fIdx]}`,
    nameCn: `${surnamesCn[sIdx]}${firstNamesCn[fIdx]}`,
    dob: `28-Aug-1952`,
    sex: i % 2 === 0 ? 'M' : 'F',
    mobile1: generateMobile(),
    mobile2: '',
    homePhone: i % 3 === 0 ? '27883344' : '',
    address: sampleAddresses[i % sampleAddresses.length],
    enrolled: true,
    deceased: false,
    notes: sampleNotes[i % sampleNotes.length],
    allergyHistory: sampleAllergies[i % sampleAllergies.length],
    clinicalSummary: generateClinicalSummary(i),
    rightMedId: i % 2 === 0 ? `RM-10${100 + i}` : '',
    clinicalNotes: generateClinicalNotes(i)
  };
});

const createMed = (seq: number, drug: MasterDrug, qty: number, duration: number = 28): MedicationDetail => {
  const freqOptions = ['BD', 'TDS', 'QN', 'QD'];
  const freq = freqOptions[Math.floor(Math.random() * freqOptions.length)];
  return {
    sequenceNumber: seq,
    name: drug.name,
    id_rpp: drug.id_rpp,
    dosageValue: '1',
    dosageUnit: 'TABLET(S)',
    frequency: freq,
    frequencyCode: freq,
    route: 'Oral',
    routeCode: 'PO',
    durationValue: duration.toString(),
    durationUnit: 'day(s)',
    quantityValue: qty,
    quantityUnit: 'PCS',
    instructions: `${freq === 'BD' ? 'TWICE DAILY' : freq === 'TDS' ? 'THREE TIMES A DAY' : freq === 'QN' ? 'NIGHTLY' : 'ONCE DAILY'}, ORAL FOR ${duration} DAY(S)`,
    prn: false
  };
};

export const MOCK_APPOINTMENTS: Appointment[] = MOCK_PATIENTS.map((p, i) => {
  const numMeds = Math.floor(Math.random() * 3) + 1;
  const selectedIndices = new Set<number>();
  while (selectedIndices.size < numMeds) {
    selectedIndices.add(Math.floor(Math.random() * MASTER_DRUGS.length));
  }

  const meds = Array.from(selectedIndices).map((drugIdx, seq) => {
    const drug = MASTER_DRUGS[drugIdx];
    const durationOptions = [7, 14, 28, 56];
    const duration = durationOptions[Math.floor(Math.random() * durationOptions.length)];
    const qty = duration * (Math.random() > 0.5 ? 2 : 1);
    return createMed(seq + 1, drug, qty, duration);
  });

  const doctors = ['DR. KO TAI MAN', 'DR. WONG KA KEUNG', 'DR. LEE SIU LING', 'DR. CHAN MEI MEI'];
  const hospitals = ['QEH', 'QMH', 'PMH', 'UCH', 'KWH'];

  // Randomize dates: 40% today, 30% tomorrow, 30% other
  const rand = Math.random();
  let apptDate = DEMO_DATE_STRS.OTHER;
  if (rand < 0.4) apptDate = DEMO_DATE_STRS.TODAY;
  else if (rand < 0.7) apptDate = DEMO_DATE_STRS.TOMORROW;

  return {
    id: `appt${i + 1}`,
    patientId: p.id,
    date: `${apptDate}T10:00:00`,
    status: i < 5 ? WorkflowStage.VERIFICATION : WorkflowStage.PREPARED,
    prescription: {
      id: `RX-GOV-10${10 + i}`,
      medications: meds,
      prescriber: { nameEn: doctors[i % doctors.length] },
      institution: { name: hospitals[i % hospitals.length], identifier: `HA-${hospitals[i % hospitals.length]}` },
      issueDate: '10/12/2025',
      status: 'PENDING',
      supplyShortage: false
    }
  };
});

export const MOCK_GOV_PRESCRIPTIONS: GovPrescription[] = MOCK_APPOINTMENTS.map((a, i) => {
  const p = MOCK_PATIENTS.find(pt => pt.id === a.patientId)!;
  const isUnbooked = i === 1;
  const collectionDate = a.date.split('T')[0];

  return {
    id: a.prescription!.id,
    orderNum: `ORD-${a.id}`,
    patientHkid: p.hkid,
    patientName: p.name,
    patientInternalId: p.internalId,
    hospital: a.prescription!.institution.name,
    prescriberName: a.prescription!.prescriber.nameEn,
    medications: a.prescription!.medications,
    issueDate: a.prescription!.issueDate,
    expiryDate: '2026-12-10',
    status: 'QUEUING',
    bookingStatus: isUnbooked ? 'UNBOOKED' : 'BOOKED',
    collectionDate: isUnbooked ? undefined : collectionDate
  };
});

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getStatusColor = (status: WorkflowStage) => {
  switch (status) {
    case WorkflowStage.ENROLLMENT: return 'bg-gray-100 text-gray-800';
    case WorkflowStage.PREPARATION: return 'bg-yellow-100 text-yellow-800';
    case WorkflowStage.VERIFICATION: return 'bg-orange-100 text-orange-800';
    case WorkflowStage.PREPARED: return 'bg-blue-100 text-blue-800';
    case WorkflowStage.COMPLETED: return 'bg-green-100 text-green-800';
    default: return 'bg-slate-100';
  }
};