// backend/routes/bloqueos.js – CRUD for blocked dates
const router = require("express").Router();
const pool = require("../db/connection");

// GET /api/bloqueos
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM bloqueos ORDER BY fecha_inicio",
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener bloqueos." });
  }
});

// POST /api/bloqueos
router.post("/", async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, motivo } = req.body;
    if (!fecha_inicio || !fecha_fin) {
      return res
        .status(400)
        .json({ error: "Fecha inicio y fin son obligatorias." });
    }
    const [result] = await pool.query(
      "INSERT INTO bloqueos (fecha_inicio, fecha_fin, motivo) VALUES (?, ?, ?)",
      [fecha_inicio, fecha_fin, motivo || "Cerrado"],
    );
    res
      .status(201)
      .json({ id: result.insertId, fecha_inicio, fecha_fin, motivo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear bloqueo." });
  }
});

// DELETE /api/bloqueos/:id
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM bloqueos WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Bloqueo no encontrado." });
    res.json({ message: "Bloqueo eliminado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar bloqueo." });
  }
});

module.exports = router;
