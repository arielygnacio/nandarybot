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
      selectJugador.innerHTML = ''; // limpiar opciones previas
      const res = await fetch(`/api/guild_list/${gremio}/listado_jugadores`, { headers });
      const data = await res.json();
      if (data.jugadores) {
        data.jugadores.forEach(nombre => {
          const option = document.createElement('option');
          option.value = nombre;
          option.textContent = nombre;
          selectJugador.appendChild(option);
        });
        if (data.jugadores.length > 0) {
          selectJugador.value = data.jugadores[0];
          actualizarGraficosJugador();
        }
      }
    } catch (err) {
      console.error("Error cargando jugadores:", err);
    }
  };

  const actualizarGraficosJugador = async () => {
    const jugador = selectJugador.value;
    if (!jugador) return;
    if (!fechaInicioInput.value || !fechaFinInput.value) {
      console.warn('Fechas no válidas para actualizar gráficos');
      return;
    }

    const fechaInicio = formatAPIDate(new Date(fechaInicioInput.value));
    const fechaFin = formatAPIDate(new Date(fechaFinInput.value));

    if (fechaInicio > fechaFin) {
      alert('La fecha de inicio no puede ser mayor a la fecha de fin.');
      return;
    }

    try {
      // Poder
      const resPoder = await fetch(`/api/guild_list/${gremio}/poder_por_jugador?jugador=${encodeURIComponent(jugador)}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`, { headers });
      const jsonPoder = await resPoder.json();

      if (!jsonPoder || !Array.isArray(jsonPoder)) {
        console.error('Respuesta de poder no válida:', jsonPoder);
        return;
      }

      const fechasPoder = jsonPoder.map(e => e.fecha);
      const valoresPoder = jsonPoder.map(e => e.might);

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

      // Cacería
      const resCaceria = await fetch(`/api/guild_list/caceria_por_jugador?jugador=${encodeURIComponent(jugador)}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`, { headers });


      const jsonCaceria = await resCaceria.json();
      console.log('Respuesta cacería:', jsonCaceria);

      if (!jsonCaceria || !Array.isArray(jsonCaceria.datos)) {
        console.error('Respuesta de cacería no válida:', jsonCaceria);
        return;
      }

      const fechasCaceria = jsonCaceria.datos.map(e => e.fecha);
      const valoresCaceria = jsonCaceria.datos.map(e => Number(e.kills) || 0);
      console.log('Fechas cacería:', fechasCaceria);
      console.log('Valores cacería:', valoresCaceria);

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
