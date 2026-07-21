import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { token, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-black text-emerald-400">Loading...</div>; 
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}