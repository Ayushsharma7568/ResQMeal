import axiosInstance from './axiosInstance';

export const analyticsApi = {
  getImpactAnalytics: () => axiosInstance.get('/analytics/impact')
};

