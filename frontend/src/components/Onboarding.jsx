import React, { useState } from 'react';
import api from '../api';

export default function Onboarding({ onComplete }) {
  const [formData, setFormData] = useState({
    weight_kg: '',
    height_cm: '',
    age: '',
    gender: 'male',
    activity_level: 'moderate'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Quick structural validation
    if (!formData.weight_kg || !formData.height_cm || !formData.age) {
      setError('Please fill in all physical metrics.');
      setLoading(false);
      return;
    }

    try {
      // 1. Format the payload to match your Django HealthUser model exactly
      const payload = {
        age: parseInt(formData.age),
        height_cm: parseFloat(formData.height_cm),
        gender: formData.gender
      };

      // 2. Point to the correct Django URL we set up earlier
      await api.post('/users/onboard/', payload);
      
      onComplete();
    } catch (err) {
      console.error("Full error:", err.response); // This will log the exact Django error to your console
      setError(err.response?.data?.error || 'Failed to save profile metrics.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to HealthSync</h2>
        <p className="text-gray-500 text-sm mb-6">Let's establish your baseline physical metrics to calibrate your ChatBot context pipeline.</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={formData.weight_kg}
              onChange={(e) => setFormData({...formData, weight_kg: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="e.g. 75.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
            <input
              type="number"
              value={formData.height_cm}
              onChange={(e) => setFormData({...formData, height_cm: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="e.g. 180"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({...formData, age: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="e.g. 21"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving Metrics...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}