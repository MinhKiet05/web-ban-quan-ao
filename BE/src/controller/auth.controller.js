/**
 * Authentication Controller
 * @description Xử lý đăng ký, đăng nhập, và các tác vụ xác thực
 */

const {
  login,
  createUser,
  refreshAccessToken,
  logout,
  logoutAllDevices,
  getUserSessions,
  logoutSessionById,
} = require("../services/auth.service");
const { findUserById } = require("../model/user.model");
const { HTTP_STATUS } = require('../constants');
const { 
  createError, 
  createValidationError,
  AUTH_ERRORS 
} = require('../constants/errors');
const AuthController = {
  /**
   * Đăng nhập
   * POST /api/auth/login
   */
  login: async (req, res, next) => {
    try {
      const { identifier, password } = req.body;

      // Lấy thông tin thiết bị từ request
      const deviceInfo = {
        deviceType: req.headers['device-type'] || 'unknown',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      };

     

      // Service xử lý validation, authentication, và tạo tokens
      const result = await login(identifier, password, deviceInfo);


      // Set refresh token trong HTTP-only cookie
      res.cookie("refreshToken", result.tokens.refreshToken, {
        httpOnly: true,           // Không thể truy cập từ JavaScript (chống XSS)
        secure: process.env.NODE_ENV === 'production', // HTTPS only trong production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' cho cross-origin, 'lax' cho dev
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        path: '/'
      });

      // Response (chỉ gửi accessToken)
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          user: result.user,
        },
        token: {
          accessToken: result.tokens.accessToken
        }
      });

      
    } catch (error) {
      console.error('Login error:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      next(error);
    }
  },

  /**
   * Đăng ký tài khoản mới
   * POST /api/auth/register
   */
  register: async (req, res, next) => {
    try {
      const { email, password, fullName, phone, role } = req.body;

      // Service xử lý validation và tạo user
      const result = await createUser(email, password, fullName, phone, role);

      // Response
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Đăng ký thành công',
        data: result
      });

    } catch (error) {
      next(error);
    }
  },

  /**
   * Đăng xuất
   * POST /api/auth/logout
   */
  logout: async (req, res, next) => {
    try {
      // Lấy refresh token từ cookie
      const refreshToken = req.cookies.refreshToken;

      // Vô hiệu hóa session trong database
      if (refreshToken) {
        await logout(refreshToken);
      }

      // Xóa refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/'
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Đăng xuất thành công'
      });

    } catch (error) {
      next(error);
    }
  },

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  refreshToken: async (req, res, next) => {
    try {
      // Lấy refreshToken từ cookie
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        throw createError(AUTH_ERRORS.REFRESH_TOKEN_INVALID);
      }

      // Verify và generate tokens mới
      const tokens = await refreshAccessToken(refreshToken);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Làm mới token thành công',
        data: {
          accessToken: tokens.accessToken
        }
      });

    } catch (error) {
      next(error);
    }
  },

  /**
   * Logout tất cả thiết bị
   * POST /api/auth/logout-all
   * Yêu cầu: Đã đăng nhập (có access token)
   */
  logoutAllDevices: async (req, res, next) => {
    try {
      const userId = req.user.userId; // Từ authenticate middleware

      // Vô hiệu hóa tất cả sessions của user
      const count = await logoutAllDevices(userId);

      // Xóa refresh token cookie của session hiện tại
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/'
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Đã đăng xuất khỏi ${count} thiết bị`,
        data: {
          sessionsDeactivated: count
        }
      });

    } catch (error) {
      next(error);
    }
  },

  /**
   * Lấy danh sách sessions đang active
   * GET /api/auth/sessions
   * Yêu cầu: Đã đăng nhập (có access token)
   */
  getSessions: async (req, res, next) => {
    try {
      const userId = req.user.userId; // Từ authenticate middleware
      const currentRefreshToken = req.cookies.refreshToken;

      // Lấy danh sách sessions từ service
      const sessions = await getUserSessions(userId, currentRefreshToken);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Lấy danh sách phiên đăng nhập thành công',
        data: {
          sessions: sessions,
          total: sessions.length
        }
      });

    } catch (error) {
      next(error);
    }
  },

  /**
   * Logout từ một session cụ thể (thiết bị khác)
   * DELETE /api/auth/sessions/:sessionId
   * Yêu cầu: Đã đăng nhập (có access token)
   */
  logoutSession: async (req, res, next) => {
    try {
      const userId = req.user.userId; // Từ authenticate middleware
      const sessionId = req.params.sessionId;

      // Vô hiệu hóa session cụ thể
      const success = await logoutSessionById(sessionId, userId);

      if (!success) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Không tìm thấy phiên đăng nhập hoặc không có quyền truy cập'
        });
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Đã đăng xuất khỏi thiết bị'
      });

    } catch (error) {
      next(error);
    }
  },

  /**
   * Lấy thông tin user hiện tại
   * GET /api/auth/me
   * Yêu cầu: Đã đăng nhập (có access token)
   * Response: { user: { id, email, fullName, phone, role, ... } }
   */
  me: async (req, res, next) => {
    try {
      const userId = req.user.userId; // Từ authenticate middleware

      if (!userId) {
        throw createError(AUTH_ERRORS.AUTH_ACCOUNT_NOT_FOUND);
      }

      // Lấy thông tin user từ database
      const user = await findUserById(userId);

      if (!user) {
        throw createError(AUTH_ERRORS.AUTH_ACCOUNT_NOT_FOUND);
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Lấy thông tin user thành công',
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            phone: user.phone,
            role: user.role,
            avatarUrl: user.avatar_url,
            dateOfBirth: user.date_of_birth,
            gender: user.gender,
            tier: user.tier,
            loyaltyPoints: user.loyalty_points,
            createdAt: user.created_at
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }
};

module.exports = AuthController;
