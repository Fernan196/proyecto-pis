// backend/logic/socketManager.js
const jwt = require('jsonwebtoken');
const roomLogic = require('./roomLogic');
const gameLogic = require('./gameLogic');
const logger = require('./logger');

let ioInstance = null;
const temporizadoresNope = new Map();

function normalizarCodigoSala(codigo) {
    return typeof codigo === 'string' ? codigo.trim().toUpperCase() : '';
}

function cancelarTemporizadorNope(codigoSala) {
    const codigo = normalizarCodigoSala(codigoSala);
    if (!codigo) return;
    const timer = temporizadoresNope.get(codigo);
    if (timer) {
        clearTimeout(timer);
        temporizadoresNope.delete(codigo);
    }
}

function limpiarTemporizadoresNope() {
    for (const timer of temporizadoresNope.values()) {
        clearTimeout(timer);
    }
    temporizadoresNope.clear();
}

/**
 * Middleware de autenticación JWT en el handshake de Socket.IO.
 */
function autenticarSocketMiddleware(socket, next) {
    const authToken = socket.handshake?.auth?.token;
    const authHeader = socket.handshake?.headers?.authorization;
    const headerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null;
    const token = authToken || headerToken;

    if (!token) {
        return next(new Error('Token no proporcionado'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        return next();
    } catch (err) {
        return next(new Error('Token inválido o expirado'));
    }
}

/**
 * Emite la lista actualizada de salas abiertas a todos los clientes conectados al Lobby.
 */
function emitirActualizacionLobby(salas) {
    if (!ioInstance || !Array.isArray(salas)) return;
    ioInstance.to('lobby').emit('lobby:updated', salas);
}

/**
 * Emite una actualización de sala del lobby a todos los clientes suscritos a la sala.
 */
function emitirActualizacionSala(codigoSala, sala) {
    const codigo = normalizarCodigoSala(codigoSala);
    if (!ioInstance || !codigo) return;
    ioInstance.to(`room:${codigo}`).emit('room:updated', sala);
}

/**
 * Notifica la eliminación de una sala vacía a los sockets suscritos.
 */
function emitirSalaEliminada(codigoSala) {
    const codigo = normalizarCodigoSala(codigoSala);
    if (!ioInstance || !codigo) return;
    ioInstance.to(`room:${codigo}`).emit('room:deleted', { codigo });
}

/**
 * Envía a cada jugador de la partida su vista segura individual en su canal privado.
 */
function emitirEstadoPartidaPorJugador(partida, meta = {}) {
    if (!ioInstance || !Array.isArray(partida?.jugadores)) return;

    for (const jugador of partida.jugadores) {
        const vistaJugador = gameLogic.obtenerVistaJugador(partida, jugador.userId);
        ioInstance.to(`user:${jugador.userId}`).emit('game:state', {
            ...meta,
            vistaJugador
        });
    }
}

/**
 * Emite únicamente al jugador activo las 3 próximas cartas vistas con SEE_FUTURE.
 */
function emitirCartasFuturoPrivadas(userId, codigoSala, cartasFuturo) {
    if (!ioInstance || !userId) return;
    ioInstance.to(`user:${userId}`).emit('game:future_cards', {
        codigoSala: normalizarCodigoSala(codigoSala),
        cartasFuturo
    });
}

/**
 * Notifica a la sala la apertura o actualización de la ventana de reacción de ¡Alto ahí!.
 */
function emitirVentanaNope(codigoSala, accionPendiente) {
    const codigo = normalizarCodigoSala(codigoSala);
    if (!ioInstance || !codigo) return;
    ioInstance.to(`room:${codigo}`).emit('game:nope_window', {
        codigoSala: codigo,
        accionPendiente
    });
}

/**
 * Programa (o reinicia) el temporizador de resolución automática de la ventana de ¡Alto ahí!.
 */
function programarResolucionNope(codigoSala, duracionMs = gameLogic.DURACION_VENTANA_NOPE_MS) {
    const codigo = normalizarCodigoSala(codigoSala);
    if (!codigo) return;

    cancelarTemporizadorNope(codigo);
    const espera = Number.isFinite(duracionMs) && duracionMs > 0
        ? duracionMs
        : gameLogic.DURACION_VENTANA_NOPE_MS;

    const timer = setTimeout(async () => {
        temporizadoresNope.delete(codigo);
        try {
            const resultado = await gameLogic.resolverAccionPendiente({
                codigoSala: codigo,
                forzar: true
            });

            if (resultado.evento === 'VISION_FUTURO') {
                emitirCartasFuturoPrivadas(
                    resultado.autorUserId,
                    resultado.partida.codigoSala,
                    resultado.cartasFuturo
                );
            }

            emitirEstadoPartidaPorJugador(resultado.partida, {
                evento: resultado.evento,
                tipoCarta: resultado.tipoCarta,
                actorUserId: resultado.autorUserId
            });
        } catch (err) {
            logger.registrarError('NOPE_RESOLUCION_ERROR', err, { codigoSala: codigo });
        }
    }, espera);

    if (typeof timer.unref === 'function') {
        timer.unref();
    }
    temporizadoresNope.set(codigo, timer);
}

/**
 * Registra los middlewares y listeners de eventos en la instancia de Socket.IO.
 */
function configurarSocketIO(io) {
    ioInstance = io;
    io.use(autenticarSocketMiddleware);

    io.on('connection', (socket) => {
        const userId = String(socket.user.id);
        socket.join(`user:${userId}`);
        socket.join('lobby');
        logger.registrarEvento('SOCKET_CONECTADO', { userId });

        socket.on('room:subscribe', async (payload = {}, ack) => {
            try {
                const codigoNorm = normalizarCodigoSala(payload?.codigo);
                if (!codigoNorm) {
                    throw new Error('El código de la sala es obligatorio');
                }

                socket.join(`room:${codigoNorm}`);
                const sala = await roomLogic.obtenerSala(codigoNorm);

                if (sala.estado === 'IN_PROGRESS') {
                    try {
                        const vistaJugador = await gameLogic.obtenerPartidaVistaJugador({
                            codigoSala: codigoNorm,
                            userId
                        });
                        socket.emit('game:state', { evento: 'SYNC', vistaJugador });
                    } catch (err) {
                        // La partida aún puede no estar creada en transiciones rápidas
                    }
                }

                ack?.({ ok: true, sala });
            } catch (err) {
                ack?.({ ok: false, error: err.message });
            }
        });

        socket.on('room:unsubscribe', (payload = {}, ack) => {
            const codigoNorm = normalizarCodigoSala(payload?.codigo);
            if (codigoNorm) {
                socket.leave(`room:${codigoNorm}`);
            }
            ack?.({ ok: true });
        });

        socket.on('game:play_card', async (payload = {}, ack) => {
            try {
                const resultado = await gameLogic.jugarCarta({
                    codigoSala: payload?.codigoSala,
                    userId,
                    tipoCarta: payload?.tipoCarta,
                    objetivoUserId: payload?.objetivoUserId
                });

                if (resultado.evento === 'VENTANA_NOPE_ABIERTA') {
                    emitirVentanaNope(resultado.partida.codigoSala, resultado.accionPendiente);
                    programarResolucionNope(resultado.partida.codigoSala);
                } else if (resultado.evento === 'VISION_FUTURO') {
                    emitirCartasFuturoPrivadas(userId, resultado.partida.codigoSala, resultado.cartasFuturo);
                }

                emitirEstadoPartidaPorJugador(resultado.partida, {
                    evento: resultado.evento,
                    tipoCarta: resultado.tipoCarta,
                    actorUserId: userId
                });

                ack?.({
                    ok: true,
                    ...resultado,
                    vistaJugador: gameLogic.obtenerVistaJugador(resultado.partida, userId)
                });
            } catch (err) {
                ack?.({ ok: false, error: err.message });
            }
        });

        socket.on('game:nope', async (payload = {}, ack) => {
            try {
                const resultado = await gameLogic.jugarNope({
                    codigoSala: payload?.codigoSala,
                    userId
                });

                emitirVentanaNope(resultado.partida.codigoSala, resultado.accionPendiente);
                programarResolucionNope(resultado.partida.codigoSala);

                emitirEstadoPartidaPorJugador(resultado.partida, {
                    evento: resultado.evento,
                    canceladaActualmente: resultado.canceladaActualmente,
                    actorUserId: userId
                });

                ack?.({
                    ok: true,
                    ...resultado,
                    vistaJugador: gameLogic.obtenerVistaJugador(resultado.partida, userId)
                });
            } catch (err) {
                ack?.({ ok: false, error: err.message });
            }
        });

        socket.on('game:draw_card', async (payload = {}, ack) => {
            try {
                const resultado = await gameLogic.robarCarta({
                    codigoSala: payload?.codigoSala,
                    userId,
                    posicionBomba: payload?.posicionBomba
                });

                emitirEstadoPartidaPorJugador(resultado.partida, {
                    evento: resultado.evento,
                    actorUserId: userId
                });

                ack?.({
                    ok: true,
                    ...resultado,
                    vistaJugador: gameLogic.obtenerVistaJugador(resultado.partida, userId)
                });
            } catch (err) {
                ack?.({ ok: false, error: err.message });
            }
        });

        socket.on('game:insert_bomb', async (payload = {}, ack) => {
            try {
                const resultado = await gameLogic.reinsertarBomba({
                    codigoSala: payload?.codigoSala,
                    userId,
                    posicionBomba: payload?.posicionBomba
                });

                emitirEstadoPartidaPorJugador(resultado.partida, {
                    evento: resultado.evento,
                    actorUserId: userId
                });

                ack?.({
                    ok: true,
                    ...resultado,
                    vistaJugador: gameLogic.obtenerVistaJugador(resultado.partida, userId)
                });
            } catch (err) {
                ack?.({ ok: false, error: err.message });
            }
        });
    });
}

module.exports = {
    autenticarSocketMiddleware,
    configurarSocketIO,
    emitirActualizacionLobby,
    emitirActualizacionSala,
    emitirSalaEliminada,
    emitirEstadoPartidaPorJugador,
    emitirCartasFuturoPrivadas,
    emitirVentanaNope,
    programarResolucionNope,
    cancelarTemporizadorNope,
    limpiarTemporizadoresNope
};
