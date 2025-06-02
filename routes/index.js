const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Ruta principal
router.get('/', (req, res) => {
  const results = [];
  const csvFilePath = path.join(__dirname, '..', 'data', 'archivo.csv'); // Ruta al archivo CSV

  // Verificamos que el archivo exista
  if (!fs.existsSync(csvFilePath)) {
    return res.render('index', { datos: [] });
  }

  // Leer el archivo CSV
  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      res.render('index', { datos: results });
    });
});

module.exports = router;
