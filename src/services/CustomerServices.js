import requests from "./httpService";

const CustomerServices = {
  getAllCustomers: async ({ searchText = "" }) => {
    return requests.get(`/customer?searchText=${searchText}`);
  },

  addAllCustomers: async (body) => {
    return requests.post("/customer/add/all", body);
  },
  // user create
  createCustomer: async (body) => {
    return requests.post(`/customer/create`, body);
  },

  filterCustomer: async (email) => {
    return requests.post(`/customer/filter/${email}`);
  },

  getCustomerById: async (id) => {
    return requests.get(`/customer/${id}`);
  },

  updateCustomer: async (id, body) => {
    return requests.put(`/customer/${id}`, body);
  },

  deleteCustomer: async (id) => {
    return requests.delete(`/customer/${id}`);
  },

  sendPaymentNotification: async (id, amount) => {
    return requests.post(`/customer/payment-notification/${id}`, { amount });
  },

  sendNeftNotification: async (id, amount, neftNumber) => {
    return requests.post(`/customer/neft-notification/${id}`, { amount, neftNumber });
  },
};

export default CustomerServices;
