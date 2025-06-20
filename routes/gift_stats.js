const express = require('express');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const autenticarPorHeader = require('../middleware/auth');

const router = express.Router();

// Ruta para obtener la lista de archivos CSV en gift_stats
router.get('/files', autenticarPorHeader, (req, res) => {
  const gremio = req.gremio;
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

// Ruta para obtener kills (cacería) por jugador entre fechas
router.get('/:gremio/caceria_por_jugador', autenticarPorHeader, async (req, res) => {
  const gremio = req.params.gremio;
  const { jugador, fechaInicio, fechaFin } = req.query;

  if (!jugador || !fechaInicio || !fechaFin) {
    return res.status(400).json({ error: 'Faltan parámetros: jugador, fechaInicio o fechaFin' });
  }

  const folder = path.join(__dirname, '..', 'stats_exported', gremio, 'gift_stats');

  try {
    const archivos = await fs.promises.readdir(folder);
    const archivosFiltrados = archivos
      .filter(name => {
        const match = name.match(/^(\d{4}-\d{2}-\d{2})/);
        if (!match) return false;
        const fecha = match[1].replace(/-/g, '');
        return fecha >= fechaInicio && fecha <= fechaFin;
      })
      .sort();

    const resultados = [];

    for (const archivo of archivosFiltrados) {
      const contenido = await fs.promises.readFile(path.join(folder, archivo));
      const registros = parse(contenido, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';'
      });

      const filaJugador = registros.find(row => row.Name === jugador);
      if (filaJugador) {
        const fecha = archivo.split(' ')[0]; // Extrae la fecha del nombre
        resultados.push({ fecha, kills: parseInt(filaJugador.Kills) || 0 });
      }
    }

    res.json({ datos: resultados });

  } catch (error) {
    console.error('Error en caceria_por_jugador:', error);
    res.status(500).json({ error: 'No se pudieron procesar los archivos' });
  }
});

// Ruta para servir un archivo CSV específico de gift_stats
router.get('/:gremio/:archivo', autenticarPorHeader, (req, res) => {
  const { gremio, archivo } = req.params;
  const archivoDecodificado = decodeURIComponent(archivo);
  const filePath = path.join(__dirname, '..', 'stats_exported', gremio, 'gift_stats', archivoDecodificado);

  if (!fs.existsSync(filePath)) {
    console.error('Archivo no encontrado:', filePath);
    return res.status(404).send('Archivo no encontrado');
  }

  res.sendFile(filePath);
});


module.exports = router;
