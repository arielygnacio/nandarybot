const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Ruta para obtener la lista de archivos gift_stats del gremio autenticado
router.get('/files', (req, res) => {
  if (!req.session.gremio) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const gremio = req.session.gremio;
  const folderPath = path.join(__dirname, '..', 'stats_exported', gremio, 'gift_stats');

  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error('Error al leer gift_stats:', err);
      return res.status(500).json({ error: 'No se pudieron cargar los archivos' });
    }

    const csvFiles = files.filter(file => file.endsWith('.csv'));
    res.json(csvFiles);
  });
});

module.exports = router;
