const { query, getClient } = require('../config/db');

/**
 * Session Model
 * Quản lý phiên đăng nhập và refresh tokens
 */

/**
 * Tạo session mới khi login
 * @param {Object} sessionData - Dữ liệu session
 * @param {string} sessionData.id - Session ID
 * @param {string} sessionData.userId - User ID
 * @param {string} sessionData.accountId - Account ID
 * @param {string} sessionData.sessionToken - Access token (JWT)
 * @param {string} sessionData.refreshToken - Refresh token (JWT)
 * @param {string} sessionData.deviceType - Loại thiết bị (mobile, tablet, desktop)
 * @param {string} sessionData.ipAddress - Địa chỉ IP
 * @param {string} sessionData.userAgent - User agent string
 * @param {Date} sessionData.expiresAt - Thời gian hết hạn
 * @returns {Promise<Object>} Session được tạo
 */
const createSession = async (sessionData) => {
    const {
        id,
        userId,
        accountId,
        sessionToken,
        refreshToken,
        deviceType,
        ipAddress,
        userAgent,
        expiresAt
    } = sessionData;

    try {
        const insertQuery = `
            INSERT INTO sessions (
                id, user_id, account_id, session_token, refresh_token,
                device_type, ip_address, user_agent, is_active, 
                expires_at, created_at, last_activity_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, NOW(), NOW())
            RETURNING id, user_id, account_id, session_token, refresh_token, 
                      device_type, ip_address, is_active, expires_at, created_at
        `;

        const result = await query(insertQuery, [
            id,
            userId,
            accountId,
            sessionToken,
            refreshToken,
            deviceType,
            ipAddress,
            userAgent,
            expiresAt
        ]);

        return result.rows[0];
    } catch (error) {
        console.error('Error creating session:', error);
        throw error;
    }
};

/**
 * Tìm session bằng refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object|null>} Session hoặc null
 */
const findSessionByRefreshToken = async (refreshToken) => {
    try {
        const result = await query(
            `SELECT 
                s.id, 
                s.user_id, 
                s.account_id,
                s.session_token,
                s.refresh_token,
                s.is_active,
                s.expires_at,
                s.created_at,
                s.last_activity_at,
                a.identifier,
                a.account_type,
                u.full_name,
                u.email,
                u.phone,
                u.role,
                u.avatar_url,
                u.tier,
                u.loyalty_points,
                u.is_active as user_is_active
            FROM sessions s
            INNER JOIN accounts a ON s.account_id = a.id
            INNER JOIN users u ON s.user_id = u.id
            WHERE s.refresh_token = $1 
            AND s.is_active = TRUE
            AND s.expires_at > NOW()
            LIMIT 1`,
            [refreshToken]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error finding session by refresh token:', error);
        throw error;
    }
};

/**
 * Tìm session bằng session token (access token)
 * @param {string} sessionToken - Session token (access token)
 * @returns {Promise<Object|null>} Session hoặc null
 */
const findSessionBySessionToken = async (sessionToken) => {
    try {
        const result = await query(
            `SELECT * FROM sessions 
             WHERE session_token = $1 
             AND is_active = TRUE
             AND expires_at > NOW()
             LIMIT 1`,
            [sessionToken]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error finding session by session token:', error);
        throw error;
    }
};

/**
 * Cập nhật session token (khi refresh)
 * @param {string} refreshToken - Refresh token hiện tại
 * @param {string} newSessionToken - Access token mới
 * @returns {Promise<Object>} Session đã cập nhật
 */
const updateSessionToken = async (refreshToken, newSessionToken) => {
    try {
        const updateQuery = `
            UPDATE sessions 
            SET session_token = $1,
                last_activity_at = NOW()
            WHERE refresh_token = $2
            AND is_active = TRUE
            RETURNING *
        `;

        const result = await query(updateQuery, [newSessionToken, refreshToken]);

        if (result.rows.length === 0) {
            throw new Error('Session not found or inactive');
        }

        return result.rows[0];
    } catch (error) {
        console.error('Error updating session token:', error);
        throw error;
    }
};

/**
 * Vô hiệu hóa session (logout)
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<boolean>} True nếu thành công
 */
const deactivateSession = async (refreshToken) => {
    try {
        const updateQuery = `
            UPDATE sessions 
            SET is_active = FALSE,
                last_activity_at = NOW()
            WHERE refresh_token = $1
            RETURNING id
        `;

        const result = await query(updateQuery, [refreshToken]);
        return result.rows.length > 0;
    } catch (error) {
        console.error('Error deactivating session:', error);
        throw error;
    }
};

/**
 * Vô hiệu hóa tất cả sessions của user (logout all devices)
 * @param {string} userId - User ID
 * @returns {Promise<number>} Số lượng sessions đã vô hiệu hóa
 */
const deactivateAllUserSessions = async (userId) => {
    try {
        const updateQuery = `
            UPDATE sessions 
            SET is_active = FALSE,
                last_activity_at = NOW()
            WHERE user_id = $1
            AND is_active = TRUE
        `;

        const result = await query(updateQuery, [userId]);
        return result.rowCount;
    } catch (error) {
        console.error('Error deactivating all user sessions:', error);
        throw error;
    }
};

/**
 * Lấy danh sách sessions active của user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Danh sách sessions
 */
const getUserActiveSessions = async (userId) => {
    try {
        const result = await query(
            `SELECT 
                id, 
                device_type, 
                ip_address, 
                created_at, 
                last_activity_at,
                expires_at
            FROM sessions 
            WHERE user_id = $1 
            AND is_active = TRUE
            AND expires_at > NOW()
            ORDER BY last_activity_at DESC`,
            [userId]
        );

        return result.rows;
    } catch (error) {
        console.error('Error getting user active sessions:', error);
        throw error;
    }
};

/**
 * Xóa các sessions đã hết hạn (cleanup job)
 * @returns {Promise<number>} Số lượng sessions đã xóa
 */
const deleteExpiredSessions = async () => {
    try {
        const deleteQuery = `
            DELETE FROM sessions 
            WHERE expires_at < NOW()
            OR (is_active = FALSE AND last_activity_at < NOW() - INTERVAL '30 days')
        `;

        const result = await query(deleteQuery);
        return result.rowCount;
    } catch (error) {
        console.error('Error deleting expired sessions:', error);
        throw error;
    }
};

/**
 * Vô hiệu hóa một session cụ thể (với verification user ownership)
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID để verify ownership
 * @returns {Promise<boolean>} True nếu thành công
 */
const deactivateSessionById = async (sessionId, userId) => {
    try {
        const updateQuery = `
            UPDATE sessions 
            SET is_active = FALSE,
                last_activity_at = NOW()
            WHERE id = $1
            AND user_id = $2
            AND is_active = TRUE
            RETURNING id
        `;

        const result = await query(updateQuery, [sessionId, userId]);
        return result.rows.length > 0;
    } catch (error) {
        console.error('Error deactivating session by id:', error);
        throw error;
    }
};

module.exports = {
    createSession,
    findSessionByRefreshToken,
    findSessionBySessionToken,
    updateSessionToken,
    deactivateSession,
    deactivateAllUserSessions,
    deactivateSessionById,
    getUserActiveSessions,
    deleteExpiredSessions
};
