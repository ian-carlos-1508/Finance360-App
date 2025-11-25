/* File: src/pages/Onboarding/OnboardingWizard.tsx */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency } from '../../lib/utils';
import { 
  HiArrowRight, 
  HiCash, 
  HiCreditCard, 
  HiTrendingUp, 
  HiCheck, 
  HiSparkles
} from 'react-icons/hi';
import styles from './OnboardingWizard.module.css'; 

// --- Import EXISTING Forms ---
import AddAccountForm from '../../components/Accounts/AddAccountForm';
import AddDebtForm from '../../components/Debts/AddDebtForm';
import AddInvestmentForm from '../../components/Investments/AddInvestmentForm'; 

interface Props {
  onComplete: () => void;
}

type Step = 'INTRO' | 'CASH' | 'DEBT' | 'INVEST' | 'PROCESSING';

type AddedItem = {
    name: string;
    amount: number;
};

const OnboardingWizard: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('INTRO');
  const [formKey, setFormKey] = useState(0); 
  
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const [stepSuccessMsg, setStepSuccessMsg] = useState('');
  
  const [debtType, setDebtType] = useState<'card' | 'loan'>('card');

  // --- SAFETY TIMER ---
  // If we get stuck on PROCESSING for more than 8 seconds, force close.
  useEffect(() => {
    if (step === 'PROCESSING') {
        const safetyTimer = setTimeout(() => {
            console.warn("Wizard Safety Timer Triggered - Forcing Complete");
            onComplete();
        }, 8000);
        return () => clearTimeout(safetyTimer);
    }
  }, [step, onComplete]);


  // --- STEP TRANSITION LOGIC ---
  const handleNextStep = () => {
     setAddedItems([]); 
     setStepSuccessMsg(''); 
     if (step === 'INTRO') setStep('CASH');
     else if (step === 'CASH') setStep('DEBT');
     else if (step === 'DEBT') setStep('INVEST');
     else if (step === 'INVEST') finishWizard();
  };

  const finishWizard = async () => {
    setStep('PROCESSING');
    
    // Wrap in a try/finally to ensure we ALWAYS exit the wizard
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
          // 1. Call the Sorting Hat (DB Function)
          console.log("Calling initialize_user_tier...");
          const { error } = await supabase.rpc('initialize_user_tier', {
              user_id_input: user.id
          });
          
          if (error) {
             console.error("Sorting Hat RPC Error:", error);
          } else {
             console.log("Sorting Hat Success");
          }
      }
    } catch (err) {
      console.error("Wizard Error (Non-Critical):", err);
    } finally {
      // 2. Wait for visual effect, then close
      setTimeout(() => {
          console.log("Wizard Complete - Calling onComplete");
          onComplete(); 
      }, 2500); 
    }
  };

  // --- HANDLERS FOR CHILD FORMS ---
  
  const handleAccountSaved = (newAccount: any) => {
      const name = newAccount.account_name || "Account";
      const amount = Math.abs(newAccount.current_balance || newAccount.initial_balance || 0);
      
      setAddedItems(prev => [...prev, { name, amount }]);
      setStepSuccessMsg(`Saved ${name}!`);
      setFormKey(prev => prev + 1); 
      setTimeout(() => setStepSuccessMsg(''), 3000);
  };

  const handleDebtSaved = (newDebt: any) => {
      const name = newDebt.debt_name || "Loan";
      const amount = Math.abs(newDebt.current_balance || 0);
      setAddedItems(prev => [...prev, { name, amount }]);
      setStepSuccessMsg(`Saved ${name}!`);
      setFormKey(prev => prev + 1);
      setTimeout(() => setStepSuccessMsg(''), 3000);
  };

  const handleInvestmentSaved = (newInv: any) => {
      const name = newInv.name || "Investment";
      const amount = (newInv.quantity * newInv.current_price) || 0; 
      setAddedItems(prev => [...prev, { name, amount }]);
      setStepSuccessMsg(`Saved ${name}!`);
      setFormKey(prev => prev + 1);
      setTimeout(() => setStepSuccessMsg(''), 3000);
  };

  const handleCancelForm = () => {
      setFormKey(prev => prev + 1);
  };

  // --- RENDERERS ---

  const renderIntro = () => (
    <div className={styles.introContainer}>
      <div className="flex justify-center mb-4">
        <div className="p-4 bg-blue-50 rounded-full text-blue-600">
            <HiSparkles size={48} />
        </div>
      </div>
      <h2 className={styles.title}>Welcome to Finance360</h2>
      <p className={styles.subtitle}>
        Let's calibrate your dashboard. Adding your accounts now unlocks the correct game level.
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

  const renderAddedList = () => (
     addedItems.length > 0 ? (
        <div className={styles.addedListContainer}>
            <div className={styles.addedListHeader}>
                <HiCheck /> Added So Far:
            </div>
            {addedItems.map((item, idx) => (
                <div key={idx} className={styles.addedItem}>
                    <span>{item.name}</span>
                    <span className={styles.addedAmount}>{formatCurrency(item.amount)}</span>
                </div>
            ))}
        </div>
     ) : null
  );

  const renderFormStep = (
    title: string, 
    subtitle: string, 
    icon: React.ReactNode, 
    contextLabel: string,
    FormComponent: React.ReactNode
  ) => (
    <div className={styles.stepContainer}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        {/* Visual Icon Bubble */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 text-2xl mb-3 border border-blue-100">
            {icon}
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle} style={{marginBottom: 0}}>{subtitle}</p>
      </div>

      {/* Success Banner */}
      {stepSuccessMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2 animate-pulse justify-center">
            <HiCheck /> {stepSuccessMsg}
        </div>
      )}

      {renderAddedList()}

      <span className={styles.contextLabel}>
         {step === 'DEBT' && debtType === 'loan' ? 'Adding: Personal Loan' : contextLabel}
      </span>

      {/* Toggle for Debt Step */}
      {step === 'DEBT' && (
          <div className={styles.toggleContainer}>
              <button 
                onClick={() => setDebtType('card')}
                className={`${styles.toggleBtn} ${debtType === 'card' ? styles.toggleBtnActive : styles.toggleBtnInactive}`}
              >
                Credit Card
              </button>
              <button 
                onClick={() => setDebtType('loan')}
                className={`${styles.toggleBtn} ${debtType === 'loan' ? styles.toggleBtnActive : styles.toggleBtnInactive}`}
              >
                Loan / Other Debt
              </button>
          </div>
      )}

      {/* The Form Container */}
      <div className="bg-white p-1 rounded-xl border-0">
         {FormComponent}
      </div>

      <div className={styles.secondaryActionRow}>
         <button 
           onClick={handleNextStep}
           className={styles.skipBtn}
         >
           {addedItems.length > 0 ? 'Done adding these' : 'Skip this step'}
         </button>
         
         <button 
           onClick={handleNextStep}
           className={styles.nextBtn}
         >
           {step === 'INVEST' ? 'Finish Setup' : 'Next Step'} <HiArrowRight />
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
            'Add Checking, Savings, or Cash.',
            <HiCash />, 
            'Adding: Cash Account',
            <AddAccountForm 
                key={formKey} 
                accountToEdit={null} 
                onSave={handleAccountSaved} 
                onCancel={handleCancelForm} 
                forcedType="cash" 
            />
        )}
        
        {step === 'DEBT' && renderFormStep(
            'Active Threats', 
            'Add Credit Cards or Personal Loans.', 
            <HiCreditCard />, 
            'Adding: Credit Card', 
            debtType === 'card' ? (
                <AddAccountForm 
                    key={formKey}
                    accountToEdit={null}
                    onSave={handleAccountSaved}
                    onCancel={handleCancelForm}
                    forcedType="credit"
                />
            ) : (
                <AddDebtForm
                    key={formKey}
                    debtToEdit={null}
                    onSave={handleDebtSaved}
                    onCancel={handleCancelForm}
                />
            )
        )}
        
        {step === 'INVEST' && renderFormStep(
            'Growth Engines', 
            'Add Brokerage, 401k, or Crypto.',
            <HiTrendingUp />, 
            'Adding: Investment',
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