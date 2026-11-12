import axiosInstance from './axiosInstance';

export const dispatchApi = {
  getActiveStatus: () => axiosInstance.get('/dispatch/active-status'),
  runCycle: () => axiosInstance.post('/dispatch/run-cycle')
};

export default dispatchApi;

