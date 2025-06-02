document.addEventListener('DOMContentLoaded', async () => {
  const tablaBody = document.getElementById('tablaGuildListBody');
  const selectorArchivos = document.getElementById('selectorArchivosGuildList');

  const gremio = new URLSearchParams(window.location.search).get('gremio') || localStorage.getItem('gremio');
  const password = localStorage.getItem('auth_' + gremio);

  if (!gremio || !password) {
    tablaBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Acceso inválido.</td></tr>`;
    return;
  }

  try {
    const response = await fetch(`/api/guild_list/files/${gremio}`, {
      headers: {
        'Authorization': `${gremio}:${password}`
      }
    });

    if (!response.ok) throw new Error('No se pudieron obtener los archivos disponibles.');
    const archivos = await response.json();

    if (!archivos || archivos.length === 0) {
      tablaBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">No hay archivos disponibles.</td></tr>`;
      return;
    }

    // Rellenar el selector de archivos
    archivos.forEach(nombre => {
      const option = document.createElement('option');
      option.value = nombre;
      option.textContent = nombre;
      selectorArchivos.appendChild(option);
    });

    // Cargar el archivo más reciente (último en la lista)
    const archivoReciente = archivos[archivos.length - 1];
    selectorArchivos.value = archivoReciente;
    cargarArchivoSeleccionado(archivoReciente, gremio, password);

    // Listener para cambio manual
    selectorArchivos.addEventListener('change', () => {
      cargarArchivoSeleccionado(selectorArchivos.value, gremio, password);
    });

  } catch (error) {
    console.error('Error:', error.message);
    tablaBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">${error.message}</td></tr>`;
  }
});

async function cargarArchivoSeleccionado(nombreArchivo, gremio, password) {
  const tablaBody = document.getElementById('tablaGuildListBody');
  tablaBody.innerHTML = `<tr><td colspan="9" class="text-center">Cargando...</td></tr>`;

  try {
    const response = await fetch(`/api/guild_list/${gremio}/archivo?nombre=${encodeURIComponent(nombreArchivo)}`, {
      headers: {
        'Authorization': `${gremio}:${password}`
      }
    });

    if (!response.ok) throw new Error('Error al cargar el archivo seleccionado.');
    const datos = await response.json();
    renderizarTablaGuildList(datos);

  } catch (error) {
    console.error('Error:', error.message);
    tablaBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">${error.message}</td></tr>`;
  }
}

function renderizarTablaGuildList(datos) {
  const tablaBody = document.getElementById('tablaGuildListBody');
  tablaBody.innerHTML = '';

  if (!datos || datos.length === 0) {
    tablaBody.innerHTML = `<tr><td colspan="9" class="text-center">No hay datos disponibles.</td></tr>`;
    return;
  }

  let html = '';
  datos.forEach(item => {
    const mightDiff = parseInt(item["Might Difference"]) || 0;
    const killsDiff = parseInt(item["Kills Difference"]) || 0;

    const classMight = mightDiff > 0 ? 'bg-success text-white' :
                       mightDiff < 0 ? 'bg-danger text-white' :
                       'bg-warning';

    const classKills = killsDiff > 0 ? 'bg-success text-white' :
                       killsDiff < 0 ? 'bg-danger text-white' :
                       'bg-warning';

    html += `
      <tr>
        <td>${item["IGG ID"]}</td>
        <td>${item["Name"]}</td>
        <td>${item["Rank"]}</td>
        <td>${item["Might"]}</td>
        <td>${item["Old Might"]}</td>
        <td class="${classMight}">${mightDiff}</td>
        <td>${item["Kills"]}</td>
        <td>${item["Old Kills"]}</td>
        <td class="${classKills}">${killsDiff}</td>
      </tr>
    `;
  });

  tablaBody.innerHTML = html;
}

// Alternar visibilidad de secciones
document.getElementById('navGuildList').addEventListener('click', () => {
  document.getElementById('contenidoGuildList').classList.remove('d-none');
  document.getElementById('estadisticasGuildList').classList.add('d-none');
});

let chartPoderJugador;
let chartCaceriaJugador;

// Cargar listado de jugadores
const cargarListadoJugadores = async () => {
  const gremio = localStorage.getItem('gremio');
  const password = localStorage.getItem(`auth_${gremio}`);
  const headers = { 'Authorization': `${gremio}:${password}` };

  try {
    const res = await fetch(`/api/guild_list/${gremio}/listado_jugadores`, { headers });
    const json = await res.json();
    const jugadorSelect = document.getElementById('jugadorSelect');
    json.jugadores.forEach(jugador => {
      const opt = document.createElement('option');
      opt.value = jugador;
      opt.textContent = jugador;
      jugadorSelect.appendChild(opt);
    });
  } catch (error) {
    console.error('Error al cargar jugadores:', error);
  }
};

// Mostrar gráficos individuales
const mostrarGraficosJugador = async (jugador) => {
  if (!jugador) return;

  const fechaInicio = formatAPIDate(new Date(fechaInicioInput.value));
  const fechaFin = formatAPIDate(new Date(fechaFinInput.value));
  const gremio = localStorage.getItem('gremio');
  const password = localStorage.getItem(`auth_${gremio}`);
  const headers = { 'Authorization': `${gremio}:${password}` };

  try {
    // Poder individual
    const resPoder = await fetch(`/api/guild_list/${gremio}/poder_por_jugador?jugador=${encodeURIComponent(jugador)}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`, { headers });
    const jsonPoder = await resPoder.json();
    const fechasPoder = jsonPoder.datos.map(d => d.fecha);
    const valoresPoder = jsonPoder.datos.map(d => d.might);

    if (chartPoderJugador) chartPoderJugador.destroy();
    chartPoderJugador = new Chart(document.getElementById('graficoPoderJugador'), {
      type: 'line',
      data: {
        labels: fechasPoder,
        datasets: [{
          label: `Poder de ${jugador}`,
          data: valoresPoder,
          borderColor: 'rgb(153, 102, 255)',
          tension: 0.3,
          fill: true
        }]
      }
    });

    // Cacería individual
    const resCaceria = await fetch(`/api/guild_list/${gremio}/caceria_por_jugador?jugador=${encodeURIComponent(jugador)}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`, { headers });
    const jsonCaceria = await resCaceria.json();
    const fechasCaceria = jsonCaceria.datos.map(d => d.fecha);
    const valoresCaceria = jsonCaceria.datos.map(d => d.kills);

    if (chartCaceriaJugador) chartCaceriaJugador.destroy();
    chartCaceriaJugador = new Chart(document.getElementById('graficoCaceriaJugador'), {
      type: 'bar',
      data: {
        labels: fechasCaceria,
        datasets: [{
          label: `Cacería de ${jugador}`,
          data: valoresCaceria,
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      }
    });

  } catch (error) {
    console.error('Error al mostrar datos individuales:', error);
  }
};

// Evento al cambiar el jugador seleccionado
document.getElementById('jugadorSelect').addEventListener('change', (e) => {
  mostrarGraficosJugador(e.target.value);
});

// Cargar listado al inicio
cargarListadoJugadores();
