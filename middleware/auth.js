const gremioPasswords = require('../gremio.json');

function autenticarPorHeader(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {
    console.log('[AUTH] Faltante Authorization header');
    return res.status(401).json({ error: 'Falta encabezado Authorization' });
  }

  const [gremio, clave] = auth.split(':');

  if (!gremio || !clave) {
    console.log('[AUTH] Formato incorrecto:', auth);
    return res.status(400).json({ error: 'Formato incorrecto. Usa: Authorization: GREMIO:CLAVE' });
  }

  const claveEsperada = gremioPasswords[gremio];

  // Logs de depuración
  console.log('--- AUTENTICACIÓN ---');
  console.log('Authorization header:', auth);
  console.log('Gremio recibido:', gremio);
  console.log('Clave recibida:', clave);
  console.log('Clave esperada:', claveEsperada);
  console.log('----------------------');

  if (!claveEsperada || clave !== claveEsperada) {
    return res.status(403).json({ error: 'Clave incorrecta' });
  }

  req.gremio = gremio;          // Para rutas que usan req.gremio
  req.auth = { gremio };        // Para rutas que usan req.auth.gremio

  next();
}


module.exports = autenticarPorHeader;
