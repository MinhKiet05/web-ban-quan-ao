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
const { URL } = require('url');
const dns = require('dns');
const { promisify } = require('util');
require('dotenv').config();

const dnsLookup = promisify(dns.lookup);

/**
 * Custom DNS lookup to force IPv4 resolution
 */
async function lookupIPv4(hostname) {
    try {
        const result = await dnsLookup(hostname, { family: 4 });
        return result.address;
    } catch (error) {
        console.error(`DNS lookup failed for ${hostname}:`, error);
        throw error;
    }
}

/**
 * Parse DATABASE_URL to individual components and resolve IPv4
 */
async function parseConnectionString(connectionString) {
    const url = new URL(connectionString);
    
    // Resolve hostname to IPv4 address
    let host = url.hostname;
    try {
        // Try to resolve to IPv4
        const ipv4Address = await lookupIPv4(host);
        console.log(`✅ Resolved ${host} to IPv4: ${ipv4Address}`);
        host = ipv4Address;
    } catch (error) {
        console.warn(`⚠️  Could not resolve to IPv4, using hostname: ${host}`);
    }
    
    return {
        user: url.username,
        password: url.password,
        host: host,  // Use resolved IPv4 address
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1), // Remove leading '/'
        ssl: { rejectUnauthorized: false },
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
    };
}

/**
 * PostgreSQL connection configuration
 * Uses environment variables for security and flexibility
 * Supports both individual credentials and DATABASE_URL (for Supabase)
 */
let config = null;

async function getConfig() {
    if (config) return config;
    
    if (process.env.DATABASE_URL) {
        config = await parseConnectionString(process.env.DATABASE_URL);
    } else {
        config = {
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT, 10) || 5432,
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
        };
    }
    
    return config;
}

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
        // Initialize config asynchronously
        (async () => {
            const poolConfig = await getConfig();
            pool = new Pool(poolConfig);
        
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
        })();
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