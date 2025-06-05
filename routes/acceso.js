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

// Ruta GET para obtener los nombres de los gremios
router.get('/gremios', (req, res) => {
  const statsPath = path.join(__dirname, '..', 'stats exported');

  fs.readdir(statsPath, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error('Error al leer la carpeta de gremios:', err);
      return res.status(500).json({ error: 'No se pudieron cargar los gremios' });
    }

    const gremios = files
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    res.json(gremios);
  });
});

module.exports = router;
