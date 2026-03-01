// backend/routes/clientes.js
const router = require("express").Router();
const pool = require("../db/connection");

// GET /api/clientes
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM clientes ORDER BY apellido, nombre",
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener clientes." });
  }
});

// GET /api/clientes/:id
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM clientes WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Cliente no encontrado." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener el cliente." });
  }
});

// POST /api/clientes
router.post("/", async (req, res) => {
  try {
    const { nombre, apellido, telefono, email, dni } = req.body;
    if (!nombre || !apellido) {
      return res
        .status(400)
        .json({ error: "Nombre y apellido son obligatorios." });
    }

    const [result] = await pool.query(
      "INSERT INTO clientes (nombre, apellido, telefono, email, dni) VALUES (?, ?, ?, ?, ?)",
      [nombre, apellido, telefono || null, email || null, dni || null],
    );

    res
      .status(201)
      .json({ id: result.insertId, nombre, apellido, telefono, email, dni });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear el cliente." });
  }
});

// PUT /api/clientes/:id
router.put("/:id", async (req, res) => {
  try {
    const { nombre, apellido, telefono, email, dni } = req.body;
    const [result] = await pool.query(
      "UPDATE clientes SET nombre=?, apellido=?, telefono=?, email=?, dni=? WHERE id=?",
      [
        nombre,
        apellido,
        telefono || null,
        email || null,
        dni || null,
        req.params.id,
      ],
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Cliente no encontrado." });
    res.json({ message: "Cliente actualizado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar el cliente." });
  }
});

// DELETE /api/clientes/:id
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM clientes WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Cliente no encontrado." });
    res.json({ message: "Cliente eliminado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar el cliente." });
  }
});

module.exports = router;
