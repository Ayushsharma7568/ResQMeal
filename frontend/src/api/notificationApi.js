import axiosInstance from './axiosInstance';

export const notificationApi = {
  getMyNotifications: (params) => axiosInstance.get('/notifications', { params }),
  markAsRead: (id) => axiosInstance.patch(`/notifications/${id}/read`),
  markAllAsRead: () => axiosInstance.patch('/notifications/read-all')
};
