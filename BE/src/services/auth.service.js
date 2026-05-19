/**
 * Auth Service
 * @description Xử lý các chức năng authentication và session management
 */

const { getClient } = require("../config/db");
const {
  findAccountByIdentifier,
} = require("../model/account.model");
const {
  createSession,
  findSessionByRefreshToken,
  updateSessionToken,
  deactivateSession,
  deactivateAllUserSessions,
  getUserActiveSessions,
  deactivateSessionById,
} = require("../model/session.model");
const { generateUniqueId } = require("../utils/generateId");
const bcrypt = require("bcrypt");
const {
  AUTH_ERRORS,
  createError,
  DB_ERRORS,
} = require("../constants");
const { createValidationError } = require("../constants/errors");
const jwt = require("jsonwebtoken");
const {
  jwtSecret,
  jwtExpire,
  jwtRefresh,
  jwtfreshExpire,
} = require("../config/jwt");

/**
 * Create a new user with account (authentication)
 * This function creates both user profile and account for authentication
 * following the separated users + accounts architecture
 * Uses TRANSACTION to ensure data consistency
 */
async function createUser(email, password, fullName, phone, role = "customer") {
  const client = await getClient();

  try {
    if (!email || !password || !fullName || !phone) {
      const errors = [];
      if (!email)
        errors.push({ field: "email", message: "Email là bắt buộc" });
      if (!password)
        errors.push({ field: "password", message: "Mật khẩu là bắt buộc" });
      if (!fullName)
        errors.push({ field: "fullName", message: "Họ tên là bắt buộc" });
      if (!phone)
        errors.push({ field: "phone", message: "Số điện thoại là bắt buộc" });
      throw createValidationError(errors);
    }

    await client.query("BEGIN");

    const userId = await generateUniqueId("users", "id", "usr", 8);
    const accountId = await generateUniqueId("accounts", "id", "acc", 8);

    const hashedPassword = await bcrypt.hash(password, 10);

    const userInsertQuery = `
        INSERT INTO users (id, email, phone, full_name, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, email, full_name, phone, role, created_at
      `;

    const userResult = await client.query(userInsertQuery, [
      userId,
      email,
      phone,
      fullName,
      role,
    ]);

    const user = userResult.rows[0];

    const accountInsertQuery = `
        INSERT INTO accounts (
          id, user_id, account_type, identifier, password_hash, 
          is_verified, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, FALSE, NOW(), NOW())
        RETURNING id, user_id, account_type, identifier, is_verified, created_at
      `;

    const accountResult = await client.query(accountInsertQuery, [
      accountId,
      userId,
      "email",
      email,
      hashedPassword,
    ]);

    const account = accountResult.rows[0];

    await client.query("COMMIT");

    return {
      user,
      account: {
        id: account.id,
        accountType: account.account_type,
        identifier: account.identifier,
        isVerified: account.is_verified,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating user:", error);
    throw error;
  } finally {
    client.release();
  }
}

async function login(identifier, password, deviceInfo = {}) {
  try {
    if (!identifier || !password) {
      const errs = [];
      if (!identifier) {
        errs.push({
          field: "identifier",
          message: "Email hoặc số điện thoại là bắt buộc",
        });
      }
      if (!password) {
        errs.push({ field: "password", message: "Mật khẩu là bắt buộc" });
      }
      throw createValidationError(errs);
    }

    const result = await findAccountByIdentifier(identifier);

    if (!result) {
      throw createError(AUTH_ERRORS.AUTH_ACCOUNT_NOT_FOUND);
    }

    if (!result.is_active) {
      throw createError(AUTH_ERRORS.AUTH_ACCOUNT_LOCKED);
    }

    const isMatch = await bcrypt.compare(password, result.password_hash);
    if (!isMatch) {
      throw createError(AUTH_ERRORS.AUTH_CREDENTIALS_INVALID);
    }

    const accessToken = await generateAccessToken(result);
    const refreshToken = await generateRefreshToken(result);

    const sessionId = await generateUniqueId("sessions", "id", "ses", 3);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await createSession({
      id: sessionId,
      userId: result.user_id,
      accountId: result.id,
      sessionToken: accessToken,
      refreshToken: refreshToken,
      deviceType: deviceInfo.deviceType || "unknown",
      ipAddress: deviceInfo.ipAddress || null,
      userAgent: deviceInfo.userAgent || null,
      expiresAt: expiresAt,
    });

    return {
      user: {
        id: result.user_id,
        fullName: result.full_name,
        email: result.email,
        phone: result.phone,
        role: result.role,
        avatarUrl: result.avatar_url,
        tier: result.tier,
        loyaltyPoints: result.loyalty_points,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  } catch (error) {
    if (error.isOperational) {
      throw error;
    }
    console.error("Login service error:", error);
    throw createError(
      DB_ERRORS.QUERY_FAILED,
      error.message || "Lỗi đăng nhập",
    );
  }
}

async function generateAccessToken(accountWithUser) {
  // ⚠️ Validate JWT_SECRET_KEY
  if (!jwtSecret) {
    throw createError(DB_ERRORS.QUERY_FAILED, "JWT_SECRET_KEY not configured");
  }

  const payload = {
    accountId: accountWithUser.id,
    userId: accountWithUser.user_id,
    role: accountWithUser.role,
    email: accountWithUser.email,
  };

  return jwt.sign(payload, jwtSecret, {
    expiresIn: jwtExpire,
  });
}

async function generateRefreshToken(accountWithUser) {
  // ⚠️ Validate JWT_REFRESH_KEY
  if (!jwtRefresh) {
    throw createError(DB_ERRORS.QUERY_FAILED, "JWT_REFRESH_KEY not configured");
  }

  return jwt.sign(
    {
      accountId: accountWithUser.id,
      userId: accountWithUser.user_id,
    },
    jwtRefresh,
    {
      expiresIn: jwtfreshExpire,
    },
  );
}

async function refreshAccessToken(refreshToken) {
  try {
    if (!refreshToken) {
      throw createError(AUTH_ERRORS.REFRESH_TOKEN_INVALID);
    }

    // ⚠️ Validate JWT_REFRESH_KEY
    if (!jwtRefresh) {
      throw createError(DB_ERRORS.QUERY_FAILED, "JWT_REFRESH_KEY not configured");
    }

    try {
      jwt.verify(refreshToken, jwtRefresh);
    } catch (error) {
      throw createError(AUTH_ERRORS.REFRESH_TOKEN_INVALID);
    }

    const session = await findSessionByRefreshToken(refreshToken);

    if (!session) {
      throw createError(AUTH_ERRORS.REFRESH_TOKEN_INVALID);
    }

    if (!session.user_is_active) {
      throw createError(AUTH_ERRORS.AUTH_ACCOUNT_LOCKED);
    }

    const newAccessToken = await generateAccessToken({
      id: session.account_id,
      user_id: session.user_id,
      role: session.role,
      email: session.email,
    });

    await updateSessionToken(refreshToken, newAccessToken);

    return {
      accessToken: newAccessToken,
      refreshToken: refreshToken,
    };
  } catch (error) {
    if (error.isOperational) {
      throw error;
    }
    console.error("Error refreshing token:", error);
    throw createError(AUTH_ERRORS.REFRESH_TOKEN_INVALID);
  }
}

/**
 * Logout - Vô hiệu hóa session
 * @param {string} refreshToken - Refresh token từ cookie
 * @returns {Promise<boolean>} True nếu thành công
 */
async function logout(refreshToken) {
  try {
    if (!refreshToken) {
      return false;
    }

    return deactivateSession(refreshToken);
  } catch (error) {
    console.error("Error during logout:", error);
    throw error;
  }
}

/**
 * Logout tất cả thiết bị
 * @param {string} userId - User ID
 * @returns {Promise<number>} Số lượng sessions đã vô hiệu hóa
 */
async function logoutAllDevices(userId) {
  try {
    if (!userId) {
      throw createError(AUTH_ERRORS.AUTH_ACCOUNT_NOT_FOUND);
    }

    return deactivateAllUserSessions(userId);
  } catch (error) {
    console.error("Error during logout all devices:", error);
    throw error;
  }
}

/**
 * Lấy danh sách sessions active của user
 * @param {string} userId - User ID
 * @param {string} currentRefreshToken - Refresh token hiện tại để đánh dấu session hiện tại
 * @returns {Promise<Array>} Danh sách sessions
 */
async function getUserSessions(userId, currentRefreshToken = null) {
  try {
    if (!userId) {
      throw createError(AUTH_ERRORS.AUTH_ACCOUNT_NOT_FOUND);
    }

    const sessions = await getUserActiveSessions(userId);

    return sessions.map((session) => ({
      id: session.id,
      deviceType: session.device_type,
      ipAddress: session.ip_address,
      createdAt: session.created_at,
      lastActivity: session.last_activity_at,
      expiresAt: session.expires_at,
      isCurrent:
        currentRefreshToken && session.refresh_token === currentRefreshToken,
    }));
  } catch (error) {
    console.error("Error getting user sessions:", error);
    throw error;
  }
}

/**
 * Logout từ một session cụ thể
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID (để verify ownership)
 * @returns {Promise<boolean>} True nếu thành công
 */
async function logoutSessionById(sessionId, userId) {
  try {
    if (!sessionId || !userId) {
      return false;
    }

    return deactivateSessionById(sessionId, userId);
  } catch (error) {
    console.error("Error logging out session:", error);
    throw error;
  }
}

module.exports = {
  createUser,
  login,
  generateAccessToken,
  generateRefreshToken,
  refreshAccessToken,
  logout,
  logoutAllDevices,
  getUserSessions,
  logoutSessionById,
};
