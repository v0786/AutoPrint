import React from 'react';
import { PrintJobProvider, usePrintJob } from './context/PrintJobContext';
import { Header } from './components/Header';
import { SplashScreen } from './components/SplashScreen';
import { StepIndicator } from './components/StepIndicator';
import { UploadAndSpecsStep } from './components/UploadAndSpecsStep';
import { PaymentStep } from './components/PaymentStep';
import { ThankYouStep } from './components/ThankYouStep';
import { ShopSwitcherModal } from './components/ShopSwitcherModal';
import { QrCodeModal } from './components/QrCodeModal';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';

const MainKioskView: React.FC = () => {
  const { currentStep } = usePrintJob();

  if (currentStep === 'splash') {
    return <SplashScreen />;
  }

  return (
    <div className="min-h-screen bg-[#0F0F12] text-[#E6E1E9] flex flex-col justify-between selection:bg-[#D0BCFF]/30 selection:text-[#D0BCFF] relative overflow-hidden font-sans">
      {/* Frosted Glass Ambient Atmospheric Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-[#D0BCFF]/10 blur-[130px]" />
        <div className="absolute top-[60%] -right-[5%] w-[35%] h-[35%] rounded-full bg-[#381E72]/20 blur-[110px]" />
        <div className="absolute top-[25%] left-[60%] w-[25%] h-[25%] rounded-full bg-[#D0BCFF]/5 blur-[100px]" />
      </div>

      {/* Dynamic Header with scanned shop info & actions */}
      <div className="relative z-10">
        <Header />

        {/* Step Indicator Stepper */}
        <StepIndicator />

        {/* Dynamic Step Content */}
        <main className="flex-1 w-full">
          {currentStep === 'specs' && <UploadAndSpecsStep />}
          {currentStep === 'payment' && <PaymentStep />}
          {currentStep === 'thankyou' && <ThankYouStep />}
        </main>
      </div>

      {/* Modals */}
      <ShopSwitcherModal />
      <QrCodeModal />
      <DocumentPreviewModal />
    </div>
  );
};

export default function App() {
  return (
    <PrintJobProvider>
      <MainKioskView />
    </PrintJobProvider>
  );
}
