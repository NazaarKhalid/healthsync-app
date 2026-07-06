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
        last_checkin: new Date().toISOString() // 
      };
      
      await api.patch('http://127.0.0.1:8000/api/users/profile/', payload);
      onComplete(); 
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-6 text-center">
          <h2 className="text-2xl font-black text-white tracking-tight">Complete Your Profile</h2>
          <p className="text-emerald-50 text-sm font-medium mt-1">
            We need these details to personalize your tracking and AI nudges.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Age</label>
            <input
              type="number"
              name="age"
              required
              min="10"
              max="120"
              value={formData.age}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-800 font-medium"
              placeholder="e.g. 25"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Gender</label>
            <select
              name="gender"
              required
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-800 font-medium appearance-none"
            >
              <option value="" disabled>Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Height (cm)</label>
            <input
              type="number"
              name="height_cm"
              required
              min="100"
              max="250"
              value={formData.height_cm}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-800 font-medium"
              placeholder="e.g. 175"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Weight (kg)</label>
            <input
              type="number"
              name="weight_kg"
              required
              min="20"
              max="300"
              step="0.1"
              value={formData.weight_kg}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-800 font-medium"
              placeholder="e.g. 70.5"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold tracking-wide shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}