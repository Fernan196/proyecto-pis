// backend/logic/gameLogic.js
const gameModel = require('../data/gameModel');
const roomModel = require('../data/roomModel');
const roomLogic = require('./roomLogic');
const logger = require('./logger');

const CATALOGO_CARTAS = {
    BOMB: { nombre: 'Michi Explosivo', copiasBase: 0 },
    DEFUSE: { nombre: 'Puntero Láser', copiasBase: 2 },
    SKIP: { nombre: 'Salto Gatuno', copiasBase: 4 },
    ATTACK: { nombre: 'Emboscada Felina', copiasBase: 4 },
    SEE_FUTURE: { nombre: 'Visión Felina', copiasBase: 5 },
    SHUFFLE: { nombre: 'Terremoto en el Arenero', copiasBase: 4 },
    FAVOR: { nombre: 'Soborno de Atún', copiasBase: 4 },
    CAT_1: { nombre: 'Michi Cósmico', copiasBase: 4 },
    CAT_2: { nombre: 'Michi Ninja', copiasBase: 4 },
    CAT_3: { nombre: 'Michi Pirata', copiasBase: 4 },
    CAT_4: { nombre: 'Michi Zombie', copiasBase: 4 }
};

const CARTAS_BASE_REPARTO = ['SKIP', 'ATTACK', 'SEE_FUTURE', 'SHUFFLE', 'FAVOR', 'CAT_1', 'CAT_2', 'CAT_3', 'CAT_4'];
const CARTAS_INICIALES_POR_JUGADOR = 7;

function crearErrorHttp(mensaje, statusCode = 400) {
    const error = new Error(mensaje);
    error.statusCode = statusCode;
    return error;
}

/**
 * Baraja una lista de elementos de forma inmutable usando Fisher-Yates.
 */
function barajarArray(lista, rng = Math.random) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

/**
 * Construye el mazo y reparte 7 cartas + 1 DEFUSE a cada uno de los 2 a 4 jugadores,
 * añadiendo después 2 DEFUSE adicionales y N-1 cartas BOMB antes de barajar el mazo final.
 */
function construirMazoInicial(jugadores, rng = Math.random) {
    if (!Array.isArray(jugadores) || jugadores.length < 2 || jugadores.length > 4) {
        throw crearErrorHttp('Se requieren entre 2 y 4 jugadores para crear el mazo', 400);
    }

    const mazoBase = [];
    for (const tipo of CARTAS_BASE_REPARTO) {
        const { copiasBase } = CATALOGO_CARTAS[tipo];
        for (let c = 0; c < copiasBase; c += 1) {
            mazoBase.push(tipo);
        }
    }

    const mazoRepartoBarajado = barajarArray(mazoBase, rng);
    const manosJugadores = [];
    let cursor = 0;

    for (let i = 0; i < jugadores.length; i += 1) {
        const manoSinDefuse = mazoRepartoBarajado.slice(cursor, cursor + CARTAS_INICIALES_POR_JUGADOR);
        cursor += CARTAS_INICIALES_POR_JUGADOR;
        manosJugadores.push(barajarArray([...manoSinDefuse, 'DEFUSE'], rng));
    }

    const mazoRestante = mazoRepartoBarajado.slice(cursor);
    for (let d = 0; d < CATALOGO_CARTAS.DEFUSE.copiasBase; d += 1) {
        mazoRestante.push('DEFUSE');
    }
    for (let b = 0; b < jugadores.length - 1; b += 1) {
        mazoRestante.push('BOMB');
    }

    return {
        manosJugadores,
        mazo: barajarArray(mazoRestante, rng)
    };
}

/**
 * Crea e inicializa directamente una partida para una lista de 2 a 4 jugadores.
 */
