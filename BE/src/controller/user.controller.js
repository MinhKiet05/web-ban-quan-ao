/**
 * User Controller
 * @description Xử lý các chức năng liên quan đến thông tin profile người dùng
 */

const crypto = require('crypto');
const { createError } = require("../constants");
const { asyncHandler } = require("../middlewares/errorHandler");
const { HTTP_STATUS, USER_ERRORS, VALIDATION_ERRORS } = require("../constants");
const { 
  getProfile, 
  updateProfile, 
  getCurrentUser,
  updateCurrentUser,
  updateAvatar
} = require("../services/user.service");
const UserController = {
  /**
   * Lấy thông tin profile
   * GET /api/users/:id
   */
  getProfile: asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;

      const user = await getProfile(id);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }),

  /**
   * Lấy thông tin user hiện tại (từ token)
   * GET /api/users/me
   */
  getMe: asyncHandler(async (req, res, next) => {
    try {
      const userId = req.user.id;
      const user = await getCurrentUser(userId);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }),

  /**
   * Cập nhật thông tin profile
   * PUT /api/users/:id
   */
  updateProfile: asyncHandler(async (req, res) => {
    try {
      const { id, full_name, date_of_birth, gender, email, phone } = req.body;

      // Truyền object vào service - tối ưu khi có nhiều tham số
      const user = await updateProfile({
        id,
        full_name,
        date_of_birth,
        gender,
        email,
        phone,
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Cập nhật thông tin thành công",
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }),

  /**
   * Cập nhật thông tin user hiện tại (từ token)
   * PUT /api/users/me
   */
  updateMe: asyncHandler(async (req, res, next) => {
    try {
      const userId = req.user.id;
      const {
        full_name,
        phone,
        avatar_url,
        date_of_birth,
        gender,
      } = req.body;

      const user = await updateCurrentUser(userId, {
        full_name,
        phone,
        avatar_url,
        date_of_birth,
        gender,
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Cập nhật thông tin thành công",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }),

  /**
   * Upload user avatar
   * POST /api/users/avatar
   */
  uploadAvatar: asyncHandler(async (req, res, next) => {
    try {
      if (!req.file) {
        throw createError(VALIDATION_ERRORS.MISSING_REQUIRED_FIELD, "Vui lòng chọn hình ảnh");
      }

      const userId = req.user.id;
      // Tạo đường dẫn URL: /uploads/filename
      const avatarUrl = `/uploads/${req.file.filename}`;

      const user = await updateAvatar(userId, avatarUrl);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Cập nhật avatar thành công",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }),

  /**
   * Generate Cloudinary upload signature (safe on server-side)
   * POST /api/users/avatar/signature
   */
  generateAvatarSignature: asyncHandler(async (req, res, next) => {
    try {
      const cloudinarySecret = process.env.CLOUDINARY_API_SECRET;
      
      if (!cloudinarySecret) {
        throw createError(VALIDATION_ERRORS.MISSING_REQUIRED_FIELD, "Cloudinary API Secret không được cấu hình");
      }

      const timestamp = Math.floor(Date.now() / 1000);
      
      // Parameters for Cloudinary upload
      const params = {
        timestamp: timestamp,
        folder: 'web_ban_quan_ao/avatars'
      };

      // Create string to sign: key1=value1&key2=value2...+secret
      const sortedKeys = Object.keys(params).sort();
      const stringToSign = sortedKeys
        .map(key => `${key}=${params[key]}`)
        .join('&') + cloudinarySecret;

      // Generate SHA-1 signature
      const signature = crypto
        .createHash('sha1')
        .update(stringToSign)
        .digest('hex');

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          signature,
          timestamp,
          folder: params.folder
        },
      });
    } catch (error) {
      next(error);
    }
  }),
};

module.exports = UserController;
