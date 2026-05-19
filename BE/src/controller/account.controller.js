/**
 * Account Controller
 * @description Xử lý các chức năng liên quan đến tài khoản và bảo mật
 */

const { createError } = require("../constants");
const { asyncHandler } = require("../middlewares/errorHandler");
const {
  HTTP_STATUS,
  AUTH_ERRORS,
  VALIDATION_ERRORS,
} = require("../constants");
const { createValidationError } = require("../constants/errors");
const { changePassword } = require("../services/account.service");
const AccountController = {
  /**
   * Đổi mật khẩu
   * PUT /api/account/change-password
   */
  changePassword: asyncHandler(async (req, res) => {
    const { id, current_password, new_password } = req.body;

    const result = await changePassword({ id, current_password, new_password });

    // Trả về phản hồi thành công
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Đổi mật khẩu thành công",
      data: {
        accountId: result.id,
        updatedAt: result.updated_at
      }
    });
  }),

  /**
   * Quên mật khẩu - gửi email reset
   * POST /api/account/forgot-password
   */
  forgotPassword: asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      throw createError(
        VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
        "Email là bắt buộc",
      );
    }

    // TODO: Implement forgot password logic
    // - Generate reset token
    // - Save token to database
    // - Send email with reset link

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Đã gửi email hướng dẫn đặt lại mật khẩu",
    });
  }),

  /**
   * Reset mật khẩu với token
   * POST /api/account/reset-password
   */
  resetPassword: asyncHandler(async (req, res) => {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      throw createValidationError([
        { field: "token", message: "Token là bắt buộc" },
        { field: "new_password", message: "Mật khẩu mới là bắt buộc" },
      ]);
    }

    // TODO: Implement reset password logic  
    // - Verify token
    // - Update password
    // - Invalidate token

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Đặt lại mật khẩu thành công",
    });
  }),
};

module.exports = AccountController;
