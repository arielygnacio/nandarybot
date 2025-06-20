document.addEventListener('DOMContentLoaded', async () => {
  const tablaContainer = document.getElementById('tablaContainer');
  let gremio = new URLSearchParams(window.location.search).get('gremio') || localStorage.getItem('gremio_actual');
  const password = localStorage.getItem('auth_' + gremio);

  if (!gremio || !password) {
    tablaContainer.innerHTML = '<div class="alert alert-danger">Acceso inválido.</div>';
    return;
  }

  try {
    // 1. Obtener lista de archivos
    const archivos = await fetch(`/api/gift_stats/files`, {
      headers: { 'Authorization': `${gremio}:${password}` }
    }).then(r => r.json());

    if (!archivos || archivos.length === 0) {
      tablaContainer.innerHTML = '<div class="alert alert-warning">No hay archivos CSV disponibles.</div>';
      return;
    }

    // 2. Usar el archivo más reciente
    const ultimoArchivo = archivos.sort().reverse()[0];

    // 3. Leer el archivo CSV
    const csvText = await fetch(`/api/gift_stats/${gremio}/${encodeURIComponent(ultimoArchivo)}`, {
      headers: { 'Authorization': `${gremio}:${password}` }
    }).then(r => r.text());

    // 4. Parsear CSV manualmente
    const filas = csvText.trim().split('\n');
    const headers = filas[0].split(';');
    const datos = filas.slice(1).map(linea => {
      const valores = linea.split(';');
      const obj = {};
      headers.forEach((h, i) => obj[h] = valores[i]);
      return obj;
    });

    renderizarTabla(datos);
  } catch (error) {
    console.error(error);
    tablaContainer.innerHTML = '<div class="alert alert-danger">Error al cargar los cofres.</div>';
  }

  function renderizarTabla(datos) {
    const mapa = new Map();

    datos.forEach(fila => {
      const id = fila['User ID'];
      const name = fila['Name'];
      if (!mapa.has(id)) {
        mapa.set(id, { id, name, L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, total: 0 });
      }
      const jugador = mapa.get(id);
      jugador.L1 += parseInt(fila['L1 (Purchase)'] || 0);
      jugador.L2 += parseInt(fila['L2 (Purchase)'] || 0);
      jugador.L3 += parseInt(fila['L3 (Purchase)'] || 0);
      jugador.L4 += parseInt(fila['L4 (Purchase)'] || 0);
      jugador.L5 += parseInt(fila['L5 (Purchase)'] || 0);
      jugador.total = jugador.L1 + jugador.L2 + jugador.L3 + jugador.L4 + jugador.L5;
    });

    let html = `
      <div class="table-responsive">
        <table class="table table-bordered table-striped">
          <thead class="table-light">
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Lvl 1</th>
              <th>Lvl 2</th>
              <th>Lvl 3</th>
              <th>Lvl 4</th>
              <th>Lvl 5</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const jugador of mapa.values()) {
      html += `
        <tr>
          <td>${jugador.id}</td>
          <td>${jugador.name}</td>
          <td>${jugador.L1}</td>
          <td>${jugador.L2}</td>
          <td>${jugador.L3}</td>
          <td>${jugador.L4}</td>
          <td>${jugador.L5}</td>
          <td><strong>${jugador.total}</strong></td>
        </tr>
      `;
    }

    html += `</tbody></table></div>`;
    tablaContainer.innerHTML = html;
  }
});
