const gremioPasswords = require('../gremio.json');

function autenticarPorHeader(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: 'Falta encabezado Authorization' });
  }

  const [gremio, clave] = auth.split(':');

  if (!gremio || !clave) {
    return res.status(400).json({ error: 'Formato incorrecto. Usa: Authorization: GREMIO:CLAVE' });
  }

  const claveEsperada = gremioPasswords[gremio];
  if (clave !== claveEsperada) {
    return res.status(403).json({ error: 'Clave incorrecta' });
  }

  req.gremio = gremio; // Se usa en las rutas para obtener datos del gremio autenticado
  next();
}

module.exports = autenticarPorHeader;
