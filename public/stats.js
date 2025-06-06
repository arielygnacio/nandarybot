function fetchConAuth(url, options = {}) {
  const gremio = localStorage.getItem("gremio");
  const clave = localStorage.getItem("clave");

  if (!gremio || !clave) {
    return Promise.reject(new Error("Falta autenticación"));
  }

  options.headers = options.headers || {};
  options.headers["Authorization"] = `${gremio} ${clave}`;

  return fetch(url, options);
}


document.addEventListener('DOMContentLoaded', async () => {
    const archivoSelect = document.getElementById('archivoSelect');
    const tablaContainer = document.getElementById('tablaContainer');
  
    try {
      const res = await fetchConAuth('/api/gift_stats/files');
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
      cargarTabla(archivoSelect.value); // carga el primero por defecto
    } catch (error) {
      tablaContainer.innerHTML = '<div class="alert alert-danger">Error al obtener los archivos.</div>';
    }
  
    async function cargarTabla(nombreArchivo) {
      try {
        const res = await fetchConAuth(`/api/gift_stats/${nombreArchivo}`);
        const datos = await res.json();
  
        if (datos.length === 0) {
          tablaContainer.innerHTML = '<div class="alert alert-warning">El archivo está vacío.</div>';
          return;
        }
  
        const headers = Object.keys(datos[0]);
        let html = '<div class="table-responsive"><table class="table table-striped table-bordered">';
        html += '<thead class="table-light"><tr>';
        headers.forEach(header => {
          html += `<th>${header}</th>`;
        });
        html += '</tr></thead><tbody>';
        datos.forEach(fila => {
          html += '<tr>';
          headers.forEach(header => {
            html += `<td>${fila[header]}</td>`;
          });
          html += '</tr>';
        });
        html += '</tbody></table></div>';
        tablaContainer.innerHTML = html;
      } catch (error) {
        tablaContainer.innerHTML = '<div class="alert alert-danger">Error al cargar el archivo.</div>';
      }
    }
  });
  