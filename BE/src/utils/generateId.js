/**
 * Generate ID Utility
 * @description Utility để tạo unique ID cho các entities trong database
 */

const { query, getClient } = require("../config/db");

/**
 * Whitelist của tables và fields được phép
 * Chống SQL Injection bằng cách validate table/field names
 */
const ALLOWED_TABLES = {
  'users': ['id', 'email'],
  'accounts': ['id', 'identifier'],
  'sessions': ['id', 'refresh_token'],
  'products': ['id'],
  'orders': ['id'],
  'order_items': ['id'],
  'payments': ['id'],
  'categories': ['id'],
  'carts': ['id'],
  'cart_items': ['id'],
};

/**
 * Validate table name và field name để chống SQL injection
 * @param {string} tableName - Tên table
 * @param {string} idField - Tên field
 * @throws {Error} Nếu table/field không hợp lệ
 */
const validateTableAndField = (tableName, idField) => {
  if (!ALLOWED_TABLES[tableName]) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  if (!ALLOWED_TABLES[tableName].includes(idField)) {
    throw new Error(`Invalid field name: ${idField} for table: ${tableName}`);
  }
};

const checkIdExists = async (tableName, idField, idValue, dbClient = null) => {
  try {
    //  Validate để chống SQL injection
    validateTableAndField(tableName, idField);

    const runner = dbClient || { query: (sql, params) => query(sql, params) };
    const result = await runner.query(
      `SELECT 1 FROM ${tableName} WHERE ${idField} = $1 LIMIT 1`,
      [idValue],
    );
    return result.rowCount > 0;
  } catch (error) {
    throw new Error(`Database error: ${error.message}`);
  }
};

/**
 * Generate a unique ID for a specific table with custom prefix
 *
 * This function finds the highest existing numeric portion of IDs with the given prefix,
 * increments it, and ensures the new ID is unique.
 *
 * @param {string} tableName - Name of the database table
 * @param {string} idField - Name of the ID column
 * @param {string} prefix - Prefix for the ID (e.g., 'ACC', 'USR', 'BK')
 * @param {number} [length=3] - Length of the numeric portion (default: 3)
 * @returns {Promise<string>} Newly generated unique ID
 * @throws {Error} If database operation fails
 *
 * @example
 * // Generate Account ID: ACC001, ACC002, etc.
 * const accountId = await generateUniqueId('Accounts', 'AccountID', 'ACC', 3);
 */
async function generateUniqueId(tableName, idField, prefix, length = 3, dbClient = null) {
  try {
    //  Validate để chống SQL injection
    validateTableAndField(tableName, idField);

    // Validate prefix và length để tránh injection
    if (typeof prefix !== 'string' || prefix.length === 0 || prefix.length > 10) {
      throw new Error('Invalid prefix');
    }
    if (typeof length !== 'number' || length < 1 || length > 20) {
      throw new Error('Invalid length');
    }

    const runner = dbClient || { query: (sql, params) => query(sql, params) };

    // Find the current maximum numeric value with the given prefix
    // Using the provided client ensures visibility of un-committed inserts
    // within the same transaction, preventing duplicate key generation.
    const result = await runner.query(
      `SELECT MAX(
                CAST(
                    SUBSTRING(${idField}, ${prefix.length + 1}, ${length})
                    AS INTEGER
                )
            ) as max_num
            FROM ${tableName}
            WHERE ${idField} LIKE $1`,
      [prefix + "%"],
    );

    const maxNum = result.rows[0].max_num || 0;
    const newNum = maxNum + 1;
    const newId = prefix + newNum.toString().padStart(length, "0");

    // Verify the new ID is truly unique (safety check)
    const exists = await checkIdExists(tableName, idField, newId, dbClient);
    if (exists) {
      // If still conflicts, recursively try the next ID
      return generateUniqueId(tableName, idField, prefix, length, dbClient);
    }

    return newId;
  } catch (error) {
    throw new Error(`ID generation error: ${error.message}`);
  }
}

/**
 * Check multiple IDs for existence in different tables simultaneously
 * 
 * This function allows batch checking of multiple IDs across different tables,
 * which is useful for validation operations that need to verify several IDs at once.
 * 
 * @param {Array<Object>} checks - Array of check objects
 * @param {string} checks[].table - Table name to check
 * @param {string} checks[].field - Field name to check
 * @param {string} checks[].value - Value to check for existence
 * @returns {Promise<Object>} Object with field names as keys and existence status as values
 * @throws {Error} If any database operation fails
 * 
 * @example
 * const results = await checkMultipleIds([
 *   { table: 'Accounts', field: 'AccountID', value: 'ACC001' },
 *   { table: 'Users', field: 'UserID', value: 'USR001' }
 * ]);
 * // Returns: { AccountID: true, UserID: false }
 */
async function checkMultipleIds(checks) {
    try {
        const results = {};
        
        for (const check of checks) {
            results[check.field] = await checkIdExists(check.table, check.field, check.value);
        }
        
        return results;
    } catch (error) {
        console.error('Error checking multiple IDs:', error);
        throw new Error(`Multiple ID check error: ${error.message}`);
    }
}

module.exports = {
    generateUniqueId,
    checkMultipleIds
}