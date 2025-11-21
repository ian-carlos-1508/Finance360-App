/* File: src/pages/Onboarding/OnboardingWizard.tsx */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import styles from './OnboardingWizard.module.css';

// Icons (Fixed Import)
import { 
  HiBanknotes, 
  HiCreditCard, 
  HiCheckCircle, 
  HiArrowRight, 
  HiPlus, 
  HiTrash,
  HiHome,
  HiArrowTrendingUp, // <--- FIX: Changed from HiTrendingUp
  HiChevronRight
} from 'react-icons/hi2';

type WizardStep = 'WELCOME' | 'CASH' | 'CREDIT' | 'LOANS' | 'INVESTMENTS' | 'COMPLETE';

// Data Interfaces
interface CashDraft { id: string; name: string; type: 'Checking' | 'Savings'; balance: string; }
interface CreditDraft { id: string; name: string; balance: string; limit: string; }
interface LoanDraft { id: string; name: string; balance: string; rate: string; payment: string; }
interface InvestDraft { id: string; name: string; type: 'Retirement' | 'Brokerage' | 'Crypto'; balance: string; }

const OnboardingWizard: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>('WELCOME');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- State Store ---
  const [cashAccounts, setCashAccounts] = useState<CashDraft[]>([]);
  const [creditCards, setCreditCards] = useState<CreditDraft[]>([]);
  const [loans, setLoans] = useState<LoanDraft[]>([]);
  const [investments, setInvestments] = useState<InvestDraft[]>([]);

  // --- Inputs State ---
  const [tempCash, setTempCash] = useState<Partial<CashDraft>>({ type: 'Checking', balance: '' });
  const [tempCredit, setTempCredit] = useState<Partial<CreditDraft>>({ balance: '', limit: '' });
  const [tempLoan, setTempLoan] = useState<Partial<LoanDraft>>({ balance: '', rate: '', payment: '' });
  const [tempInvest, setTempInvest] = useState<Partial<InvestDraft>>({ type: 'Retirement', balance: '' });

  // --- Handlers ---
  const addCash = () => {
    if (tempCash.name && tempCash.balance) {
      setCashAccounts([...cashAccounts, { ...tempCash, id: Date.now().toString() } as CashDraft]);
      setTempCash({ type: 'Checking', balance: '', name: '' }); 
    }
  };
  const addCredit = () => {
    if (tempCredit.name && tempCredit.balance) {
      setCreditCards([...creditCards, { ...tempCredit, id: Date.now().toString() } as CreditDraft]);
      setTempCredit({ balance: '', limit: '', name: '' }); 
    }
  };
  const addLoan = () => {
    if (tempLoan.name && tempLoan.balance) {
      setLoans([...loans, { ...tempLoan, id: Date.now().toString() } as LoanDraft]);
      setTempLoan({ balance: '', rate: '', payment: '', name: '' }); 
    }
  };
  const addInvest = () => {
    if (tempInvest.name && tempInvest.balance) {
      setInvestments([...investments, { ...tempInvest, id: Date.now().toString() } as InvestDraft]);
      setTempInvest({ type: 'Retirement', balance: '', name: '' }); 
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      alert("Session expired. Please log in.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/onboarding/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          cashAccounts, 
          creditCards, 
          loans, 
          investments 
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.details || 'Failed to save');
      
      navigate('/control');
    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- UI Helpers ---
  const ProgressBar = ({ step }: { step: number }) => (
    <div className={styles.progressBarContainer}>
      <div className={styles.track}>
         <div className={styles.fill} style={{ width: `${step * 20}%` }} />
      </div>
      <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400 mt-2">
        <span>Start</span>
        <span>Cash</span>
        <span>Credit</span>
        <span>Debt</span>
        <span>Invest</span>
      </div>
    </div>
  );

  const StepHeader = ({ icon, title, subtitle }: any) => (
    <div className="mb-6">
      <h2 className={styles.title}>{icon} {title}</h2>
      <p className={styles.subtitle}>{subtitle}</p>
    </div>
  );

  // --- WELCOME ---
  if (currentStep === 'WELCOME') {
    return (
      <div className={styles.container}>
        <div className={styles.wizardCard} style={{maxWidth: '600px'}}>
          <div className={styles.welcomeContainer}>
            <span className={styles.welcomeIcon}>🚀</span>
            <h1 className={styles.title} style={{justifyContent:'center'}}>Finance 360 Setup</h1>
            <p className={styles.subtitle}>
              Let's initialize your financial profile. This takes about 2 minutes.
            </p>
            <button onClick={() => setCurrentStep('CASH')} className={styles.nextButton} style={{margin: '0 auto'}}>
              Start <HiChevronRight />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- STEP 1: CASH ---
  if (currentStep === 'CASH') {
    return (
      <div className={styles.container}>
        <div className={styles.wizardCard}>
          <div className={styles.wizardHeader}><ProgressBar step={1} /></div>
          <div className={styles.content}>
            <StepHeader icon={<HiBanknotes className="text-green-600"/>} title="Cash Accounts" subtitle="Checking, Savings, and Cash on Hand." />
            
            <div className={styles.inputGroup}>
              <div className={styles.inputWrapper}>
                <label className={styles.label}>Name</label>
                <input className={styles.input} placeholder="Chase Checking" value={tempCash.name||''} onChange={e=>setTempCash({...tempCash, name:e.target.value})} />
              </div>
              <div className={styles.inputWrapper}>
                <label className={styles.label}>Type</label>
                <select className={styles.input} value={tempCash.type} onChange={e=>setTempCash({...tempCash, type:e.target.value as any})}>
                  <option>Checking</option><option>Savings</option>
                </select>
              </div>
              <div className={styles.inputWrapper}>
                <label className={styles.label}>Balance</label>
                <input type="number" className={styles.input} placeholder="0.00" value={tempCash.balance||''} onChange={e=>setTempCash({...tempCash, balance:e.target.value})} />
              </div>
              <button className={styles.addButton} onClick={addCash}><HiPlus /> Add</button>
            </div>

            <div className={styles.list}>
              {cashAccounts.map(item => (
                <div key={item.id} className={styles.listItem}>
                  <div className={styles.itemInfo}><span className={styles.itemName}>{item.name}</span><span className={styles.itemType}>{item.type}</span></div>
                  <div style={{display:'flex', gap:'1rem', alignItems:'center'}}><span className={styles.itemBalance} style={{color:'#10b981'}}>${item.balance}</span><HiTrash onClick={()=>setCashAccounts(cashAccounts.filter(x=>x.id!==item.id))} className={styles.deleteButton}/></div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.footer}>
            <button className={styles.backButton} onClick={()=>setCurrentStep('CREDIT')}>Skip This Step</button>
            <button className={styles.nextButton} onClick={()=>setCurrentStep('CREDIT')}>Next <HiArrowRight/></button>
          </div>
        </div>
      </div>
    );
  }

  // --- STEP 2: CREDIT ---
  if (currentStep === 'CREDIT') {
    return (
      <div className={styles.container}>
        <div className={styles.wizardCard}>
          <div className={styles.wizardHeader}><ProgressBar step={2} /></div>
          <div className={styles.content}>
            <StepHeader icon={<HiCreditCard className="text-blue-600"/>} title="Credit Cards" subtitle="Add active credit cards." />
            
            <div className={styles.inputGroup}>
              <div className={styles.inputWrapper}>
                <label className={styles.label}>Name</label>
                <input className={styles.input} placeholder="Amex Gold" value={tempCredit.name||''} onChange={e=>setTempCredit({...tempCredit, name:e.target.value})} />
              </div>
              <div className={styles.inputWrapper}>
                <label className={styles.label}>Limit</label>
                <input type="number" className={styles.input} placeholder="5000" value={tempCredit.limit||''} onChange={e=>setTempCredit({...tempCredit, limit:e.target.value})} />
              </div>
              <div className={styles.inputWrapper}>
                <label className={styles.label}>Current Balance</label>
                <input type="number" className={styles.input} placeholder="0.00" value={tempCredit.balance||''} onChange={e=>setTempCredit({...tempCredit, balance:e.target.value})} />
              </div>
              <button className={styles.addButton} onClick={addCredit}><HiPlus /> Add</button>
            </div>

            <div className={styles.list}>
              {creditCards.map(item => (
                <div key={item.id} className={styles.listItem}>
                  <div className={styles.itemInfo}><span className={styles.itemName}>{item.name}</span><span className={styles.itemType}>Limit: ${item.limit}</span></div>
                  <div style={{display:'flex', gap:'1rem', alignItems:'center'}}><span className={styles.itemBalance} style={{color:'#ef4444'}}>${item.balance}</span><HiTrash onClick={()=>setCreditCards(creditCards.filter(x=>x.id!==item.id))} className={styles.deleteButton}/></div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.footer}>
            <button className={styles.backButton} onClick={()=>setCurrentStep('LOANS')}>Skip</button>
            <button className={styles.nextButton} onClick={()=>setCurrentStep('LOANS')}>Next <HiArrowRight/></button>
          </div>
        </div>
      </div>
    );
  }

  // --- STEP 3: LOANS ---
  if (currentStep === 'LOANS') {
    return (
      <div className={styles.container}>
        <div className={styles.wizardCard}>
          <div className={styles.wizardHeader}><ProgressBar step={3} /></div>
          <div className={styles.content}>
            <StepHeader icon={<HiHome className="text-red-600"/>} title="Loans & Debts" subtitle="Mortgages, Student Loans, Auto Loans." />
            
            <div className={styles.inputGroup}>
              <div className={styles.inputWrapper}>
                <label className={styles.label}>Name</label>
                <input className={styles.input} placeholder="Student Loan" value={tempLoan.name||''} onChange={e=>setTempLoan({...tempLoan, name:e.target.value})} />
              </div>
              <div className={styles.inputWrapper}>
                <label className={styles.label}>APR %</label>
                <input type="number" className={styles.input} placeholder="5.5" value={tempLoan.rate||''} onChange={e=>setTempLoan({...tempLoan, rate:e.target.value})} />
              </div>
              <div className={styles.inputWrapper}>
                <label className={styles.label}>Balance</label>
                <input type="number" className={styles.input} placeholder="0.00" value={tempLoan.balance||''} onChange={e=>setTempLoan({...tempLoan, balance:e.target.value})} />
              </div>
              <button className={styles.addButton} onClick={addLoan}><HiPlus /> Add</button>
            </div>

            <div className={styles.list}>
              {loans.map(item => (
                <div key={item.id} className={styles.listItem}>
                  <div className={styles.itemInfo}><span className={styles.itemName}>{item.name}</span><span className={styles.itemType}>{item.rate}% APR</span></div>
                  <div style={{display:'flex', gap:'1rem', alignItems:'center'}}><span className={styles.itemBalance} style={{color:'#ef4444'}}>${item.balance}</span><HiTrash onClick={()=>setLoans(loans.filter(x=>x.id!==item.id))} className={styles.deleteButton}/></div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.footer}>
            <button className={styles.backButton} onClick={()=>setCurrentStep('INVESTMENTS')}>Skip</button>
            <button className={styles.nextButton} onClick={()=>setCurrentStep('INVESTMENTS')}>Next <HiArrowRight/></button>
          </div>
        </div>
      </div>
    );
  }

  // --- STEP 4: INVESTMENTS ---
  if (currentStep === 'INVESTMENTS') {
    return (
      <div className={styles.container}>
        <div className={styles.wizardCard}>
          <div className={styles.wizardHeader}><ProgressBar step={4} /></div>
          <div className={styles.content}>
            {/* FIX: Using HiArrowTrendingUp instead of HiTrendingUp */}
            <StepHeader icon={<HiArrowTrendingUp className="text-purple-600"/>} title="Investments" subtitle="Brokerage accounts, 401k, Crypto." />
            
            <div className={styles.inputGroup}>
              <div className={styles.inputWrapper}>
                <label className={styles.label}>Name</label>
                <input className={styles.input} placeholder="Vanguard 401k" value={tempInvest.name||''} onChange={e=>setTempInvest({...tempInvest, name:e.target.value})} />
              </div>
              <div className={styles.inputWrapper}>
                <label className={styles.label}>Type</label>
                <select className={styles.input} value={tempInvest.type} onChange={e=>setTempInvest({...tempInvest, type:e.target.value as any})}>
                  <option>Retirement</option><option>Brokerage</option><option>Crypto</option>
                </select>
              </div>
              <div className={styles.inputWrapper}>
                <label className={styles.label}>Value</label>
                <input type="number" className={styles.input} placeholder="0.00" value={tempInvest.balance||''} onChange={e=>setTempInvest({...tempInvest, balance:e.target.value})} />
              </div>
              <button className={styles.addButton} onClick={addInvest}><HiPlus /> Add</button>
            </div>

            <div className={styles.list}>
              {investments.map(item => (
                <div key={item.id} className={styles.listItem}>
                  <div className={styles.itemInfo}><span className={styles.itemName}>{item.name}</span><span className={styles.itemType}>{item.type}</span></div>
                  <div style={{display:'flex', gap:'1rem', alignItems:'center'}}><span className={styles.itemBalance} style={{color:'#8b5cf6'}}>${item.balance}</span><HiTrash onClick={()=>setInvestments(investments.filter(x=>x.id!==item.id))} className={styles.deleteButton}/></div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.footer}>
            <button className={styles.backButton} onClick={()=>setCurrentStep('COMPLETE')}>Skip</button>
            <button className={styles.nextButton} onClick={()=>setCurrentStep('COMPLETE')}>Finish <HiArrowRight/></button>
          </div>
        </div>
      </div>
    );
  }

  // --- COMPLETE ---
  return (
    <div className={styles.container}>
      <div className={styles.wizardCard} style={{maxWidth:'600px'}}>
        <div className={styles.welcomeContainer}>
          <span className={styles.welcomeIcon}>🎉</span>
          <h1 className={styles.title} style={{justifyContent:'center'}}>Setup Complete!</h1>
          <p className={styles.subtitle}>We have configured your dashboard.</p>
          
          <div style={{textAlign: 'left', display: 'inline-block', background: '#f0fdf4', padding: '1rem 2rem', borderRadius: '8px', marginBottom: '2rem', width:'100%'}}>
             <div className="grid grid-cols-2 gap-4">
               <p style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><HiCheckCircle className="text-green-600"/> {cashAccounts.length} Cash Accts</p>
               <p style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><HiCheckCircle className="text-green-600"/> {creditCards.length} Credit Cards</p>
               <p style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><HiCheckCircle className="text-green-600"/> {loans.length} Loans</p>
               <p style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><HiCheckCircle className="text-green-600"/> {investments.length} Investments</p>
             </div>
          </div>

          <button 
            onClick={handleFinish}
            disabled={isSubmitting}
            className={styles.nextButton}
            style={{margin: '0 auto', width: '100%', justifyContent: 'center'}}
          >
            {isSubmitting ? "Saving..." : "Go to Dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;