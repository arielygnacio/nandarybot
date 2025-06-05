document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('loginForm');
  const gremioSelect = document.getElementById('gremioSelect');
  const passwordInput = document.getElementById('passwordInput');
  const mensaje = document.getElementById('mensaje');

  // 1. Cargar gremios desde el backend
  try {
    const res = await fetch('/api/acceso/gremios');
    const gremios = await res.json();

    gremioSelect.innerHTML = gremios
      .map(g => `<option value="${g}">${g}</option>`)
      .join('');
  } catch (err) {
    console.error('Error al cargar los gremios:', err);
    gremioSelect.innerHTML = `<option disabled>Error al cargar gremios</option>`;
  }

  // 2. Manejar login
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const gremio = gremioSelect.value;
    const password = passwordInput.value;

    try {
      const res = await fetch('/api/acceso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gremio, password })
      });

      const data = await res.json();

      if (data.ok) {
        localStorage.setItem('gremio', gremio);
        localStorage.setItem(`auth_${gremio}`, password);
        window.location.href = '/estadisticas.html';
      } else {
        mensaje.textContent = data.error || 'Acceso denegado';
        mensaje.classList.add('text-danger');
      }
    } catch (err) {
      console.error('Error al intentar acceder:', err);
      mensaje.textContent = 'Error de conexión';
      mensaje.classList.add('text-danger');
    }
  });
});
