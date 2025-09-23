// scripts/footer.js
document.addEventListener("DOMContentLoaded", () => {
  const footerDiv = document.getElementById("footer");
  if (!footerDiv) return;

  fetch("../views/footer.html") // si tus vistas están en /views/, el footer está en la raíz
    .then(res => res.text())
    .then(html => { footerDiv.innerHTML = html; })
    .catch(() => {
      footerDiv.innerHTML = `
        <footer class="footer">
          <p>&copy; 2025 Turners</p>
        </footer>
      `;
    });
});
