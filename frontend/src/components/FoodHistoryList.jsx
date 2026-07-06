import React, { useState, useEffect } from 'react';
import api from '../api';

export default function FoodHistoryList({ refreshTrigger }) {
  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/tracker/history/');
        setHistory(response.data);
      } catch (error) {
        console.error("Failed to fetch food history", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [refreshTrigger]);

  if (loading) return <div className="text-sm text-slate-400 py-4 text-center font-medium">Loading history...</div>;
  if (history.length === 0) return <div className="text-sm text-slate-400 py-4 text-center font-medium">No meals logged recently.</div>;

  return (
    <div className="space-y-3 pr-2 pb-4">
      {history.map((food) => (
        <div key={food.id} className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200">
          
          <button
            onClick={() => setExpandedId(expandedId === food.id ? null : food.id)}
            className="w-full px-4 py-3.5 flex justify-between items-center bg-white hover:bg-emerald-50/50 transition-colors text-left"
          >
            <span className="font-bold text-slate-800 text-sm truncate pr-4">
              {food.item_name}
            </span>
            <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap bg-slate-50 px-2 py-1 rounded-md">
              {new Date(food.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </button>

          {expandedId === food.id && (
            <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 grid grid-cols-4 gap-2 text-center animate-in slide-in-from-top-2 duration-200">
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">Cals</p>
                <p className="text-sm font-black text-emerald-600">{food.calories}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">Pro</p>
                <p className="text-sm font-bold text-slate-700">{food.protein}g</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">Carbs</p>
                <p className="text-sm font-bold text-slate-700">{food.carbs}g</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">Fats</p>
                <p className="text-sm font-bold text-slate-700">{food.fats}g</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}