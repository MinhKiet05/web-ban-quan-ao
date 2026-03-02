const authServices = require("../services/user.service");
const { HTTP_STATUS } = require('../constants');
const { 
  createError, 
  createValidationError,
  AUTH_ERRORS 
} = require('../constants/errors');
/**
 * Authentication Controller
 * Xử lý đăng ký, đăng nhập, và các tác vụ xác thực
 */
const AuthController = {
  /**
   * Đăng nhập
   * POST /api/auth/login
   */
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Lấy thông tin thiết bị từ request
      const deviceInfo = {
        deviceType: req.headers['device-type'] || 'unknown',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      };

      // Service xử lý validation, authentication, và tạo tokens
      const result = await authServices.login(email, password, deviceInfo);

      // Set refresh token trong HTTP-only cookie
      res.cookie("refreshToken", result.tokens.refreshToken, {
        httpOnly: true,           // Không thể truy cập từ JavaScript (chống XSS)
        secure: process.env.NODE_ENV === 'production', // HTTPS only trong production
        sameSite: 'strict',       // Chống CSRF
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
      const result = await authServices.createUser(email, password, fullName, phone, role);

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
        await authServices.logout(refreshToken);
      }

      // Xóa refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
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
      const tokens = await authServices.refreshAccessToken(refreshToken);

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
      const count = await authServices.logoutAllDevices(userId);

      // Xóa refresh token cookie của session hiện tại
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
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
      const sessions = await authServices.getUserSessions(userId, currentRefreshToken);

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
      const success = await authServices.logoutSessionById(sessionId, userId);

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
  }
};

module.exports = AuthController;
