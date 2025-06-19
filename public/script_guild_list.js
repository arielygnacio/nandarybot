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
    const response = await fetch(`/api/guild_list/files`, {
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

    archivos.forEach(nombre => {
      const option = document.createElement('option');
      option.value = nombre;
      option.textContent = nombre;
      selectorArchivos.appendChild(option);
    });

    const archivoReciente = archivos[archivos.length - 1];
    selectorArchivos.value = archivoReciente;
    cargarArchivoSeleccionado(archivoReciente, gremio, password);

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
