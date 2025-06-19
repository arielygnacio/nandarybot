const express = require('express');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const router = express.Router();
const basePath = path.join(__dirname, '..', 'stats_exported');

function leerCSV(filePath) {
  return new Promise((resolve, reject) => {
    const datos = [];
    if (!fs.existsSync(filePath)) return resolve([]);
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ';' }))
      .on('data', data => datos.push(data))
      .on('end', () => resolve(datos))
      .on('error', err => reject(err));
  });
}

// Ruta: Obtener evolución de poder total del gremio entre dos fechas
router.get('/:gremio/might_por_fecha', async (req, res) => {
  const { gremio } = req.params;
  const { fechaInicio, fechaFin } = req.query;

  if (!fechaInicio || !fechaFin) {
    return res.status(400).json({ error: 'Faltan parámetros de fecha' });
  }

  const carpeta = path.join(basePath, gremio, 'guild_list');
  if (!fs.existsSync(carpeta)) {
    return res.status(404).json({ error: 'No se encontró la carpeta del gremio' });
  }

  const archivos = fs.readdirSync(carpeta)
    .filter(f => {
      const match = f.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (!match) return false;
      const fechaArchivo = `${match[1]}${match[2]}${match[3]}`;
      return f.endsWith('.csv') && fechaArchivo >= fechaInicio && fechaArchivo <= fechaFin;
    })
    .sort((a, b) => {
      const matchA = a.match(/(\d{4})-(\d{2})-(\d{2})/);
      const matchB = b.match(/(\d{4})-(\d{2})-(\d{2})/);
      const fechaA = `${matchA[1]}${matchA[2]}${matchA[3]}`;
      const fechaB = `${matchB[1]}${matchB[2]}${matchB[3]}`;
      return fechaA.localeCompare(fechaB);
    });

  const resultados = [];

  for (const archivo of archivos) {
    const filePath = path.join(carpeta, archivo);
    const filas = await leerCSV(filePath);
    let suma = 0;

    filas.forEach(fila => {
      const might = parseInt(fila['Might'] || '0');
      suma += might;
    });

    const matchFecha = archivo.match(/(\d{4})-(\d{2})-(\d{2})/);
    const fecha = matchFecha ? `${matchFecha[1]}${matchFecha[2]}${matchFecha[3]}` : 'sin_fecha';

    resultados.push({ fecha, total: suma });
  }

  res.json(resultados);
});

// Ruta: Obtener evolución de kills del gremio entre dos fechas
router.get('/:gremio/kills_por_fecha', async (req, res) => {
  const { gremio } = req.params;
  const { fechaInicio, fechaFin } = req.query;

  if (!fechaInicio || !fechaFin) {
    return res.status(400).json({ error: 'Faltan parámetros de fecha' });
  }

  const carpeta = path.join(basePath, gremio, 'guild_list');
  if (!fs.existsSync(carpeta)) {
    return res.status(404).json({ error: 'No se encontró la carpeta del gremio' });
  }

  const archivos = fs.readdirSync(carpeta)
    .filter(f => {
      const match = f.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (!match) return false;
      const fechaArchivo = `${match[1]}${match[2]}${match[3]}`;
      return f.endsWith('.csv') && fechaArchivo >= fechaInicio && fechaArchivo <= fechaFin;
    })
    .sort((a, b) => {
      const matchA = a.match(/(\d{4})-(\d{2})-(\d{2})/);
      const matchB = b.match(/(\d{4})-(\d{2})-(\d{2})/);
      const fechaA = `${matchA[1]}${matchA[2]}${matchA[3]}`;
      const fechaB = `${matchB[1]}${matchB[2]}${matchB[3]}`;
      return fechaA.localeCompare(fechaB);
    });

  const resultados = [];

  for (const archivo of archivos) {
    const filePath = path.join(carpeta, archivo);
    const filas = await leerCSV(filePath);
    let suma = 0;

    filas.forEach(fila => {
      const kills = parseInt(fila['Kills'] || '0');
      suma += kills;
    });

    const matchFecha = archivo.match(/(\d{4})-(\d{2})-(\d{2})/);
    const fecha = matchFecha ? `${matchFecha[1]}${matchFecha[2]}${matchFecha[3]}` : 'sin_fecha';

    resultados.push({ fecha, kills: suma });
  }

  res.json(resultados);
});

module.exports = router;
