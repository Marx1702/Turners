// backend/routes/auth.js – Register + Login with auto-client creation
const router = require("express").Router();
const pool = require("../db/connection");
const bcrypt = require("bcryptjs");

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { nombre, apellido, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res
        .status(400)
        .json({ error: "Nombre, email y contraseña son obligatorios." });
    }

    // Check if email already exists
    const [existing] = await conn.query(
      "SELECT id FROM usuarios WHERE email = ?",
      [email.toLowerCase()],
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Este correo ya está registrado." });
    }

    await conn.beginTransaction();

    // Create usuario
    const password_hash = await bcrypt.hash(password, 10);
    const [userResult] = await conn.query(
      "INSERT INTO usuarios (nombre, apellido, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)",
      [nombre, apellido || "", email.toLowerCase(), password_hash, "cliente"],
    );
    const userId = userResult.insertId;

    // Auto-create linked cliente record
    await conn.query(
      "INSERT INTO clientes (nombre, apellido, email, usuario_id) VALUES (?, ?, ?, ?)",
      [nombre, apellido || "", email.toLowerCase(), userId],
    );

    await conn.commit();

    res.status(201).json({
      message: "Usuario registrado con éxito.",
      user: {
        id: userId,
        nombre,
        apellido: apellido || "",
        email: email.toLowerCase(),
        rol: "cliente",
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error("Register error:", err);
    res.status(500).json({ error: "Error interno del servidor." });
  } finally {
    conn.release();
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email y contraseña son obligatorios." });
    }

    const [rows] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [
      email.toLowerCase(),
    ]);
    if (rows.length === 0) {
      return res
        .status(401)
        .json({ error: "Correo o contraseña incorrectos." });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res
        .status(401)
        .json({ error: "Correo o contraseña incorrectos." });
    }

    res.json({
      message: `Bienvenido, ${user.nombre}`,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido || "",
        email: user.email,
        rol: user.rol || "cliente",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

module.exports = router;
