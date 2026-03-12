// backend/server.js
require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ── */
app.use(cors());
app.use(express.json());

/* ── Servir archivos estáticos del frontend ── */
app.use(express.static(path.join(__dirname, "..")));

/* ── Rutas API ── */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/clientes", require("./routes/clientes"));
app.use("/api/vehiculos", require("./routes/vehiculos"));
app.use("/api/servicios", require("./routes/servicios"));
app.use("/api/turnos", require("./routes/turnos"));
app.use("/api/seguimientos", require("./routes/seguimientos"));
app.use("/api/bloqueos", require("./routes/bloqueos"));
app.use("/api/presupuestos", require("./routes/presupuestos"));
app.use("/api/backoffice", require("./routes/backoffice"));

/* ── Redirigir raíz al index ── */
app.get("/", (_req, res) => res.redirect("/views/index.html"));

/* ── Health check para monitoreo ── */
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

/* ── Debug (TEMPORAL – borrar en producción) ── */
app.get("/debug", (_req, res) => {
  const fs = require("fs");
  const staticDir = path.join(__dirname, "..");
  let parentFiles = [];
  let currentFiles = [];
  try { parentFiles = fs.readdirSync(staticDir); } catch(e) { parentFiles = [e.message]; }
  try { currentFiles = fs.readdirSync(__dirname); } catch(e) { currentFiles = [e.message]; }
  res.json({
    __dirname,
    cwd: process.cwd(),
    staticDir,
    parentFiles,
    currentFiles,
    env: {
      DB_HOST: process.env.DB_HOST ? "SET" : "NOT SET",
      DB_USER: process.env.DB_USER ? "SET" : "NOT SET",
      DB_NAME: process.env.DB_NAME ? "SET" : "NOT SET",
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
    }
  });
});

/* ── Inicio ── */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Turners API corriendo en http://localhost:${PORT}`);
});
