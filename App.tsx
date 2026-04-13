import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './views/Dashboard';
import { PatientProcess } from './views/PatientProcess';
import { GovPrescriptions } from './views/GovPrescriptions';
import { MedicationCollection } from './views/MedicationCollection';
import { IssuedRecords } from './views/IssuedRecords';
import { Settings } from './views/Settings';
import { Inventory } from './views/Inventory';
import { ContactsSync } from './views/ContactsSync';
import { MasterRecords } from './views/MasterRecords';
import { PatientPortal } from './views/PatientPortal';
import { MOCK_GOV_PRESCRIPTIONS, MOCK_PATIENTS } from './mockData';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState('patient_portal');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | undefined>(undefined);
  const [selectedGovRxId, setSelectedGovRxId] = useState<string | undefined>(undefined);
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>(undefined);
  const [returnView, setReturnView] = useState('patient_portal');
  
  // Detect platform for better shortcut experience
  const isMac = useMemo(() => {
    return /Mac|iPhone|iPod|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifierPressed = isMac ? (e.altKey || e.ctrlKey) : e.altKey;

      if (isModifierPressed) {
        const shortcuts: Record<string, string> = {
          'Digit1': 'gov_queue',
          'Digit2': 'medication_collection',
          'Digit3': 'patient_sync',
          'Digit4': 'inventory',
          'Digit5': 'issued_records',
          'Digit6': 'master_records',
          'Digit7': 'settings',
          'Digit8': 'patient_portal',
          'KeyE': 'gov_queue',
          'KeyC': 'medication_collection',
          'KeyP': 'patient_sync',
          'KeyI': 'inventory',
          'KeyR': 'issued_records',
          'KeyM': 'master_records',
          'KeyS': 'settings',
          'KeyD': 'dashboard',
          'KeyK': 'patient_portal'
        };

        const targetView = shortcuts[e.code];
        if (targetView) {
          e.preventDefault();
          setActiveView(targetView);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMac]);

  const handleNavigateToPatient = (apptId: string) => {
    resetSelection();
    setSelectedAppointmentId(apptId);
    setReturnView('dashboard');
    setActiveView('patient_process');
  };

  const handleBackToDashboard = () => {
    resetSelection();
    setActiveView(returnView);
  };

  const resetSelection = () => {
    setSelectedAppointmentId(undefined);
    setSelectedGovRxId(undefined);
    setSelectedPatientId(undefined);
  };

  const handleProcessGovRx = (rxId: string) => {
    const rx = MOCK_GOV_PRESCRIPTIONS.find(r => r.id === rxId);
    if (!rx) return;

    let patientId = MOCK_PATIENTS.find(p => p.hkid === rx.patientHkid)?.id;
    if (!patientId) {
        patientId = MOCK_PATIENTS[0].id; 
    }

    resetSelection();
    setSelectedGovRxId(rxId);
    setSelectedPatientId(patientId);
    setReturnView('gov_queue'); 
    setActiveView('patient_process');
  };
  
  const handleCollectionStart = (apptId: string) => {
    resetSelection();
    setSelectedAppointmentId(apptId);
    setReturnView('medication_collection');
    setActiveView('patient_process');
  };

  const handleScanQr = () => {
    resetSelection();
    setSelectedAppointmentId('appt3'); 
    setReturnView('medication_collection');
    setActiveView('patient_process');
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onNavigateToPatient={handleNavigateToPatient} />;
      case 'patient_process':
        return (
            <PatientProcess 
                initialAppointmentId={selectedAppointmentId} 
                initialGovRxId={selectedGovRxId}
                initialPatientId={selectedPatientId}
                onBack={handleBackToDashboard} 
            />
        );
      case 'gov_queue':
        return <GovPrescriptions onProcess={handleProcessGovRx} />;
      case 'medication_collection':
        return <MedicationCollection onStartCollection={handleCollectionStart} onScanQr={handleScanQr} />;
      case 'patient_sync':
        return <ContactsSync />;
      case 'inventory':
        return <Inventory />;
      case 'issued_records':
        return <IssuedRecords />;
      case 'master_records':
        return <MasterRecords />;
      case 'settings':
        return <Settings />;
      case 'patient_portal':
        return <PatientPortal />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
            <p>This module is under development.</p>
          </div>
        );
    }
  };

  const getSidebarActiveItem = () => {
    if (activeView === 'patient_process') return returnView;
    return activeView;
  };

  return (
    <div className={`flex h-screen font-sans text-secondary bg-slate-50`}>
      <Sidebar 
        activeView={getSidebarActiveItem()} 
        setActiveView={setActiveView} 
      />
      
      <main className="flex-1 ml-56 flex flex-col h-screen overflow-hidden relative">
        <div className={`flex-1 overflow-y-auto ${activeView === 'patient_process' || activeView === 'patient_portal' ? '' : 'p-4'}`}>
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;