// backend/routes/seguimientos.js
const router = require("express").Router();
const pool = require("../db/connection");

// GET /api/seguimientos
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT seg.*, v.dominio, v.marca, v.modelo,
             s.nombre AS servicio_nombre
      FROM seguimientos seg
      LEFT JOIN vehiculos v ON seg.vehiculo_id = v.id
      LEFT JOIN servicios s ON seg.servicio_id = s.id
      ORDER BY seg.fecha DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener seguimientos." });
  }
});

// GET /api/seguimientos/vehiculo/:dominio  → Filtrar por dominio
router.get("/vehiculo/:dominio", async (req, res) => {
  try {
    const dominio = req.params.dominio.toUpperCase();
    const [rows] = await pool.query(
      `
      SELECT seg.*, v.dominio, v.marca, v.modelo,
             s.nombre AS servicio_nombre
      FROM seguimientos seg
      JOIN vehiculos v ON seg.vehiculo_id = v.id
      LEFT JOIN servicios s ON seg.servicio_id = s.id
      WHERE v.dominio = ?
      ORDER BY seg.fecha DESC
    `,
      [dominio],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al filtrar seguimientos." });
  }
});

// POST /api/seguimientos
router.post("/", async (req, res) => {
  try {
    const {
      vehiculo_id,
      servicio_id,
      fecha,
      kilometraje,
      observaciones,
      turno_id,
    } = req.body;

    if (!vehiculo_id || !servicio_id || !fecha) {
      return res
        .status(400)
        .json({ error: "Vehículo, servicio y fecha son obligatorios." });
    }

    const [result] = await pool.query(
      `INSERT INTO seguimientos (vehiculo_id, servicio_id, fecha, kilometraje, observaciones, turno_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        vehiculo_id,
        servicio_id,
        fecha,
        kilometraje || null,
        observaciones || null,
        turno_id || null,
      ],
    );

    res
      .status(201)
      .json({
        id: result.insertId,
        vehiculo_id,
        servicio_id,
        fecha,
        kilometraje,
        observaciones,
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear seguimiento." });
  }
});

// PUT /api/seguimientos/:id
router.put("/:id", async (req, res) => {
  try {
    const { vehiculo_id, servicio_id, fecha, kilometraje, observaciones } =
      req.body;
    const [result] = await pool.query(
      `UPDATE seguimientos SET vehiculo_id=?, servicio_id=?, fecha=?, kilometraje=?, observaciones=? WHERE id=?`,
      [
        vehiculo_id,
        servicio_id,
        fecha,
        kilometraje || null,
        observaciones || null,
        req.params.id,
      ],
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Seguimiento no encontrado." });
    res.json({ message: "Seguimiento actualizado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar seguimiento." });
  }
});

// DELETE /api/seguimientos/:id
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM seguimientos WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Seguimiento no encontrado." });
    res.json({ message: "Seguimiento eliminado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar seguimiento." });
  }
});

module.exports = router;
