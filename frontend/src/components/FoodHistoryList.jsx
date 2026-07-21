import React, { useState, useEffect } from 'react';
import api from '../api';

export default function FoodHistoryList({ refreshTrigger, onDeleteSuccess }) {
  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

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

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    
    setDeletingId(id);
    try {
      await api.delete(`/tracker/history/${id}/`);
      
      setHistory(prev => prev.filter(food => food.id !== id));
      
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (error) {
      console.error("Failed to delete food entry", error);
      alert("Failed to delete entry. Check your server connection.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-6 opacity-70">
       <div className="flex items-center space-x-1.5">
         <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></div>
         <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-75"></div>
         <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce delay-150"></div>
       </div>
    </div>
  );
  
  if (history.length === 0) return (
    <div className="text-sm text-slate-500 py-6 text-center font-medium bg-white/[0.02] rounded-xl border border-white/[0.05]">
      No meals logged recently.
    </div>
  );

  return (
    <div className="space-y-3 pr-2 pb-4">
      {history.map((food) => (
        <div key={food.id} className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-xl overflow-hidden shadow-lg hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300">
          
          <button
            onClick={() => setExpandedId(expandedId === food.id ? null : food.id)}
            className="w-full px-4 py-3.5 flex justify-between items-center bg-transparent transition-colors text-left focus:outline-none"
          >
            <span className="font-bold text-slate-200 text-sm truncate pr-4 drop-shadow-sm">
              {food.item_name}
            </span>
            <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap bg-white/[0.05] border border-white/[0.05] px-2.5 py-1 rounded-md">
              {new Date(food.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </button>

          {expandedId === food.id && (
            <div className="px-4 py-3 bg-black/20 border-t border-white/[0.05] flex flex-col animate-in slide-in-from-top-2 duration-200">
              
              {/* Macros Grid */}
              <div className="grid grid-cols-4 gap-2 text-center mb-4">
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Cals</p>
                  <p className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 drop-shadow-sm">
                    {food.calories}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Pro</p>
                  <p className="text-sm font-bold text-white">
                    {food.protein}<span className="text-emerald-400 text-xs ml-0.5">g</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Carbs</p>
                  <p className="text-sm font-bold text-white">
                    {food.carbs}<span className="text-amber-400 text-xs ml-0.5">g</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Fats</p>
                  <p className="text-sm font-bold text-white">
                    {food.fats}<span className="text-teal-400 text-xs ml-0.5">g</span>
                  </p>
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => handleDelete(food.id, e)}
                disabled={deletingId === food.id}
                className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {deletingId === food.id ? (
                  <span className="flex items-center space-x-2">
                    <div className="w-3 h-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </span>
                ) : (
                  'Delete Entry'
                )}
              </button>
              
            </div>
          )}
        </div>
      ))}
    </div>
  );
}