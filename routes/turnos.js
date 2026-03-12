// backend/routes/turnos.js – With status editing, duration-aware slots, and blocked dates
const router = require("express").Router();
const pool = require("../db/connection");

// GET /api/turnos/disponibles?fecha=X&servicio_id=Y (MUST be before /:id)
router.get("/disponibles", async (req, res) => {
  try {
    const { fecha, servicio_id } = req.query;
    if (!fecha || !servicio_id) {
      return res
        .status(400)
        .json({ error: "Fecha y servicio_id son obligatorios." });
    }

    // Check if date is blocked
    const [bloqueados] = await pool.query(
      "SELECT id FROM bloqueos WHERE ? BETWEEN fecha_inicio AND fecha_fin",
      [fecha],
    );
    if (bloqueados.length > 0) {
      return res.json([]); // No slots available — date blocked
    }

    // Get service duration
    const [servicios] = await pool.query(
      "SELECT duracion_min FROM servicios WHERE id = ?",
      [servicio_id],
    );
    const duracionMin = servicios.length > 0 ? servicios[0].duracion_min : 30;
    const slotsNeeded = Math.ceil(duracionMin / 30); // How many 30-min slots this service needs

    // Get occupied slots with their durations
    const [ocupados] = await pool.query(
      `
      SELECT t.hora, COALESCE(s.duracion_min, 30) AS duracion_min
      FROM turnos t
      LEFT JOIN servicios s ON t.servicio_id = s.id
      WHERE t.fecha = ?
    `,
      [fecha],
    );

    // Build a set of all occupied 30-min blocks
    const ocupadosSet = new Set();
    ocupados.forEach((r) => {
      const [hh, mm] = r.hora.slice(0, 5).split(":").map(Number);
      const blocks = Math.ceil(r.duracion_min / 30);
      for (let i = 0; i < blocks; i++) {
        const totalMin = hh * 60 + mm + i * 30;
        const bh = String(Math.floor(totalMin / 60)).padStart(2, "0");
        const bm = String(totalMin % 60).padStart(2, "0");
        ocupadosSet.add(`${bh}:${bm}`);
      }
    });

    // Generate all 30-min slots from 09:00 to 18:00
    const allSlots = [];
    for (let h = 9; h <= 18; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 18 && m > 0) break;
        allSlots.push(
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        );
      }
    }

    // Filter: only slots where ALL consecutive blocks needed are free
    const available = [];
    for (const slot of allSlots) {
      const [sh, sm] = slot.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = startMin + duracionMin;

      // Don't exceed business hours (18:00 = 1080 min)
      if (endMin > 18 * 60) continue;

      let free = true;
      for (let i = 0; i < slotsNeeded; i++) {
        const checkMin = startMin + i * 30;
        const ch = String(Math.floor(checkMin / 60)).padStart(2, "0");
        const cm = String(checkMin % 60).padStart(2, "0");
        if (ocupadosSet.has(`${ch}:${cm}`)) {
          free = false;
          break;
        }
      }
      if (free) available.push(slot);
    }

    res.json(available);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener disponibilidad." });
  }
});

// GET /api/turnos?usuario_id=X
router.get("/", async (req, res) => {
  try {
    const { usuario_id } = req.query;
    let query = `
      SELECT t.*, s.nombre AS servicio_nombre, s.duracion_min,
             c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
             v.dominio AS vehiculo_dominio,
             u.nombre AS usuario_nombre, u.email AS usuario_email
      FROM turnos t
      LEFT JOIN servicios s ON t.servicio_id = s.id
      LEFT JOIN clientes  c ON t.cliente_id  = c.id
      LEFT JOIN vehiculos v ON t.vehiculo_id = v.id
      LEFT JOIN usuarios  u ON t.usuario_id  = u.id
    `;
    const params = [];

    if (usuario_id) {
      query += " WHERE t.usuario_id = ?";
      params.push(usuario_id);
    }

    query += " ORDER BY t.fecha DESC, t.hora DESC";

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener turnos." });
  }
});

