import axios from 'axios';

const api = axios.create({
  baseURL: 'https://healthsync-backend-1scb.onrender.com/api', 
});


// Interceptor: Runs before every API call
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;