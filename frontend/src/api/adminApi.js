import axiosInstance from './axiosInstance';

export const adminApi = {
  getUsers: (params) => axiosInstance.get('/admin/users', { params }),
  updateUser: (id, data) => axiosInstance.patch(`/admin/users/${id}`, data),
  getListings: (params) => axiosInstance.get('/admin/listings', { params }),
  updateListing: (id, data) => axiosInstance.patch(`/admin/listings/${id}`, data),
  getDeliveries: (params) => axiosInstance.get('/admin/deliveries', { params }),
  getClaims: (params) => axiosInstance.get('/admin/claims', { params }),
  getAnalytics: (params) => axiosInstance.get('/admin/analytics', { params })
};

export default adminApi;
