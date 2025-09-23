// ../scripts/services.js
// Render de servicios con imagen por tarjeta (sin romper tu HTML ni rutas)

const SERVICES_JSON_URL = '../data/services.json'; // desde services.html (subcarpeta) subir 1 nivel
const IMG_BASE = '../assets/images/services/';     // carpeta donde vas a poner las imágenes
const IMG_PLACEHOLDER = 'placeholder.jpg';         // imagen por defecto (ponela en /assets/images/services/)

document.addEventListener('DOMContentLoaded', initServices);

async function initServices() {
  const list = document.getElementById('services-list');
  if (!list) return;

  try {
    const servicios = await cargarServicios();
    renderServicios(servicios, list);
    wireEvents(list);
  } catch (err) {
    console.error(err);
    list.innerHTML = `<p class="error">No se pudieron cargar los servicios.</p>`;
  }
}

async function cargarServicios() {
  const res = await fetch(SERVICES_JSON_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('Error cargando services.json');
  return res.json();
}

function renderServicios(servicios, container) {
  container.innerHTML = servicios.map((s) => {
    // 1) Si el JSON trae "image" se usa tal cual; 
    // 2) si no, generamos un nombre de archivo por slug del nombre
    const fileName = s.image ? s.image : slug(`${s.nombre}`) + '.jpg';
    const imgSrc = `${IMG_BASE}${fileName}`;

    const precio = (s.precio != null)
      ? `$${Number(s.precio).toLocaleString('es-AR')}`
      : '';

    const duracion = (s.duracionMin != null)
      ? `${s.duracionMin} min`
      : '';

    return `
      <article class="service-card">
        <div class="service-media">
          <img src="${imgSrc}" alt="${escapeHtml(s.nombre)}"
               onerror="this.onerror=null;this.src='${IMG_BASE}${IMG_PLACEHOLDER}';">
        </div>
        <div class="service-body">
          <h3 class="service-title">${escapeHtml(s.nombre)}</h3>
          <p class="service-meta">
            ${duracion ? `<span>${duracion}</span>` : ''}
            ${precio ? `<span>${precio}</span>` : ''}
          </p>
          <p class="service-desc">${escapeHtml(s.descripcion || '')}</p>
          <button class="btn reservar-btn" data-id="${s.id}">Reservar</button>
        </div>
      </article>
    `;
  }).join('');
}

function wireEvents(container) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.reservar-btn');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    // Si ya tenías lógica para ir a turnos o guardar selección, mantenela acá:
    localStorage.setItem('turners:selectedServiceId', String(id));
    window.location.href = 'turnos.html'; // misma carpeta que services.html
  });
}

// Utilidades
function slug(str) {
  return String(str)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // saca tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')     // espacios y no alfanum → guiones
    .replace(/(^-|-$)+/g, '');       // bordes
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}
