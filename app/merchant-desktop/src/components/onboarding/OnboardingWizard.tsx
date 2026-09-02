/**
 * OnboardingWizard Container Component
 * Orchestrates the full multi-step wizard, navigation bar, validation guards, and persistence.
 */
import React, { useState } from 'react';
import {
  Printer,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useOnboarding, TOTAL_STEPS } from '../../hooks/useOnboarding';
import { StepSplash } from './StepSplash';
import { StepUserDetails } from './StepUserDetails';
import { StepPrinters } from './StepPrinters';
import { StepTerms } from './StepTerms';
import { StepAdminAccount } from './StepAdminAccount';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const {
    state,
    connectedPrinters,
    isDetectingPrinters,
    detectionError,
    validationErrors,
    scanPrinters,
    validateUserDetails,
    validateAdminAccount,
    validateTerms,
    nextStep,
    prevStep,
    goToStep,
    updateUserDetails,
    setPrimaryPrinter,
    updateTerms,
    setAdminAccount,
    completeOnboarding,
    resetAll,
  } = useOnboarding();

  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  const stepTitles = [
    'Welcome',
    'Shop Details',
    'Printer Setup',
    'Terms Agreement',
    'Admin Security',
  ];

  const handleNextClick = () => {
    // Step-specific validation before moving forward
    if (state.currentStep === 1) {
      if (!validateUserDetails(state.userDetails)) return;
    } else if (state.currentStep === 2) {
      if (!state.selectedPrinterId && connectedPrinters.length > 0) {
        setPrimaryPrinter(connectedPrinters[0].id);
      }
    } else if (state.currentStep === 3) {
      if (!validateTerms(state.terms)) return;
    }

    nextStep();
  };

  const handleFinishClick = () => {
    const username = state.adminAccount?.username || 'admin';
    if (
      !validateAdminAccount({
        username,
        password: adminPassword,
        confirmPassword: adminConfirmPassword,
      })
    ) {
      return;
    }

    setAdminAccount({
      username,
      passwordHash: `sha256_mock_${adminPassword.split('').reverse().join('')}`,
      createdAt: new Date().toISOString(),
      securityQuestion: state.adminAccount?.securityQuestion || 'What was the name of your first store?',
      securityAnswer: state.adminAccount?.securityAnswer || '',
    });

    completeOnboarding();
    onComplete();
  };

  return (
    <div className="min-h-screen w-screen bg-[#F0F5FA] text-slate-800 flex flex-col font-sans antialiased overflow-x-hidden">
      {/* Top Wizard Navigation & Progress Bar */}
      <header className="bg-white border-b border-blue-100 px-6 py-4 sticky top-0 z-40 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Brand Identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">AutoPrint</h1>
              <p className="text-[10px] text-slate-500 font-medium">System Setup Wizard</p>
            </div>
          </div>

          {/* Stepper Dots (Desktop) */}
          <div className="hidden sm:flex items-center gap-1.5">
            {stepTitles.map((title, idx) => {
              const isPast = idx < state.currentStep;
              const isCurrent = idx === state.currentStep;
              return (
                <div key={idx} className="flex items-center">
                  <button
                    onClick={() => idx < state.currentStep && goToStep(idx)}
                    disabled={idx > state.currentStep}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isPast
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-transparent text-slate-400 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold">
                      {isPast ? <Check className="w-3 h-3 text-emerald-700" /> : idx + 1}
                    </span>
                    <span className="hidden md:inline">{title}</span>
                  </button>
                  {idx < stepTitles.length - 1 && (
                    <div
                      className={`w-3 h-0.5 mx-0.5 rounded-full ${
                        idx < state.currentStep ? 'bg-red-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Reset / Restart helper */}
          <button
            onClick={resetAll}
            className="text-[11px] font-bold text-slate-400 hover:text-red-600 flex items-center gap-1 p-1 rounded transition-colors cursor-pointer"
            title="Reset setup state"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        {/* Mobile RED Progress Bar */}
        <div className="sm:hidden mt-3">
          <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
            <span>Step {state.currentStep + 1} of {TOTAL_STEPS}</span>
            <span>{stepTitles[state.currentStep]}</span>
          </div>
          <div className="h-1.5 w-full bg-red-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-600 rounded-full transition-all duration-300"
              style={{ width: `${((state.currentStep + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Form Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-8 flex flex-col justify-center">
        <div className="w-full">
          {state.currentStep === 0 && <StepSplash onStart={nextStep} />}

          {state.currentStep === 1 && (
            <StepUserDetails
              details={state.userDetails}
              onChange={updateUserDetails}
              errors={validationErrors}
            />
          )}

          {state.currentStep === 2 && (
            <StepPrinters
              printers={connectedPrinters}
              selectedPrinterId={state.selectedPrinterId}
              onSelectPrimary={setPrimaryPrinter}
              isScanning={isDetectingPrinters}
              onScan={scanPrinters}
              detectionError={detectionError}
            />
          )}

          {state.currentStep === 3 && (
            <StepTerms
              terms={state.terms}
              onChange={updateTerms}
              errors={validationErrors}
              shopOwnerName={state.userDetails.shopOwnerName}
            />
          )}

          {state.currentStep === 4 && (
            <StepAdminAccount
              adminAccount={state.adminAccount}
              onSetAccount={setAdminAccount}
              errors={validationErrors}
              password={adminPassword}
              confirmPassword={adminConfirmPassword}
              onPasswordChange={(pass, conf) => {
                setAdminPassword(pass);
                setAdminConfirmPassword(conf);
              }}
            />
          )}
        </div>
      </main>

      {/* Bottom Sticky Action Footer (steps > 0) */}
      {state.currentStep > 0 && (
        <footer className="bg-white border-t border-blue-100 px-6 py-4 sticky bottom-0 z-40 shadow-xs">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              id="btn-wizard-prev"
              type="button"
              onClick={prevStep}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Auto-persisted to local workstation disk
            </div>

            {state.currentStep === 4 ? (
              <button
                id="btn-wizard-complete"
                type="button"
                onClick={handleFinishClick}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-700/20 active:scale-[0.98] cursor-pointer"
              >
                <Check className="w-4 h-4 text-white" />
                <span>Complete Setup & Launch Dashboard</span>
              </button>
            ) : (
              <button
                id="btn-wizard-next"
                type="button"
                onClick={handleNextClick}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-700/20 active:scale-[0.98] cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
};
