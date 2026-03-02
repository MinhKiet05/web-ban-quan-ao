const { query, getClient } = require('../config/db');

/**
 * Create a new account (for authentication)
 * @param {Object} accountData - Account data object
 * @param {string} accountData.id - Account ID (generated)
 * @param {string} accountData.userId - Associated user ID
 * @param {string} accountData.accountType - Type: 'email', 'phone', or 'oauth'
 * @param {string} accountData.identifier - Email, phone, or OAuth provider user ID
 * @param {string} accountData.passwordHash - Hashed password
 * @returns {Promise<Object>} Created account
 */
const createAccount = async (accountData) => {
    const { id, userId, accountType, identifier, passwordHash } = accountData;
    
    // Validate required fields
    if (!id || !userId || !accountType || !identifier || !passwordHash) {
        throw new Error('Missing required fields: id, userId, accountType, identifier, passwordHash');
    }

    const client = await getClient();

    try {
        await client.query('BEGIN');
        
        // Insert account query
        const insertQuery = `
            INSERT INTO accounts (
                id, user_id, account_type, identifier, password_hash, 
                is_verified, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, FALSE, NOW(), NOW())
            RETURNING id, user_id, account_type, identifier, is_verified, created_at
        `;
        
        const result = await client.query(insertQuery, [
            id, userId, accountType, identifier, passwordHash
        ]);
        
        await client.query('COMMIT');
        
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating account:', error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Find account by identifier (email, phone, or OAuth ID) with user info
 * @param {string} identifier - Email, phone, or OAuth provider user ID
 * @returns {Promise<Object|null>} Account object with user info or null
 */
const findAccountByIdentifier = async (identifier) => {
    try {
        const result = await query(
            `SELECT 
                a.id, 
                a.user_id, 
                a.identifier, 
                a.password_hash,
                a.account_type,
                a.is_verified,
                u.full_name,
                u.email,
                u.phone,
                u.role,
                u.avatar_url,
                u.tier,
                u.loyalty_points,
                u.is_active
            FROM accounts a
            INNER JOIN users u ON a.user_id = u.id
            WHERE a.identifier = $1 
            LIMIT 1`,
            [identifier]
        );
        
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error finding account by identifier:', error);
        throw error;
    }
};

/**
 * Find account by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of accounts
 */
const findAccountsByUserId = async (userId) => {
    try {
        const result = await query(
            'SELECT * FROM accounts WHERE user_id = $1',
            [userId]
        );
        
        return result.rows;
    } catch (error) {
        console.error('Error finding accounts by user ID:', error);
        throw error;
    }
};

/**
 * Update account password
 * @param {string} accountId - Account ID
 * @param {string} newPasswordHash - New hashed password
 * @returns {Promise<Object>} Updated account
 */
const updateAccountPassword = async (accountId, newPasswordHash) => {
    try {
        const result = await query(
            `UPDATE accounts 
             SET password_hash = $1, updated_at = NOW() 
             WHERE id = $2 
             RETURNING id, user_id, account_type, identifier, updated_at`,
            [newPasswordHash, accountId]
        );
        
        return result.rows[0];
    } catch (error) {
        console.error('Error updating account password:', error);
        throw error;
    }
};

/**
 * Verify account (mark as verified)
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} Updated account
 */
const verifyAccount = async (accountId) => {
    try {
        const result = await query(
            `UPDATE accounts 
             SET is_verified = TRUE, verified_at = NOW(), updated_at = NOW() 
             WHERE id = $1 
             RETURNING id, user_id, account_type, identifier, is_verified, verified_at`,
            [accountId]
        );
        
        return result.rows[0];
    } catch (error) {
        console.error('Error verifying account:', error);
        throw error;
    }
};

module.exports = {
    createAccount,
    findAccountByIdentifier,
    findAccountsByUserId,
    updateAccountPassword,
    verifyAccount
};
