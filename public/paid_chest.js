document.addEventListener('DOMContentLoaded', async () => {
    const tablaContainer = document.getElementById('tablaContainer');
    const params = new URLSearchParams(window.location.search);
    let gremio = new URLSearchParams(window.location.search).get('gremio') || localStorage.getItem('gremio_actual');
    const password = localStorage.getItem('auth_' + gremio);

  
    if (!gremio || !password) {
      tablaContainer.innerHTML = '<div class="alert alert-danger">Acceso inválido.</div>';
      return;
    }
  
    try {
      const res = await fetch(`/api/paid_chest/${gremio}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
  
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
  
      const respuesta = await res.json();
      const datos = respuesta.datos;
  
      if (!Array.isArray(datos)) {
        throw new Error(`La propiedad 'datos' no es un array. Respuesta: ${JSON.stringify(respuesta)}`);
      }
  
      if (datos.length === 0) {
        tablaContainer.innerHTML = '<div class="alert alert-warning">No hay datos disponibles.</div>';
        return;
      }
  
      renderizarTabla(datos);
    } catch (error) {
      console.error(error);
      tablaContainer.innerHTML = '<div class="alert alert-danger">Error al cargar los cofres.</div>';
    }
  
    function renderizarTabla(datos) {
      const mapa = new Map();
  
      datos.forEach(fila => {
        const id = fila['userID'] || fila['User ID'];
        const name = fila['name'] || fila['Name'];
        if (!mapa.has(id)) {
          mapa.set(id, { id, name, L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, total: 0 });
        }
        const jugador = mapa.get(id);
        jugador.L1 += parseInt(fila['L1'] || fila['L1 (Purchase)'] || 0);
        jugador.L2 += parseInt(fila['L2'] || fila['L2 (Purchase)'] || 0);
        jugador.L3 += parseInt(fila['L3'] || fila['L3 (Purchase)'] || 0);
        jugador.L4 += parseInt(fila['L4'] || fila['L4 (Purchase)'] || 0);
        jugador.L5 += parseInt(fila['L5'] || fila['L5 (Purchase)'] || 0);
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
  
// Evento para el enlace de Cacería
document.addEventListener('DOMContentLoaded', () => {
  const linkCaceria = document.getElementById('linkCaceria');

  if (linkCaceria) {
    linkCaceria.addEventListener('click', (e) => {
      e.preventDefault();
      const gremio = localStorage.getItem('gremio_actual');
      if (gremio) {
        window.location.href = `/stats.html?view=gift_stats&gremio=${gremio}`;
      } else {
        console.warn('No se encontró un gremio seleccionado.');
      }
    });
  }
});
