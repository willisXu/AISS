// API 客戶端
const API_BASE_URL = window.location.origin + '/api';

class APIClient {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      ...options,
      headers: this.getHeaders()
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.clearToken();
          window.location.href = '/login.html';
        }
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // 認證
  async login(tenantCode, username, password) {
    const data = await this.post('/auth/login', { tenantCode, username, password });
    this.setToken(data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  }

  async getCurrentUser() {
    return this.get('/auth/me');
  }

  async changePassword(oldPassword, newPassword) {
    return this.post('/auth/change-password', { oldPassword, newPassword });
  }

  // 門店
  async getStores() {
    return this.get('/stores');
  }

  async getStore(id) {
    return this.get(`/stores/${id}`);
  }

  async createStore(data) {
    return this.post('/stores', data);
  }

  async updateStore(id, data) {
    return this.put(`/stores/${id}`, data);
  }

  async deleteStore(id) {
    return this.delete(`/stores/${id}`);
  }

  // 商品
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/products${query ? '?' + query : ''}`);
  }

  async getProduct(id) {
    return this.get(`/products/${id}`);
  }

  async createProduct(data) {
    return this.post('/products', data);
  }

  async updateProduct(id, data) {
    return this.put(`/products/${id}`, data);
  }

  async deleteProduct(id) {
    return this.delete(`/products/${id}`);
  }

  async getCategories() {
    return this.get('/products/categories/all');
  }

  async createCategory(data) {
    return this.post('/products/categories', data);
  }

  // 庫存
  async getInventory(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/inventory${query ? '?' + query : ''}`);
  }

  async getInventoryAlerts() {
    return this.get('/inventory/alerts');
  }

  async updateInventory(id, data) {
    return this.put(`/inventory/${id}`, data);
  }

  async stockTake(data) {
    return this.post('/inventory/stock-take', data);
  }

  async getInventoryTransactions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/inventory/transactions${query ? '?' + query : ''}`);
  }

  // 採購
  async getPurchaseOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/purchases${query ? '?' + query : ''}`);
  }

  async getPurchaseOrder(id) {
    return this.get(`/purchases/${id}`);
  }

  async createPurchaseOrder(data) {
    return this.post('/purchases', data);
  }

  async updatePurchaseOrderStatus(id, status) {
    return this.patch(`/purchases/${id}/status`, { status });
  }

  async receivePurchaseOrder(id, data) {
    return this.post(`/purchases/${id}/receive`, data);
  }

  async getSuppliers() {
    return this.get('/purchases/suppliers/all');
  }

  async createSupplier(data) {
    return this.post('/purchases/suppliers', data);
  }

  // 銷售
  async getSalesOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/sales${query ? '?' + query : ''}`);
  }

  async getSalesOrder(id) {
    return this.get(`/sales/${id}`);
  }

  async createSalesOrder(data) {
    return this.post('/sales', data);
  }

  async updatePaymentStatus(id, paymentStatus) {
    return this.patch(`/sales/${id}/payment-status`, { payment_status: paymentStatus });
  }

  async getSalesStats(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/sales/stats/daily${query ? '?' + query : ''}`);
  }

  // 支付
  async getPayments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/payments${query ? '?' + query : ''}`);
  }

  async getPayment(id) {
    return this.get(`/payments/${id}`);
  }

  async createPayment(data) {
    return this.post('/payments', data);
  }

  async getPaymentMethods() {
    return this.get('/payments/methods/all');
  }

  async getPaymentStats(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/payments/stats/summary${query ? '?' + query : ''}`);
  }

  // 費用
  async getExpenses(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/expenses${query ? '?' + query : ''}`);
  }

  async getExpense(id) {
    return this.get(`/expenses/${id}`);
  }

  async createExpense(data) {
    return this.post('/expenses', data);
  }

  async updateExpense(id, data) {
    return this.put(`/expenses/${id}`, data);
  }

  async approveExpense(id, status) {
    return this.patch(`/expenses/${id}/approve`, { status });
  }

  async payExpense(id) {
    return this.patch(`/expenses/${id}/pay`, {});
  }

  async getExpenseCategories() {
    return this.get('/expenses/categories/all');
  }

  async getExpenseStats(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/expenses/stats/summary${query ? '?' + query : ''}`);
  }

  // 報表
  async getDashboard(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/reports/dashboard${query ? '?' + query : ''}`);
  }

  async getSalesReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/reports/sales${query ? '?' + query : ''}`);
  }

  async getInventoryReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/reports/inventory${query ? '?' + query : ''}`);
  }

  async getFinancialReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/reports/financial${query ? '?' + query : ''}`);
  }
}

// 創建全局 API 實例
const api = new APIClient();

// 檢查登入狀態
function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token && !window.location.pathname.includes('login.html')) {
    window.location.href = '/login.html';
  }
}

// 獲取當前用戶
function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// 登出
function logout() {
  api.clearToken();
  window.location.href = '/login.html';
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-TW');
}

// 格式化日期時間
function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-TW');
}

// 格式化金額
function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '$0';
  return '$' + Number(amount).toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

// 顯示訊息
function showMessage(message, type = 'success') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;

  const container = document.querySelector('.main-content') || document.body;
  container.insertBefore(alertDiv, container.firstChild);

  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}

// 確認對話框
function confirmAction(message) {
  return confirm(message);
}
