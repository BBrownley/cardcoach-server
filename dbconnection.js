require("dotenv").config();

const mysql = require("mysql2");
const connection = mysql.createPool({
  connectionLimit: 1000,
  host: process.env.PRODUCTION_DB_HOST || "localhost",
  password: process.env.PRODUCTION_DB_PASSWORD || "",
  user: process.env.PRODUCTION_DB_USER || "root",
  database: process.env.PRODUCTION_DB_NAME || "cardcoach"
});

module.exports = { connection };
