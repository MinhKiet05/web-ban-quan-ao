const { Pool} = require('pg');
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});
 
module.exports = pool;