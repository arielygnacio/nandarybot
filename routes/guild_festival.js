const express = require('express');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const router = express.Router();

const autenticarPorHeader = require('../middleware/auth');
router.use(autenticarPorHeader);

// Ruta para obtener la lista de fechas (nombres de archivos CSV)
router.get('/fechas', async (req, res) => {
  const gremio = req.gremio;
  const folder = path.join(__dirname, '..', 'stats_exported', gremio, 'guild_festival');

  try {
    const archivos = await fs.promises.readdir(folder);
    const fechas = archivos
      .filter(file => file.endsWith('.csv'))
      .map(file => file.replace('.csv', ''))
      .sort();
    res.json(fechas);
  } catch (error) {
    console.error('Error al leer archivos del festival:', error);
    res.status(500).json({ error: 'Error al obtener fechas' });
  }
});

// Ruta para obtener los datos de un archivo CSV por fecha
router.get('/', async (req, res) => {
  const gremio = req.gremio;
  const { fecha } = req.query;
  const folder = path.join(__dirname, '..', 'stats_exported', gremio, 'guild_festival');

  try {
    let fileName;

    if (fecha) {
      fileName = `${fecha}.csv`;
    } else {
      const archivos = await fs.promises.readdir(folder);
      const csvs = archivos.filter(f => f.endsWith('.csv')).sort();
      fileName = csvs[csvs.length - 1]; // El más reciente
    }

    const filePath = path.join(folder, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const contenido = await fs.promises.readFile(filePath);
    const registros = parse(contenido, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';'  // ← Agrega esta línea
    });

    res.json(registros);
  } catch (error) {
    console.error('Error al leer archivo del festival:', error);
    res.status(500).json({ error: 'Error al obtener datos del festival' });
  }
});

module.exports = router;
