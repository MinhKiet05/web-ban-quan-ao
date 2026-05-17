/**
 * API Client - Axios instance với interceptor
 * - Tự động thêm access token vào Authorization header
 * - Tự động refresh token khi access token hết hạn (401)
 * - Tự động logout nếu refresh token thất bại
 */

import axios from 'axios';

const API_BASE_URL = 'https://web-ban-quan-ao-9s0d.onrender.com/api';

// Flag để track refresh token request (tránh multiple refresh calls)
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Tạo Axios instance
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Gửi cookies cùng request
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * - Thêm access token từ localStorage vào Authorization header
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * - Kiểm tra 401 Unauthorized
 * - Tự động gọi refresh token
 * - Retry original request với token mới
 * - Nếu refresh fail → logout
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu không phải 401 hoặc không có response, reject ngay
    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Tránh retry vô hạn (check xem đã retry chưa)
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // Nếu đang refresh token, queue request này chờ
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // Bắt đầu refresh token
    isRefreshing = true;
    originalRequest._retry = true;

    try {
      // Gọi API refresh token
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          withCredentials: true, // Gửi cookies để lấy refreshToken
        }
      );

      const newAccessToken = response.data.data?.accessToken;

      if (!newAccessToken) {
        throw new Error('No access token in response');
      }

      // Lưu token mới vào localStorage
      localStorage.setItem('accessToken', newAccessToken);

      // Update header request gốc
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      // Process all queued requests
      processQueue(null, newAccessToken);

      // Retry request gốc
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh token fail → logout
      console.error('Token refresh failed:', refreshError);
      
      // Xóa token
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      
      // Process failed queue
      processQueue(refreshError, null);

      // Redirect to login
      window.location.href = '/login';
      
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
