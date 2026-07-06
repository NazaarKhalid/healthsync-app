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
      onLogSuccess(); // Tell the dashboard to refresh!
      onClose(); // Close the modal
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

    // Package the file using FormData
    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      await api.post('/tracker/log/vision/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onLogSuccess(); // Tell the dashboard to refresh!
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Vision analysis failed. Ensure it is a valid food image.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        
        {/* Header & Tabs */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-lg">Log a Meal</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
        </div>
        
        <div className="flex border-b border-gray-100">
          <button 
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'vision' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('vision')}
          >
            AI Vision Log
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'manual' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('manual')}
          >
            Manual Log
          </button>
        </div>

        <div className="p-6">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}

          {/* Vision Form */}
          {activeTab === 'vision' && (
            <form onSubmit={handleVisionSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-2 text-xs text-gray-400">Upload a photo of your plate.</p>
              </div>
              <button disabled={loading} type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50">
                {loading ? 'Analyzing with Gemini...' : 'Analyze & Log Meal'}
              </button>
            </form>
          )}

          {/* Manual Form */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-3 text-black">
              <input type="text" placeholder="Meal Name (e.g. Banana)" className="w-full px-3 py-2 border rounded-lg" required onChange={e => setManualData({...manualData, item_name: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Calories" className="w-full px-3 py-2 border rounded-lg" required onChange={e => setManualData({...manualData, calories: e.target.value})} />
                <input type="number" placeholder="Protein (g)" className="w-full px-3 py-2 border rounded-lg" required onChange={e => setManualData({...manualData, protein: e.target.value})} />
                <input type="number" placeholder="Carbs (g)" className="w-full px-3 py-2 border rounded-lg" required onChange={e => setManualData({...manualData, carbs: e.target.value})} />
                <input type="number" placeholder="Fats (g)" className="w-full px-3 py-2 border rounded-lg" required onChange={e => setManualData({...manualData, fats: e.target.value})} />
              </div>
              <button disabled={loading} type="submit" className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50">
                {loading ? 'Saving...' : 'Log Manually'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}