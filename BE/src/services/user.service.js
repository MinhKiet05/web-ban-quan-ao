/**
 * User Service
 * @description Xử lý các chức năng quản lý thông tin profile người dùng
 */

const {
  findUserById,
  updateUserProfile,
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
 * @returns {User} User object
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
      id: result.id,
      email: result.email,
      full_name: result.full_name,
      first_name: result.first_name,
      last_name: result.last_name,
      phone: result.phone,
      avatar_url: result.avatar_url,
      date_of_birth: result.date_of_birth,
      gender: result.gender,
      country: result.country,
      state: result.state,
      address: result.address,
      city: result.city,
      postal_code: result.postal_code,
      role: result.role,
      tier: result.tier,
      loyalty_points: result.loyalty_points,
      total_spent: result.total_spent,
      total_orders: result.total_orders,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  } catch (error) {
    if (error.isOperational) {
      throw error;
    }
    throw createError(DB_ERRORS);
  }
}

/**
 * Update current user profile
 * @param {string} userId User Id from token
 * @param {Object} userData User data to update
 */
async function updateCurrentUser(userId, userData) {
  try {
    if (!userId) {
      throw createError(VALIDATION_ERRORS.MISSING_REQUIRED_FIELD, "User ID không tìm thấy");
    }

    const errs = [];
    if (!userData.email) {
      errs.push({ field: "email", message: "Email là bắt buộc" });
    }
    if (!userData.phone) {
      errs.push({ field: "phone", message: "Số điện thoại là bắt buộc" });
    }
    if (!userData.first_name) {
      errs.push({ field: "first_name", message: "Họ là bắt buộc" });
    }
    if (!userData.last_name) {
      errs.push({ field: "last_name", message: "Tên là bắt buộc" });
    }
    if (!userData.country) {
      errs.push({ field: "country", message: "Quốc gia là bắt buộc" });
    }
    if (!userData.address) {
      errs.push({ field: "address", message: "Địa chỉ là bắt buộc" });
    }
    if (!userData.city) {
      errs.push({ field: "city", message: "Thành phố là bắt buộc" });
    }

    if (errs.length > 0) {
      throw createValidationError(errs);
    }

    const existingUser = await findUserById(userId);
    if (!existingUser) {
      throw createError(USER_ERRORS.USER_NOT_FOUND);
    }

    const updatedUser = await updateUserProfile({
      id: userId,
      email: userData.email,
      phone: userData.phone,
      first_name: userData.first_name,
      last_name: userData.last_name,
      country: userData.country,
      state: userData.state || null,
      address: userData.address,
      city: userData.city,
      postal_code: userData.postal_code || null,
    });

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
      date_of_birth: updatedUser.date_of_birth,
      gender: updatedUser.gender,
      country: updatedUser.country,
      state: updatedUser.state,
      address: updatedUser.address,
      city: updatedUser.city,
      postal_code: updatedUser.postal_code,
      role: updatedUser.role,
      tier: updatedUser.tier,
      loyalty_points: updatedUser.loyalty_points,
      total_spent: updatedUser.total_spent,
      total_orders: updatedUser.total_orders,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
    };
  } catch (error) {
    throw error;
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
    throw createError(DB_ERRORS);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getCurrentUser,
  updateCurrentUser,
};
