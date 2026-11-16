// backend/logic/roomLogic.js
const roomModel = require('../data/roomModel');
const logger = require('./logger');

const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LONGITUD_CODIGO = 6;

function crearErrorHttp(mensaje, statusCode = 400) {
    const error = new Error(mensaje);
    error.statusCode = statusCode;
    return error;
}

/**
 * Genera un código alfanumérico corto de 6 caracteres sin ambigüedad visual.
 */
function generarCodigoSala() {
    let codigo = '';
    for (let i = 0; i < LONGITUD_CODIGO; i += 1) {
        const indice = Math.floor(Math.random() * ALFABETO_CODIGO.length);
        codigo += ALFABETO_CODIGO[indice];
    }
    return codigo;
}

/**
 * Crea una nueva sala de 2 a 4 jugadores en estado WAITING con el anfitrión dentro.
 */
async function crearSala({ hostId, hostUsername, nombre, maxJugadores = 4 }) {
    if (!hostId || typeof hostUsername !== 'string' || hostUsername.trim() === '') {
        throw crearErrorHttp('Datos del anfitrión obligatorios', 400);
    }

    if (typeof nombre !== 'string' || nombre.trim().length < 3 || nombre.trim().length > 40) {
        throw crearErrorHttp('El nombre de la sala debe tener entre 3 y 40 caracteres', 400);
    }

    const limiteJugadores = maxJugadores === undefined || maxJugadores === null ? 4 : maxJugadores;
    if (!Number.isInteger(limiteJugadores) || limiteJugadores < 2 || limiteJugadores > 4) {
        throw crearErrorHttp('El número máximo de jugadores debe estar entre 2 y 4', 400);
    }

    let codigo;
    do {
        codigo = generarCodigoSala();
    } while (await roomModel.buscarPorCodigo(codigo));

    const hostIdStr = String(hostId);
    const hostNombre = hostUsername.trim();

    const sala = await roomModel.crearSalaDatos({
        codigo,
        nombre: nombre.trim(),
        hostId: hostIdStr,
        hostUsername: hostNombre,
        maxJugadores: limiteJugadores,
        estado: 'WAITING',
        jugadores: [{ userId: hostIdStr, username: hostNombre }],
        partidaId: null
    });

    logger.registrarEvento('SALA_CREADA', {
        codigo,
        hostId: hostIdStr,
        maxJugadores: limiteJugadores
    });

    return sala;
}

/**
 * Lista todas las salas abiertas disponibles para unirse (estado WAITING).
 */
async function listarSalasDisponibles() {
    return await roomModel.listarSalasPorEstado('WAITING');
}

/**
 * Obtiene una sala por su código único o lanza error 404 si no existe.
 */
async function obtenerSala(codigo) {
    if (typeof codigo !== 'string' || codigo.trim() === '') {
        throw crearErrorHttp('El código de la sala es obligatorio', 400);
    }

    const sala = await roomModel.buscarPorCodigo(codigo.trim().toUpperCase());
    if (!sala) {
        throw crearErrorHttp('Sala no encontrada', 404);
    }

    return sala;
}

/**
 * Añade a un jugador a una sala en espera, validando aforo y evitando duplicados.
 */
async function unirseASala({ codigo, userId, username }) {
    if (!codigo || !userId || typeof username !== 'string' || username.trim() === '') {
        throw crearErrorHttp('Datos obligatorios para unirse a la sala', 400);
    }

    const sala = await obtenerSala(codigo);
    if (sala.estado !== 'WAITING') {
        throw crearErrorHttp('La partida en esta sala ya ha comenzado o ha finalizado', 400);
    }

    const userIdStr = String(userId);
    if (sala.jugadores.some(j => String(j.userId) === userIdStr)) {
        return sala;
    }

    if (sala.jugadores.length >= sala.maxJugadores) {
        throw crearErrorHttp('La sala está llena', 400);
    }

    const nuevosJugadores = [
        ...sala.jugadores,
        { userId: userIdStr, username: username.trim() }
    ];

    const actualizada = await roomModel.actualizarSalaDatos(sala.codigo, {
        jugadores: nuevosJugadores
    });

    logger.registrarEvento('JUGADOR_UNIDO_SALA', {
        codigo: sala.codigo,
        userId: userIdStr,
        totalJugadores: actualizada.jugadores.length
    });

    return actualizada;
}

/**
 * Saca a un jugador de la sala, transfiere el anfitrión si procede o elimina la sala vacía.
 */
async function salirDeSala({ codigo, userId }) {
    if (!userId) {
        throw crearErrorHttp('El identificador del usuario es obligatorio', 400);
    }

    const sala = await obtenerSala(codigo);
    const userIdStr = String(userId);

    if (!sala.jugadores.some(j => String(j.userId) === userIdStr)) {
        throw crearErrorHttp('El usuario no pertenece a esta sala', 400);
    }

    const restantes = sala.jugadores.filter(j => String(j.userId) !== userIdStr);
    if (restantes.length === 0) {
        await roomModel.eliminarPorCodigo(sala.codigo);
        logger.registrarEvento('SALA_ELIMINADA_VACIA', { codigo: sala.codigo });
        return { eliminada: true, codigo: sala.codigo };
    }

    const cambios = { jugadores: restantes };
    if (String(sala.hostId) === userIdStr) {
        cambios.hostId = restantes[0].userId;
        cambios.hostUsername = restantes[0].username;
    }

    const actualizada = await roomModel.actualizarSalaDatos(sala.codigo, cambios);

    logger.registrarEvento('JUGADOR_SALIO_SALA', {
        codigo: sala.codigo,
        userId: userIdStr,
        hostId: actualizada.hostId
    });

    return { eliminada: false, sala: actualizada };
}

/**
 * Marca la sala en estado IN_PROGRESS validando que lo solicite el anfitrión con 2-4 jugadores.
 */
async function marcarSalaEnCurso({ codigo, solicitanteId, partidaId = null }) {
    if (!solicitanteId) {
        throw crearErrorHttp('El identificador del solicitante es obligatorio', 400);
    }

    const sala = await obtenerSala(codigo);
    if (sala.estado !== 'WAITING') {
        throw crearErrorHttp('La sala no está en espera', 400);
    }

    if (String(sala.hostId) !== String(solicitanteId)) {
        throw crearErrorHttp('Solo el anfitrión puede iniciar la partida', 403);
    }

    if (sala.jugadores.length < 2 || sala.jugadores.length > 4) {
        throw crearErrorHttp('Se requieren entre 2 y 4 jugadores para iniciar la partida', 400);
    }

    const actualizada = await roomModel.actualizarSalaDatos(sala.codigo, {
        estado: 'IN_PROGRESS',
        partidaId
    });

    logger.registrarEvento('SALA_PARTIDA_INICIADA', {
        codigo: sala.codigo,
        hostId: String(solicitanteId),
        numJugadores: sala.jugadores.length
    });

    return actualizada;
}

/**
 * Obtiene la sala activa (WAITING o IN_PROGRESS) en la que participa un jugador.
 */
async function obtenerSalaActivaJugador(userId) {
    if (!userId) {
        throw crearErrorHttp('El identificador del usuario es obligatorio', 400);
    }
    return await roomModel.buscarSalaActivaPorJugador(userId);
}

module.exports = {
    generarCodigoSala,
    crearSala,
    listarSalasDisponibles,
    obtenerSala,
    obtenerSalaActivaJugador,
    unirseASala,
    salirDeSala,
    marcarSalaEnCurso
};
