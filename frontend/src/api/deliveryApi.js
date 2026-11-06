import axiosInstance from './axiosInstance';

export const deliveryApi = {
  createDeliveryTask: (data) => axiosInstance.post('/deliveries', data),
  getAvailableTasks: (params) => axiosInstance.get('/deliveries/available', { params }),
  getMyAssignedTasks: (params) => axiosInstance.get('/deliveries/my', { params }),
  getSeekerDeliveries: (params) => axiosInstance.get('/deliveries/seeker', { params }),
  acceptTask: (id) => axiosInstance.patch(`/deliveries/${id}/accept`),
  updateStatus: (id, data) => axiosInstance.patch(`/deliveries/${id}/status`, data),
  markPickedUp: (id) => axiosInstance.patch(`/deliveries/${id}/picked-up`),
  markDelivered: (id, data) => axiosInstance.patch(`/deliveries/${id}/delivered`, data),
  confirmReceipt: (id) => axiosInstance.patch(`/deliveries/${id}/confirm-receipt`),
  getDelivery: (id) => axiosInstance.get(`/deliveries/${id}`)
};
