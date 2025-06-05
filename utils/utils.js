// Extrae la fecha del nombre del archivo (ej: "gift_stats_2024-03-20.csv")
function extraerFechaDeNombreArchivo(nombreArchivo) {
  const match = nombreArchivo.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

// Convierte una fecha tipo "2024-03-20" a "20/03/2024"
function obtenerFechaLegible(fecha) {
  if (!fecha) return '';
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

// Convierte string a número entero, validando que no sea NaN
function limpiarNumero(valor) {
  const numero = parseInt(valor?.toString().replace(/,/g, '').trim(), 10);
  return isNaN(numero) ? 0 : numero;
}

module.exports = {
  extraerFechaDeNombreArchivo,
  obtenerFechaLegible,
  limpiarNumero
};
