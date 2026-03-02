const express = require('express');
const router = express.Router();
const AuthController = require('../controller/auth.controller');
const { authenticate } = require('../middlewares/authMiddleware');

/**
 * Authentication Routes
 * =====================
 */

// ============================================================================
// PUBLIC ROUTES (Không cần authentication)
// ============================================================================

/**
 * @route   POST /api/auth/register
 * @desc    Đăng ký tài khoản mới
 * @access  Public
 * @body    { email, password, fullName, phone, role? }
 */
router.post('/register', AuthController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Đăng nhập
 * @access  Public
 * @body    { email, password }
 * @cookie  refreshToken (HTTP-only, 7 days)
 * @return  { user, token: { accessToken } }
 */
router.post('/login', AuthController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Làm mới access token bằng refresh token
 * @access  Public (nhưng cần refresh token trong cookie)
 * @cookie  refreshToken
 * @return  { accessToken }
 */
router.post('/refresh', AuthController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Đăng xuất (vô hiệu hóa session hiện tại)
 * @access  Public
 * @cookie  refreshToken
 */
router.post('/logout', AuthController.logout);

// ============================================================================
// PROTECTED ROUTES (Cần authentication - Access Token)
// ============================================================================

/**
 * @route   GET /api/auth/sessions
 * @desc    Lấy danh sách tất cả sessions đang active của user
 * @access  Private
 * @header  Authorization: Bearer {accessToken}
 * @return  { sessions: [...], total }
 */
router.get('/sessions', authenticate, AuthController.getSessions);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Đăng xuất khỏi tất cả thiết bị
 * @access  Private
 * @header  Authorization: Bearer {accessToken}
 * @return  { sessionsDeactivated }
 */
router.post('/logout-all', authenticate, AuthController.logoutAllDevices);

/**
 * @route   DELETE /api/auth/sessions/:sessionId
 * @desc    Đăng xuất từ một session/thiết bị cụ thể
 * @access  Private
 * @header  Authorization: Bearer {accessToken}
 * @param   sessionId - ID của session cần xóa
 */
router.delete('/sessions/:sessionId', authenticate, AuthController.logoutSession);

module.exports = router;