const MAX_LOGS = 200;
const logs = [];

/**
 * Registra un evento relevante del sistema en memoria y en consola.
 * Nunca debe recibir credenciales, tokens ni contraseñas en el detalle.
 */
function registrarEvento(accion, detalle = {}, nivel = 'INFO') {
    const entrada = {
        timestamp: new Date().toISOString(),
        nivel,
        accion,
        detalle
    };

    logs.push(entrada);
    if (logs.length > MAX_LOGS) {
        logs.shift();
    }

    const resumen = Object.keys(detalle).length > 0 ? ` ${JSON.stringify(detalle)}` : '';
    const linea = `[${entrada.timestamp}] [${nivel}] [${accion}]${resumen}`;
    if (nivel === 'ERROR') {
        console.error(linea);
    } else {
        console.log(linea);
    }

    return entrada;
}

/**
 * Registra un error del sistema con nivel ERROR y el mensaje resumido.
 */
function registrarError(accion, error, detalle = {}) {
    const mensajeError = error?.message || String(error);
    return registrarEvento(accion, { ...detalle, error: mensajeError }, 'ERROR');
}

/**
 * Devuelve una copia de los últimos eventos registrados (del más reciente al más antiguo).
 */
function obtenerLogs(limite = 50) {
    const cantidad = Number.isFinite(limite) && limite > 0 ? Math.floor(limite) : 50;
    return logs.slice(-cantidad).reverse();
}

/**
 * Vacía el buffer en memoria de eventos registrados.
 */
function limpiarLogs() {
    logs.length = 0;
}

module.exports = {
    registrarEvento,
    registrarError,
    obtenerLogs,
    limpiarLogs
};
