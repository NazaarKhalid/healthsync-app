import axios from 'axios';

const api = axios.create({
  baseURL: 'https://healthsync-backend-xxxx.onrender.com/api', 
});

// ... the rest of your interceptor code stays exactly the same

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