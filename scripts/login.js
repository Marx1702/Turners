// Cargar usuarios desde localStorage
const users = JSON.parse(localStorage.getItem("users")) || [];

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
    gravity: "top",
    position: "right",
    stopOnFocus: true,
    style: { background: bg, borderRadius: "8px", fontSize: "0.9rem" }
  }).showToast();
}

/* ========== Login ========== */
function loginUser(userFound) { 
  if (userFound) {
    showToast(`Bienvenido, ${userFound.nombre}`, "success");
    localStorage.setItem("activeUser", JSON.stringify(userFound));
    // redirección después de mostrar el toast
    setTimeout(() => {
      window.location.href = "index.html"; // ajustá la ruta si login.html está en subcarpeta
    }, 900);
  } else {
    showToast("Correo o contraseña incorrectos.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    // buscar usuario en localStorage
    const userFound = users.find(
      user => String(user.email).toLowerCase() === email && user.password === password
    );

    loginUser(userFound);
  });
});
