/* File: src/pages/Onboarding/OnboardingWizard.tsx */

import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { HiArrowRight, HiCash, HiCreditCard, HiTrendingUp, HiCheck, HiX } from 'react-icons/hi';
import styles from './OnboardingWizard.module.css'; 

// --- Import EXISTING Forms ---
import AddAccountForm from '../../components/Accounts/AddAccountForm';
import AddDebtForm from '../../components/Debts/AddDebtForm';
import AddInvestmentForm from '../../components/Investments/AddInvestmentForm'; // Assuming this file exists at this path based on previous context

interface Props {
  onComplete: () => void;
}

type Step = 'INTRO' | 'CASH' | 'DEBT' | 'INVEST' | 'PROCESSING';

const OnboardingWizard: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('INTRO');
  
  // We use this key to force-reset the form component when "Add Another" is clicked
  const [formKey, setFormKey] = useState(0); 

  // --- STEP TRANSITION LOGIC ---
  const handleNextStep = () => {
     if (step === 'INTRO') setStep('CASH');
     else if (step === 'CASH') setStep('DEBT');
     else if (step === 'DEBT') setStep('INVEST');
     else if (step === 'INVEST') finishWizard();
  };

  const finishWizard = async () => {
    setStep('PROCESSING');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        // Trigger the "Sorting Hat" logic in the DB
        const { error } = await supabase.rpc('initialize_user_tier', {
            user_id_input: user.id
        });
        
        if (error) console.error("Sorting Hat Failed:", error);
        
        // Delay to show the "Analyzing..." animation
        setTimeout(() => {
            onComplete(); 
        }, 2500); 
    }
  };

  // --- HANDLERS FOR CHILD FORMS ---
  // These are passed to the existing components to intercept the "Save" action
  
  const handleAccountSaved = () => {
      // When an account is saved, we don't close a modal. 
      // Instead, we flash a success message and reset the form for potentially adding another.
      alert("Account Saved! Add another or click 'Next Step' to continue.");
      setFormKey(prev => prev + 1); // Reset form state
  };

  const handleDebtSaved = () => {
      alert("Debt Saved! Add another or click 'Next Step'.");
      setFormKey(prev => prev + 1);
  };

  const handleInvestmentSaved = () => {
      alert("Investment Saved! Add another or click 'Finish'.");
      setFormKey(prev => prev + 1);
  };

  // We mock the "Cancel" action to just clear the form in this context
  const handleCancelForm = () => {
      setFormKey(prev => prev + 1);
  };


  // --- RENDERERS ---

  const renderIntro = () => (
    <div className={styles.introContainer}>
      <span className={styles.emojiIcon}>👋</span>
      <h2 className={styles.title}>Welcome to Finance360</h2>
      <p className={styles.subtitle}>
        To give you the right tools (and your correct Pilot Rank), we need to calibrate your financial dashboard.
        <br/><br/>
        Please take a moment to add your current accounts.
      </p>
      <button 
        onClick={handleNextStep}
        className={styles.primaryBtn}
      >
        Start Setup <HiArrowRight />
      </button>
    </div>
  );

  const renderProcessing = () => (
    <div className={styles.processingContainer}>
       <div className={styles.spinner}></div>
       <h2 className={styles.title}>Analyzing Telemetry...</h2>
       <p className={styles.subtitle}>
         Assigning your Pilot Tier based on assets and liabilities.
       </p>
    </div>
  );

  // --- MAIN WRAPPER FOR FORM STEPS ---
  const renderFormStep = (
    title: string, 
    subtitle: string, 
    icon: React.ReactNode,
    FormComponent: React.ReactNode
  ) => (
    <div className={styles.stepContainer}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 text-2xl mb-2">
            {icon}
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle} style={{marginBottom: 0}}>{subtitle}</p>
      </div>

      {/* THE EXISTING FORM COMPONENT IS RENDERED HERE */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
         {FormComponent}
      </div>

      <div className={styles.secondaryActionRow}>
         <button 
           onClick={handleNextStep}
           className={styles.skipBtn}
         >
           Skip this step
         </button>
         
         <button 
           onClick={handleNextStep}
           className={styles.nextBtn}
         >
           Next Step <HiArrowRight />
         </button>
      </div>
    </div>
  );

  // Progress Bar Width Logic
  const progressWidth = step === 'CASH' ? '25%' : step === 'DEBT' ? '50%' : step === 'INVEST' ? '75%' : '100%';

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        
        {/* Progress Bar */}
        {step !== 'PROCESSING' && step !== 'INTRO' && (
            <div className={styles.progressBarBg}>
                <div 
                    className={styles.progressBarFill} 
                    style={{ width: progressWidth }}
                ></div>
            </div>
        )}

        {step === 'INTRO' && renderIntro()}
        
        {step === 'CASH' && renderFormStep(
            'Liquid Assets', 
            'Add your Checking, Savings, or Cash accounts.', 
            <HiCash />,
            <AddAccountForm 
                key={formKey} // Force re-render on save
                accountToEdit={null} 
                onSave={handleAccountSaved} 
                onCancel={handleCancelForm} 
            />
        )}
        
        {step === 'DEBT' && renderFormStep(
            'Active Threats', 
            'Add Credit Cards or Personal Loans.', 
            <HiCreditCard />,
            // Note: Reusing AddAccountForm for Credit Cards is fine, or AddDebtForm for loans.
            // For simplicity in the wizard, let's allow users to add LOANS here via AddDebtForm.
            // (Credit Cards are technically accounts, but user might see them as debt).
            // Let's provide the DEBT form here for Loans.
            <AddDebtForm
                key={formKey}
                debtToEdit={null}
                onSave={handleDebtSaved}
                onCancel={handleCancelForm}
            />
        )}
        
        {step === 'INVEST' && renderFormStep(
            'Growth Engines', 
            'Add Brokerage, 401k, or Crypto holdings.', 
            <HiTrendingUp />,
            <AddInvestmentForm
                key={formKey}
                investmentToEdit={null}
                onSave={handleInvestmentSaved}
                onCancel={handleCancelForm}
            />
        )}
        
        {step === 'PROCESSING' && renderProcessing()}

      </div>
    </div>
  );
};

export default OnboardingWizard;