/* File: src/components/Gamification/FreedomRoadmap.tsx */
import React from 'react';
import { HiCheck, HiLockClosed } from 'react-icons/hi';

interface Props {
  netWorth: number;
  debt: number;
  passiveIncome: number;
}

const FreedomRoadmap: React.FC<Props> = ({ netWorth, debt, passiveIncome }) => {
  
  // Define Milestones
  const milestones = [
    { id: 1, label: "Debt Free", achieved: debt <= 0, sub: "Net Worth > $0" },
    { id: 2, label: "The First $10k", achieved: netWorth >= 10000, sub: "Safety Net Built" },
    { id: 3, label: "The Hardest $100k", achieved: netWorth >= 100000, sub: "Compound Fuel" },
    { id: 4, label: "Quarter Million", achieved: netWorth >= 250000, sub: "Momentum" },
    { id: 5, label: "Liquid Millionaire", achieved: netWorth >= 1000000, sub: "High Net Worth" },
    { id: 6, label: "Financial Freedom", achieved: passiveIncome >= 40000, sub: "Work Optional" } // Simplified goal
  ];

  // Calculate progress bar width
  const completedCount = milestones.filter(m => m.achieved).length;
  const progressPercent = (completedCount / (milestones.length - 1)) * 100;

  return (
    <div className="relative py-8">
      {/* Connection Line */}
      <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 z-0 rounded-full"></div>
      <div 
        className="absolute top-1/2 left-0 h-1 bg-blue-500 -translate-y-1/2 z-0 rounded-full transition-all duration-1000" 
        style={{ width: `${Math.min(progressPercent, 100)}%` }}
      ></div>

      <div className="relative z-10 flex justify-between w-full px-2">
        {milestones.map((m, idx) => {
          const isCurrent = !m.achieved && (idx === 0 || milestones[idx-1].achieved);
          
          return (
            <div key={m.id} className="flex flex-col items-center group">
               {/* Node Circle */}
               <div 
                 className={`
                   w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300
                   ${m.achieved 
                     ? 'bg-blue-600 border-blue-600 text-white' 
                     : isCurrent 
                       ? 'bg-white border-blue-500 text-blue-500 animate-pulse shadow-[0_0_0_4px_rgba(59,130,246,0.2)]' 
                       : 'bg-gray-100 border-gray-300 text-gray-400'}
                 `}
               >
                 {m.achieved ? <HiCheck size={14} /> : isCurrent ? <div className="w-2 h-2 bg-blue-500 rounded-full" /> : <HiLockClosed size={12} />}
               </div>
               
               {/* Label */}
               <div className={`mt-3 text-center transition-opacity duration-300 ${isCurrent ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
                 <p className={`text-xs font-bold ${m.achieved || isCurrent ? 'text-gray-900' : 'text-gray-400'}`}>
                    {m.label}
                 </p>
                 <p className="text-[10px] text-gray-500 font-medium">{m.sub}</p>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FreedomRoadmap;