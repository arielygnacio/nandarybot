
document.addEventListener('DOMContentLoaded', async () => {
  let gremio = sessionStorage.getItem('gremio');
  let password = sessionStorage.getItem('password');

  const params = new URLSearchParams(window.location.search);
  const urlGremio = params.get('gremio');

  if (urlGremio) {
    gremio = urlGremio;
    password = localStorage.getItem('auth_' + gremio); // auth guardado en localStorage
    sessionStorage.setItem('gremio', gremio);
    sessionStorage.setItem('password', password);
  }

  if (!gremio || !password) {
    alert("Sesión inválida. Volvé a iniciar sesión.");
    window.location.href = "/acceso.html";
    return;
  }

  const archivoSelect = document.getElementById('archivoSelect');
  const tablaContainer = document.getElementById('tablaContainer');
  const purchaseTableBody = document.getElementById('purchaseTableBody');
  const selectJugador = document.getElementById('selectJugador');

  function getAuthHeaders(gremio, password) {
    return {
      'Authorization': `${gremio}:${password}`
    };
  }

  // Resto del código...


  // ======== CARGAR ARCHIVOS gift_stats ========
  try {
    const res = await fetch(`/api/gift_stats/files`, {
      headers: getAuthHeaders(gremio, password)
    });

    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

    const archivos = await res.json();

    if (archivos.length === 0) {
      tablaContainer.innerHTML = '<div class="alert alert-warning">No hay archivos disponibles.</div>';
      return;
    }

    archivos.forEach(archivo => {
      const option = document.createElement('option');
      option.value = archivo;
      option.textContent = archivo;
      archivoSelect.appendChild(option);
    });

    archivoSelect.addEventListener('change', () => cargarTabla(archivoSelect.value));
    cargarTabla(archivoSelect.value);
  } catch (error) {
    console.error(error);
    tablaContainer.innerHTML = '<div class="alert alert-danger">Error al obtener los archivos.</div>';
  }

  async function cargarTabla(nombreArchivo) {
    try {
      const res = await fetch(`/api/gift_stats/${gremio}/${nombreArchivo}`, {
        headers: getAuthHeaders(gremio, password)
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

      const datos = await res.json();

      if (datos.length === 0) {
        tablaContainer.innerHTML = '<div class="alert alert-warning">El archivo está vacío.</div>';
        return;
      }

      renderizarTabla(datos);
    } catch (error) {
      console.error(error);
      tablaContainer.innerHTML = '<div class="alert alert-danger">Error al cargar el archivo.</div>';
    }
  }

  // ======== COFRES DE PAGA desde botón ========
  const botonCofres = document.getElementById('paid_chest');
  if (botonCofres) {
    botonCofres.addEventListener('click', async () => {
      ocultarSecciones();
      tablaContainer.classList.remove("d-none");
      tablaContainer.innerHTML = '<div class="alert alert-info">Cargando cofres de paga...</div>';

      try {
        const res = await fetch(`/api/paid_chest/${gremio}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password })
        });

        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

        const datos = await res.json();

        if (datos.length === 0) {
          tablaContainer.innerHTML = '<div class="alert alert-warning">No hay datos de cofres de paga.</div>';
          return;
        }

        renderizarTabla(datos);
      } catch (error) {
        console.error(error);
        tablaContainer.innerHTML = '<div class="alert alert-danger">Error al cargar los cofres de paga.</div>';
      }
    });
  }

  // ======== NAVBAR cofres de paga ========
  const navPurchase = document.getElementById("navPurchase");
  if (navPurchase) {
    navPurchase.addEventListener("click", async () => {
      ocultarSecciones();
      document.getElementById("sectionPurchase").classList.remove("d-none");

      try {
        const response = await fetch("/api/latest-purchase", {
          headers: getAuthHeaders(gremio, password)
        });

        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);

        const data = await response.json();
        purchaseTableBody.innerHTML = "";

        data.forEach((row) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${row["User ID"]}</td>
            <td>${row["Name"]}</td>
            <td>${row["L1 (Purchase)"]}</td>
            <td>${row["L2 (Purchase)"]}</td>
            <td>${row["L3 (Purchase)"]}</td>
            <td>${row["L4 (Purchase)"]}</td>
            <td>${row["L5 (Purchase)"]}</td>
            <td>${row["Purchase (Total)"]}</td>
          `;
          purchaseTableBody.appendChild(tr);
        });
      } catch (error) {
        console.error(error);
        purchaseTableBody.innerHTML = `<tr><td colspan="8"><div class="alert alert-danger">Error al cargar los cofres de paga.</div></td></tr>`;
      }
    });
  }

  // ======== JUGADORES: poder y cacería individual ========
  let chartPoderJugador;
  let chartCaceriaJugador;
  const fechaInicioInput = document.getElementById('fechaInicio');
  const fechaFinInput = document.getElementById('fechaFin');

  function formatAPIDate(date) {
    return date.toISOString().split('T')[0];
  }

  const cargarJugadores = async () => {
    const headers = getAuthHeaders(gremio, password);
    const res = await fetch(`/api/guild_list/${gremio}/listado_jugadores`, { headers });
    const json = await res.json();

    selectJugador.innerHTML = '<option value="">-- Seleccionar jugador --</option>';
    json.jugadores.sort().forEach(nombre => {
      const opt = document.createElement('option');
      opt.value = nombre;
      opt.textContent = nombre;
      selectJugador.appendChild(opt);
    });
  };

  selectJugador.addEventListener('change', async () => {
    const nombre = selectJugador.value;
    if (!nombre) return;

    const headers = getAuthHeaders(gremio, password);
    const fechaInicio = formatAPIDate(new Date(fechaInicioInput.value));
    const fechaFin = formatAPIDate(new Date(fechaFinInput.value));

    // Poder
    const resPoder = await fetch(`/api/guild_list/${gremio}/poder_por_jugador?nombre=${encodeURIComponent(nombre)}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`, { headers });
    const datosPoder = await resPoder.json();

    if (chartPoderJugador) chartPoderJugador.destroy();
    chartPoderJugador = new Chart(document.getElementById('graficoPoderJugador'), {
      type: 'line',
      data: {
        labels: datosPoder.datos.map(e => e.fecha),
        datasets: [{
          label: `Poder de ${nombre}`,
          data: datosPoder.datos.map(e => e.might),
          borderColor: 'rgba(54, 162, 235, 1)',
          fill: false
        }]
      }
    });

    // Cacería
    const resCaceria = await fetch(`/api/guild_list/${gremio}/caceria_por_jugador?nombre=${encodeURIComponent(nombre)}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`, { headers });
    const datosCaceria = await resCaceria.json();

    if (chartCaceriaJugador) chartCaceriaJugador.destroy();
    chartCaceriaJugador = new Chart(document.getElementById('graficoCaceriaJugador'), {
      type: 'bar',
      data: {
        labels: datosCaceria.datos.map(e => e.fecha),
        datasets: [{
          label: `Cacería de ${nombre}`,
          data: datosCaceria.datos.map(e => e.kills),
          backgroundColor: 'rgba(255, 99, 132, 0.6)'
        }]
      }
    });
  });

  cargarJugadores();

  // ======== UTILIDADES ========
  function renderizarTabla(datos) {
    const headers = Object.keys(datos[0]);
    let html = '<div class="table-responsive"><table class="table table-striped table-bordered">';
    html += '<thead class="table-light"><tr>';
    headers.forEach(header => html += `<th>${header}</th>`);
    html += '</tr></thead><tbody>';
    datos.forEach(fila => {
      html += '<tr>';
      headers.forEach(header => html += `<td>${fila[header]}</td>`);
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    tablaContainer.innerHTML = html;
  }

  function ocultarSecciones() {
    [
      "sectionStats",
      "sectionCaceria",
      "sectionPurchase",
      "tablaContainer"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add("d-none");
    });
  }
});
