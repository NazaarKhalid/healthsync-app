import React, { useState, useEffect } from 'react';
import api from '../api';

export default function EditProfileModal({ isOpen, onClose, onSuccess, userProfile }) {
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    height_cm: '',
    weight_kg: '',
    activity_level: '',
    primary_goal: '',
  });
  const [loading, setLoading] = useState(false);

  // Pre-fill the form whenever the modal opens or the profile changes
  useEffect(() => {
    if (userProfile) {
      setFormData({
        age: userProfile.age || '',
        gender: userProfile.gender || '',
        height_cm: userProfile.height_cm || '',
        weight_kg: userProfile.weight_kg || '',
        activity_level: userProfile.activity_level || '',
        primary_goal: userProfile.primary_goal || '',
      });
    }
  }, [userProfile, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // PATCH request allows sending partial updates seamlessly
      await api.patch('/users/profile/', formData);
      onSuccess(); // Triggers the dashboard to re-fetch profile and macros
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0d10]/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative bg-[#13171c]/95 backdrop-blur-2xl border border-white/[0.08] w-full max-w-md rounded-[28px] shadow-[0_25px_50px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 duration-200 my-8">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-white bg-white/[0.05] p-2 rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8 pb-4 border-b border-white/[0.05]">
          <h2 className="text-2xl font-black tracking-tighter text-white">
            Edit Profile
          </h2>
          <p className="text-slate-400 text-sm font-medium mt-1">
            Update your metrics to recalculate your macro targets.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Age</label>
              <input
                type="number"
                name="age"
                min="10"
                max="120"
                value={formData.age}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl outline-none text-white text-sm font-medium focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl outline-none text-white text-sm font-medium focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none [&>option]:bg-[#13171c] [&>option]:text-slate-200"
              >
                <option value="" disabled>Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Height (cm)</label>
              <input
                type="number"
                name="height_cm"
                min="100"
                max="250"
                value={formData.height_cm}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl outline-none text-white text-sm font-medium focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Weight (kg)</label>
              <input
                type="number"
                name="weight_kg"
                min="20"
                max="300"
                step="0.1"
                value={formData.weight_kg}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl outline-none text-white text-sm font-medium focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Activity Level</label>
            <select
              name="activity_level"
              value={formData.activity_level}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl outline-none text-white text-sm font-medium focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none [&>option]:bg-[#13171c] [&>option]:text-slate-200"
            >
              <option value="" disabled>Select Activity Level</option>
              <option value="Sedentary">Sedentary (Little or no exercise)</option>
              <option value="Lightly Active">Lightly Active (Light exercise 1-3 days/wk)</option>
              <option value="Moderately Active">Moderately Active (Moderate exercise 3-5 days/wk)</option>
              <option value="Very Active">Very Active (Hard exercise 6-7 days/wk)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Primary Goal</label>
            <select
              name="primary_goal"
              value={formData.primary_goal}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl outline-none text-white text-sm font-medium focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none [&>option]:bg-[#13171c] [&>option]:text-slate-200"
            >
              <option value="" disabled>Select Goal</option>
              <option value="Lose Weight">Lose Weight</option>
              <option value="Maintain">Maintain Weight</option>
              <option value="Build Muscle">Build Muscle / Gain Weight</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 bg-white/[0.1] hover:bg-white/[0.15] text-white rounded-xl font-bold tracking-wide transition-all disabled:opacity-50 flex items-center justify-center border border-white/[0.1]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Save Changes'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}