const gremioPasswords = require('../gremio.json');

function autenticarPorHeader(req, res, next) {
  const auth = req.headers.authorization;
  console.log('Authorization recibido:', auth);

  if (!auth) {
    return res.status(401).json({ error: 'Falta encabezado Authorization' });
  }

  const [gremio, clave] = auth.split(':'); // CORREGIDO AQUÍ

  console.log('Gremio:', gremio);
  console.log('Clave enviada:', clave);
  console.log('Clave esperada:', gremioPasswords[gremio]);

  if (!gremio || !clave) {
    return res.status(400).json({ error: 'Formato incorrecto. Usa: Authorization: GREMIO:CLAVE' });
  }

  if (gremioPasswords[gremio] === clave) {
    req.gremio = gremio;
    next();
  } else {
    return res.status(403).json({ error: 'Clave incorrecta' });
  }
}

module.exports = autenticarPorHeader;
