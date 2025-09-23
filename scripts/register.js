// Carga el array users desde localStorage o crea uno vacío
let users = JSON.parse(localStorage.getItem("users")) || [];

/* ========== Notificaciones ========== */
function showToast(message, type = "info") {
  const bg = {
    success: "linear-gradient(to right, #00b09b, #96c93d)",
    error:   "linear-gradient(to right, #ff5f6d, #ffc371)",
    info:    "linear-gradient(to right, #2193b0, #6dd5ed)"
  }[type] || "linear-gradient(to right, #2193b0, #6dd5ed)";

  Toastify({
    text: message,
    duration: 3000,
    close: true,
    gravity: "top",     // "top" | "bottom"
    position: "right",  // "left" | "center" | "right"
    stopOnFocus: true,
    style: { background: bg, borderRadius: "8px", fontSize: "0.9rem" }
  }).showToast();
}

/* ========== Helpers de validación ========== */
function isValidEmail(email) {
  // validación simple
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isStrongEnough(pass) {
  return typeof pass === "string" && pass.length >= 6; // regla mínima
}

/* ========== Registro ========== */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const nombre   = document.getElementById("nombre").value.trim();
    const emailRaw = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    // normalizamos email para evitar duplicados por mayúsculas
    const email = emailRaw.toLowerCase();

    registerUser(nombre, email, password);
  });
});

function registerUser(nombre, email, password) {
  // Validaciones básicas
  if (!nombre) {
    showToast("Ingresá tu nombre.", "error");
    return;
  }
  if (!email || !isValidEmail(email)) {
    showToast("Ingresá un correo válido.", "error");
    return;
  }
  if (!isStrongEnough(password)) {
    showToast("La contraseña debe tener al menos 6 caracteres.", "error");
    return;
  }

  // Validar que el email no exista (case-insensitive)
  const exists = users.some(user => String(user.email).toLowerCase() === email);
  if (exists) {
    showToast("El correo ya está registrado.", "error");
    return;
  }

  // Crear nuevo usuario con id incremental
  const newUser = {
    id: users.length > 0 ? users[users.length - 1].id + 1 : 1,
    nombre,
    email,     // ya normalizado en minúsculas
    password   // Nota: en producción, nunca guardar plano
  };

  users.push(newUser);
  localStorage.setItem("users", JSON.stringify(users));

  showToast("Usuario registrado con éxito 👌", "success");
  // Redirigir (ajustá la ruta si este HTML está en subcarpeta)
  setTimeout(() => { window.location.href = "../views/login.html"; }, 900);
}
