import { Patient, Prescription, GovPrescription, MedicationDetail, WorkflowStage } from '../types';
import { delay } from '../mockData';

export interface GovConfig {
  hcpId: string;
  serviceName: string;
  targetResource: string;
  connected: boolean;
}

class GovService {
  private config: GovConfig = {
    hcpId: '9006662656',
    serviceName: 'XYSysES',
    targetResource: 'apim-xs-ehrss-eif-dhub-gateway',
    connected: true
  };

  private accessToken: string | null = null;

  async authenticate(): Promise<string> {
    await delay(500);
    this.accessToken = `AT-${Math.random().toString(36).substr(2, 12)}`;
    return this.accessToken;
  }

  // Operation 1: ePrescription Data Retrieval (S14 Compliant)
  async retrievePrescription(hkid: string): Promise<Prescription> {
    if (!this.accessToken) await this.authenticate();
    await delay(1200);

    const meds: MedicationDetail[] = [
      {
        sequenceNumber: 1,
        medOrderItemNum: 'ITEM-9001',
        name: 'Metformin 500mg Tablet',
        id_rpp: 'RPP-44291',
        dosageValue: '1',
        dosageUnit: 'tablet(s)',
        frequency: 'Three times daily',
        frequencyCode: 'TDS',
        route: 'Oral',
        routeCode: 'PO',
        durationValue: '28',
        durationUnit: 'day(s)',
        quantityValue: 84,
        quantityUnit: 'pcs',
        instructions: 'Take one tablet three times a day with meal',
        prn: false
      },
      {
        sequenceNumber: 2,
        medOrderItemNum: 'ITEM-9002',
        name: 'Amlodipine 5mg Tablet',
        id_rpp: 'RPP-11202',
        dosageValue: '1',
        dosageUnit: 'tablet(s)',
        frequency: 'Once daily',
        frequencyCode: 'QD',
        route: 'Oral',
        routeCode: 'PO',
        durationValue: '28',
        durationUnit: 'day(s)',
        quantityValue: 28,
        quantityUnit: 'pcs',
        instructions: 'Take one tablet daily in the morning',
        prn: false
      }
    ];

    return {
      // Use 4000+ range for new real-time retrievals
      id: `RX-GOV-${4000 + Math.floor(Math.random() * 1000)}`,
      orderNum: `ORD-${Math.floor(Math.random() * 999999)}`,
      refillCouponNum: `REF-${Math.floor(Math.random() * 999999)}`,
      medications: meds,
      prescriber: {
        nameEn: 'Dr. Chan Tai Man',
        nameCn: '陳大文醫生',
        identifier: 'M08821'
      },
      institution: {
        name: 'Queen Mary Hospital',
        identifier: 'HA-QMH',
        localName: '瑪麗醫院'
      },
      issueDate: new Date().toISOString().split('T')[0],
      status: 'PENDING',
      supplyShortage: false
    };
  }

  async calculateCoPayment(hkid: string, meds: MedicationDetail[]): Promise<{ gross: number, subsidy: number, coPay: number, transactionId: string }> {
    if (!this.accessToken) await this.authenticate();
    await delay(1500);
    
    // Updated Logic: HKD 20 per drug item
    const coPayPerItem = 20.00;
    const totalCoPay = meds.length * coPayPerItem;
    const gross = totalCoPay + 350.00; // Mocking a higher gross for subsidy demonstration
    
    return {
      gross: gross,
      subsidy: gross - totalCoPay,
      coPay: totalCoPay,
      transactionId: `TX-CALC-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
    };
  }

  async submitDispensingRecord(payload: {
    patient: Patient,
    prescription: Prescription,
    amount: number,
    vas: string[]
  }): Promise<string> {
    if (!this.accessToken) await this.authenticate();
    await delay(2000);
    return `SUB-${Math.floor(Math.random() * 1000000)}`;
  }
}

export const govService = new GovService();