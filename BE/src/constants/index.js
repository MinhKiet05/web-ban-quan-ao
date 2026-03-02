/**
 * Constants Index
 * Central export for all constants
 */

const { AppError, AUTH_ERRORS, USER_ERRORS, DB_ERRORS, createError } = require('./errors');
const HTTP_STATUS = require('./httpStatus');

module.exports = {
  AppError,
  AUTH_ERRORS,
  USER_ERRORS,
  DB_ERRORS,
  createError,
  HTTP_STATUS
};
