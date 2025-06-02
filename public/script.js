document.getElementById("btnAcceder").addEventListener("click", () => {
  const gremio = document.getElementById("selectGremio").value;
  const clave = document.getElementById("claveGremio").value;

  fetch(`/api/gift_stats/files`, {
    headers: {
      Authorization: `${gremio} ${clave}`
    }
  })
  .then(res => {
    if (!res.ok) throw new Error("Clave incorrecta");
    return res.json();
  })
  .then(() => {
    // Guardar el gremio en localStorage y redirigir al index
    localStorage.setItem("gremio", gremio);
    window.location.href = "/";
  })
  .catch(err => {
    alert("Acceso denegado: " + err.message);
  });
});
