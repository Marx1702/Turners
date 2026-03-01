// backend/routes/servicios.js
const router = require("express").Router();
const pool = require("../db/connection");

// GET /api/servicios
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM servicios ORDER BY id");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener servicios." });
  }
});

// GET /api/servicios/:id
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM servicios WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Servicio no encontrado." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener el servicio." });
  }
});

module.exports = router;
