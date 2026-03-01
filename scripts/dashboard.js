// scripts/dashboard.js – Admin dashboard with presupuestos + PDF export
const API = "http://localhost:3001/api";

document.addEventListener("DOMContentLoaded", () => {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("activeUser"));
    } catch {
      return null;
    }
  })();
  if (!user || user.rol !== "admin") {
    window.location.href = "index.html";
    return;
  }

  const greeting = document.getElementById("dashGreeting");
  if (greeting) greeting.textContent = `Hola, ${user.nombre} 👋`;

  let allTurnos = [];

  /* ========== STATS ========== */
  async function loadStats() {
    try {
      const [resC, resV, resT, resS] = await Promise.all([
        fetch(`${API}/clientes`),
        fetch(`${API}/vehiculos`),
        fetch(`${API}/turnos`),
        fetch(`${API}/seguimientos`),
      ]);
      const [clientes, vehiculos, turnos, seguimientos] = await Promise.all([
        resC.json(),
        resV.json(),
        resT.json(),
        resS.json(),
      ]);

      document.getElementById("statClientes").textContent = clientes.length;
      document.getElementById("statVehiculos").textContent = vehiculos.length;
      document.getElementById("statSeguimientos").textContent =
        seguimientos.length;

      const today = new Date().toISOString().slice(0, 10);
      document.getElementById("statTurnos").textContent = turnos.filter(
        (t) => t.fecha?.slice(0, 10) === today,
      ).length;

      renderTurnos(turnos);
      renderClientes(clientes, vehiculos);
    } catch (err) {
      console.error(err);
    }
  }

  /* ========== RENDIMIENTO MENSUAL ========== */
  const MESES = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const selMes = document.getElementById("rendMes");
  const selAnio = document.getElementById("rendAnio");

  // Populate selectors
  (function initRendSelectors() {
    const now = new Date();
    const mAct = now.getMonth();
    const aAct = now.getFullYear();

    MESES.forEach((m, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = m;
      if (i === mAct) opt.selected = true;
      selMes.appendChild(opt);
    });

    for (let a = aAct - 2; a <= aAct + 1; a++) {
      const opt = document.createElement("option");
      opt.value = a;
      opt.textContent = a;
      if (a === aAct) opt.selected = true;
      selAnio.appendChild(opt);
    }
  })();

  selMes?.addEventListener("change", loadRendimiento);
  selAnio?.addEventListener("change", loadRendimiento);

  async function loadRendimiento() {
    const mes = parseInt(selMes.value);
    const anio = parseInt(selAnio.value);

    // Number of days in this month
    const diasMes = new Date(anio, mes + 1, 0).getDate();
    const prefix = `${anio}-${String(mes + 1).padStart(2, "0")}`;

    try {
      // Fetch all data in parallel
      const [resT, resS, resP] = await Promise.all([
        fetch(`${API}/turnos`),
        fetch(`${API}/seguimientos`),
        fetch(`${API}/presupuestos`),
      ]);
      const [turnos, seguimientos, presupuestos] = await Promise.all([
        resT.json(),
        resS.json(),
        resP.json(),
      ]);

      // Filter by month
      const turnosMes = turnos.filter((t) => t.fecha?.slice(0, 7) === prefix);
      const segMes = seguimientos.filter(
        (s) => s.fecha?.slice(0, 7) === prefix,
      );
      const presMes = presupuestos.filter(
        (p) => p.fecha?.slice(0, 7) === prefix,
      );

      // KPIs
      const totalTurnos = turnosMes.length;
      const completados = turnosMes.filter(
        (t) => t.estado === "completado",
      ).length;
      const totalSeg = segMes.length;

      // Revenue: sum all presupuesto items for the month
      let totalIngresos = 0;
      for (const p of presMes) {
        try {
          const detRes = await fetch(`${API}/presupuestos/${p.id}`);
          if (detRes.ok) {
            const det = await detRes.json();
            if (det.items) {
              det.items.forEach((item) => {
                totalIngresos +=
                  (item.cantidad || 1) * parseFloat(item.precio_unitario || 0);
              });
            }
          }
        } catch {
          /* skip */
        }
      }

      const ticketProm =
        presMes.length > 0 ? totalIngresos / presMes.length : 0;

      // Update KPI values
      document.getElementById("rkTurnos").textContent = totalTurnos;
      document.getElementById("rkCompletados").textContent = completados;
      document.getElementById("rkIngresos").textContent =
        `$${totalIngresos.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
      document.getElementById("rkTicket").textContent =
        `$${ticketProm.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
      document.getElementById("rkServicios").textContent = totalSeg;

      // Build daily distribution for bar chart
      const dayCounts = new Array(diasMes).fill(0);
      turnosMes.forEach((t) => {
        const day = parseInt(t.fecha?.slice(8, 10));
        if (day >= 1 && day <= diasMes) dayCounts[day - 1]++;
      });

      const maxCount = Math.max(...dayCounts, 1);
      const chart = document.getElementById("rendChart");
      chart.innerHTML = "";

      for (let d = 0; d < diasMes; d++) {
        const col = document.createElement("div");
        col.className = "rend-bar-col";

        const bar = document.createElement("div");
        bar.className = `rend-bar ${dayCounts[d] === 0 ? "empty" : ""}`;
        const pct = (dayCounts[d] / maxCount) * 100;
        bar.style.height = dayCounts[d] > 0 ? `${Math.max(pct, 8)}%` : "2px";

        const tooltip = document.createElement("span");
        tooltip.className = "rend-bar-tooltip";
        tooltip.textContent = `${dayCounts[d]} turno${dayCounts[d] !== 1 ? "s" : ""}`;
        bar.appendChild(tooltip);

        const label = document.createElement("span");
        label.className = "rend-bar-label";
        // Show label for every 5th day, first, and last
        label.textContent =
          d === 0 || d === diasMes - 1 || (d + 1) % 5 === 0 ? d + 1 : "";

        col.appendChild(bar);
        col.appendChild(label);
        chart.appendChild(col);
      }
    } catch (err) {
      console.error("Error cargando rendimiento:", err);
    }
  }

  /* ========== BLOQUEOS ========== */
  async function loadBloqueos() {
    try {
      const res = await fetch(`${API}/bloqueos`);
      const bloqueos = await res.json();
      const container = document.getElementById("bloqueosLista");
      if (bloqueos.length === 0) {
        container.innerHTML = '<p class="muted">No hay fechas bloqueadas.</p>';
        return;
      }
      container.innerHTML = bloqueos
        .map(
          (b) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid var(--border-glass);">
          <div>
            <strong style="color:var(--red);">${b.fecha_inicio?.slice(0, 10)} → ${b.fecha_fin?.slice(0, 10)}</strong>
            <span class="muted" style="margin-left:12px;">${esc(b.motivo || "")}</span>
          </div>
          <button class="btn btn-danger sm" data-del-bloqueo="${b.id}">Quitar</button>
        </div>
      `,
        )
        .join("");
    } catch (err) {
      console.error(err);
    }
  }

  document
    .getElementById("formBloqueo")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = {
        fecha_inicio: document.getElementById("bFechaInicio").value,
        fecha_fin: document.getElementById("bFechaFin").value,
        motivo: document.getElementById("bMotivo").value.trim() || "Cerrado",
      };
      try {
        const res = await fetch(`${API}/bloqueos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json();
          alert(d.error);
          return;
        }
        e.target.reset();
        loadBloqueos();
      } catch {
        alert("Error de conexión.");
      }
    });

  document
    .getElementById("bloqueosLista")
    ?.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-del-bloqueo]");
      if (!btn) return;
      if (!confirm("¿Eliminar este bloqueo?")) return;
      try {
        await fetch(`${API}/bloqueos/${btn.dataset.delBloqueo}`, {
          method: "DELETE",
        });
        loadBloqueos();
      } catch (err) {
        console.error(err);
      }
    });

  /* ========== TURNOS TABLE ========== */
  const turnosBody = document.getElementById("turnosBody");
  const filterFecha = document.getElementById("filterFecha");
  const btnTodos = document.getElementById("btnTodosLos");

  function renderTurnos(list) {
    allTurnos = list;
    turnosBody.innerHTML = "";
    if (list.length === 0) {
      turnosBody.innerHTML =
        '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);">No hay turnos.</td></tr>';
      return;
    }
    list.forEach((t) => {
      const estado = t.estado || "pendiente";
      const badgeClass =
        estado === "completado"
          ? "badge-done"
          : estado === "cancelado"
            ? "badge-cancelled"
            : estado === "confirmado"
              ? "badge-confirmed"
              : "badge-pending";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${t.id}</td>
        <td>${t.fecha?.slice(0, 10) || "-"}</td>
        <td>${t.hora?.slice(0, 5) || "-"}</td>
        <td>${esc(t.servicio_nombre || "-")}</td>
        <td>${t.duracion_min || 30} min</td>
        <td>${esc(t.usuario_nombre || t.cliente_nombre || "-")}<br><span class="muted" style="font-size:0.75rem;">${esc(t.usuario_email || "")}</span></td>
        <td><span class="badge ${badgeClass}">${estado}</span></td>
        <td style="white-space:nowrap;">
          <button class="btn btn-outline sm" data-edit-turno="${t.id}">✏️</button>
          <button class="btn btn-primary sm" data-presupuesto-turno="${t.id}" data-vehiculo="${t.vehiculo_id || ""}" title="Presupuesto">📄</button>
        </td>
      `;
      turnosBody.appendChild(tr);
    });
  }

  filterFecha?.addEventListener("change", () => {
    const f = filterFecha.value;
    if (!f) {
      renderTurnos(allTurnos);
      return;
    }
    renderTurnos(allTurnos.filter((t) => t.fecha?.slice(0, 10) === f));
  });
  btnTodos?.addEventListener("click", () => {
    filterFecha.value = "";
    renderTurnos(allTurnos);
  });

  /* ========== EDIT TURNO MODAL ========== */
  const modalTurno = document.getElementById("modalTurno");
  const formEditTurno = document.getElementById("formEditTurno");
  const btnCancelT = document.getElementById("btnCancelTurno");

  turnosBody?.addEventListener("click", (e) => {
    // Edit button
    const editBtn = e.target.closest("[data-edit-turno]");
    if (editBtn) {
      const turno = allTurnos.find(
        (t) => String(t.id) === editBtn.dataset.editTurno,
      );
      if (!turno) return;
      document.getElementById("editTurnoId").value = turno.id;
      document.getElementById("editFecha").value =
        turno.fecha?.slice(0, 10) || "";
      document.getElementById("editHora").value = turno.hora?.slice(0, 5) || "";
      document.getElementById("editEstado").value = turno.estado || "pendiente";
      modalTurno.classList.add("active");
      return;
    }

    // Presupuesto button
    const pBtn = e.target.closest("[data-presupuesto-turno]");
    if (pBtn) {
      openPresupuestoModal(
        pBtn.dataset.presupuestoTurno,
        pBtn.dataset.vehiculo,
      );
    }
  });

  btnCancelT?.addEventListener("click", () =>
    modalTurno.classList.remove("active"),
  );
  modalTurno?.addEventListener("click", (e) => {
    if (e.target === modalTurno) modalTurno.classList.remove("active");
  });

  formEditTurno?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("editTurnoId").value;
    const body = {
      fecha: document.getElementById("editFecha").value,
      hora: document.getElementById("editHora").value,
      estado: document.getElementById("editEstado").value,
    };
    try {
      const res = await fetch(`${API}/turnos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error);
        return;
      }
      modalTurno.classList.remove("active");
      loadStats();
    } catch {
      alert("Error de conexión.");
    }
  });

  /* ========== PRESUPUESTO MODAL ========== */
  const modalP = document.getElementById("modalPresupuesto");
  const formP = document.getElementById("formPresupuesto");
  const pItemsBody = document.getElementById("pItemsBody");
  const pTotal = document.getElementById("pTotal");
  const pInfoBlock = document.getElementById("pInfoBlock");
  const btnCancelP = document.getElementById("btnCancelPresupuesto");
  const btnAddItem = document.getElementById("btnAddItem");
  const btnExportPDF = document.getElementById("btnExportPDF");

  let currentPresupuestoData = null;

  async function openPresupuestoModal(turnoId, vehiculoId) {
    document.getElementById("pTurnoId").value = turnoId;
    document.getElementById("pVehiculoId").value = vehiculoId || "";
    document.getElementById("pPresupuestoId").value = "";
    document.getElementById("pObservaciones").value = "";
    pItemsBody.innerHTML = "";

    // Check if presupuesto already exists for this turno
    try {
      const res = await fetch(`${API}/presupuestos/turno/${turnoId}`);
      if (res.ok) {
        const data = await res.json();
        // Load existing presupuesto
        const detRes = await fetch(
          `${API}/presupuestos/${data.presupuesto_id}`,
        );
        if (detRes.ok) {
          const pres = await detRes.json();
          document.getElementById("pPresupuestoId").value = pres.id;
          document.getElementById("pVehiculoId").value = pres.vehiculo_id;
          document.getElementById("pObservaciones").value =
            pres.observaciones || "";
          document.getElementById("presupuestoTitle").textContent =
            "Editar Presupuesto";
          currentPresupuestoData = pres;

          pInfoBlock.innerHTML = `
            <strong>${esc(pres.dominio || "")}</strong>
            <span>${esc(pres.marca || "")} ${esc(pres.modelo || "")} ${pres.anio || ""}</span>
            <span class="muted">Cliente: ${esc(pres.vehiculo_owner_nombre || pres.cliente_nombre || "—")}</span>
          `;

          pres.items.forEach((item) =>
            addItemRow(item.descripcion, item.cantidad, item.precio_unitario),
          );
          recalcTotal();
          modalP.classList.add("active");
          return;
        }
      }
    } catch (err) {
      console.error(err);
    }

    // New presupuesto — load turno info
    document.getElementById("presupuestoTitle").textContent =
      "Nuevo Presupuesto";
    currentPresupuestoData = null;
    const turno = allTurnos.find((t) => String(t.id) === String(turnoId));
    if (turno) {
      pInfoBlock.innerHTML = `
        <strong>${esc(turno.dominio || turno.vehiculo_dominio || "—")}</strong>
        <span>${esc(turno.servicio_nombre || "")}</span>
        <span class="muted">Cliente: ${esc(turno.usuario_nombre || turno.cliente_nombre || "—")}</span>
      `;
      if (!vehiculoId && turno.vehiculo_id) {
        document.getElementById("pVehiculoId").value = turno.vehiculo_id;
      }
    } else {
      pInfoBlock.innerHTML =
        '<span class="muted">Sin información del turno</span>';
    }

    addItemRow("", 1, 0);
    recalcTotal();
    modalP.classList.add("active");
  }

  function addItemRow(desc = "", qty = 1, price = 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" class="item-desc" value="${esc(desc)}" placeholder="Descripción del ítem" /></td>
      <td><input type="number" class="item-qty" value="${qty}" min="1" step="1" /></td>
      <td><input type="number" class="item-price" value="${price}" min="0" step="0.01" /></td>
      <td class="item-subtotal" style="font-weight:600;">$${(qty * price).toFixed(2)}</td>
      <td><button type="button" class="btn-remove-item" title="Quitar">✕</button></td>
    `;
    pItemsBody.appendChild(tr);

    tr.querySelector(".item-qty").addEventListener("input", () =>
      recalcRow(tr),
    );
    tr.querySelector(".item-price").addEventListener("input", () =>
      recalcRow(tr),
    );
    tr.querySelector(".btn-remove-item").addEventListener("click", () => {
      tr.remove();
      recalcTotal();
    });
  }

  function recalcRow(tr) {
    const qty = parseFloat(tr.querySelector(".item-qty").value) || 0;
    const price = parseFloat(tr.querySelector(".item-price").value) || 0;
    tr.querySelector(".item-subtotal").textContent =
      `$${(qty * price).toFixed(2)}`;
    recalcTotal();
  }

  function recalcTotal() {
    let total = 0;
    pItemsBody.querySelectorAll("tr").forEach((tr) => {
      const qty = parseFloat(tr.querySelector(".item-qty")?.value) || 0;
      const price = parseFloat(tr.querySelector(".item-price")?.value) || 0;
      total += qty * price;
    });
    pTotal.textContent = `$${total.toFixed(2)}`;
  }

  function getItems() {
    const items = [];
    pItemsBody.querySelectorAll("tr").forEach((tr) => {
      const desc = tr.querySelector(".item-desc")?.value.trim();
      const qty = parseInt(tr.querySelector(".item-qty")?.value) || 1;
      const price = parseFloat(tr.querySelector(".item-price")?.value) || 0;
      if (desc)
        items.push({
          descripcion: desc,
          cantidad: qty,
          precio_unitario: price,
        });
    });
    return items;
  }

  /* ========== PRESUPUESTO MODAL EVENT DELEGATION ========== */
  modalP?.addEventListener("click", async (e) => {
    // Close on overlay click
    if (e.target === modalP) {
      modalP.classList.remove("active");
      return;
    }

    const target = e.target.closest("button");
    if (!target) return;
    const id = target.id;

    // Cancel
    if (id === "btnCancelPresupuesto") {
      modalP.classList.remove("active");
      return;
    }

    // Add item
    if (id === "btnAddItem") {
      addItemRow();
      return;
    }

    // Remove item
    if (target.classList.contains("btn-remove-item")) {
      target.closest("tr")?.remove();
      recalcTotal();
      return;
    }

    // Save
    if (id === "btnSavePresupuesto") {
      const items = getItems();
      if (items.length === 0) {
        alert("Agregá al menos un ítem.");
        return;
      }

      const presupuestoId = document.getElementById("pPresupuestoId").value;
      const vehiculoId = document.getElementById("pVehiculoId").value;
      const turnoId = document.getElementById("pTurnoId").value;

      const body = {
        turno_id: turnoId ? Number(turnoId) : null,
        vehiculo_id: vehiculoId ? Number(vehiculoId) : null,
        usuario_id: user.id,
        fecha: new Date().toISOString().slice(0, 10),
        observaciones: document.getElementById("pObservaciones").value.trim(),
        items,
      };

      try {
        let res;
        if (presupuestoId) {
          res = await fetch(`${API}/presupuestos/${presupuestoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ observaciones: body.observaciones, items }),
          });
        } else {
          res = await fetch(`${API}/presupuestos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }

        if (!res.ok) {
          const d = await res.json();
          alert(d.error || "Error");
          return;
        }
        alert("✅ Presupuesto guardado.");
        modalP.classList.remove("active");
      } catch {
        alert("Error de conexión.");
      }
      return;
    }

    // Export PDF
    if (id === "btnExportPDF") {
      exportPresupuestoPDF();
      return;
    }
  });

  /* ========== PDF EXPORT ========== */
  function exportPresupuestoPDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
      alert("Error: jsPDF no cargó. Recargá la página.");
      return;
    }

    const items = getItems();
    if (items.length === 0) {
      alert("Agregá al menos un ítem para exportar.");
      return;
    }

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, pageW, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("TURNERS", 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Presupuesto de Servicio", 14, 28);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-AR")}`, 14, 35);

    // Vehicle info
    y = 52;
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");

    const infoBlock = pInfoBlock.textContent.trim();
    if (infoBlock) {
      doc.text("Vehículo / Cliente:", 14, y);
      doc.setFont("helvetica", "normal");
      doc.text(infoBlock, 14, y + 7);
      y += 20;
    }

    // Table header
    doc.setFillColor(40, 40, 40);
    doc.rect(14, y, pageW - 28, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIPCIÓN", 16, y + 7);
    doc.text("CANT.", 110, y + 7);
    doc.text("P. UNIT.", 130, y + 7);
    doc.text("SUBTOTAL", 160, y + 7);
    y += 14;

    // Table rows
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    let grandTotal = 0;
    items.forEach((item) => {
      const subtotal = item.cantidad * item.precio_unitario;
      grandTotal += subtotal;
      doc.text(item.descripcion.substring(0, 50), 16, y);
      doc.text(String(item.cantidad), 114, y);
      doc.text(`$${item.precio_unitario.toFixed(2)}`, 130, y);
      doc.text(`$${subtotal.toFixed(2)}`, 160, y);

      // Divider line
      doc.setDrawColor(200, 200, 200);
      doc.line(14, y + 3, pageW - 14, y + 3);
      y += 9;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    // Total
    y += 4;
    doc.setFillColor(220, 38, 38);
    doc.rect(130, y - 5, pageW - 144, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: $${grandTotal.toFixed(2)}`, 134, y + 3);

    // Observations
    const obs = document.getElementById("pObservaciones").value.trim();
    if (obs) {
      y += 20;
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text(`Obs: ${obs}`, 14, y);
    }

    // Footer
    y = doc.internal.pageSize.getHeight() - 15;
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Turners – Taller Mecánico | Av. San Martín 123, Mendoza | (261) 444-5566",
      14,
      y,
    );

    doc.save(`presupuesto_turners_${Date.now()}.pdf`);
  }

  /* ========== CLIENTES TABLE ========== */
  const clientesBody = document.getElementById("clientesBody");

  function renderClientes(clientes, vehiculos) {
    clientesBody.innerHTML = "";
    if (clientes.length === 0) {
      clientesBody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No hay clientes.</td></tr>';
      return;
    }
    clientes.forEach((c) => {
      const vehs = vehiculos.filter((v) => v.cliente_id === c.id);
      const vehStr =
        vehs.length > 0
          ? vehs
              .map(
                (v) =>
                  `<span class="badge badge-done" style="font-size:0.7rem;">${esc(v.dominio)}</span>`,
              )
              .join(" ")
          : '<span class="muted">—</span>';
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${esc(c.nombre)} ${esc(c.apellido)}</td>
        <td>${esc(c.email || "-")}</td>
        <td>${esc(c.telefono || "-")}</td>
        <td>${vehStr}</td>
      `;
      clientesBody.appendChild(tr);
    });
  }

  /* ========== QUICK SEGUIMIENTO ========== */
  const formSeg = document.getElementById("formQuickSeg");
  const qDominio = document.getElementById("qDominio");
  const qVehInfo = document.getElementById("qVehiculoInfo");
  const qServicio = document.getElementById("qServicio");

  async function loadServicios() {
    try {
      const res = await fetch(`${API}/servicios`);
      const servicios = await res.json();
      qServicio.innerHTML = '<option value="">Seleccionar...</option>';
      servicios.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.nombre;
        qServicio.appendChild(opt);
      });
    } catch (err) {
      console.error(err);
    }
  }

  let lookupTimeout;
  qDominio?.addEventListener("input", () => {
    clearTimeout(lookupTimeout);
    lookupTimeout = setTimeout(async () => {
      const dom = qDominio.value.trim().toUpperCase();
      if (dom.length < 3) {
        qVehInfo.textContent = "";
        return;
      }
      try {
        const res = await fetch(
          `${API}/vehiculos/dominio/${encodeURIComponent(dom)}`,
        );
        if (res.ok) {
          const v = await res.json();
          qVehInfo.innerHTML = `✅ ${esc(v.marca)} ${esc(v.modelo)} ${v.anio || ""}`;
          qVehInfo.style.color = "#22c55e";
        } else {
          qVehInfo.textContent = "⚠️ No encontrado";
          qVehInfo.style.color = "#f59e0b";
        }
      } catch {
        qVehInfo.textContent = "";
      }
    }, 400);
  });

  const qFecha = document.getElementById("qFecha");
  if (qFecha) qFecha.value = new Date().toISOString().slice(0, 10);

  formSeg?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dominio = qDominio.value.trim().toUpperCase();
    try {
      const resV = await fetch(
        `${API}/vehiculos/dominio/${encodeURIComponent(dominio)}`,
      );
      if (!resV.ok) {
        alert("No se encontró un vehículo con ese dominio.");
        return;
      }
      const vehiculo = await resV.json();

      const body = {
        vehiculo_id: vehiculo.id,
        servicio_id: Number(qServicio.value),
        fecha: qFecha.value,
        kilometraje: document.getElementById("qKm").value
          ? Number(document.getElementById("qKm").value)
          : null,
        observaciones: document.getElementById("qObs").value.trim(),
      };

      const res = await fetch(`${API}/seguimientos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error);
        return;
      }
      alert("✅ Seguimiento registrado.");
      formSeg.reset();
      qFecha.value = new Date().toISOString().slice(0, 10);
      qVehInfo.textContent = "";
      loadStats();
    } catch {
      alert("Error de conexión.");
    }
  });

  /* ========== STAT CARD CLICKS ========== */
  document.getElementById("statsGrid")?.addEventListener("click", (e) => {
    const card = e.target.closest(".stat-card");
    if (!card) return;
    const goto = card.dataset.goto;
    if (goto) window.location.href = goto;
  });

  /* ========== INIT ========== */
  loadServicios();
  loadStats();
  loadBloqueos();
  loadRendimiento();
});

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
