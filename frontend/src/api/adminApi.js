import axiosInstance from './axiosInstance';

export const adminApi = {
  getUsers: (params) => axiosInstance.get('/admin/users', { params }),
  getListings: (params) => axiosInstance.get('/admin/listings', { params }),
  getDeliveries: (params) => axiosInstance.get('/admin/deliveries', { params }),
  getClaims: (params) => axiosInstance.get('/admin/claims', { params }),
  getAnalytics: (params) => axiosInstance.get('/admin/analytics', { params })
};

export default adminApi;
