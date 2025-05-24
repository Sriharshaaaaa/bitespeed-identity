const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "bitespeed",
  password: "Sriharsha@2004",
  port: 5432,
});

module.exports = { pool };
