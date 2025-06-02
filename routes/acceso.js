// routes/acceso.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const contrasPath = path.join(__dirname, '..', 'gremio.json');

// Ruta POST para verificar acceso
router.post('/', (req, res) => {
  const { gremio, password } = req.body;

  if (!gremio || !password) {
    return res.status(400).json({ ok: false, error: 'Faltan datos' });
  }

  try {
    const contraseñas = JSON.parse(fs.readFileSync(contrasPath, 'utf8'));
    const passCorrecta = contraseñas[gremio];

    if (passCorrecta && password === passCorrecta) {
      res.json({ ok: true });
    } else {
      res.status(401).json({ ok: false, error: 'Contraseña incorrecta o gremio inválido' });
    }
  } catch (err) {
    console.error('Error leyendo el archivo de contraseñas:', err);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

module.exports = router;
