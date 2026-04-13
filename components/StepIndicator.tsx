import React from 'react';
import { Check } from 'lucide-react';
import { WorkflowStage } from '../types';

interface StepIndicatorProps {
  currentStage: WorkflowStage;
}

// Complete logical order to determine status even if step is not visible in the UI
const WORKFLOW_ORDER = [
  WorkflowStage.ENROLLMENT,
  WorkflowStage.BOOKING,
  WorkflowStage.PREPARATION,
  WorkflowStage.PREPARED,
  WorkflowStage.VERIFICATION,
  WorkflowStage.DISPENSING,
  WorkflowStage.PAYMENT,
  WorkflowStage.SUBMISSION,
  WorkflowStage.CLAIM,
  WorkflowStage.COMPLETED
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStage }) => {
  // Respect user setting to skip co-payment stage
  const skipCoPaymentSetting = (() => {
    const val = localStorage.getItem('cph_skip_copayment');
    return val === null ? true : val === 'true';
  })();

  // Visual steps requested matching the design
  const steps = [
    { id: WorkflowStage.VERIFICATION, label: 'VERIFICATION' },
    { id: WorkflowStage.DISPENSING, label: 'DISPENSING' },
  ];

  if (!skipCoPaymentSetting) {
    steps.push({ id: WorkflowStage.PAYMENT, label: 'CO-PAYMENT' });
  }

  // Helper to determine step status based on global workflow order
  const getStepStatus = (stepId: WorkflowStage) => {
    const currentWorkflowIndex = WORKFLOW_ORDER.indexOf(currentStage);
    const stepWorkflowIndex = WORKFLOW_ORDER.indexOf(stepId);
    
    if (currentWorkflowIndex > stepWorkflowIndex) return 'completed';
    if (currentWorkflowIndex === stepWorkflowIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="w-full overflow-x-auto py-4 border-b border-slate-200">
      <div className="flex items-center justify-center min-w-max px-4 w-full">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isLast = index === steps.length - 1;
          
          // Determine styling based on status - removed rounded-full
          const circleColor = status === 'completed' || status === 'current' 
            ? 'bg-success border-success text-white' 
            : 'bg-white border-slate-200 text-transparent'; 
            
          const lineColor = status === 'completed' 
            ? 'bg-success' 
            : 'bg-slate-200';

          const textColor = status === 'completed' || status === 'current'
            ? 'text-success'
            : 'text-slate-400';

          return (
            <React.Fragment key={step.id}>
              {/* Step Square & Label */}
              <div className="flex flex-col items-center relative z-10 w-32 group">
                <div 
                  className={`w-12 h-12 rounded-none flex items-center justify-center border-2 transition-all duration-300 ${circleColor} ${status === 'current' ? 'scale-105' : ''}`}
                >
                  {(status === 'completed' || status === 'current') && (
                    <Check size={24} strokeWidth={3} />
                  )}
                </div>
                <span className={`mt-2 text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${textColor}`}>
                  {step.label}
                </span>
              </div>
              
              {/* Connector Line */}
              {!isLast && (
                <div className={`flex-1 h-0.5 max-w-[80px] mx-2 -mt-6 transition-colors duration-500 ${lineColor}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};