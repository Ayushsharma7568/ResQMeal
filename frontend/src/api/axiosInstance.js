import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach Authorization Bearer token from localStorage
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for standardized error messages
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const response = error.response?.data;
    const message = response?.message || error.message || 'An unexpected error occurred';
    return Promise.reject({
      status: error.response?.status || 500,
      message,
      errors: response?.errors || []
    });
  }
);

export default axiosInstance;
