const { query, getClient } = require('../config/db');

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
    const { id, email, fullName, phone, role = 'customer' } = userData;
    
    // Validate required fields
    if (!id || !email || !fullName || !phone) {
        throw new Error('Missing required fields: id, email, fullName, phone');
    }

    const client = await getClient();

    try {
        await client.query('BEGIN');
        
        // Insert user query (profile data only)
        const insertQuery = `
            INSERT INTO users (id, email, phone, full_name, role, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            RETURNING id, email, full_name, phone, role, created_at
        `;
        
        const result = await client.query(insertQuery, [id, email, phone, fullName, role]);
        
        await client.query('COMMIT');
        
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating user:', error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null
 */
const findUserByEmail = async (email) => {
    try {
        const result = await query(
            'SELECT * FROM users WHERE email = $1 LIMIT 1',
            [email]
        );
        
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error finding user by email:', error);
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
        const result = await query(
            'SELECT * FROM users WHERE id = $1 LIMIT 1',
            [userId]
        );
        
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error finding user by ID:', error);
        throw error;
    }
};

module.exports = {
    createUser,
    findUserByEmail,
    findUserById
};