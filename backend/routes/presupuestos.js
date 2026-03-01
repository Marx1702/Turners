// backend/routes/presupuestos.js – CRUD for quotes with line items
const router = require("express").Router();
const pool = require("../db/connection");

// GET /api/presupuestos  — all (admin) or by vehiculo owner (client)
router.get("/", async (req, res) => {
  try {
    const { usuario_id } = req.query;

    let query = `
      SELECT p.*,
             v.dominio, v.marca, v.modelo, v.anio,
             u.nombre AS admin_nombre,
             t.fecha AS turno_fecha, t.hora AS turno_hora,
             s.nombre AS servicio_nombre
      FROM presupuestos p
      LEFT JOIN vehiculos  v ON p.vehiculo_id = v.id
      LEFT JOIN usuarios   u ON p.usuario_id  = u.id
      LEFT JOIN turnos     t ON p.turno_id    = t.id
      LEFT JOIN servicios  s ON t.servicio_id = s.id
    `;
    const params = [];

    if (usuario_id) {
      // Client: only presupuestos for their vehicles
      query += " WHERE v.usuario_id = ?";
      params.push(usuario_id);
    }

    query += " ORDER BY p.created_at DESC";
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener presupuestos." });
  }
});

// GET /api/presupuestos/:id  — detail with items
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT p.*,
             v.dominio, v.marca, v.modelo, v.anio,
             v.usuario_id AS vehiculo_usuario_id,
             u.nombre AS admin_nombre,
             t.fecha AS turno_fecha, t.hora AS turno_hora,
             s.nombre AS servicio_nombre,
             cl.nombre AS cliente_nombre, cl.apellido AS cliente_apellido,
             vu.nombre AS vehiculo_owner_nombre, vu.email AS vehiculo_owner_email
      FROM presupuestos p
      LEFT JOIN vehiculos  v  ON p.vehiculo_id = v.id
      LEFT JOIN usuarios   u  ON p.usuario_id  = u.id
      LEFT JOIN usuarios   vu ON v.usuario_id  = vu.id
      LEFT JOIN turnos     t  ON p.turno_id    = t.id
      LEFT JOIN servicios  s  ON t.servicio_id = s.id
      LEFT JOIN clientes   cl ON v.cliente_id  = cl.id
      WHERE p.id = ?
    `,
      [req.params.id],
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Presupuesto no encontrado." });

    const presupuesto = rows[0];

    const [items] = await pool.query(
      "SELECT * FROM presupuesto_items WHERE presupuesto_id = ? ORDER BY id",
      [req.params.id],
    );

    presupuesto.items = items;
    res.json(presupuesto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener presupuesto." });
  }
});

// GET /api/presupuestos/turno/:turnoId — get presupuesto by turno
router.get("/turno/:turnoId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id FROM presupuestos WHERE turno_id = ? LIMIT 1",
      [req.params.turnoId],
    );
    if (rows.length === 0)
      return res
        .status(404)
        .json({ error: "No hay presupuesto para este turno." });
    res.json({ presupuesto_id: rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al buscar presupuesto." });
  }
});

// POST /api/presupuestos — create with items
router.post("/", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { turno_id, vehiculo_id, usuario_id, fecha, observaciones, items } =
      req.body;

    if (!usuario_id || !fecha) {
      return res
        .status(400)
        .json({ error: "Usuario y fecha son obligatorios." });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Debe incluir al menos un ítem." });
    }

    const [result] = await conn.query(
      "INSERT INTO presupuestos (turno_id, vehiculo_id, usuario_id, fecha, observaciones) VALUES (?, ?, ?, ?, ?)",
      [
        turno_id || null,
        vehiculo_id || null,
        usuario_id,
        fecha,
        observaciones || null,
      ],
    );

    const presupuestoId = result.insertId;

    for (const item of items) {
      await conn.query(
        "INSERT INTO presupuesto_items (presupuesto_id, descripcion, cantidad, precio_unitario) VALUES (?, ?, ?, ?)",
        [
          presupuestoId,
          item.descripcion,
          item.cantidad || 1,
          item.precio_unitario,
        ],
      );
    }

    await conn.commit();
    res.status(201).json({ message: "Presupuesto creado.", id: presupuestoId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Error al crear presupuesto." });
  } finally {
    conn.release();
  }
});

// PUT /api/presupuestos/:id — update header + replace items
router.put("/:id", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { observaciones, estado, items } = req.body;
    const updates = [];
    const params = [];

    if (observaciones !== undefined) {
      updates.push("observaciones = ?");
      params.push(observaciones);
    }
    if (estado) {
      updates.push("estado = ?");
      params.push(estado);
    }

    if (updates.length > 0) {
      params.push(req.params.id);
      await conn.query(
        `UPDATE presupuestos SET ${updates.join(", ")} WHERE id = ?`,
        params,
      );
    }

    if (items && Array.isArray(items)) {
      await conn.query(
        "DELETE FROM presupuesto_items WHERE presupuesto_id = ?",
        [req.params.id],
      );
      for (const item of items) {
        await conn.query(
          "INSERT INTO presupuesto_items (presupuesto_id, descripcion, cantidad, precio_unitario) VALUES (?, ?, ?, ?)",
          [
            req.params.id,
            item.descripcion,
            item.cantidad || 1,
            item.precio_unitario,
          ],
        );
      }
    }

    await conn.commit();
    res.json({ message: "Presupuesto actualizado." });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Error al actualizar presupuesto." });
  } finally {
    conn.release();
  }
});

// DELETE /api/presupuestos/:id
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM presupuestos WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "No encontrado." });
    res.json({ message: "Presupuesto eliminado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar." });
  }
});

module.exports = router;
