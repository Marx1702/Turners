// /scripts/turnos.js
document.addEventListener("DOMContentLoaded", () => {
  /* =========  Sesión  ========= */
  const getActiveUser = () => {
    try { return JSON.parse(localStorage.getItem("activeUser")); }
    catch { return null; }
  };
  const activeUser = getActiveUser();
  if (!activeUser) {
    window.location.href = "login.html";
    return;
  }
  const USER_ID    = activeUser.id    ?? activeUser.uid   ?? null;
  const USER_EMAIL = activeUser.email ?? null;
  const USER_NAME  = activeUser.name  ?? activeUser.nombre ?? activeUser.username ?? null;

  const belongsToActiveUser = (t) => {
    if (USER_EMAIL && t.userEmail) return t.userEmail === USER_EMAIL;
    if (USER_ID != null && t.userId != null) return String(t.userId) === String(USER_ID);
    if (USER_NAME && t.userName) return t.userName === USER_NAME;
    return false;
  };

  /* =========  Storage helpers  ========= */
  const STORAGE_KEY_TURNOS = "turnos";
  const STORAGE_KEY_SERVICES = "services_catalog";

  const loadAllTurnos = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_TURNOS));
      return Array.isArray(raw) ? raw : [];
    } catch { return []; }
  };
  const saveAllTurnos = (arr) =>
    localStorage.setItem(STORAGE_KEY_TURNOS, JSON.stringify(arr));

  const loadCatalog = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_SERVICES));
      return Array.isArray(raw) ? raw : [];
    } catch { return []; }
  };

  /* =========  UI refs  ========= */
  const form = document.getElementById("turnoForm");
  const selServicio = document.getElementById("servicio");
  const inputFecha = document.getElementById("fecha");
  const selHora = document.getElementById("hora");
  const tbody = document.getElementById("turnosBody");
  const usuarioActual = document.getElementById("usuarioActual");

  if (usuarioActual) {
    const who = USER_EMAIL || USER_NAME || "(usuario)";
    usuarioActual.textContent = `Sesión: ${who}`;
  }

  /* =========  Catálogo desde services.js  ========= */
  let catalog = loadCatalog();

  const ensureCatalogOrWarn = () => {
    if (!catalog || catalog.length === 0) {
      // Catálogo vacío: deshabilitar selects y guiar al usuario.
      if (selServicio) {
        selServicio.innerHTML = `<option value="">No hay servicios disponibles. Visitá la página de Servicios primero.</option>`;
        selServicio.disabled = true;
      }
      if (selHora) {
        selHora.innerHTML = `<option value="">Selecciona fecha y servicio...</option>`;
        selHora.disabled = true;
      }
      return false;
    }
    return true;
  };

  const populateServicios = () => {
    selServicio.innerHTML = `<option value="">Seleccionar servicio...</option>`;
    catalog.forEach(s => {
      const opt = document.createElement("option");
      opt.value = String(s.id);
      opt.textContent = s.name;
      selServicio.appendChild(opt);
    });
    selServicio.disabled = false;
  };

  if (ensureCatalogOrWarn()) {
    populateServicios();
   
const preselected = localStorage.getItem("selectedServiceId");
if (preselected && document.getElementById("servicio")) {
  const selServicio = document.getElementById("servicio");
  if ([...selServicio.options].some(o => o.value === preselected)) {
    selServicio.value = preselected;
   
    const evt = new Event("change");
    selServicio.dispatchEvent(evt);
  }
  localStorage.removeItem("selectedServiceId");
}

  }

  /* =========  Fecha mínima (hoy)  ========= */
  const todayISO = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  if (inputFecha) inputFecha.min = todayISO();

  /* =========  Franjas horarias  ========= */
  const pad = (n) => String(n).padStart(2, "0");
  // Cambiá el rango/intervalo a gusto: 9→18 hs, cada 30 min.
  const generateTimeSlots = (startHour = 9, endHour = 18, intervalMin = 30) => {
    const slots = [];
    for (let h = startHour; h <= endHour; h++) {
      for (let m = 0; m < 60; m += intervalMin) {
        if (h === endHour && m > 0) break; // evita 18:30 si endHour=18
        slots.push(`${pad(h)}:${pad(m)}`);
      }
    }
    return slots;
  };

  const refreshHoras = () => {
    selHora.innerHTML = "";
    selHora.disabled = true;

    if (!ensureCatalogOrWarn()) return;

    const fecha = inputFecha.value;
    const servicioId = selServicio.value ? Number(selServicio.value) : null;
    if (!fecha || !servicioId) {
      selHora.innerHTML = `<option value="">Selecciona fecha y servicio...</option>`;
      return;
    }

    const baseSlots = generateTimeSlots(9, 18, 30);
    const all = loadAllTurnos();
    const ocupados = new Set(
      all
        .filter(t => t.fecha === fecha && Number(t.servicioId) === servicioId)
        .map(t => t.hora)
    );

    const today = todayISO();
    const isToday = fecha === today;
    const now = new Date();
    const nowRounded = `${pad(now.getHours())}:${pad(now.getMinutes() - (now.getMinutes() % 30))}`;

    const disponibles = baseSlots.filter(hhmm => {
      if (ocupados.has(hhmm)) return false;
      if (isToday && hhmm <= nowRounded) return false;
      return true;
    });

    if (disponibles.length === 0) {
      selHora.innerHTML = `<option value="">No hay horarios disponibles</option>`;
      selHora.disabled = true;
    } else {
      selHora.innerHTML = `<option value="">Seleccionar horario...</option>`;
      disponibles.forEach(h => {
        const opt = document.createElement("option");
        opt.value = h;
        opt.textContent = h;
        selHora.appendChild(opt);
      });
      selHora.disabled = false;
    }
  };

  selServicio?.addEventListener("change", refreshHoras);
  inputFecha?.addEventListener("change", refreshHoras);

  /* =========  Tabla (solo mis turnos)  ========= */
  const toDateTime = (fecha, hora) => new Date(`${fecha}T${hora || "00:00"}:00`);
  const myTurnos = () => loadAllTurnos().filter(belongsToActiveUser);

  const render = () => {
    if (!tbody) return;
    const list = myTurnos().sort((a, b) => toDateTime(a.fecha, a.hora) - toDateTime(b.fecha, b.hora));
    tbody.innerHTML = "";

    if (list.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = "No hay turnos cargados.";
      td.style.textAlign = "center";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    const nameById = Object.fromEntries(loadCatalog().map(s => [String(s.id), s.name]));

    list.forEach(t => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${t.id}</td>
        <td>${t.fecha}</td>
        <td>${t.hora}</td>
        <td>${nameById[String(t.servicioId)] ?? t.servicio ?? "-"}</td>
        <td>${t.cliente}</td>
        <td class="actions">
          <button data-del="${t.id}" title="Eliminar">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  };

  /* =========  Crear turno  ========= */
  const generateId = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!ensureCatalogOrWarn()) {
      alert("No hay servicios para reservar. Visitá la página de Servicios primero.");
      return;
    }

    const servicioId = selServicio.value ? Number(selServicio.value) : null;
    const fecha = inputFecha.value?.trim();
    const hora  = selHora.value?.trim();
    const cliente = document.getElementById("cliente")?.value?.trim();

    if (!servicioId || !fecha || !hora || !cliente) {
      alert("Completá todos los campos.");
      return;
    }

    const all = loadAllTurnos();
    const exists = all.some(t =>
      Number(t.servicioId) === servicioId && t.fecha === fecha && t.hora === hora
    );
    if (exists) {
      alert("Ese horario ya fue reservado para este servicio. Elegí otro horario.");
      refreshHoras();
      return;
    }

    const turno = {
      id: generateId(),
      servicioId,
      fecha,
      hora,
      cliente,
      userId: USER_ID,
      userEmail: USER_EMAIL,
      userName: USER_NAME,
      createdAt: new Date().toISOString(),
    };

    all.push(turno);
    saveAllTurnos(all);

    form.reset();
    selHora.innerHTML = `<option value="">Selecciona fecha y servicio...</option>`;
    selHora.disabled = true;

    render();
  });

  /* =========  Eliminar turno (solo propios)  ========= */
  tbody?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-del]");
    if (!btn) return;
    const id = btn.getAttribute("data-del");

    const all = loadAllTurnos();
    const target = all.find(t => t.id === id);
    if (!target || !belongsToActiveUser(target)) {
      alert("No podés eliminar turnos de otros usuarios.");
      return;
    }

    const remaining = all.filter(t => t.id !== id);
    saveAllTurnos(remaining);

    refreshHoras();
    render();
  });

  /* =========  Primer render  ========= */
  render();

  /* =========  (Opcional) Reaccionar si el catálogo cambia en otra pestaña  ========= */
  window.addEventListener("storage", (ev) => {
    if (ev.key === STORAGE_KEY_SERVICES) {
      catalog = loadCatalog();
      if (ensureCatalogOrWarn()) {
        populateServicios();
        refreshHoras();
      }
    }
    if (ev.key === STORAGE_KEY_TURNOS) {
      render();
      refreshHoras();
    }
  });
});
