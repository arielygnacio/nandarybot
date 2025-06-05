const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const {
  extraerFechaDeNombreArchivo,
  limpiarNumero
} = require('../utils/utils');

const router = express.Router();
const basePath = path.join(__dirname, '..', 'stats_exported');

router.get('/listado_jugadores', (req, res) => {
  const gremio = req.gremio;
  const carpetaGiftStats = path.join(basePath, gremio, 'gift_stats');

  fs.readdir(carpetaGiftStats, (err, archivos) => {
    if (err) return res.status(500).json({ error: 'No se pudo leer la carpeta gift_stats' });

    const archivosCSV = archivos
      .filter(archivo => archivo.endsWith('.csv'))
      .sort((a, b) => extraerFechaDeNombreArchivo(b).localeCompare(extraerFechaDeNombreArchivo(a)));

    const archivoMasReciente = archivosCSV[0];
    if (!archivoMasReciente) return res.status(404).json({ error: 'No hay archivos CSV disponibles' });

    const resultados = [];
    fs.createReadStream(path.join(carpetaGiftStats, archivoMasReciente))
      .pipe(csv())
      .on('data', (data) => {
        resultados.push({
          user_id: data['User ID'] || '',
          name: data['Name'] || '',
          l1: limpiarNumero(data['L1 (Hunt)']),
          l2: limpiarNumero(data['L2 (Hunt)']),
          l3: limpiarNumero(data['L3 (Hunt)']),
          l4: limpiarNumero(data['L4 (Hunt)']),
          l5: limpiarNumero(data['L5 (Hunt)']),
          total: limpiarNumero(data['Hunt'])
        });
      })
      .on('end', () => {
        res.json({
          archivo: archivoMasReciente,
          jugadores: resultados
        });
      });
  });
});

module.exports = router;
