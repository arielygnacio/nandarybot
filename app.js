const express = require('express');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const session = require('express-session');

// Middleware de autenticación
const autenticarPorHeader = require('./middlewares/auth');

// Archivo de contraseñas por gremio
const gremioPasswords = require('./gremio.json');

const app = express();
const PORT = process.env.PORT || 3000;

const basePath = path.join(__dirname, '..', 'stats_exported');

// Configuración de sesiones
app.use(session({
  secret: 'clave-secreta',
  resave: false,
  saveUninitialized: true
}));

app.use(express.json());
app.use(express.static('public'));

// Rutas externas
const accesoRoutes = require('./routes/acceso');
app.use('/api/acceso', accesoRoutes);

// Funciones auxiliares
function obtenerGremiosDisponibles() {
  return fs.readdirSync(basePath).filter(nombre => {
    const fullPath = path.join(basePath, nombre);
    return fs.statSync(fullPath).isDirectory();
  });
}

function getLatestCSVFile(dirPath) {
  if (!fs.existsSync(dirPath)) return null;
  const files = fs.readdirSync(dirPath)
    .filter(file => file.endsWith('.csv'))
    .map(file => ({
      name: file,
      time: fs.statSync(path.join(dirPath, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);
  return files.length > 0 ? path.join(dirPath, files[0].name) : null;
}

function leerCSV(filePath) {
  return new Promise((resolve) => {
    const datos = [];
    if (!filePath) return resolve([]);
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ';' }))
      .on('data', data => datos.push(data))
      .on('end', () => resolve(datos));
  });
}

function generarTablaBootstrap(nombre, datos, filePath) {
  let html = `<h2 class="section-title">${nombre}</h2>`;
  if (!filePath || !datos || datos.length === 0) {
    html += `<div class="alert alert-warning" role="alert">
      <i class="bi bi-exclamation-triangle-fill text-danger"></i> No hay datos disponibles para ${nombre}.
    </div>`;
    return html;
  }

  html += `<p><i class="bi bi-file-earmark-spreadsheet-fill text-success"></i> Archivo: <strong>${path.basename(filePath)}</strong></p>`;
  html += `<div class="table-responsive"><table class="table table-striped table-bordered table-hover align-middle">`;

  const headers = Object.keys(datos[0]);
  html += '<thead class="table-light"><tr>';
  headers.forEach(header => html += `<th>${header}</th>`);
  html += '</tr></thead><tbody>';

  datos.forEach(row => {
    html += '<tr>';
    headers.forEach(header => html += `<td>${row[header]}</td>`);
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

// Rutas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/gremios', (req, res) => {
  const gremios = obtenerGremiosDisponibles();
  res.json(gremios);
});

// 📁 Archivos CSV protegidos por header (GET)
app.get('/api/gift_stats/files', autenticarPorHeader, (req, res) => {
  const gremio = req.gremio;
  const folder = path.join(basePath, gremio, 'gift_stats');

  fs.readdir(folder, (err, files) => {
    if (err) return res.status(500).json({ error: 'Error leyendo archivos' });
    const csvs = files.filter(f => f.endsWith('.csv'));
    res.json(csvs);
  });
});

// 📄 Leer un archivo específico protegido por header (GET)
app.get('/api/gift_stats/:gremio/:archivo', autenticarPorHeader, (req, res) => {
  const { gremio: paramGremio, archivo } = req.params;
  const gremio = req.gremio;

  if (paramGremio !== gremio) {
    return res.status(403).json({ error: 'Acceso denegado al gremio' });
  }

  const filePath = path.join(basePath, gremio, 'gift_stats', archivo);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }

  const results = [];
  fs.createReadStream(filePath)
    .pipe(csv({ separator: ';' }))
    .on('data', data => results.push(data))
    .on('end', () => res.json(results))
    .on('error', () => res.status(500).json({ error: 'Error leyendo el archivo' }));
});

// 📁 Guild Festival (GET - Protegido por header)
app.get('/api/guild_festival', autenticarPorHeader, (req, res) => {
  const gremio = req.gremio;
  const fechaSeleccionada = req.query.fecha;
  const folder = path.join(basePath, gremio, 'guild_festival');

  let selectedFile;

  if (fechaSeleccionada) {
    const archivos = fs.readdirSync(folder);
    selectedFile = archivos.find(file => file.includes(fechaSeleccionada) && file.includes('GUILD_FESTIVAL'));
  } else {
    selectedFile = getLatestCSVFile(folder); // tu función existente
  }

  if (!selectedFile) {
    return res.status(404).json({ error: 'No se encontró archivo para la fecha seleccionada.' });
  }

  leerCSV(path.join(folder, selectedFile))
    .then(datos => res.json(datos))
    .catch(err => {
      console.error("Error al leer el archivo CSV:", err);
      res.status(500).json({ error: 'Error al procesar el archivo Guild Festival.' });
    });
});
app.get('/api/guild_festival/fechas', autenticarPorHeader, (req, res) => {
  const gremio = req.gremio;
  const folder = path.join(basePath, gremio, 'guild_festival');

  fs.readdir(folder, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'No se pudo leer la carpeta del gremio.' });
    }

    const fechas = files
      .filter(file => file.includes('GUILD_FESTIVAL'))
      .map(file => {
        const match = file.match(/^(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    res.json([...new Set(fechas)]); // fechas únicas
  });
});





// 🖼️ Vista visual por gremio (sin autenticación)
app.get('/gremio/:nombre', async (req, res) => {
  const gremio = req.params.nombre;

  const giftStatsPath = path.join(basePath, gremio, 'gift_stats');
  const guildListPath = path.join(basePath, gremio, 'guild_list');
  const guildFestivalPath = path.join(basePath, gremio, 'guild_festival');

  const giftStatsFile = getLatestCSVFile(giftStatsPath);
  const guildListFile = getLatestCSVFile(guildListPath);
  const guildFestivalFile = getLatestCSVFile(guildFestivalPath);

  const [giftStats, guildList, guildFestival] = await Promise.all([
    leerCSV(giftStatsFile),
    leerCSV(guildListFile),
    leerCSV(guildFestivalFile),
  ]);

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Visor ${gremio}</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
      <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css" rel="stylesheet">
    </head>
    <body class="container py-4">
      <h1 class="mb-4 text-success">Estadísticas de ${gremio}</h1>
      ${generarTablaBootstrap('Gift Stats', giftStats, giftStatsFile)}
      ${generarTablaBootstrap('Guild List', guildList, guildListFile)}
      ${generarTablaBootstrap('Guild Festival', guildFestival, guildFestivalFile)}
    </body>
    </html>
  `;

  res.send(html);
});

// 🔒 Leer último archivo de cofres de paga
app.post('/api/paid_chest/:gremio', async (req, res) => {
  const { gremio } = req.params;
  const { password } = req.body;

  if (gremioPasswords[gremio] !== password) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const giftStatsPath = path.join(basePath, gremio, 'gift_stats');
  const latestFile = getLatestCSVFile(giftStatsPath);

  if (!latestFile) {
    return res.status(404).json({ error: 'No hay archivos disponibles' });
  }

  const datos = await leerCSV(latestFile);
  const resumen = {};
  const fecha = path.basename(latestFile, '.csv');

  for (const fila of datos) {
    const userID = fila['User ID'] || 'Desconocido';
    const name = fila['Name'] || 'Sin nombre';

    const L1 = parseInt(fila['L1 (Purchase)'] || '0');
    const L2 = parseInt(fila['L2 (Purchase)'] || '0');
    const L3 = parseInt(fila['L3 (Purchase)'] || '0');
    const L4 = parseInt(fila['L4 (Purchase)'] || '0');
    const L5 = parseInt(fila['L5 (Purchase)'] || '0');

    const total = L1 + L2 + L3 + L4 + L5;

    if (!resumen[userID]) {
      resumen[userID] = {
        userID,
        name,
        L1: 0,
        L2: 0,
        L3: 0,
        L4: 0,
        L5: 0,
        total: 0,
        fecha
      };
    }

    resumen[userID].L1 += L1;
    resumen[userID].L2 += L2;
    resumen[userID].L3 += L3;
    resumen[userID].L4 += L4;
    resumen[userID].L5 += L5;
    resumen[userID].total += total;
  }

  const resultado = Object.values(resumen).sort((a, b) => b.total - a.total);
  res.json({ archivo: path.basename(latestFile), fecha, datos: resultado });
});



// 🔒 Obtener lista de archivos CSV (POST + password)
app.post('/api/archivos/:gremio/:seccion', (req, res) => {
  const { gremio, seccion } = req.params;
  const { password } = req.body;

  if (gremioPasswords[gremio] !== password) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const folder = path.join(basePath, gremio, seccion);
  if (!fs.existsSync(folder)) {
    return res.status(404).json({ error: 'Carpeta no encontrada' });
  }

  fs.readdir(folder, (err, files) => {
    if (err) return res.status(500).json({ error: 'Error leyendo archivos' });
    const csvs = files.filter(f => f.endsWith('.csv'));
    res.json(csvs);
  });
});

// 🔒 Leer archivo CSV (POST + password)
app.post('/api/csv/:gremio/:seccion/:archivo', (req, res) => {
  const { gremio, seccion, archivo } = req.params;
  const { password } = req.body;

  if (gremioPasswords[gremio] !== password) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const filePath = path.join(basePath, gremio, seccion, archivo);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }

  const resultados = [];
  fs.createReadStream(filePath)
    .pipe(csv({ separator: ';' }))
    .on('data', fila => resultados.push(fila))
    .on('end', () => res.json(resultados))
    .on('error', () => res.status(500).json({ error: 'Error leyendo el archivo' }));
});

// Ruta: listar todos los archivos CSV disponibles del gremio
app.get('/api/guild_list/files/:gremio', autenticarPorHeader, (req, res) => {
  const carpeta = path.join(basePath, req.params.gremio, 'guild_list');

  if (!fs.existsSync(carpeta)) {
    return res.status(404).json({ error: 'Carpeta no encontrada' });
  }

  const archivos = fs.readdirSync(carpeta)
    .filter(file => file.endsWith('.csv'))
    .sort(); // opcional: para que el último sea el más nuevo

  res.json(archivos);
});

// Ruta: devolver datos del archivo CSV por nombre
app.get('/api/guild_list/:gremio/archivo', autenticarPorHeader, async (req, res) => {
  const { gremio } = req.params;
  const { nombre } = req.query;

  if (!nombre) {
    return res.status(400).json({ error: 'Falta el nombre del archivo' });
  }

  const ruta = path.join(basePath, gremio, 'guild_list', nombre);

  if (!fs.existsSync(ruta)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }

  try {
    const datos = await leerCSV(ruta); // ← tu función personalizada de parseo
    res.json(datos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al leer el archivo' });
  }
});

app.get('/api/guild_list/:gremio/might_por_fecha', autenticarPorHeader, async (req, res) => {
  const { gremio } = req.params;
  const { fechaInicio, fechaFin } = req.query;

  if (!fechaInicio || !fechaFin) {
    return res.status(400).json({ error: 'Faltan parámetros de fecha' });
  }

  const carpeta = path.join(basePath, gremio, 'guild_list');

  if (!fs.existsSync(carpeta)) {
    return res.status(404).json({ error: 'Carpeta no encontrada' });
  }

  try {
    const archivos = fs.readdirSync(carpeta)
      .filter(file => file.endsWith('.csv'))
      .filter(file => {
        // Extraer la fecha YYYYMMDD del nombre del archivo
        const match = file.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return false;

        const fechaFormateada = match[1] + match[2] + match[3]; // Ej: "20250323"
        
        return fechaFormateada >= fechaInicio && fechaFormateada <= fechaFin;
      })
      .sort();

    const resultado = [];

    for (const archivo of archivos) {
      const ruta = path.join(carpeta, archivo);
      const datos = await leerCSV(ruta);

      const totalMight = datos.reduce((acum, fila) => {
        const might = parseInt(fila['Might']?.replace(/,/g, '') || 0, 10);
        return acum + (isNaN(might) ? 0 : might);
      }, 0);

      // Extraer fecha legible para mostrar en el resultado
      const match = archivo.match(/^(\d{4})-(\d{2})-(\d{2})/);
      const fechaLegible = match ? `${match[1]}-${match[2]}-${match[3]}` : archivo.replace('.csv', '');

      resultado.push({
        fecha: fechaLegible,
        might: totalMight
      });
    }

    res.json({ datos: resultado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar archivos' });
  }
});


app.get('/api/guild_list/:gremio/kills_por_fecha', autenticarPorHeader, async (req, res) => {
  const { gremio } = req.params;
  const { fechaInicio, fechaFin } = req.query;

  if (!fechaInicio || !fechaFin) {
    return res.status(400).json({ error: 'Faltan parámetros de fecha' });
  }

  const carpeta = path.join(basePath, gremio, 'guild_list');

  if (!fs.existsSync(carpeta)) {
    return res.status(404).json({ error: 'Carpeta no encontrada' });
  }

  try {
    const archivos = fs.readdirSync(carpeta)
      .filter(file => file.endsWith('.csv'))
      .filter(file => {
        const match = file.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return false;

        const fechaFormateada = match[1] + match[2] + match[3];
        return fechaFormateada >= fechaInicio && fechaFormateada <= fechaFin;
      })
      .sort();

    const resultado = [];

    for (const archivo of archivos) {
      const ruta = path.join(carpeta, archivo);
      const datos = await leerCSV(ruta);

      const totalKills = datos.reduce((acum, fila) => {
        const kills = parseInt(fila['Kills']?.replace(/,/g, '') || 0, 10);
        return acum + (isNaN(kills) ? 0 : kills);
      }, 0);

      const match = archivo.match(/^(\d{4})-(\d{2})-(\d{2})/);
      const fechaLegible = match ? `${match[1]}-${match[2]}-${match[3]}` : archivo.replace('.csv', '');

      resultado.push({
        fecha: fechaLegible,
        kills: totalKills
      });
    }

    res.json({ datos: resultado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar archivos' });
  }
});


// 📌 Obtener listado de jugadores desde la carpeta guild_list
app.get('/api/guild_list/:gremio/listado_jugadores', autenticarPorHeader, async (req, res) => {
  const { gremio } = req.params;
  const carpeta = path.join(basePath, gremio, 'guild_list');

  if (!fs.existsSync(carpeta)) return res.status(404).json({ error: 'Carpeta no encontrada' });

  try {
    const archivos = fs.readdirSync(carpeta)
      .filter(file => file.endsWith('.csv'))
      .sort()
      .reverse(); // del más reciente al más antiguo

    for (const archivo of archivos) {
      const ruta = path.join(carpeta, archivo);
      const datos = await leerCSV(ruta);
      const jugadores = datos.map(f => f['Name']).filter(Boolean);
      const unicos = [...new Set(jugadores)];
      return res.json({ jugadores: unicos });
    }

    res.status(404).json({ error: 'No se encontraron datos de jugadores' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar archivos' });
  }
});

// 📌 Obtener evolución del poder de un jugador
app.get('/api/guild_list/:gremio/poder_por_jugador', autenticarPorHeader, async (req, res) => {
  const { gremio } = req.params;
  const { jugador, fechaInicio, fechaFin } = req.query;

  if (!jugador || !fechaInicio || !fechaFin) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }

  const carpeta = path.join(basePath, gremio, 'guild_list');
  if (!fs.existsSync(carpeta)) return res.status(404).json({ error: 'Carpeta no encontrada' });

  try {
    const archivos = fs.readdirSync(carpeta)
      .filter(file => file.endsWith('.csv'))
      .filter(file => {
        const match = file.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return false;
        const fecha = match[1] + match[2] + match[3];
        return fecha >= fechaInicio && fecha <= fechaFin;
      })
      .sort();

    const resultado = [];

    for (const archivo of archivos) {
      const ruta = path.join(carpeta, archivo);
      const datos = await leerCSV(ruta);
      const fila = datos.find(f => f['Name']?.trim() === jugador);
      if (!fila) continue;

      const might = parseInt(fila['Might']?.replace(/,/g, '') || 0, 10);
      const match = archivo.match(/^(\d{4})-(\d{2})-(\d{2})/);
      const fecha = match ? `${match[1]}-${match[2]}-${match[3]}` : archivo;

      resultado.push({ fecha, might });
    }

    res.json({ datos: resultado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar archivos' });
  }
});

// 📌 Obtener evolución de kills (cacería) de un jugador
app.get('/api/guild_list/:gremio/caceria_por_jugador', autenticarPorHeader, async (req, res) => {
  const { gremio } = req.params;
  const { jugador, fechaInicio, fechaFin } = req.query;

  if (!jugador || !fechaInicio || !fechaFin) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }

  const carpeta = path.join(basePath, gremio, 'guild_list');
  if (!fs.existsSync(carpeta)) return res.status(404).json({ error: 'Carpeta no encontrada' });

  try {
    const archivos = fs.readdirSync(carpeta)
      .filter(file => file.endsWith('.csv'))
      .filter(file => {
        const match = file.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return false;
        const fecha = match[1] + match[2] + match[3];
        return fecha >= fechaInicio && fecha <= fechaFin;
      })
      .sort();

    const resultado = [];

    for (const archivo of archivos) {
      const ruta = path.join(carpeta, archivo);
      const datos = await leerCSV(ruta);
      const fila = datos.find(f => f['Name']?.trim() === jugador);
      if (!fila) continue;

      const kills = parseInt(fila['Kills']?.replace(/,/g, '') || 0, 10);
      const match = archivo.match(/^(\d{4})-(\d{2})-(\d{2})/);
      const fecha = match ? `${match[1]}-${match[2]}-${match[3]}` : archivo;

      resultado.push({ fecha, kills });
    }

    res.json({ datos: resultado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar archivos' });
  }
});

app.get('/api/guilds', autenticarPorHeader, (req, res) => {
  try {
    if (!fs.existsSync(basePath)) {
      return res.status(404).json({ error: 'Carpeta base no encontrada' });
    }

    const gremios = fs.readdirSync(basePath)
      .filter(nombre => fs.statSync(path.join(basePath, nombre)).isDirectory());

    res.json(gremios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar gremios' });
  }
});



// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
