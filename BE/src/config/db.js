/**
 * Database Configuration
 * @description PostgreSQL connection for local development and production
 * Uses environment variables for database connection
 * Supports both local (no SSL) and remote (SSL) connections
 */

const { Pool } = require('pg');
require('dotenv').config();

/**
 * PostgreSQL connection pool configuration
 * Optimized for local PostgreSQL connection
 */
const pool = new Pool({
    // Force IPv4 to avoid ENETUNREACH errors
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_HOST === 'localhost' ? false : {
        rejectUnauthorized: false
    },
    // Additional configuration
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
});

// Handle pool errors
pool.on('error', (err) => {
    console.error(' Unexpected database error:', err);
});

// Test connection on startup
pool.connect()
    .then(client => {
        console.log(' Database connected successfully', pool.options.database);
        client.release();
    })
    .catch(err => {
        console.error(' Database connection failed:', err.message);
    });

/*+*
 * Get database connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
const getPool = () => pool;

/**
 * Query helper function
 * Executes a SQL query with parameterized inputs
 * 
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params) => {
    try {
        const result = await pool.query(text, params);
        return result;
    } catch (err) {
        console.error(' Query error:', err);
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
    return await pool.connect();
};

module.exports = {
    getPool,
    query,
    getClient
};