async function iniciarPartidaDirecta({ codigoSala, jugadores, rng = Math.random }) {
    if (typeof codigoSala !== 'string' || codigoSala.trim() === '') {
        throw crearErrorHttp('El código de sala es obligatorio', 400);
    }
    if (!Array.isArray(jugadores) || jugadores.length < 2 || jugadores.length > 4) {
        throw crearErrorHttp('Se requieren entre 2 y 4 jugadores para iniciar la partida', 400);
    }

    const { manosJugadores, mazo } = construirMazoInicial(jugadores, rng);
    const jugadoresPartida = jugadores.map((j, idx) => ({
        userId: String(j.userId),
        username: String(j.username || j.userId),
        mano: manosJugadores[idx],
        vivo: true
    }));

    const codigoNormalizado = codigoSala.trim().toUpperCase();
    const partida = await gameModel.crearPartidaDatos({
        codigoSala: codigoNormalizado,
        estado: 'PLAYING',
        jugadores: jugadoresPartida,
        mazo,
        descartes: [],
        turnoActualIndex: 0,
        turnoActualUserId: jugadoresPartida[0].userId,
        turnosPendientes: 1,
        jugadorDesactivando: null,
        ganadorId: null,
        ganadorUsername: null,
        historialAcciones: [`Partida iniciada con ${jugadoresPartida.length} jugadores.`]
    });

    logger.registrarEvento('PARTIDA_INICIADA', {
        codigoSala: partida.codigoSala,
        numJugadores: jugadoresPartida.length
    });

    return partida;
}

/**
 * Marca una sala del lobby en curso e inicializa su partida asociada.
 */
async function iniciarPartidaDesdeSala({ codigoSala, solicitanteId, rng = Math.random }) {
    const sala = await roomLogic.marcarSalaEnCurso({
        codigo: codigoSala,
        solicitanteId
    });

    const partida = await iniciarPartidaDirecta({
        codigoSala: sala.codigo,
        jugadores: sala.jugadores,
        rng
    });

    const salaActualizada = await roomModel.actualizarSalaDatos(sala.codigo, {
        partidaId: partida.id
    });

    return {
        ...(salaActualizada || sala),
        partidaId: partida.id,
        partida
    };
}

/**
 * Recupera una partida existente por código de sala o lanza error 404.
 */
async function obtenerPartida(codigoSala) {
    if (typeof codigoSala !== 'string' || codigoSala.trim() === '') {
        throw crearErrorHttp('El código de sala es obligatorio', 400);
    }

    const partida = await gameModel.buscarPorCodigoSala(codigoSala.trim().toUpperCase());
    if (!partida) {
        throw crearErrorHttp('Partida no encontrada', 404);
    }

    return partida;
}

/**
 * Calcula el siguiente turno: descuenta turnos pendientes si el jugador actual sigue vivo
 * y tiene >1 turnos pendientes, o avanza circularmente al siguiente jugador vivo.
 */
function avanzarTurno(jugadores, turnoActualIndex, turnosPendientes) {
    if (turnosPendientes > 1 && jugadores[turnoActualIndex]?.vivo) {
        return {
            turnoActualIndex,
            turnoActualUserId: jugadores[turnoActualIndex].userId,
            turnosPendientes: turnosPendientes - 1
        };
    }

    const total = jugadores.length;
    for (let offset = 1; offset <= total; offset += 1) {
        const sigIndex = (turnoActualIndex + offset) % total;
        if (jugadores[sigIndex]?.vivo) {
            return {
                turnoActualIndex: sigIndex,
                turnoActualUserId: jugadores[sigIndex].userId,
                turnosPendientes: 1
            };
        }
    }

    throw crearErrorHttp('No hay jugadores vivos para continuar el turno', 400);
}