// POST /api/turnos
router.post("/", async (req, res) => {
  try {
    const { fecha, hora, servicio_id, cliente_id, vehiculo_id, usuario_id } =
      req.body;

    if (!fecha || !hora || !servicio_id || !usuario_id) {
      return res
        .status(400)
        .json({ error: "Fecha, hora, servicio y usuario son obligatorios." });
    }

    // Check if date is blocked
    const [bloqueados] = await pool.query(
      "SELECT id FROM bloqueos WHERE ? BETWEEN fecha_inicio AND fecha_fin",
      [fecha],
    );
    if (bloqueados.length > 0) {
      return res
        .status(409)
        .json({ error: "Esa fecha está bloqueada (el taller no atiende)." });
    }

    // Check for overlap with duration awareness
    const [servicios] = await pool.query(
      "SELECT duracion_min FROM servicios WHERE id = ?",
      [servicio_id],
    );
    const duracionMin = servicios.length > 0 ? servicios[0].duracion_min : 30;
    const slotsNeeded = Math.ceil(duracionMin / 30);

    const [hh, mm] = hora.split(":").map(Number);
    const startMin = hh * 60 + mm;

    // Check each slot this service would occupy
    for (let i = 0; i < slotsNeeded; i++) {
      const checkMin = startMin + i * 30;
      const ch = String(Math.floor(checkMin / 60)).padStart(2, "0");
      const cm = String(checkMin % 60).padStart(2, "0");
      const checkTime = `${ch}:${cm}`;

      // Check if any existing turno occupies this slot
      const [conflicts] = await pool.query(
        `
        SELECT t.id FROM turnos t
        LEFT JOIN servicios s ON t.servicio_id = s.id
        WHERE t.fecha = ? AND (
          TIME_TO_SEC(?) >= TIME_TO_SEC(t.hora) AND
          TIME_TO_SEC(?) < TIME_TO_SEC(t.hora) + COALESCE(s.duracion_min, 30) * 60
        )
      `,
        [fecha, checkTime, checkTime],
      );

      if (conflicts.length > 0) {
        return res.status(409).json({ error: "Ese horario ya está ocupado." });
      }
    }

    // Auto-resolve cliente_id from usuario_id if not provided
    let resolvedClienteId = cliente_id || null;
    if (!resolvedClienteId && usuario_id) {
      const [clienteRows] = await pool.query(
        "SELECT id FROM clientes WHERE usuario_id = ? LIMIT 1",
        [usuario_id],
      );
      if (clienteRows.length > 0) resolvedClienteId = clienteRows[0].id;
    }

    const [result] = await pool.query(
      `INSERT INTO turnos (fecha, hora, servicio_id, cliente_id, vehiculo_id, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        fecha,
        hora,
        servicio_id,
        resolvedClienteId,
        vehiculo_id || null,
        usuario_id,
      ],
    );

    res
      .status(201)
      .json({ id: result.insertId, fecha, hora, servicio_id, usuario_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear el turno." });
  }
});

// PUT /api/turnos/:id (update estado, fecha, hora)
router.put("/:id", async (req, res) => {
  try {
    const { estado, fecha, hora } = req.body;
    const updates = [];
    const params = [];

    if (estado) {
      updates.push("estado = ?");
      params.push(estado);
    }
    if (fecha) {
      updates.push("fecha = ?");
      params.push(fecha);
    }
    if (hora) {
      updates.push("hora = ?");
      params.push(hora);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Nada para actualizar." });
    }

    params.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE turnos SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Turno no encontrado." });
    res.json({ message: "Turno actualizado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar el turno." });
  }
});

// DELETE /api/turnos/:id
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM turnos WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Turno no encontrado." });
    res.json({ message: "Turno eliminado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar el turno." });
  }
});

module.exports = router;
