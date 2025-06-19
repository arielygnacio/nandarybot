document.addEventListener('DOMContentLoaded', async () => {
    const tablaContainer = document.getElementById('tablaContainer');
    const scoreInput = document.getElementById('scoreFilter');
    const applyFilterBtn = document.getElementById('applyFilter');
    const fechaSelect = document.getElementById('fechaSelect');

    let gremio = new URLSearchParams(window.location.search).get('gremio') || localStorage.getItem('gremio');
    const password = localStorage.getItem('auth_' + gremio);

    let datos = [];

    if (!gremio || !password) {
        tablaContainer.innerHTML = '<div class="alert alert-danger">Acceso inválido.</div>';
        return;
    }

    try {
        await cargarFechasDisponibles(gremio, password);
        const fechaSeleccionada = fechaSelect.value;
        datos = await cargarDatosGuildFestival(gremio, password, fechaSeleccionada);
        renderizarTabla(datos);
    } catch (error) {
        console.error('Error al cargar los datos del Guild Festival:', error);
        tablaContainer.innerHTML = '<div class="alert alert-danger">Error al cargar los datos del Guild Festival.</div>';
    }

    applyFilterBtn.addEventListener('click', async () => {
        const scoreFilter = parseInt(scoreInput.value) || 0;
        const fechaSeleccionada = fechaSelect.value;

        try {
            datos = await cargarDatosGuildFestival(gremio, password, fechaSeleccionada);
            renderizarTabla(datos, scoreFilter);
        } catch (error) {
            console.error('Error al aplicar el filtro:', error);
            tablaContainer.innerHTML = '<div class="alert alert-danger">Error al aplicar el filtro.</div>';
        }
    });
});

async function cargarFechasDisponibles(gremio, password) {
    const res = await fetch('/api/guild_festival/fechas', {
        headers: {
            'Authorization': `${gremio}:${password}`
        }
    });

    if (!res.ok) {
        throw new Error('No se pudieron cargar las fechas');
    }

    const fechas = await res.json();
    const fechaSelect = document.getElementById('fechaSelect');
    fechaSelect.innerHTML = fechas.map(f => `<option value="${f}">${f}</option>`).join('');
}

async function cargarDatosGuildFestival(gremio, password, fecha = '') {
    const response = await fetch(`/api/guild_festival${fecha ? `?fecha=${encodeURIComponent(fecha)}` : ''}`, {

        headers: {
            'Authorization': `${gremio}:${password}`
        }
    });

    if (!response.ok) {
        throw new Error('Error al obtener los datos del Guild Festival.');
    }

    return await response.json();
}

function renderizarTabla(datos, scoreFilter = 0) {
    const tablaContainer = document.getElementById('tablaContainer');

    let tablaHTML = `
        <table class="table table-hover">
            <thead>
                <tr>
                    <th class="text-center">Name</th>
                    <th class="text-center">Completed</th>
                    <th class="text-center">Total</th>
                    <th class="text-center">Score</th>
                    <th class="text-center">Completed Bonus</th>
                </tr>
            </thead>
            <tbody>
    `;

    datos.forEach(item => {
        const score = parseInt(item.Score);
        const scoreClass = score >= scoreFilter ? 'table-success' : 'table-danger';

        tablaHTML += `
            <tr class="${scoreClass}">
                <td class="text-center">${item.Name}</td>
                <td class="text-center">${item.Completed}</td>
                <td class="text-center">${item.Total}</td>
                <td class="text-center">${score}</td>
                <td class="text-center">${item["Completed Bonus"]}</td>
            </tr>
        `;
    });

    tablaHTML += `
            </tbody>
        </table>
    `;

    tablaContainer.innerHTML = tablaHTML;
}
