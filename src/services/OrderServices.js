import requests from "./httpService";

const OrderServices = {
  getAllOrders: async ({
    body,
    headers,
    customerName,
    status,
    page = 1,
    limit = 8,
    day,
    // source,
    method,
    startDate,
    endDate,
    // download = "",
  }) => {
    const enc = (v) => encodeURIComponent(v ?? "");
    // date inputs give YYYY-MM-DD; send the admin's local day boundaries
    const dayBoundary = (d, endOfDay) =>
      d
        ? new Date(`${d}T${endOfDay ? "23:59:59.999" : "00:00:00"}`).toISOString()
        : "";

    const searchName = enc(customerName);
    const searchStatus = enc(status);
    const searchDay = enc(day);
    const searchMethod = enc(method);
    const startD = enc(dayBoundary(startDate, false));
    const endD = enc(dayBoundary(endDate, true));

    return requests.get(
      `/orders?customerName=${searchName}&status=${searchStatus}&day=${searchDay}&page=${page}&limit=${limit}&startDate=${startD}&endDate=${endD}&method=${searchMethod}`,
      body,
      headers
    );
  },

  getAllOrdersTwo: async ({ invoice, body, headers }) => {
    const searchInvoice = invoice !== null ? invoice : "";
    return requests.get(`/orders/all?invoice=${searchInvoice}`, body, headers);
  },

  getRecentOrders: async ({
    page = 1,
    limit = 8,
    startDate = "1:00",
    endDate = "23:59",
  }) => {
    return requests.get(
      `/orders/recent?page=${page}&limit=${limit}&startDate=${startDate}&endDate=${endDate}`
    );
  },

  getOrderCustomer: async (id, body) => {
    return requests.get(`/orders/customer/${id}`, body);
  },

  getOrderById: async (id, body) => {
    return requests.get(`/orders/${id}`, body);
  },

  updateOrder: async (id, body, headers) => {
    return requests.put(`/orders/${id}`, body, headers);
  },

  deleteOrder: async (id) => {
    return requests.delete(`/orders/${id}`);
  },

  getDashboardOrdersData: async ({
    page = 1,
    limit = 8,
    endDate = "23:59",
  }) => {
    return requests.get(
      `/orders/dashboard?page=${page}&limit=${limit}&endDate=${endDate}`
    );
  },

  getDashboardAmount: async () => {
    return requests.get("/orders/dashboard-amount");
  },

  getDashboardCount: async () => {
    return requests.get("/orders/dashboard-count");
  },

  getDashboardRecentOrder: async ({ page = 1, limit = 8 }) => {
    return requests.get(
      `/orders/dashboard-recent-order?page=${page}&limit=${limit}`
    );
  },

  getBestSellerProductChart: async () => {
    return requests.get("/orders/best-seller/chart");
  },

  //for sending email invoice to customer
  sendEmailInvoiceToCustomer: async (body) => {
    return requests.post("/order/customer/invoice", body);
  },

  addPosOrder: async (body) => {
    return requests.post("/orders/pos/add", body);
  },

  getMonthlyReport: async ({ month, year }) => {
    return requests.get(`/orders/monthly-report?month=${month}&year=${year}`);
  },
};

export default OrderServices;
