document.addEventListener('DOMContentLoaded', () => {
  const fechaInicioInput = document.getElementById('fechaInicio');
  const fechaFinInput = document.getElementById('fechaFin');
  const selectJugador = document.getElementById('jugadorSelect');
  const btnActualizar = document.getElementById('btnActualizar');

  const hoy = new Date();
  const hace30dias = new Date(hoy);
  hace30dias.setDate(hoy.getDate() - 30);

  const formatInputDate = (fecha) => fecha.toISOString().slice(0, 10);
  const formatAPIDate = (fecha) => fecha.toISOString().slice(0, 10).replace(/-/g, '');

  fechaInicioInput.value = formatInputDate(hace30dias);
  fechaFinInput.value = formatInputDate(hoy);

  let chartPoderJugador;
  let chartCaceriaJugador;

  const gremio = localStorage.getItem('gremio');
  const password = localStorage.getItem(`auth_${gremio}`);
  const headers = { 'Authorization': `${gremio}:${password}` };

  const cargarJugadores = async () => {
    try {
      const res = await fetch(`/api/guild_list/${gremio}/listado_jugadores`, { headers });
      const data = await res.json();
      if (data.jugadores) {
        data.jugadores.forEach(nombre => {
          const option = document.createElement('option');
          option.value = nombre;
          option.textContent = nombre;
          selectJugador.appendChild(option);
        });
      }
    } catch (err) {
      console.error("Error cargando jugadores:", err);
    }
  };

  const actualizarGraficosJugador = async () => {
    const jugador = selectJugador.value;
    if (!jugador) return;

    const fechaInicio = formatAPIDate(new Date(fechaInicioInput.value));
    const fechaFin = formatAPIDate(new Date(fechaFinInput.value));

    try {
      const resPoder = await fetch(`/api/guild_list/${gremio}/poder_por_jugador?jugador=${encodeURIComponent(jugador)}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`, { headers });
      const jsonPoder = await resPoder.json();

      const fechasPoder = jsonPoder.datos.map(e => e.fecha);
      const valoresPoder = jsonPoder.datos.map(e => e.might);

      if (chartPoderJugador) chartPoderJugador.destroy();
      chartPoderJugador = new Chart(document.getElementById('graficoPoderJugador'), {
        type: 'line',
        data: {
          labels: fechasPoder,
          datasets: [{
            label: `Poder de ${jugador}`,
            data: valoresPoder,
            borderColor: 'rgb(255, 165, 0)',
            backgroundColor: 'rgba(255, 165, 0, 0.2)',
            tension: 0.3,
            fill: true
          }]
        }
      });

      const resCaceria = await fetch(`/api/guild_list/${gremio}/caceria_por_jugador?jugador=${encodeURIComponent(jugador)}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`, { headers });
      const jsonCaceria = await resCaceria.json();

      const fechasCaceria = jsonCaceria.datos.map(e => e.fecha);
      const valoresCaceria = jsonCaceria.datos.map(e => e.kills);

      if (chartCaceriaJugador) chartCaceriaJugador.destroy();
      chartCaceriaJugador = new Chart(document.getElementById('graficoCaceriaJugador'), {
        type: 'line',
        data: {
          labels: fechasCaceria,
          datasets: [{
            label: `Cacería de ${jugador}`,
            data: valoresCaceria,
            borderColor: 'rgb(60, 179, 113)',
            backgroundColor: 'rgba(60, 179, 113, 0.2)',
            tension: 0.3,
            fill: true
          }]
        }
      });

    } catch (err) {
      console.error('Error al actualizar gráficos del jugador:', err);
    }
  };

  selectJugador.addEventListener('change', actualizarGraficosJugador);
  btnActualizar.addEventListener('click', actualizarGraficosJugador);

  cargarJugadores();
});
