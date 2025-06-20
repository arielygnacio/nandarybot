const express = require('express');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const router = express.Router();

const autenticarPorHeader = require('../middleware/auth');
router.use(autenticarPorHeader);

// 🔍 Detecta el delimitador correcto de cada archivo CSV
function detectarDelimitador(buffer) {
  const texto = buffer.toString().split('\n')[0];
  if (texto.includes(';')) return ';';
  if (texto.includes(',')) return ',';
  return ','; // por defecto
}

// Obtener lista de archivos CSV
router.get('/files', async (req, res) => {
  const gremio = req.gremio;
  const folder = path.join(__dirname, '..', 'stats_exported', gremio, 'guild_list');

  try {
    const files = await fs.promises.readdir(folder);
    const csvs = files.filter(f => f.endsWith('.csv')).sort();
    res.json(csvs);
  } catch (err) {
    console.error('Error leyendo archivos guild_list:', err);
    res.status(404).json({ error: 'Archivos no encontrados' });
  }
});

// Obtener contenido de un archivo específico
router.get('/:gremio/archivo', async (req, res) => {
  const gremio = req.params.gremio;
  const archivo = req.query.nombre;
  const filePath = path.join(__dirname, '..', 'stats_exported', gremio, 'guild_list', archivo);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }

  try {
    const contenido = await fs.promises.readFile(filePath);
    const delimiter = detectarDelimitador(contenido);
    const registros = parse(contenido, {
      columns: true,
      skip_empty_lines: true,
      delimiter
    });
    res.json(registros);
  } catch (error) {
    console.error('Error leyendo archivo CSV:', error);
    res.status(500).json({ error: 'Error al procesar el archivo' });
  }
});

// Poder total por fecha
router.get('/:gremio/might_por_fecha', async (req, res) => {
  const gremio = req.params.gremio;
  const { fechaInicio, fechaFin } = req.query;
  const folder = path.join(__dirname, '..', 'stats_exported', gremio, 'guild_list');

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
      const delimiter = detectarDelimitador(contenido);
      const registros = parse(contenido, {
        columns: true,
        skip_empty_lines: true,
        delimiter
      });

      const totalMight = registros.reduce((acc, row) => acc + (parseInt(row["Might"]) || 0), 0);
      const fecha = archivo.split(' ')[0];
      resultados.push({ fecha, total: totalMight });
    }

    res.json(resultados);
  } catch (error) {
    console.error('Error en might_por_fecha:', error);
    res.status(500).json({ error: 'No se pudieron procesar los archivos' });
  }
});

// Listado de jugadores del archivo más reciente
router.get('/:gremio/listado_jugadores', async (req, res) => {
  const gremio = req.params.gremio;
  const folder = path.join(__dirname, '..', 'stats_exported', gremio, 'guild_list');

  try {
    const files = await fs.promises.readdir(folder);
    const archivosCSV = files
      .filter(f => f.endsWith('.csv'))
      .sort((a, b) => b.localeCompare(a));

    const archivoMasReciente = archivosCSV[0];
    if (!archivoMasReciente) {
      return res.status(404).json({ error: 'No hay archivos CSV disponibles' });
    }

    const contenido = await fs.promises.readFile(path.join(folder, archivoMasReciente));
    const delimiter = detectarDelimitador(contenido);
    const registros = parse(contenido, {
      columns: true,
      skip_empty_lines: true,
      delimiter
    });

    const jugadores = [...new Set(registros.map(row => row['Name']).filter(Boolean))];

    res.json({
      archivo: archivoMasReciente,
      jugadores
    });
  } catch (error) {
    console.error('Error en listado_jugadores:', error);
    res.status(500).json({ error: 'No se pudo procesar el listado de jugadores' });
  }
});

// Evolución de poder por jugador entre fechas
router.get('/:gremio/poder_por_jugador', async (req, res) => {
  const gremio = req.params.gremio;
  const { jugador, fechaInicio, fechaFin } = req.query;

  if (!jugador || !fechaInicio || !fechaFin) {
    return res.status(400).json({ error: 'Faltan parámetros: jugador, fechaInicio o fechaFin' });
  }

  const folder = path.join(__dirname, '..', 'stats_exported', gremio, 'guild_list');

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
      const delimiter = detectarDelimitador(contenido);
      const registros = parse(contenido, {
        columns: true,
        skip_empty_lines: true,
        delimiter
      });

      const jugadorEncontrado = registros.find(row => row.Name === jugador);
      if (jugadorEncontrado) {
        const might = parseInt(jugadorEncontrado["Might"]) || 0;
        const fecha = archivo.split(' ')[0];
        resultados.push({ fecha, might });
      }
    }

    res.json(resultados);
  } catch (error) {
    console.error('Error en poder_por_jugador:', error);
    res.status(500).json({ error: 'No se pudo procesar el poder por jugador' });
  }
});

// Ruta para obtener kills (cacería) por jugador entre fechas desde guild_list
router.get('/caceria_por_jugador', autenticarPorHeader, async (req, res) => {
  const gremio = req.gremio;
  const { jugador, fechaInicio, fechaFin } = req.query;

  if (!jugador || !fechaInicio || !fechaFin) {
    return res.status(400).json({ error: 'Faltan parámetros: jugador, fechaInicio o fechaFin' });
  }

  const folder = path.join(__dirname, '..', 'stats_exported', gremio, 'guild_list');

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

// Ruta para obtener la lista de archivos CSV de gift_stats
router.get('/gift_stats/files', async (req, res) => {
  const gremio = req.gremio;
  const folder = path.join(__dirname, '..', 'stats_exported', gremio, 'gift_stats');

  try {
    const files = await fs.promises.readdir(folder);
    const archivosCSV = files.filter(name => name.endsWith('.csv')).sort();
    res.json(archivosCSV);
  } catch (error) {
    console.error('Error al leer archivos gift_stats:', error);
    res.status(404).json({ error: 'Archivos no encontrados' });
  }
});

// Ruta para obtener el contenido de un archivo específico de gift_stats
router.get('/gift_stats/:gremio/:archivo', async (req, res) => {
  const gremio = req.params.gremio;
  const archivo = req.params.archivo;
  const filePath = path.join(__dirname, '..', 'stats_exported', gremio, 'gift_stats', archivo);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }

  try {
    const contenido = await fs.promises.readFile(filePath);
    const registros = parse(contenido, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';'
    });
    res.json(registros);
  } catch (error) {
    console.error('Error leyendo archivo gift_stats:', error);
    res.status(500).json({ error: 'Error al procesar el archivo' });
  }
});


module.exports = router;
