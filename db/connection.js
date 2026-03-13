// db/connection.js
const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const pool = mysql.createPool({
  host: process.env.DB_HOST || "193.203.175.107",
  user: process.env.DB_USER || "u447396976_Marx",
  password: process.env.DB_PASSWORD || "NsMotors2026",
  database: process.env.DB_NAME || "u447396976_turners_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
