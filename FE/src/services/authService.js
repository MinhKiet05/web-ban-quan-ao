/**
 * Authentication Service
 * - Gọi API auth
 * - Dùng Axios instance có interceptor
 */

import apiClient from './apiClient';

const BASE_URL = 'https://web-ban-quan-ao-9s0d.onrender.com/api';

export const authService = {
  /**
   * Login
   * POST /auth/login
   * Response: { user, token: { accessToken } }
   * Cookie: refreshToken (HTTP-only)
   */
  login: async (identifier, password) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Gửi và nhận cookies
      body: JSON.stringify({ identifier, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || data.message || 'Đăng nhập thất bại');
    }

    return data;
  },

  /**
   * Register
   * POST /auth/register
   */
  register: async (email, password, fullName, phone) => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password, fullName, phone }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || data.message || 'Đăng ký thất bại');
    }

    return data;
  },

  /**
   * Get current user info từ access token
   * GET /auth/me
   * Response: { user: { id, email, fullName, phone, role, ... } }
   */
  getMe: async () => {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Không thể lấy thông tin user');
    }
  },

  /**
   * Logout
   * POST /auth/logout
   */
  logout: async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      return response.json();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  /**
   * Refresh access token
   * POST /auth/refresh
   * Response: { accessToken }
   */
  refreshToken: async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      return response.json();
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  },

  /**
   * Verify access token còn valid không
   * (Dùng để check trước khi restore user)
   */
  verifyToken: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        return null;
      }

      // Gọi /me endpoint để verify
      const data = await authService.getMe();
      return data;
    } catch (error) {
      console.log('Token verification failed:', error.message);
      return null;
    }
  },
};

