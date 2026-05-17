/**
 * JWT Configuration
 * @description Cấu hình JWT secret keys và expiration times
 */

require('dotenv').config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET_KEY,
  jwtRefresh: process.env.JWT_REFRESH_KEY,
  jwtExpire: "3d",      // Access token: 3 days (as per requirement)
  jwtfreshExpire: "7d"  // Refresh token: 7 days
};
