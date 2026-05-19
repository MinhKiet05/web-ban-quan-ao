/**
 * User Service
 * @description Xử lý các chức năng quản lý thông tin profile người dùng
 */

const path = require('path');
const fs = require('fs').promises;
const {
  findUserById,
  updateUserProfile,
  updateUserAvatar,
} = require("../model/user.model");
const {
  createError,
  USER_ERRORS,
  DB_ERRORS,
  VALIDATION_ERRORS,
} = require("../constants");
const { createValidationError } = require("../constants/errors");

/**
 * Get current user profile (from token)
 * @param {string} userId User Id from token
 * @returns {User} User object with essential fields only
 */
async function getCurrentUser(userId) {
  try {
    if (!userId) {
      throw createError(VALIDATION_ERRORS.MISSING_REQUIRED_FIELD, "User ID không tìm thấy");
    }

    const result = await findUserById(userId);
    if (!result) {
      throw createError(USER_ERRORS.USER_NOT_FOUND);
    }

    return {
      email: result.email,
      fullName: result.full_name,
      phone: result.phone,
      avatarUrl: result.avatar_url,
      dateOfBirth: result.date_of_birth,
      gender: result.gender,
      tier: result.tier,
      loyaltyPoints: result.loyalty_points,
      createdAt: result.created_at,
    };
  } catch (error) {
    if (error.isOperational) {
      throw error;
    }
    throw createError(DB_ERRORS.QUERY_FAILED);
  }
}

/**
 * Update current user profile
 * @param {string} userId User Id from token
 * @param {Object} userData User data to update (fullName, phone, avatarUrl, dateOfBirth, gender)
 */
async function updateCurrentUser(userId, userData) {
  try {
    if (!userId) {
      throw createError(VALIDATION_ERRORS.MISSING_REQUIRED_FIELD, "User ID không tìm thấy");
    }

    const existingUser = await findUserById(userId);
    if (!existingUser) {
      throw createError(USER_ERRORS.USER_NOT_FOUND);
    }

    const updatedUser = await updateUserProfile({
      id: userId,
      full_name: userData.full_name,
      phone: userData.phone,
      avatar_url: userData.avatar_url || null,
      date_of_birth: userData.date_of_birth || null,
      gender: userData.gender || null,
    });

    if (!updatedUser) {
      throw createError(USER_ERRORS.USER_NOT_FOUND);
    }

    return {
      email: updatedUser.email,
      fullName: updatedUser.full_name,
      phone: updatedUser.phone,
      avatarUrl: updatedUser.avatar_url,
      dateOfBirth: updatedUser.date_of_birth,
      gender: updatedUser.gender,
      tier: updatedUser.tier,
      loyaltyPoints: updatedUser.loyalty_points,
      createdAt: updatedUser.created_at,
    };
  } catch (error) {
    if (error.isOperational) {
      throw error;
    }
    throw createError(DB_ERRORS.QUERY_FAILED);
  }
}

/**
 * Update profile
 * @param {String} userId User Id
 * @param {String} full_name
 */
async function updateProfile({ id, full_name, date_of_birth, gender, email, phone }) {
  try {
    const errs = [];
    if (!id) {
      errs.push({ field: "id", message: "Id là bắt buộc" });
    }
    if (!full_name) {
      errs.push({ field: "full_name", message: "Họ tên là bắt buộc" });
    }
    if (!email) {
      errs.push({ field: "email", message: "Email là bắt buộc" });
    }
    if (!date_of_birth) {
      errs.push({ field: "date_of_birth", message: "Ngày sinh là bắt buộc" });
    }
    if (!gender) {
      errs.push({ field: "gender", message: "Giới tính là bắt buộc" });
    }
    if (!phone) {
      errs.push({ field: "phone", message: "Số điện thoại là bắt buộc" });
    }

    if (errs.length > 0) {
      throw createValidationError(errs);
    }

    const existingUser = await findUserById(id);
    if (!existingUser) {
      throw createError(USER_ERRORS.USER_NOT_FOUND);
    }

    const updateduser = await updateUserProfile({
      id,
      full_name,
      date_of_birth,
      gender,
      email,
      phone,
    });

    if (!updateduser) {
      throw createError(USER_ERRORS.USER_NOT_FOUND);
    }

    return {
      id: updateduser.id,
      email: updateduser.email,
      full_name: updateduser.full_name,
      phone: updateduser.phone,
      avatar_url: updateduser.avatar_url,
      role: updateduser.role,
      tier: updateduser.tier,
      loyalty_points: updateduser.loyalty_points,
      total_spent: updateduser.total_spent,
      total_orders: updateduser.total_orders,
      created_at: updateduser.created_at,
      updated_at: updateduser.updated_at,
    };
  } catch (error) {
    throw error;
  }
}

/**
<<<<<<< HEAD
 * Update user avatar
 * @param {string} userId User ID
 * @param {string} avatarUrl Avatar URL
 * @returns {Object} Updated user
 */
async function updateAvatar(userId, avatarUrl) {
  try {
    if (!userId) {
      throw createError(VALIDATION_ERRORS.MISSING_REQUIRED_FIELD, "User ID không tìm thấy");
    }

    if (!avatarUrl) {
      throw createError(VALIDATION_ERRORS.MISSING_REQUIRED_FIELD, "Avatar URL là bắt buộc");
    }

    const existingUser = await findUserById(userId);
    if (!existingUser) {
      throw createError(USER_ERRORS.USER_NOT_FOUND);
    }

    // Delete old avatar file if exists
    if (existingUser.avatar_url) {
      try {
        const oldAvatarPath = path.join(__dirname, '../../' + existingUser.avatar_url);
        await fs.unlink(oldAvatarPath);
      } catch (error) {
        // Nếu không tìm thấy file cũ, không cần báo lỗi
        console.warn('Warning: Could not delete old avatar file:', existingUser.avatar_url);
      }
    }

    const updatedUser = await updateUserAvatar(userId, avatarUrl);

    if (!updatedUser) {
      throw createError(USER_ERRORS.USER_NOT_FOUND);
    }

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      full_name: updatedUser.full_name,
      first_name: updatedUser.first_name,
      last_name: updatedUser.last_name,
      phone: updatedUser.phone,
      avatar_url: updatedUser.avatar_url,
      updated_at: updatedUser.updated_at,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Lấy thông tin profile
 * @param {string} id User ID
 */
async function getProfile(id) {
  try {
    if (!id) {
      throw createError(VALIDATION_ERRORS.MISSING_REQUIRED_FIELD, "User ID là bắt buộc");
    }

    const result = await findUserById(id);
    if (!result) {
      throw createError(USER_ERRORS.USER_NOT_FOUND);
    }

    return {
      id: result.id,
      email: result.email,
      full_name: result.full_name,
      phone: result.phone,
      avatar_url: result.avatar_url,
      role: result.role,
      tier: result.tier,
      loyalty_points: result.loyalty_points,
      total_spent: result.total_spent,
      total_orders: result.total_orders,
      created_at: result.created_at,
      updated_at: result.updated_at,
      date_of_birth: result.date_of_birth,
      gender: result.gender,
    };
  } catch (error) {
    if (error.isOperational) {
      throw error;
    }
    throw createError(DB_ERRORS.QUERY_FAILED);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getCurrentUser,
  updateCurrentUser,
  updateAvatar,
};
