import axiosInstance from './axiosInstance';

export const claimApi = {
  createClaim: (claimData) => axiosInstance.post('/claims', claimData),
  getMyClaims: (params) => axiosInstance.get('/claims/my', { params }),
  getIncomingClaims: (params) => axiosInstance.get('/claims/incoming', { params }),
  getClaim: (id) => axiosInstance.get(`/claims/${id}`),
  approveClaim: (id) => axiosInstance.patch(`/claims/${id}/approve`),
  rejectClaim: (id, data) => axiosInstance.patch(`/claims/${id}/reject`, data),
  cancelClaim: (id) => axiosInstance.patch(`/claims/${id}/cancel`)
};
