import React, { useState } from 'react';
import api from '../api';

export default function MealUploaderModal({ isOpen, onClose, onLogSuccess }) {
  const [activeTab, setActiveTab] = useState('vision'); // 'vision' or 'manual'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // States for Manual Entry
  const [manualData, setManualData] = useState({ item_name: '', calories: '', protein: '', carbs: '', fats: '' });
  
  // State for Vision Entry
  const [imageFile, setImageFile] = useState(null);

  if (!isOpen) return null;

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await api.post('/tracker/log/manual/', manualData);
      onLogSuccess(); 
      onClose(); 
    } catch (err) {
      setError('Failed to log meal manually. Check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleVisionSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      setError('Please select an image first.');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      await api.post('/tracker/log/vision/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onLogSuccess(); 
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Vision analysis failed. Ensure it is a valid food image.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0d10]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#13171c]/95 backdrop-blur-2xl border border-white/[0.08] rounded-[24px] w-full max-w-md overflow-hidden shadow-[0_25px_50px_rgba(0,0,0,0.8)]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/[0.05]">
          <h3 className="font-bold text-slate-200 text-lg tracking-wide">Log a Meal</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-rose-400 transition-colors font-bold text-2xl leading-none">&times;</button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-white/[0.05]">
          <button 
            className={`flex-1 py-3.5 text-sm font-bold transition-all ${activeTab === 'vision' ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-500/10' : 'text-slate-500 hover:bg-white/[0.02] hover:text-slate-300'}`}
            onClick={() => setActiveTab('vision')}
          >
            AI Vision Log
          </button>
          <button 
            className={`flex-1 py-3.5 text-sm font-bold transition-all ${activeTab === 'manual' ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-500/10' : 'text-slate-500 hover:bg-white/[0.02] hover:text-slate-300'}`}
            onClick={() => setActiveTab('manual')}
          >
            Manual Log
          </button>
        </div>

        <div className="p-6">
          {error && <div className="mb-5 p-3.5 bg-rose-500/10 text-rose-400 text-sm font-medium rounded-xl border border-rose-500/20 text-center">{error}</div>}

          {/* Vision Form */}
          {activeTab === 'vision' && (
            <form onSubmit={handleVisionSubmit} className="space-y-5">
              <div className="border-2 border-dashed border-white/[0.1] rounded-xl p-8 text-center bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-white/[0.05] file:text-slate-200 hover:file:bg-white/[0.1] hover:file:text-white transition-all cursor-pointer"
                />
                <p className="mt-3 text-xs font-medium text-slate-500">Upload a clear photo of your plate.</p>
              </div>
              <button disabled={loading} type="submit" className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-emerald-600 hover:brightness-110 text-white rounded-xl font-bold tracking-wide shadow-[0_4px_15px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50 disabled:grayscale">
                {loading ? 'Analyzing with AI...' : 'Analyze & Log Meal'}
              </button>
            </form>
          )}

          {/* Manual Form */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4 text-slate-200">
              <div>
                <input type="text" placeholder="Meal Name (e.g. Grilled Chicken)" className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl outline-none placeholder-slate-500 text-sm font-medium focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all" required onChange={e => setManualData({...manualData, item_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Calories" className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl outline-none placeholder-slate-500 text-sm font-medium focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all" required onChange={e => setManualData({...manualData, calories: e.target.value})} />
                <input type="number" placeholder="Protein (g)" className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl outline-none placeholder-slate-500 text-sm font-medium focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all" required onChange={e => setManualData({...manualData, protein: e.target.value})} />
                <input type="number" placeholder="Carbs (g)" className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl outline-none placeholder-slate-500 text-sm font-medium focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all" required onChange={e => setManualData({...manualData, carbs: e.target.value})} />
                <input type="number" placeholder="Fats (g)" className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl outline-none placeholder-slate-500 text-sm font-medium focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all" required onChange={e => setManualData({...manualData, fats: e.target.value})} />
              </div>
              <button disabled={loading} type="submit" className="w-full py-3.5 mt-2 bg-gradient-to-r from-amber-500 to-emerald-600 hover:brightness-110 text-white rounded-xl font-bold tracking-wide shadow-[0_4px_15px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50 disabled:grayscale">
                {loading ? 'Saving to Ledger...' : 'Log Manually'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}