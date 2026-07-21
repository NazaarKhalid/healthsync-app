import axios from 'axios';

const api = axios.create({
  //baseURL: 'https://healthsync-backend-1scb.onrender.com/api', 
  baseURL: 'http://127.0.0.1:8000/api',
});

// Request Interceptor: Runs before every API call to attach the token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor: Catches 401 errors and refreshes the token
api.interceptors.response.use(
  (response) => {
    // If the request succeeds, just return the response normally
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 Unauthorized and we haven't tried to refresh yet
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Set a flag so we don't get stuck in an infinite loop

      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          // Use a standard axios call (NOT the 'api' instance) to avoid looping the interceptor
          const response = await axios.post('https://healthsync-backend-1scb.onrender.com/api/auth/refresh/', {
            refresh: refreshToken,
          });

          // 1. Save the brand new access token
          localStorage.setItem('access_token', response.data.access);

          // 2. Update the original failed request with the new token
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;

          // 3. Retry the original request!
          return api(originalRequest);
          
        } catch (refreshError) {
          // If the refresh token itself is expired, kick them to the login screen
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login'; 
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token exists, force login
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }

    // If it's any other type of error, just pass it along
    return Promise.reject(error);
  }
);

export default api;