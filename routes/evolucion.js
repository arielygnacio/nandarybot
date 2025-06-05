const express = require('express');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { extraerFechaDeNombreArchivo, limpiarNumero } = require('../utils/utils');

const router = express.Router();
const basePath = path.join(__dirname, '..', '..', 'stats_exported');

// Función genérica para evolución
function generarEvolucion({ carpetaTipo, campo }) {
  return (req, res) => {
    const gremio = req.gremio;
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ error: 'Falta parámetro user_id' });

    const carpeta = path.join(basePath, gremio, carpetaTipo);
    fs.readdir(carpeta, (err, archivos) => {
      if (err) return res.status(500).json({ error: 'No se pudo leer la carpeta' });

      const archivosCSV = archivos
        .filter(nombre => nombre.endsWith('.csv'))
        .sort((a, b) => extraerFechaDeNombreArchivo(a).localeCompare(extraerFechaDeNombreArchivo(b)));

      const resultados = [];

      let archivosProcesados = 0;
      if (archivosCSV.length === 0) return res.json({ evolucion: [] });

      archivosCSV.forEach(nombreArchivo => {
        const fecha = extraerFechaDeNombreArchivo(nombreArchivo);
        fs.createReadStream(path.join(carpeta, nombreArchivo))
          .pipe(csv())
          .on('data', row => {
            if (row['User ID'] === userId) {
              resultados.push({
                fecha,
                valor: limpiarNumero(row[campo])
              });
            }
          })
          .on('end', () => {
            archivosProcesados++;
            if (archivosProcesados === archivosCSV.length) {
              res.json({ evolucion: resultados });
            }
          });
      });
    });
  };
}

// Rutas
router.get('/poder_por_jugador', generarEvolucion({
  carpetaTipo: 'guild_list',
  campo: 'Might'
}));

router.get('/caceria_por_jugador', generarEvolucion({
  carpetaTipo: 'gift_stats',
  campo: 'Hunt'
}));

module.exports = router;