async function finalizarReinsercionBomba(
    partida,
    mazoSinBomba,
    descartesActualizados,
    jugadoresActualizados,
    jugadorActual,
    posicionBomba
) {
    if (!Number.isInteger(posicionBomba) || posicionBomba < 0 || posicionBomba > mazoSinBomba.length) {
        throw crearErrorHttp('Posición del mazo no válida', 400);
    }

    const nuevoMazo = [...mazoSinBomba];
    nuevoMazo.splice(posicionBomba, 0, 'BOMB');

    const siguienteTurno = avanzarTurno(
        jugadoresActualizados,
        partida.turnoActualIndex,
        partida.turnosPendientes
    );

    const historialAcciones = [
        ...partida.historialAcciones,
        `${jugadorActual.username} desactivó un Michi Explosivo con Puntero Láser.`
    ];

    const actualizada = await gameModel.actualizarPartidaDatos(partida.codigoSala, {
        estado: 'PLAYING',
        jugadorDesactivando: null,
        jugadores: jugadoresActualizados,
        mazo: nuevoMazo,
        descartes: descartesActualizados,
        ...siguienteTurno,
        historialAcciones
    });

    logger.registrarEvento('BOMBA_DESACTIVADA', {
        codigoSala: partida.codigoSala,
        userId: String(jugadorActual.userId)
    });

    return actualizada;
}

/**
 * Ejecuta el robo de la carta superior del mazo para el jugador en turno,
 * resolviendo carta normal, desactivación con DEFUSE o explosión y posible victoria.
 */
async function robarCarta({ codigoSala, userId, posicionBomba }) {
    if (!userId) {
        throw crearErrorHttp('El identificador del usuario es obligatorio', 400);
    }

    const partida = await obtenerPartida(codigoSala);
    if (partida.estado === 'FINISHED') {
        throw crearErrorHttp('La partida ya ha finalizado', 400);
    }
    if (partida.estado === 'WAITING_DEFUSE_INSERT') {
        throw crearErrorHttp('Debes reinsertar el Michi Explosivo en el mazo antes de continuar', 400);
    }
    if (String(partida.turnoActualUserId) !== String(userId)) {
        throw crearErrorHttp('No es tu turno', 403);
    }
    if (partida.mazo.length === 0) {
        throw crearErrorHttp('No quedan cartas en el mazo', 400);
    }

    const cartaRobada = partida.mazo[0];
    const nuevoMazo = partida.mazo.slice(1);
    const jugadores = partida.jugadores.map(j => ({ ...j, mano: [...j.mano] }));
    const jugadorActual = jugadores[partida.turnoActualIndex];

    if (cartaRobada !== 'BOMB') {
        jugadorActual.mano.push(cartaRobada);
        const siguienteTurno = avanzarTurno(jugadores, partida.turnoActualIndex, partida.turnosPendientes);
        const historialAcciones = [
            ...partida.historialAcciones,
            `${jugadorActual.username} robó una carta del mazo.`
        ];

        const actualizada = await gameModel.actualizarPartidaDatos(partida.codigoSala, {
            jugadores,
            mazo: nuevoMazo,
            ...siguienteTurno,
            historialAcciones
        });

        logger.registrarEvento('CARTA_ROBADA', {
            codigoSala: partida.codigoSala,
            userId: String(userId)
        });

        return {
            evento: 'CARTA_ROBADA',
            cartaRobada,
            partida: actualizada
        };
    }

    const indiceDefuse = jugadorActual.mano.indexOf('DEFUSE');
    if (indiceDefuse !== -1) {
        jugadorActual.mano.splice(indiceDefuse, 1);
        const nuevosDescartes = [...partida.descartes, 'DEFUSE'];

        if (posicionBomba !== undefined && posicionBomba !== null) {
            const actualizada = await finalizarReinsercionBomba(
                partida,
                nuevoMazo,
                nuevosDescartes,
                jugadores,
                jugadorActual,
                posicionBomba
            );

            return {
                evento: 'BOMBA_DESACTIVADA',
                cartaRobada: 'BOMB',
                requierePosicionBomba: false,
                partida: actualizada
            };
        }

        const historialAcciones = [
            ...partida.historialAcciones,
            `${jugadorActual.username} robó un Michi Explosivo y usó su Puntero Láser.`
        ];

        const actualizada = await gameModel.actualizarPartidaDatos(partida.codigoSala, {
            estado: 'WAITING_DEFUSE_INSERT',
            jugadorDesactivando: String(userId),
            jugadores,
            mazo: nuevoMazo,
            descartes: nuevosDescartes,
            historialAcciones
        });

        return {
            evento: 'BOMBA_DESACTIVADA_PENDIENTE_POSICION',
            cartaRobada: 'BOMB',
            requierePosicionBomba: true,
            partida: actualizada
        };
    }

    jugadorActual.vivo = false;
    const nuevosDescartes = [...partida.descartes, ...jugadorActual.mano, 'BOMB'];
    jugadorActual.mano = [];

    const vivos = jugadores.filter(j => j.vivo);
    if (vivos.length === 1) {
        const ganador = vivos[0];
        const historialAcciones = [
            ...partida.historialAcciones,
            `${jugadorActual.username} explotó. ¡${ganador.username} gana la partida!`
        ];

        const actualizada = await gameModel.actualizarPartidaDatos(partida.codigoSala, {
            estado: 'FINISHED',
            jugadores,
            mazo: nuevoMazo,
            descartes: nuevosDescartes,
            ganadorId: ganador.userId,
            ganadorUsername: ganador.username,
            historialAcciones
        });

        const sala = await roomModel.buscarPorCodigo(partida.codigoSala);
        if (sala) {
            await roomModel.actualizarSalaDatos(partida.codigoSala, { estado: 'FINISHED' });
        }

        logger.registrarEvento('PARTIDA_FINALIZADA', {
            codigoSala: partida.codigoSala,
            ganadorId: ganador.userId,
            eliminadoId: String(userId)
        });

        return {
            evento: 'JUGADOR_ELIMINADO',
            cartaRobada: 'BOMB',
            partida: actualizada
        };
    }

    const siguienteTurno = avanzarTurno(jugadores, partida.turnoActualIndex, 1);
    const historialAcciones = [
        ...partida.historialAcciones,
        `${jugadorActual.username} explotó y quedó eliminado.`
    ];

    const actualizada = await gameModel.actualizarPartidaDatos(partida.codigoSala, {
        jugadores,
        mazo: nuevoMazo,
        descartes: nuevosDescartes,
        ...siguienteTurno,
        historialAcciones
    });

    logger.registrarEvento('JUGADOR_ELIMINADO', {
        codigoSala: partida.codigoSala,
        userId: String(userId),
        jugadoresVivos: vivos.length
    });

    return {
        evento: 'JUGADOR_ELIMINADO',
        cartaRobada: 'BOMB',
        partida: actualizada
    };
}

