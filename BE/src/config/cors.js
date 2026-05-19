/**
 * CORS Configuration
 * @description Cấu hình Cross-Origin Resource Sharing
 */

require('dotenv').config();

module.exports = {
  origin: [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'https://web-ban-quan-ao-nu.vercel.app'
  ].filter(Boolean),
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
};

