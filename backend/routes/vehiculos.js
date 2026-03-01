// backend/routes/vehiculos.js – With usuario_id support
const router = require("express").Router();
const pool = require("../db/connection");

// GET /api/vehiculos?usuario_id=X  (filter by user for clients)
router.get("/", async (req, res) => {
  try {
    const { usuario_id } = req.query;
    let query = `
      SELECT v.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido
      FROM vehiculos v
      LEFT JOIN clientes c ON v.cliente_id = c.id
    `;
    const params = [];

    if (usuario_id) {
      // Show vehicles owned by this user (usuario_id) OR linked to a
      // client whose email matches this user's email
      query += `
        WHERE v.usuario_id = ?
           OR v.cliente_id IN (
                SELECT cl.id FROM clientes cl
                INNER JOIN usuarios u ON LOWER(cl.email) = LOWER(u.email)
                WHERE u.id = ?
              )
      `;
      params.push(usuario_id, usuario_id);
    }

    query += " ORDER BY v.dominio";
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener vehículos." });
  }
});

// GET /api/vehiculos/:id
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT v.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido
      FROM vehiculos v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE v.id = ?
    `,
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Vehículo no encontrado." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener el vehículo." });
  }
});

// GET /api/vehiculos/dominio/:dominio
router.get("/dominio/:dominio", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT v.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido
      FROM vehiculos v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE v.dominio = ?
    `,
      [req.params.dominio.toUpperCase()],
    );
    if (rows.length === 0)
      return res
        .status(404)
        .json({ error: "Vehículo no encontrado con ese dominio." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al buscar vehículo." });
  }
});

// POST /api/vehiculos
router.post("/", async (req, res) => {
  try {
    const { dominio, marca, modelo, anio, color, cliente_id, usuario_id } =
      req.body;
    if (!dominio || !marca || !modelo) {
      return res
        .status(400)
        .json({ error: "Dominio, marca y modelo son obligatorios." });
    }
    // Auto-resolve cliente_id from usuario_id if not provided
    let resolvedClienteId = cliente_id || null;
    if (!resolvedClienteId && usuario_id) {
      const [cl] = await pool.query(
        "SELECT id FROM clientes WHERE usuario_id = ? LIMIT 1",
        [usuario_id],
      );
      if (cl.length > 0) resolvedClienteId = cl[0].id;
    }

    const [result] = await pool.query(
      "INSERT INTO vehiculos (dominio, marca, modelo, anio, color, cliente_id, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        dominio.toUpperCase(),
        marca,
        modelo,
        anio || null,
        color || null,
        resolvedClienteId,
        usuario_id || null,
      ],
    );

    res.status(201).json({
      id: result.insertId,
      dominio: dominio.toUpperCase(),
      marca,
      modelo,
      anio,
      color,
      usuario_id,
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Ya existe un vehículo con ese dominio." });
    }
    console.error(err);
    res.status(500).json({ error: "Error al crear el vehículo." });
  }
});

// PUT /api/vehiculos/:id
router.put("/:id", async (req, res) => {
  try {
    const { dominio, marca, modelo, anio, color, cliente_id, usuario_id } =
      req.body;
    const [result] = await pool.query(
      "UPDATE vehiculos SET dominio=?, marca=?, modelo=?, anio=?, color=?, cliente_id=?, usuario_id=? WHERE id=?",
      [
        dominio?.toUpperCase(),
        marca,
        modelo,
        anio || null,
        color || null,
        cliente_id || null,
        usuario_id || null,
        req.params.id,
      ],
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Vehículo no encontrado." });
    res.json({ message: "Vehículo actualizado." });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Ya existe un vehículo con ese dominio." });
    }
    console.error(err);
    res.status(500).json({ error: "Error al actualizar el vehículo." });
  }
});

// DELETE /api/vehiculos/:id
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM vehiculos WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Vehículo no encontrado." });
    res.json({ message: "Vehículo eliminado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar el vehículo." });
  }
});

module.exports = router;