/**
 * Reintroduce el Michi Explosivo en el índice elegido tras haberlo desactivado con DEFUSE.
 */
async function reinsertarBomba({ codigoSala, userId, posicionBomba }) {
    if (!userId) {
        throw crearErrorHttp('El identificador del usuario es obligatorio', 400);
    }

    const partida = await obtenerPartida(codigoSala);
    if (partida.estado !== 'WAITING_DEFUSE_INSERT') {
        throw crearErrorHttp('No hay ningún Michi Explosivo pendiente de reinsertar', 400);
    }
    if (String(partida.jugadorDesactivando) !== String(userId)) {
        throw crearErrorHttp('No eres el jugador que está desactivando la bomba', 403);
    }

    const jugadores = partida.jugadores.map(j => ({ ...j, mano: [...j.mano] }));
    const jugadorActual = jugadores[partida.turnoActualIndex];

    const actualizada = await finalizarReinsercionBomba(
        partida,
        partida.mazo,
        partida.descartes,
        jugadores,
        jugadorActual,
        posicionBomba
    );

    return {
        evento: 'BOMBA_DESACTIVADA',
        partida: actualizada
    };
}

module.exports = {
    CATALOGO_CARTAS,
    barajarArray,
    construirMazoInicial,
    iniciarPartidaDirecta,
    iniciarPartidaDesdeSala,
    obtenerPartida,
    avanzarTurno,
    robarCarta,
    reinsertarBomba
};
