/**
 * User Model
 * @description Quản lý dữ liệu và thao tác với bảng users
 */

const { query, getClient } = require("../config/db");
const { createError } = require("../constants");

const {
  DB_ERRORS,
  USER_ERRORS,
  AUTH_ERRORS,
  VALIDATION_ERRORS,
} = require("../constants");
/**
 * Create a new user (profile data only, no password)
 * Password is stored in separate accounts table
 * @param {Object} userData - User data object
 * @param {string} userData.id - User ID (generated)
 * @param {string} userData.email - User email
 * @param {string} userData.fullName - User full name
 * @param {string} userData.phone - User phone number
 * @param {string} userData.role - User role (default: 'customer')
 * @returns {Promise<Object>} Created user
 */
const createUser = async (userData) => {
  const { id, email, fullName, phone, role = "customer" } = userData;

  // Validate required fields
  if (!id || !email || !fullName || !phone) {
    throw new Error("Missing required fields: id, email, fullName, phone");
  }

  try {
    // Insert user query (profile data only)
    const insertQuery = `
      INSERT INTO users (id, email, phone, full_name, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, email, full_name, phone, role, created_at
    `;

    const result = await query(insertQuery, [
      id,
      email,
      phone,
      fullName,
      role,
    ]);

    return result.rows[0];
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null
 */
const findUserByEmail = async (email) => {
  try {
    const result = await query("SELECT * FROM users WHERE email = $1 LIMIT 1", [
      email,
    ]);

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error("Error finding user by email:", error);
    throw error;
  }
};

/**
 * Find user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User object or null
 */
const findUserById = async (userId) => {
  try {
    const result = await query("SELECT * FROM users WHERE id = $1 LIMIT 1", [
      userId,
    ]);

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error("Error finding user by ID:", error);
    throw error;
  }
};

/**
 * Update user profile
 * @param {Object} userData - User data object
 * @param {string} userData.id - User ID (required)
 * @param {string} [userData.full_name] - User full name
 * @param {string} [userData.first_name] - User first name
 * @param {string} [userData.last_name] - User last name
 * @param {string} [userData.date_of_birth] - User date of birth
 * @param {string} [userData.gender] - User gender
 * @param {string} [userData.email] - User email
 * @param {string} [userData.phone] - User phone number
 * @param {string} [userData.country] - User country
 * @param {string} [userData.state] - User state
 * @param {string} [userData.address] - User address
 * @param {string} [userData.city] - User city
 * @param {string} [userData.postal_code] - User postal code
 * @returns {Promise<Object>} Updated user
 */
const updateUserProfile = async (userData) => {
  try {
    const { 
      id, 
      full_name, 
      first_name,
      last_name,
      date_of_birth, 
      gender, 
      email, 
      phone,
      country,
      state,
      address,
      city,
      postal_code,
      avatar_url
    } = userData;

    // Validate required fields
    if (!id) {
      throw createError(
        VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
        "Id là bắt buộc",
      );
    }

    // Build dynamic update query based on provided fields
    const result = await query(
      `UPDATE users SET 
         full_name = COALESCE($1, full_name),
         first_name = COALESCE($2, first_name),
         last_name = COALESCE($3, last_name),
         date_of_birth = COALESCE($4, date_of_birth),
         gender = COALESCE($5, gender),
         email = COALESCE($6, email),
         phone = COALESCE($7, phone),
         country = COALESCE($8, country),
         state = COALESCE($9, state),
         address = COALESCE($10, address),
         city = COALESCE($11, city),
         postal_code = COALESCE($12, postal_code),
         avatar_url = COALESCE($13, avatar_url),
         updated_at = NOW()
         WHERE id = $14
         RETURNING *`,
      [
        full_name, 
        first_name,
        last_name,
        date_of_birth, 
        gender, 
        email, 
        phone,
        country,
        state,
        address,
        city,
        postal_code,
        avatar_url,
        id
      ],
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user avatar
 * @param {string} userId - User ID
 * @param {string} avatarUrl - Avatar URL path
 * @returns {Promise<Object>} Updated user
 */
const updateUserAvatar = async (userId, avatarUrl) => {
  try {
    if (!userId || !avatarUrl) {
      throw createError(
        VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
        "User ID và avatar URL là bắt buộc"
      );
    }

    const result = await query(
      `UPDATE users SET 
         avatar_url = $1,
         updated_at = NOW()
         WHERE id = $2
         RETURNING id, email, full_name, first_name, last_name, phone, avatar_url, updated_at`,
      [avatarUrl, userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserProfile,
  updateUserAvatar
};
