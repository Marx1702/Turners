// backend/routes/servicios.js – Full CRUD for services
const router = require("express").Router();
const pool = require("../db/connection");
const multer = require("multer");
const path = require("path");

// Multer storage: save to assets/images/services/
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, "../../assets/images/services"));
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, safeName);
  },
});
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp|gif)$/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// POST /api/servicios/upload — upload service image
router.post("/upload", upload.single("imagen"), (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: "No se subió ninguna imagen válida." });
  }
  res.json({ filename: req.file.filename });
});
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

// POST /api/servicios
router.post("/", async (req, res) => {
  try {
    const { nombre, descripcion, duracion_min, precio, imagen } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: "El nombre es obligatorio." });
    }
    const [result] = await pool.query(
      "INSERT INTO servicios (nombre, descripcion, duracion_min, precio, imagen) VALUES (?, ?, ?, ?, ?)",
      [
        nombre,
        descripcion || null,
        duracion_min || 30,
        precio || 0,
        imagen || null,
      ],
    );
    res.status(201).json({
      id: result.insertId,
      nombre,
      descripcion,
      duracion_min: duracion_min || 30,
      precio: precio || 0,
      imagen,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear el servicio." });
  }
});

// PUT /api/servicios/:id
router.put("/:id", async (req, res) => {
  try {
    const { nombre, descripcion, duracion_min, precio, imagen } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: "El nombre es obligatorio." });
    }
    const [result] = await pool.query(
      "UPDATE servicios SET nombre=?, descripcion=?, duracion_min=?, precio=?, imagen=? WHERE id=?",
      [
        nombre,
        descripcion || null,
        duracion_min || 30,
        precio || 0,
        imagen || null,
        req.params.id,
      ],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Servicio no encontrado." });
    }
    res.json({ message: "Servicio actualizado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar el servicio." });
  }
});

// DELETE /api/servicios/:id
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM servicios WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Servicio no encontrado." });
    }
    res.json({ message: "Servicio eliminado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar el servicio." });
  }
});

module.exports = router;
