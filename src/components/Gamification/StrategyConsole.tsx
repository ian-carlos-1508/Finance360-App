/* File: src/components/Gamification/StrategyConsole.tsx */
import React from 'react';
import { HiSparkles, HiExclamationCircle, HiLightBulb } from 'react-icons/hi';

interface Props {
  netWorth: number;
  totalDebt: number;
  monthsSafety: number;
  investmentRatio: number;
}

const StrategyConsole: React.FC<Props> = ({ netWorth, totalDebt, monthsSafety, investmentRatio }) => {
  
  // --- HEURISTIC ENGINE (Simulated AI) ---
  let message = "System Status: Nominal. Maintain current trajectory.";
  let type: 'alert' | 'tip' | 'success' = 'tip';
  let action = "Review Goals";

  if (monthsSafety < 3) {
    message = "Emergency reserves are critically low. High vulnerability to income shock.";
    type = 'alert';
    action = "Boost Cash";
  } else if (totalDebt > 0 && (totalDebt / netWorth) > 0.5) {
    message = "Debt drag is suppressing wealth compounding. Avalanche method recommended.";
    type = 'alert';
    action = "Attack Debt";
  } else if (investmentRatio < 0.2 && netWorth > 10000) {
    message = "Capital inefficiency detected. Large cash position is eroding due to inflation.";
    type = 'tip';
    action = "Deploy Capital";
  } else if (netWorth > 100000 && netWorth < 1000000) {
    message = "The 'Boring Middle'. Consistency is your greatest asset now. Automate contributions.";
    type = 'success';
    action = "Automate";
  } else if (netWorth >= 1000000) {
     message = "Heritage Mode Unlocked. Focus on tax efficiency and estate planning.";
     type = 'success';
     action = "Optimize Taxes";
  }

  // Colors
  const bgClass = type === 'alert' ? 'bg-red-50 border-red-100' 
                : type === 'success' ? 'bg-green-50 border-green-100' 
                : 'bg-indigo-50 border-indigo-100';
  
  const iconColor = type === 'alert' ? 'text-red-600' 
                  : type === 'success' ? 'text-green-600' 
                  : 'text-indigo-600';

  const Icon = type === 'alert' ? HiExclamationCircle 
             : type === 'success' ? HiSparkles 
             : HiLightBulb;

  return (
    <div className={`p-4 rounded-xl border ${bgClass} flex items-start gap-4 shadow-sm`}>
       <div className={`p-2 rounded-full bg-white ${iconColor} shadow-sm`}>
          <Icon size={24} />
       </div>
       <div className="flex-1">
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${iconColor}`}>
             AI Strategy Insight
          </h4>
          <p className="text-sm text-gray-700 font-medium leading-relaxed">
             {message}
          </p>
       </div>
       <div className="self-center">
          <button className={`text-xs font-bold px-3 py-2 rounded-lg bg-white border hover:shadow-md transition-shadow ${iconColor}`}>
             {action} &rarr;
          </button>
       </div>
    </div>
  );
};

export default StrategyConsole;