// db/init.js – Creates tables and seeds data (clean start)
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

async function init() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "193.203.175.107",
    user: process.env.DB_USER || "u447396976_Marx",
    password: process.env.DB_PASSWORD || "NsMotors2026",
    multipleStatements: true,
  });

  console.log("✅ Conectado a MySQL");

  // Schema (drops and recreates the database)
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  console.log("📄 Ejecutando schema.sql (DROP + CREATE)...");
  await conn.query(schema);
  console.log("✅ Base de datos recreada con todas las tablas");

  // Seed servicios
  const seed = fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8");
  console.log("📄 Ejecutando seed.sql...");
  await conn.query(seed);
  console.log("✅ Datos iniciales insertados");

  // Create admin user
  await conn.query("USE u447396976_turners_db");
  const hash = await bcrypt.hash("admin123", 10);
  await conn.query(
    "INSERT INTO usuarios (nombre, apellido, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)",
    ["Administrador", "", "admin@turners.com", hash, "admin"],
  );
  console.log("✅ Usuario admin creado (admin@turners.com / admin123)");

  await conn.end();
  console.log("\n🎉 Base de datos turners_db lista!");
}

init().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
