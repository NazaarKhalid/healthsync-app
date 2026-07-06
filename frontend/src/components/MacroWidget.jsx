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
  
  // Vibrant Gradient Backgrounds
  const calBg = isOverGoal 
    ? "bg-gradient-to-br from-rose-500 to-rose-700 shadow-rose-200" 
    : "bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-200";

  return (
    <div className="flex flex-col space-y-3 md:space-y-4 shrink-0">
      
      {/* Dynamic Calories Block - Now a bold gradient */}
      <div className={`${calBg} p-4 md:p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center transition-all duration-500 border border-white/20`}>
        <span className="text-[10px] md:text-xs font-bold text-white/90 uppercase tracking-wider mb-1 drop-shadow-sm">
          {isOverGoal ? 'Over Daily Goal' : 'Total Calories'}
        </span>
        <span className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
          {macros.calories}
        </span>
        <span className="text-[10px] md:text-xs font-medium text-white/80 mt-1 bg-white/20 px-3 py-1 rounded-full">
          / {DAILY_GOAL} kcal
        </span>
      </div>

      {/* Macros Grid - High contrast slate & emerald accents */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-100 flex flex-col items-center shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
          <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Protein</span>
          <span className="text-sm md:text-lg font-black text-slate-800 mt-0.5">{macros.protein}<span className="text-emerald-500 text-sm font-bold">g</span></span>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-100 flex flex-col items-center shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
          <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Carbs</span>
          <span className="text-sm md:text-lg font-black text-slate-800 mt-0.5">{macros.carbs}<span className="text-emerald-500 text-sm font-bold">g</span></span>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-100 flex flex-col items-center shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
          <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Fats</span>
          <span className="text-sm md:text-lg font-black text-slate-800 mt-0.5">{macros.fats}<span className="text-emerald-500 text-sm font-bold">g</span></span>
        </div>
      </div>
    </div>
  );
}