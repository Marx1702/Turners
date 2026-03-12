// backend/routes/backoffice.js – Protected backoffice for admin management
const router = require("express").Router();
const pool = require("../db/connection");
const bcrypt = require("bcryptjs");

// Middleware: verify backoffice key on every request
function verifyKey(req, res, next) {
  const key = req.headers["x-backoffice-key"];
  if (!key || key !== process.env.BACKOFFICE_KEY) {
    return res.status(403).json({ error: "Acceso denegado." });
  }
  next();
}

// POST /api/backoffice/auth – validate the secret key
router.post("/auth", (req, res) => {
  const { key } = req.body;
  if (!key || key !== process.env.BACKOFFICE_KEY) {
    return res.status(403).json({ error: "Clave incorrecta." });
  }
  res.json({ message: "Acceso concedido." });
});

// GET /api/backoffice/admins – list all admin users
router.get("/admins", verifyKey, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, apellido, email, created_at FROM usuarios WHERE rol = 'admin' ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("Backoffice list error:", err);
    res.status(500).json({ error: "Error interno." });
  }
});

// POST /api/backoffice/admins – create a new admin user
router.post("/admins", verifyKey, async (req, res) => {
  try {
    const { nombre, apellido, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios." });
    }

    // Check duplicate email
    const [existing] = await pool.query(
      "SELECT id FROM usuarios WHERE email = ?",
      [email.toLowerCase()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Este correo ya está registrado." });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre, apellido, email, password_hash, rol) VALUES (?, ?, ?, ?, 'admin')",
      [nombre, apellido || "", email.toLowerCase(), password_hash]
    );

    res.status(201).json({
      message: "Admin creado con éxito.",
      admin: {
        id: result.insertId,
        nombre,
        apellido: apellido || "",
        email: email.toLowerCase(),
      },
    });
  } catch (err) {
    console.error("Backoffice create error:", err);
    res.status(500).json({ error: "Error interno." });
  }
});

// DELETE /api/backoffice/admins/:id – delete an admin user
router.delete("/admins/:id", verifyKey, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting the last admin
    const [admins] = await pool.query(
      "SELECT id FROM usuarios WHERE rol = 'admin'"
    );
    if (admins.length <= 1) {
      return res.status(400).json({ error: "No se puede eliminar el último administrador." });
    }

    const [result] = await pool.query(
      "DELETE FROM usuarios WHERE id = ? AND rol = 'admin'",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Admin no encontrado." });
    }

    res.json({ message: "Admin eliminado." });
  } catch (err) {
    console.error("Backoffice delete error:", err);
    res.status(500).json({ error: "Error interno." });
  }
});

module.exports = router;
