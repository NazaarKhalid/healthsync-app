import React, { useState, useEffect } from 'react';
import api from '../api';

export default function MacroWidget({ refreshTrigger }) {
  const [macros, setMacros] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await api.get('/tracker/summary/');
        setMacros(response.data);
      } catch (error) {
        console.error("Failed to fetch macros", error);
      }
    };
    fetchSummary();
  }, [refreshTrigger]);

  const DAILY_GOAL = 2000;
  const isOverGoal = macros.calories > DAILY_GOAL;
  
  const calBg = isOverGoal 
    ? "bg-rose-500/10 border-rose-500/30 shadow-[0_10px_30px_rgba(225,29,72,0.15)]" 
    : "bg-emerald-500/10 border-emerald-500/30 shadow-[0_10px_30px_rgba(16,185,129,0.15)]";

  const calText = isOverGoal
    ? "from-rose-400 to-rose-500"
    : "from-emerald-400 to-teal-400";

  return (
    <div className="flex flex-col space-y-3 md:space-y-4 shrink-0">
      
      {/* Dynamic Calories Block - Now a glowing frosted glass pill */}
      <div className={`p-4 md:p-6 rounded-[24px] backdrop-blur-md flex flex-col items-center justify-center transition-all duration-500 border ${calBg}`}>
        <span className="text-[10px] md:text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 drop-shadow-sm">
          {isOverGoal ? 'Over Daily Goal' : 'Total Calories'}
        </span>
        
        {/* Neon Gradient Text */}
        <span className={`text-4xl md:text-5xl font-black tracking-tight drop-shadow-md text-transparent bg-clip-text bg-gradient-to-r ${calText}`}>
          {macros.calories}
        </span>
        
        <span className="text-[10px] md:text-xs font-medium text-slate-300 mt-2 bg-white/[0.05] border border-white/[0.1] px-4 py-1 rounded-full">
          / {DAILY_GOAL} kcal
        </span>
      </div>

      {/* Macros Grid - Deep tinted glass with neon accents */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {/* Protein */}
        <div className="bg-white/[0.03] backdrop-blur-md p-3 md:p-4 rounded-xl border border-white/[0.08] flex flex-col items-center shadow-lg transition-all hover:bg-white/[0.06]">
          <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Protein</span>
          <span className="text-sm md:text-lg font-black text-white mt-0.5">
            {macros.protein}<span className="text-amber-400 text-sm font-bold ml-0.5">g</span>
          </span>
        </div>
        
        {/* Carbs */}
        <div className="bg-white/[0.03] backdrop-blur-md p-3 md:p-4 rounded-xl border border-white/[0.08] flex flex-col items-center shadow-lg transition-all hover:bg-white/[0.06]">
          <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Carbs</span>
          <span className="text-sm md:text-lg font-black text-white mt-0.5">
            {macros.carbs}<span className="text-amber-400 text-sm font-bold ml-0.5">g</span>
          </span>
        </div>
        
        {/* Fats */}
        <div className="bg-white/[0.03] backdrop-blur-md p-3 md:p-4 rounded-xl border border-white/[0.08] flex flex-col items-center shadow-lg transition-all hover:bg-white/[0.06]">
          <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Fats</span>
          <span className="text-sm md:text-lg font-black text-white mt-0.5">
            {macros.fats}<span className="text-amber-400 text-sm font-bold ml-0.5">g</span>
          </span>
        </div>
      </div>
      
    </div>
  );
}