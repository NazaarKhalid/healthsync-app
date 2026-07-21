import React, { useState } from 'react';
import api from '../api';

export default function OnboardingModal({ isOpen, onComplete, initialData }) {
  const [formData, setFormData] = useState({
    age: initialData?.age || '',
    gender: initialData?.gender || '',
    height_cm: initialData?.height_cm || '',
    weight_kg: initialData?.weight_kg || '',
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        last_checkin: new Date().toISOString() 
      };
      
      await api.patch('/users/profile/', payload);
      onComplete(); 
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0d10]/80 backdrop-blur-md p-4">
      <div className="bg-[#13171c]/95 backdrop-blur-2xl border border-white/[0.08] w-full max-w-md rounded-[28px] shadow-[0_25px_50px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Area */}
        <div className="p-8 text-center border-b border-white/[0.05]">
          <h2 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-500">
            Complete Your Profile
          </h2>
          <p className="text-slate-400 text-sm font-medium mt-2">
            We need these details to personalize your tracking and AI nudges.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Age</label>
            <input
              type="number"
              name="age"
              required
              min="10"
              max="120"
              value={formData.age}
              onChange={handleChange}
              className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl outline-none text-white placeholder-slate-600 text-sm font-medium focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
              placeholder="e.g. 25"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Gender</label>
            <select
              name="gender"
              required
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl outline-none text-white text-sm font-medium focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none [&>option]:bg-[#13171c] [&>option]:text-slate-200"
            >
              <option value="" disabled>Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Height (cm)</label>
            <input
              type="number"
              name="height_cm"
              required
              min="100"
              max="250"
              value={formData.height_cm}
              onChange={handleChange}
              className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl outline-none text-white placeholder-slate-600 text-sm font-medium focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
              placeholder="e.g. 175"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Weight (kg)</label>
            <input
              type="number"
              name="weight_kg"
              required
              min="20"
              max="300"
              step="0.1"
              value={formData.weight_kg}
              onChange={handleChange}
              className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl outline-none text-white placeholder-slate-600 text-sm font-medium focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
              placeholder="e.g. 70.5"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 bg-gradient-to-r from-amber-500 to-emerald-600 hover:brightness-110 text-white rounded-xl font-bold tracking-wide shadow-[0_4px_15px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Save & Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}