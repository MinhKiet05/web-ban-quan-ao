/**
 * DATABASE CONNECTION CONFIGURATION
 * 
 * This module handles PostgreSQL database connection using pg package.
 * Implements connection pooling for optimal performance and resource management.
 * 
 * Features:
 * - Connection pooling with configurable min/max connections
 * - Auto-reconnection handling
 * - Environment-based configuration
 * - SSL settings for production readiness
 * 
 * @requires pg - PostgreSQL driver for Node.js
 * @requires dotenv - Environment variables management
 */

const { Pool } = require('pg');
require('dotenv').config();

/**
 * PostgreSQL connection configuration
 * Uses environment variables for security and flexibility
 */
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    max: 10, // Maximum number of connections in pool
    min: 0, // Minimum number of connections in pool
    idleTimeoutMillis: 30000, // Connection timeout in milliseconds
    connectionTimeoutMillis: 2000, // Connection attempt timeout
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

// Global connection pool instance
let pool = null;

/**
 * Get database connection pool
 * Creates new pool if not exists, returns existing pool otherwise
 * 
 * @returns {Pool} PostgreSQL connection pool
 * @throws {Error} If connection fails
 */
const getPool = () => {
    if (!pool) {
        pool = new Pool(config);
        
        // Handle connection errors
        pool.on('error', (err) => {
            console.error('Unexpected error on idle PostgreSQL client:', err);
        });
        
        // Test connection
        pool.connect((err, client, release) => {
            if (err) {
                console.error('Database connection failed:', err);
            } else {
                console.log('Database connection pool established successfully');
                release();
            }
        });
    }
    return pool;
};

/**
 * Query helper function
 * Executes a SQL query with parameterized inputs
 * 
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await getPool().query(text, params);
        const duration = Date.now() - start;
        return result;
    } catch (err) {
        console.error('Query error:', err);
        throw err;
    }
};

/**
 * Get a client from the pool for transactions
 * Remember to release the client after use
 * 
 * @returns {Promise<PoolClient>} PostgreSQL client
 */
const getClient = async () => {
    return await getPool().connect();
};

// Initialize connection pool on module load
getPool();

module.exports = {
    getPool,
    query,
    getClient
};