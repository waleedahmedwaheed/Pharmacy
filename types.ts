export enum WorkflowStage {
  ENROLLMENT = 'ENROLLMENT',
  BOOKING = 'BOOKING',
  PREPARATION = 'PREPARATION',
  PREPARED = 'PREPARED',
  VERIFICATION = 'VERIFICATION',
  DISPENSING = 'DISPENSING',
  PAYMENT = 'PAYMENT',
  SUBMISSION = 'SUBMISSION',
  CLAIM = 'CLAIM',
  COMPLETED = 'COMPLETED'
}

export interface MasterDirection {
  code: string;
  translation: string;
  translationCn?: string;
  customTranslation?: string;
  category: 'Administration' | 'Timing' | 'Storage' | 'Warning';
}

export interface MasterDrug {
  name: string;
  strength: string;
  customStrength?: string;
  id_rpp?: string;
}

export interface MedicationDetail {
  sequenceNumber: number;
  medOrderItemNum?: string; // S14/Operation 2 identifier
  name: string;
  id_rpp?: string;
  id_hkctt?: string;
  dosageValue: string;
  dosageUnit: string;
  frequency: string;
  frequencyCode: string;
  route: string;
  routeCode: string;
  durationValue: string;
  durationUnit: string;
  quantityValue: number;
  quantityUnit: string;
  instructions: string;
  site?: string;
  prn: boolean;
}

export interface EHRPrescribingItem {
  name: string;
  qty: number;
  instructions: string;
  haCode?: string; // New field for HA Drug Code
}

export interface EHRPrescribingRecord {
  recordKey: string;
  episodeNumber: string;
  attendanceInstitutionId: string;
  prescriptionDatetime: string;
  prescribingInstitution: {
    id: string;
    longName: string;
    localName?: string;
  };
  prescriptionOrderNumber: string;
  prescriber: {
    id: string;
    prefix: string;
    fullName: string;
    givenName?: string;
    chineseFullName?: string;
    chineseNameSuffix?: string;
  };
  medications: string[];
  items?: EHRPrescribingItem[];
}

export interface EHRClinicalSummary {
  problems: { date: string; description: string }[];
  allergies: { allergen: string; agent: string; info: string }[];
  labs: { date: string; description: string; institution: string }[];
  encounters: { date: string; specialty: string; hcp: string }[];
  prescribingHistory: EHRPrescribingRecord[];
}

export interface PrescriberInfo {
  nameEn: string;
  nameCn?: string;
  identifier?: string;
}

export interface InstitutionInfo {
  name: string;
  identifier: string;
  localName?: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship?: string;
}

export type ICType = 'HKID' | 'Passport' | 'Other';

export interface ClinicalNote {
  id: string;
  timestamp: string;
  pharmacistName: string;
  content: string;
  category: 'Counseling' | 'Intervention' | 'VAS' | 'Follow-up';
}

export interface Patient {
  id: string; // System UUID
  internalId: string; // Pharmacy's Patient ID
  icType: ICType;
  hkid: string; // The raw IC number (Masked in UI)
  hkicNum?: string; // DHUB API Identifier
  rightMedId?: string; // RightMed Platform ID
  ehrNo?: string; 
  name: string;
  nameCn?: string;
  dob: string;
  sex: 'M' | 'F' | 'U';
  enrolled: boolean;
  deceased: boolean;
  
  // Address & Contact
  address?: string;
  homePhone?: string;
  mobile1?: string;
  mobile2?: string;
  emergencyContact?: EmergencyContact;
  
  // Clinical & Notes
  allergyHistory?: string;
  notes?: string;
  remarks?: string;
  clinicalNotes?: ClinicalNote[];

  // External IDs
  eHealthId?: string;
  odooId?: number;
  clinicalSummary?: EHRClinicalSummary;
}

export interface Prescription {
  id: string;
  orderNum?: string; // S14/Operation 2 identifier
  refillCouponNum?: string; // S14/Operation 2 identifier
  medications: MedicationDetail[];
  prescriber: PrescriberInfo;
  institution: InstitutionInfo;
  issueDate: string;
  status: 'PENDING' | 'PREPARED' | 'DISPENSED';
  supplyShortage: boolean;
  odooId?: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  date: string;
  status: WorkflowStage;
  prescription?: Prescription;
  vasServices?: string[];
  coPaymentAmount?: number;
  paymentCollected?: boolean;
  submissionId?: string;
  claimId?: string;
  odooSyncId?: number;
  pharmacistNotes?: ClinicalNote[];
}

export interface OdooConfig {
  url: string;
  db: string;
  username: string;
  apiKey: string;
  proxyUrl: string;
  connected: boolean;
}

export interface DashboardStats {
  pendingPrep: number;
  collectionToday: number;
  pendingClaims: number;
}

export interface GovPrescription {
  id: string;
  orderNum?: string;
  patientHkid: string;
  patientName: string;
  patientInternalId?: string;
  hospital: string;
  prescriberName?: string;
  medications: MedicationDetail[];
  issueDate: string;
  expiryDate: string;
  status: 'QUEUING' | 'DISPENSED';
  bookingStatus?: 'UNBOOKED' | 'BOOKED';
  collectionDate?: string;
  pharmacist?: string;
  selectedVas?: string[];
}

export type SortOrder = 'asc' | 'desc';

export interface SortState<T> {
  key: keyof T | string;
  order: SortOrder;
}

export const maskHkid = (id: string): string => {
  if (!id) return '';
  const cleanId = id.replace(/\s/g, '');
  if (cleanId.length <= 4) return cleanId;
  const prefix = cleanId.substring(0, 4);
  return `${prefix}****`;
};