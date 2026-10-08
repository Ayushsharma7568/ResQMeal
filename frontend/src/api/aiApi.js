import axiosInstance from './axiosInstance';

export const aiApi = {
  parseListing: (text) => axiosInstance.post('/ai/parse-listing', { text }),
  getRecommendations: (params) => axiosInstance.get('/ai/recommendations', { params }),
  getInsights: () => axiosInstance.get('/ai/insights'),
  queryAnalytics: (query) => axiosInstance.post('/ai/admin-query', { query })
};
