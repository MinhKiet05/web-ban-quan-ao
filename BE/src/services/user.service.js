const { createUser: createUserInDB } = require("../model/user.model");
const {
  createAccount,
  findAccountByIdentifier,
} = require("../model/account.model");
const {
  createSession,
  findSessionByRefreshToken,
  updateSessionToken,
  deactivateSession,
  deactivateAllUserSessions,
  getUserActiveSessions,
  deactivateSessionById
} = require("../model/session.model");
const { generateUniqueId } = require("../utils/generateId");
const bcrypt = require("bcrypt");
const {
  AUTH_ERRORS,
  createError,
  USER_ERRORS,
  DB_ERRORS,  // ← Thêm dòng này
} = require("../constants");
const { createValidationError } = require("../constants/errors");
const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpire, jwtRefresh, jwtfreshExpire   } = require("../config/jwt");

class UserService {
  /**
   * Create a new user with account (authentication)
   * This function creates both user profile and account for authentication
   * following the separated users + accounts architecture
   */
  async createUser(email, password, fullName, phone, role = "customer") {
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

      // Generate unique IDs
      const userId = await generateUniqueId("users", "id", "usr", 3);
      const accountId = await generateUniqueId("accounts", "id", "acc", 3);

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user profile (no password here)
      const userData = {
        id: userId,
        fullName: fullName,
        email: email,
        phone: phone,
        role: role,
      };

      const user = await createUserInDB(userData);

      // Create account for authentication
      const accountData = {
        id: accountId,
        userId: userId,
        accountType: "email",
        identifier: email,
        passwordHash: hashedPassword,
      };

      const account = await createAccount(accountData);

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
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async login(email, password, deviceInfo = {}) {
    try {
      if (!email || !password) {
        const errs = [];
        if (!email) {
          errs.push({ field: "email", message: "Email là bắt buộc" });
        }
        if (!password) {
          errs.push({ field: "password", message: "Mật khẩu là bắt buộc" });
        }
        throw createValidationError(errs);
      }

      // 1. Tìm account + user (1 query với JOIN)
      const result = await findAccountByIdentifier(email);

      // 2. Kiểm tra tồn tại
      if (!result) {
        throw createError(AUTH_ERRORS.AUTH_ACCOUNT_NOT_FOUND);
      }

      // 3. Kiểm tra account có active không
      if (!result.is_active) {
        throw createError(AUTH_ERRORS.AUTH_ACCOUNT_LOCKED);
      }

      // 4. So sánh password
      const isMatch = await bcrypt.compare(password, result.password_hash);
      if (!isMatch) {
        throw createError(AUTH_ERRORS.AUTH_CREDENTIALS_INVALID);
      }

      // 5. Tạo tokens
      const accessToken = await this.generateAccessToken(result);
      const refreshToken = await this.generateRefreshToken(result);

      // 6. Lưu session vào database
      const sessionId = await generateUniqueId("sessions", "id", "ses", 3);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 ngày

      await createSession({
        id: sessionId,
        userId: result.user_id,
        accountId: result.id,
        sessionToken: accessToken,
        refreshToken: refreshToken,
        deviceType: deviceInfo.deviceType || 'unknown',
        ipAddress: deviceInfo.ipAddress || null,
        userAgent: deviceInfo.userAgent || null,
        expiresAt: expiresAt
      });

      // 7. Return user info + tokens
      return {
        user: {
          id: result.user_id,
          fullName: result.full_name,
          email: result.email,
          phone: result.phone,
          role: result.role,
          avatarUrl: result.avatar_url,
          tier: result.tier,
          loyaltyPoints: result.loyalty_points
        },
        tokens: {
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      // Nếu là lỗi khác (DB, system...) thì wrap
      throw createError(DB_ERRORS.QUERY_FAILED, "Chi tiết lỗi");
    }
  }

  async generateAccessToken(accountWithUser){
      const payload = {
        accountId: accountWithUser.id,
        userId: accountWithUser.user_id,
        role: accountWithUser.role,
        email: accountWithUser.email
      }

      const token = jwt.sign(payload, jwtSecret, {
          expiresIn: jwtExpire
      })

      return token;
  };

  async generateRefreshToken(accountWithUser){
      return jwt.sign(
        {
          accountId: accountWithUser.id,
          userId: accountWithUser.user_id
        }, jwtRefresh,
        {
          expiresIn: jwtfreshExpire
        })
  }

  async refreshAccessToken(refreshToken){
      try {
        if(!refreshToken){
          throw createError(AUTH_ERRORS.REFRESH_TOKEN_INVALID);
        }

        // 1. Verify JWT refresh token
        let decoded;
        try {
          decoded = jwt.verify(refreshToken, jwtRefresh);
        } catch (error) {
          throw createError(AUTH_ERRORS.REFRESH_TOKEN_INVALID);
        }

        // 2. Kiểm tra session trong database
        const session = await findSessionByRefreshToken(refreshToken);
        
        if (!session) {
          throw createError(AUTH_ERRORS.REFRESH_TOKEN_INVALID);
        }

        // 3. Kiểm tra user còn active không
        if (!session.user_is_active) {
          throw createError(AUTH_ERRORS.AUTH_ACCOUNT_LOCKED);
        }

        // 4. Tạo access token mới
        const newAccessToken = await this.generateAccessToken({
          id: session.account_id,
          user_id: session.user_id,
          role: session.role,
          email: session.email
        });

        // 5. Cập nhật session token trong DB
        await updateSessionToken(refreshToken, newAccessToken);

        // 6. Return tokens mới
        return {
          accessToken: newAccessToken,
          refreshToken: refreshToken // Giữ nguyên refresh token
        };
      } catch (error) {
        if (error.isOperational) {
          throw error;
        }
        console.error('Error refreshing token:', error);
        throw createError(AUTH_ERRORS.REFRESH_TOKEN_INVALID);
      }
  }

  /**
   * Logout - Vô hiệu hóa session
   * @param {string} refreshToken - Refresh token từ cookie
   * @returns {Promise<boolean>} True nếu thành công
   */
  async logout(refreshToken) {
    try {
      if (!refreshToken) {
        return false; // Không có token thì không cần xóa
      }

      // Vô hiệu hóa session trong database
      const deactivated = await deactivateSession(refreshToken);
      return deactivated;
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  }

  /**
   * Logout tất cả thiết bị
   * @param {string} userId - User ID
   * @returns {Promise<number>} Số lượng sessions đã vô hiệu hóa
   */
  async logoutAllDevices(userId) {
    try {
      if (!userId) {
        throw createError(AUTH_ERRORS.AUTH_ACCOUNT_NOT_FOUND);
      }

      const count = await deactivateAllUserSessions(userId);
      return count;
    } catch (error) {
      console.error('Error during logout all devices:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách sessions active của user
   * @param {string} userId - User ID
   * @param {string} currentRefreshToken - Refresh token hiện tại để đánh dấu session hiện tại
   * @returns {Promise<Array>} Danh sách sessions
   */
  async getUserSessions(userId, currentRefreshToken = null) {
    try {
      if (!userId) {
        throw createError(AUTH_ERRORS.AUTH_ACCOUNT_NOT_FOUND);
      }

      const sessions = await getUserActiveSessions(userId);

      // Đánh dấu session hiện tại
      return sessions.map(session => ({
        id: session.id,
        deviceType: session.device_type,
        ipAddress: session.ip_address,
        createdAt: session.created_at,
        lastActivity: session.last_activity_at,
        expiresAt: session.expires_at,
        isCurrent: currentRefreshToken && session.refresh_token === currentRefreshToken
      }));
    } catch (error) {
      console.error('Error getting user sessions:', error);
      throw error;
    }
  }

  /**
   * Logout từ một session cụ thể
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (để verify ownership)
   * @returns {Promise<boolean>} True nếu thành công
   */
  async logoutSessionById(sessionId, userId) {
    try {
      if (!sessionId || !userId) {
        return false;
      }

      // Deactivate session với verification
      const deactivated = await deactivateSessionById(sessionId, userId);
      return deactivated;
    } catch (error) {
      console.error('Error logging out session:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
