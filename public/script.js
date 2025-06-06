document.getElementById("btnAcceder").addEventListener("click", () => {
  const gremio = document.getElementById("selectGremio").value;
  const clave = document.getElementById("claveGremio").value;

  // Paso 1: Verificar el acceso
  fetch(`/api/acceso`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ gremio, password: clave })
  })
  .then(res => {
    if (!res.ok) throw new Error("Clave incorrecta");
    return res.json();
  })
  .then(data => {
    // Paso 2: Guardar gremio y clave y redirigir
    localStorage.setItem("gremio", gremio);
    localStorage.setItem("clave", clave);  // ⚠️ Opcional: podés usar sessionStorage si preferís que se borre al cerrar
    window.location.href = "/";
  })
  .catch(err => {
    alert("Acceso denegado: " + err.message);
  });
});

function fetchConAuth(url, options = {}) {
  const gremio = localStorage.getItem("gremio");
  const clave = localStorage.getItem("clave");

  if (!gremio || !clave) {
    return Promise.reject(new Error("Falta autenticación"));
  }

  // Asegurarse de tener un objeto headers
  options.headers = options.headers || {};
  options.headers["Authorization"] = `${gremio} ${clave}`;

  return fetch(url, options);
}
