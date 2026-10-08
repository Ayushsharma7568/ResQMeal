import axiosInstance from './axiosInstance';

export const listingApi = {
  createListing: (listingData) => axiosInstance.post('/listings', listingData),
  getListings: (params) => axiosInstance.get('/listings', { params }),
  getListing: (id) => axiosInstance.get(`/listings/${id}`),
  getMyListings: (params) => axiosInstance.get('/listings/my/listings', { params }),
  updateListing: (id, listingData) => axiosInstance.put(`/listings/${id}`, listingData),
  deleteListing: (id) => axiosInstance.delete(`/listings/${id}`)
};
