document.addEventListener('DOMContentLoaded', () => {
  const fechaInicioInput = document.getElementById('fechaInicio');
  const fechaFinInput = document.getElementById('fechaFin');
  const btnActualizar = document.getElementById('btnActualizar');

  const hoy = new Date();
  const hace30dias = new Date(hoy);
  hace30dias.setDate(hoy.getDate() - 30);

  const formatInputDate = (fecha) => fecha.toISOString().slice(0, 10);
  const formatAPIDate = (fecha) => fecha.toISOString().slice(0, 10).replace(/-/g, '');

  fechaInicioInput.value = formatInputDate(hace30dias);
  fechaFinInput.value = formatInputDate(hoy);

  let chartPoder;
  let chartCaceria;

  const obtenerYMostrarGraficos = async () => {
    const fechaInicio = formatAPIDate(new Date(fechaInicioInput.value));
    const fechaFin = formatAPIDate(new Date(fechaFinInput.value));
    const gremio = localStorage.getItem('gremio');
    const password = localStorage.getItem(`auth_${gremio}`);

    if (!gremio || !password) {
      alert("Sesión inválida. Volvé a iniciar sesión.");
      return;
    }

    const headers = {
      'Authorization': `${gremio}:${password}`
    };

    try {
      // Poder
      const resPoder = await fetch(`/api/guild_list/${gremio}/might_por_fecha?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&_=${Date.now()}`, { headers });
      const jsonPoder = await resPoder.json();

      console.log("Respuesta de poder:", jsonPoder);

      // Corregido para acceder directamente al array
      const fechasPoder = jsonPoder.map(e => e.fecha);
      const valoresPoder = jsonPoder.map(e => e.total);

      if (chartPoder) chartPoder.destroy();
      chartPoder = new Chart(document.getElementById('graficoPoder'), {
        type: 'line',
        data: {
          labels: fechasPoder,
          datasets: [{
            label: 'Poder Total del Gremio',
            data: valoresPoder,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 20,
                padding: 20,
                font: {
                  size: 14
                }
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          },
          layout: {
            padding: 20
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Fecha'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Poder'
              }
            }
          }
        }
      });

      // Cacería
      // Cacería
        const resCaceria = await fetch(`/api/guild_list/${gremio}/kills_por_fecha?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&_=${Date.now()}`, { headers });
        const jsonCaceria = await resCaceria.json();

        console.log("Respuesta de cacería:", jsonCaceria);

        const fechasCaceria = jsonCaceria.map(e => e.fecha);
        const valoresCaceria = jsonCaceria.map(e => e.kills);



      if (chartCaceria) chartCaceria.destroy();
      chartCaceria = new Chart(document.getElementById('graficoCaceria'), {
        type: 'line',
        data: {
          labels: fechasCaceria,
          datasets: [{
            label: 'Cacería Total',
            data: valoresCaceria,
            borderColor: 'rgb(75, 97, 192)',
            backgroundColor: 'rgba(77, 75, 192, 0.2)',
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 20,
                padding: 20,
                font: {
                  size: 14
                }
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          },
          layout: {
            padding: 20
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Fecha'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Kills'
              }
            }
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener datos de estadísticas:', error);
      alert('Error al cargar estadísticas. Verifica conexión o sesión.');
    }
  };

  btnActualizar.addEventListener('click', obtenerYMostrarGraficos);

  // Mostrar al cargar
  obtenerYMostrarGraficos();
});
