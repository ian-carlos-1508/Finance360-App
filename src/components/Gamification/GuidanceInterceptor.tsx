/* File: src/components/Gamification/GuidanceInterceptor.tsx */
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFinancialJourney } from '../../hooks/useFinancialJourney';
import styles from './GuidanceInterceptor.module.css'; 

const GuidanceInterceptor: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { journey } = useFinancialJourney();
  const [warning, setWarning] = useState<{title: string, msg: string, redirect: string} | null>(null);

  useEffect(() => {
    // Safety check: If journey isn't loaded, stop.
    if (!journey) return;

    // RULE 1: Debt Trap Interceptor
    // Logic: If user visits Investment page, but is Level < 3 AND has "Eliminate High Interest" quest incomplete
    if (location.pathname.includes('/assets') || location.pathname.includes('/planners/investment')) {
        // Find the 'Eliminate High Interest' module status (T2-01)
        const buildStep = journey.steps.find(s => s.id === 'build');
        const debtModule = buildStep?.modules.find(m => m.id === 'T2-01'); // Looking for slug 'T2-01'
        
        // Safely access userLevel with a default value of 1
        const currentLevel = journey.userLevel ?? 1;

        // If they are lower level OR they have the quest pending
        if (currentLevel < 3 && debtModule && debtModule.status !== 'COMPLETED') {
            setWarning({
                title: '⚠️ Drag Coefficient Critical',
                msg: 'Commander, you are attempting to deploy capital while carrying high-interest debt. This is mathematically inefficient. We recommend neutralizing the threat first.',
                redirect: '/planners/debt'
            });
            return;
        }
    }

    setWarning(null);
  }, [location, journey]);

  if (!warning) return null;

  return (
    <div className={styles.overlay}>
       <div className={styles.modal}>
          <h2 className={styles.title}>{warning.title}</h2>
          <p className={styles.message}>{warning.msg}</p>
          
          <div className={styles.buttonGroup}>
             <button 
               onClick={() => { setWarning(null); navigate(warning.redirect); }}
               className={styles.primaryBtn}
             >
               Reroute to Safety
             </button>
             <button 
               onClick={() => setWarning(null)}
               className={styles.secondaryBtn}
             >
               Override Protocol
             </button>
          </div>
       </div>
    </div>
  );
};

export default GuidanceInterceptor;