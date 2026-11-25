// backend/logic/gameLogic.js
const gameModel = require('../data/gameModel');
const roomModel = require('../data/roomModel');
const User = require('../data/userModel');
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
    NOPE: { nombre: '¡Alto ahí!', copiasBase: 5 },
    CAT_1: { nombre: 'Michi Cósmico', copiasBase: 4 },
    CAT_2: { nombre: 'Michi Ninja', copiasBase: 4 },
    CAT_3: { nombre: 'Michi Pirata', copiasBase: 4 },
    CAT_4: { nombre: 'Michi Zombie', copiasBase: 4 }
};

const CARTAS_BASE_REPARTO = ['SKIP', 'ATTACK', 'SEE_FUTURE', 'SHUFFLE', 'FAVOR', 'NOPE', 'CAT_1', 'CAT_2', 'CAT_3', 'CAT_4'];
const TIPOS_GATO = ['CAT_1', 'CAT_2', 'CAT_3', 'CAT_4'];
const CARTAS_INICIALES_POR_JUGADOR = 7;
const DURACION_VENTANA_NOPE_MS = 5000;

function crearErrorHttp(mensaje, statusCode = 400) {
    const error = new Error(mensaje);
    error.statusCode = statusCode;
    return error;
}

function validarEstadoYTirador(partida, userId) {
    if (!userId) {
        throw crearErrorHttp('El identificador del usuario es obligatorio', 400);
    }
    if (partida.estado === 'FINISHED') {
        throw crearErrorHttp('La partida ya ha finalizado', 400);
    }
    if (partida.estado === 'WAITING_DEFUSE_INSERT') {
        throw crearErrorHttp('Debes reinsertar el Michi Explosivo en el mazo antes de continuar', 400);
    }
    if (partida.estado === 'WAITING_NOPE_WINDOW') {
        throw crearErrorHttp('Hay una acción pendiente en ventana de ¡Alto ahí!; espera a que se resuelva', 400);
    }
    if (String(partida.turnoActualUserId) !== String(userId)) {
        throw crearErrorHttp('No es tu turno', 403);
    }
}

function consumirCartasMano(mano, descartes, tipoCarta, cantidad = 1) {
    for (let i = 0; i < cantidad; i += 1) {
        const idx = mano.indexOf(tipoCarta);
        if (idx === -1) {
            throw crearErrorHttp('No tienes suficientes copias de esa carta', 400);
        }
        mano.splice(idx, 1);
        descartes.push(tipoCarta);
    }
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
        accionPendiente: null,
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
    validarEstadoYTirador(partida, userId);
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

        await User.registrarResultadoPartidaUsuarios({
            jugadores,
            ganadorId: ganador.userId
        });

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

/**
 * Construye una vista segura de la partida para un jugador concreto,
 * ocultando el mazo completo y las cartas en mano de los rivales.
 */
function obtenerVistaJugador(partida, userId) {
    const mazo = Array.isArray(partida.mazo) ? partida.mazo : [];
    const bombasRestantes = mazo.filter(c => c === 'BOMB').length;
    const riesgoBombaPorcentaje = mazo.length === 0 ? 0 : Math.round((bombasRestantes / mazo.length) * 100);
    const solicitante = partida.jugadores.find(j => String(j.userId) === String(userId));
    const descartes = [...(partida.descartes || [])];
    const accionRaw = partida.accionPendiente;
    const nopes = Array.isArray(accionRaw?.nopes) ? accionRaw.nopes : [];
    const accionPendiente = accionRaw
        ? {
            autorUserId: accionRaw.autorUserId,
            autorUsername: accionRaw.autorUsername,
            tipoCarta: accionRaw.tipoCarta,
            objetivoUserId: accionRaw.objetivoUserId || null,
            objetivoUsername: accionRaw.objetivoUsername || null,
            nopes: nopes.map(n => ({ userId: n.userId, username: n.username })),
            totalNopes: nopes.length,
            canceladaActualmente: nopes.length % 2 === 1,
            expiraEn: accionRaw.expiraEn ? new Date(accionRaw.expiraEn).toISOString() : null
        }
        : null;

    return {
        id: partida.id,
        codigoSala: partida.codigoSala,
        estado: partida.estado,
        cartasRestantesMazo: mazo.length,
        riesgoBombaPorcentaje,
        descartes,
        ultimaCartaDescartada: descartes[descartes.length - 1] || null,
        turnoActualIndex: partida.turnoActualIndex,
        turnoActualUserId: partida.turnoActualUserId,
        turnosPendientes: partida.turnosPendientes,
        jugadorDesactivando: partida.jugadorDesactivando,
        accionPendiente,
        ganadorId: partida.ganadorId,
        ganadorUsername: partida.ganadorUsername,
        historialAcciones: [...(partida.historialAcciones || [])],
        miMano: solicitante ? [...solicitante.mano] : [],
        jugadores: partida.jugadores.map(j => ({
            userId: j.userId,
            username: j.username,
            vivo: j.vivo,
            numCartas: j.mano.length
        }))
    };
}

/**
 * Obtiene una partida existente filtrada como vista segura para el jugador solicitante.
 */
async function obtenerPartidaVistaJugador({ codigoSala, userId }) {
    const partida = await obtenerPartida(codigoSala);
    return obtenerVistaJugador(partida, userId);
}

/**
 * Ejecuta el efecto real de una carta pendiente una vez vencida la ventana de NOPE
 * con un número par de cancelaciones (0, 2, 4...).
 */
async function aplicarEfectoAccion(partida, accion, rng = Math.random) {
    const jugadores = partida.jugadores.map(j => ({ ...j, mano: [...j.mano] }));
    const jugadorActual = jugadores[partida.turnoActualIndex];
    const historialAcciones = [...(partida.historialAcciones || [])];
    const tipo = accion.tipoCarta;

    if (tipo === 'SKIP') {
        const siguienteTurno = avanzarTurno(jugadores, partida.turnoActualIndex, partida.turnosPendientes);
        historialAcciones.push(`${jugadorActual.username} completó Salto Gatuno y terminó su turno sin robar.`);

        const actualizada = await gameModel.actualizarPartidaDatos(partida.codigoSala, {
            estado: 'PLAYING',
            accionPendiente: null,
            jugadores,
            ...siguienteTurno,
            historialAcciones
        });
        logger.registrarEvento('CARTA_JUGADA', { codigoSala: partida.codigoSala, userId: String(accion.autorUserId), tipoCarta: tipo });
        return { evento: 'CARTA_JUGADA', tipoCarta: 'SKIP', autorUserId: String(accion.autorUserId), partida: actualizada };
    }

    if (tipo === 'ATTACK') {
        const sig = avanzarTurno(jugadores, partida.turnoActualIndex, 1);
        const siguienteTurno = { ...sig, turnosPendientes: 2 };
        historialAcciones.push(
            `${jugadorActual.username} aplicó Emboscada Felina contra ${jugadores[sig.turnoActualIndex].username} (2 turnos).`
        );

        const actualizada = await gameModel.actualizarPartidaDatos(partida.codigoSala, {
            estado: 'PLAYING',
            accionPendiente: null,
            jugadores,
            ...siguienteTurno,
            historialAcciones
        });
        logger.registrarEvento('CARTA_JUGADA', { codigoSala: partida.codigoSala, userId: String(accion.autorUserId), tipoCarta: tipo });
        return { evento: 'CARTA_JUGADA', tipoCarta: 'ATTACK', autorUserId: String(accion.autorUserId), partida: actualizada };
    }

    if (tipo === 'SEE_FUTURE') {
        const cartasFuturo = partida.mazo.slice(0, 3);
        historialAcciones.push(`${jugadorActual.username} resolvió Visión Felina para espiar el mazo.`);

        const actualizada = await gameModel.actualizarPartidaDatos(partida.codigoSala, {
            estado: 'PLAYING',
            accionPendiente: null,
            jugadores,
            historialAcciones
        });
        logger.registrarEvento('CARTA_JUGADA', { codigoSala: partida.codigoSala, userId: String(accion.autorUserId), tipoCarta: tipo });
        return {
            evento: 'VISION_FUTURO',
            tipoCarta: 'SEE_FUTURE',
            autorUserId: String(accion.autorUserId),
            cartasFuturo,
            partida: actualizada
        };
    }

    if (tipo === 'SHUFFLE') {
        const nuevoMazo = barajarArray(partida.mazo, rng);
        historialAcciones.push(`${jugadorActual.username} aplicó Terremoto en el Arenero y barajó el mazo.`);

        const actualizada = await gameModel.actualizarPartidaDatos(partida.codigoSala, {
            estado: 'PLAYING',
            accionPendiente: null,
            jugadores,
            mazo: nuevoMazo,
            historialAcciones
        });
        logger.registrarEvento('CARTA_JUGADA', { codigoSala: partida.codigoSala, userId: String(accion.autorUserId), tipoCarta: tipo });
        return { evento: 'MAZO_BARAJADO', tipoCarta: 'SHUFFLE', autorUserId: String(accion.autorUserId), partida: actualizada };
    }

    // FAVOR o pareja de Michis (CAT_1..4)
    const objetivo = jugadores.find(j => String(j.userId) === String(accion.objetivoUserId));
    let cartaRobadaRival = null;

    if (objetivo && objetivo.vivo && objetivo.mano.length > 0) {
        const idxRobado = Math.floor(rng() * objetivo.mano.length);
        [cartaRobadaRival] = objetivo.mano.splice(idxRobado, 1);
        jugadorActual.mano.push(cartaRobadaRival);
        historialAcciones.push(
            `${jugadorActual.username} robó una carta a ${objetivo.username} con ${CATALOGO_CARTAS[tipo].nombre}.`
        );
    } else {
        historialAcciones.push(
            `${jugadorActual.username} intentó robar a ${accion.objetivoUsername || 'un rival'}, pero ya no tenía cartas.`
        );
    }

    const actualizada = await gameModel.actualizarPartidaDatos(partida.codigoSala, {
        estado: 'PLAYING',
        accionPendiente: null,
        jugadores,
        historialAcciones
    });
    logger.registrarEvento('CARTA_JUGADA', {
        codigoSala: partida.codigoSala,
        userId: String(accion.autorUserId),
        tipoCarta: tipo,
        objetivoUserId: String(accion.objetivoUserId)
    });

    return {
        evento: 'CARTA_ROBADA_RIVAL',
        tipoCarta: tipo,
        autorUserId: String(accion.autorUserId),
        objetivoUserId: String(accion.objetivoUserId),
        cartaRobadaRival,
        partida: actualizada
    };
}

/**
 * Inicia una carta de acción o pareja de Michis abriendo siempre una ventana de ¡Alto ahí! (5 s).
 */
async function jugarCarta({
    codigoSala,
    userId,
    tipoCarta,
    objetivoUserId = null,
    duracionVentanaMs = DURACION_VENTANA_NOPE_MS
}) {
    if (!userId) {
        throw crearErrorHttp('El identificador del usuario es obligatorio', 400);
    }
    if (typeof tipoCarta !== 'string' || tipoCarta.trim() === '') {
        throw crearErrorHttp('El tipo de carta es obligatorio', 400);
    }

    const partida = await obtenerPartida(codigoSala);
    validarEstadoYTirador(partida, userId);

    const tipo = tipoCarta.trim().toUpperCase();
    if (tipo === 'NOPE') {
        throw crearErrorHttp('La carta ¡Alto ahí! solo puede jugarse durante una ventana de reacción activa', 400);
    }
    if (!CATALOGO_CARTAS[tipo] || tipo === 'BOMB' || tipo === 'DEFUSE') {
        throw crearErrorHttp('Esta carta no se puede jugar manualmente en tu turno', 400);
    }

    const jugadores = partida.jugadores.map(j => ({ ...j, mano: [...j.mano] }));
    const jugadorActual = jugadores[partida.turnoActualIndex];
    const descartes = [...(partida.descartes || [])];
    const historialAcciones = [...(partida.historialAcciones || [])];

    const esParejaGato = TIPOS_GATO.includes(tipo);
    if (esParejaGato) {
        const copias = jugadorActual.mano.filter(c => c === tipo).length;
        if (copias < 2) {
            throw crearErrorHttp('Necesitas una pareja de cartas iguales de Michi para jugarlas', 400);
        }
    } else if (!jugadorActual.mano.includes(tipo)) {
        throw crearErrorHttp('No tienes esa carta en tu mano', 400);
    }

    let objetivo = null;
    if (tipo === 'FAVOR' || esParejaGato) {
        if (!objetivoUserId || String(objetivoUserId) === String(userId)) {
            throw crearErrorHttp('Debes elegir a otro jugador como objetivo', 400);
        }

        objetivo = jugadores.find(j => String(j.userId) === String(objetivoUserId));
        if (!objetivo || !objetivo.vivo) {
            throw crearErrorHttp('El jugador objetivo no es válido o está eliminado', 400);
        }
        if (objetivo.mano.length === 0) {
            throw crearErrorHttp('El jugador objetivo no tiene cartas en su mano', 400);
        }
    }

    const cantidadConsumo = esParejaGato ? 2 : 1;
    consumirCartasMano(jugadorActual.mano, descartes, tipo, cantidadConsumo);

    const accionPendiente = {
        autorUserId: String(userId),
        autorUsername: jugadorActual.username,
        tipoCarta: tipo,
        objetivoUserId: objetivo ? String(objetivo.userId) : null,
        objetivoUsername: objetivo ? objetivo.username : null,
        nopes: [],
        expiraEn: new Date(Date.now() + duracionVentanaMs).toISOString()
    };

    const sufijoObjetivo = objetivo ? ` sobre ${objetivo.username}` : '';
    historialAcciones.push(
        `${jugadorActual.username} jugó ${CATALOGO_CARTAS[tipo].nombre}${sufijoObjetivo} (ventana de ¡Alto ahí! abierta).`
    );

    const actualizada = await gameModel.actualizarPartidaDatos(partida.codigoSala, {
        estado: 'WAITING_NOPE_WINDOW',
        jugadores,
        descartes,
        accionPendiente,
        historialAcciones
    });

    logger.registrarEvento('VENTANA_NOPE_ABIERTA', {
        codigoSala: partida.codigoSala,
        userId: String(userId),
        tipoCarta: tipo
    });

    return {
        evento: 'VENTANA_NOPE_ABIERTA',
        tipoCarta: tipo,
        autorUserId: String(userId),
        accionPendiente: actualizada.accionPendiente,
        partida: actualizada
    };
}

/**
 * Permite a cualquier jugador vivo con carta NOPE cancelar o reactivar (¡Yup!)
 * la acción que se encuentra actualmente en ventana de reacción, reiniciando el contador.
 */
async function jugarNope({ codigoSala, userId, duracionVentanaMs = DURACION_VENTANA_NOPE_MS }) {
    if (!userId) {
        throw crearErrorHttp('El identificador del usuario es obligatorio', 400);
    }

    const partida = await obtenerPartida(codigoSala);
    if (partida.estado !== 'WAITING_NOPE_WINDOW' || !partida.accionPendiente) {
        throw crearErrorHttp('No hay ninguna acción activa que se pueda cancelar con ¡Alto ahí!', 400);
    }

    const jugadores = partida.jugadores.map(j => ({ ...j, mano: [...j.mano] }));
    const jugador = jugadores.find(j => String(j.userId) === String(userId));
    if (!jugador || !jugador.vivo) {
        throw crearErrorHttp('Solo un jugador vivo de la partida puede jugar ¡Alto ahí!', 403);
    }

    if (!jugador.mano.includes('NOPE')) {
        throw crearErrorHttp('No tienes ninguna carta ¡Alto ahí! en tu mano', 400);
    }

    const descartes = [...(partida.descartes || [])];
    consumirCartasMano(jugador.mano, descartes, 'NOPE', 1);

    const nopesActuales = Array.isArray(partida.accionPendiente.nopes)
        ? partida.accionPendiente.nopes.map(n => ({ userId: String(n.userId), username: String(n.username) }))
        : [];
    nopesActuales.push({ userId: String(userId), username: jugador.username });

    const canceladaActualmente = nopesActuales.length % 2 === 1;
    const nuevaAccionPendiente = {
        ...partida.accionPendiente,
        nopes: nopesActuales,
        expiraEn: new Date(Date.now() + duracionVentanaMs).toISOString()
    };

    const historialAcciones = [
        ...(partida.historialAcciones || []),
        canceladaActualmente
            ? `${jugador.username} lanzó ¡Alto ahí! (acción cancelada provisionalmente).`
            : `${jugador.username} respondió con contra-¡Alto ahí! (¡YUP! La acción vuelve a activarse).`
    ];

    const actualizada = await gameModel.actualizarPartidaDatos(partida.codigoSala, {
        jugadores,
        descartes,
        accionPendiente: nuevaAccionPendiente,
        historialAcciones
    });

    logger.registrarEvento('NOPE_JUGADO', {
        codigoSala: partida.codigoSala,
        userId: String(userId),
        totalNopes: nopesActuales.length,
        canceladaActualmente
    });

    return {
        evento: 'NOPE_JUGADO',
        canceladaActualmente,
        totalNopes: nopesActuales.length,
        accionPendiente: actualizada.accionPendiente,
        partida: actualizada
    };
}

/**
 * Resuelve la acción pendiente al expirar la ventana de ¡Alto ahí! (impar = cancelada, par = ejecutada).
 */
async function resolverAccionPendiente({ codigoSala, forzar = false, rng = Math.random }) {
    const partida = await obtenerPartida(codigoSala);
    if (partida.estado !== 'WAITING_NOPE_WINDOW' || !partida.accionPendiente) {
        throw crearErrorHttp('No hay ninguna acción pendiente por resolver', 400);
    }

    const accion = partida.accionPendiente;
    if (!forzar && accion.expiraEn && Date.now() < new Date(accion.expiraEn).getTime()) {
        throw crearErrorHttp('La ventana de ¡Alto ahí! aún no ha expirado', 400);
    }

    const totalNopes = Array.isArray(accion.nopes) ? accion.nopes.length : 0;
    if (totalNopes % 2 === 1) {
        const nombreCarta = CATALOGO_CARTAS[accion.tipoCarta]?.nombre || accion.tipoCarta;
        const historialAcciones = [
            ...(partida.historialAcciones || []),
            `${nombreCarta} de ${accion.autorUsername} quedó cancelada por ¡Alto ahí!.`
        ];

        const actualizada = await gameModel.actualizarPartidaDatos(partida.codigoSala, {
            estado: 'PLAYING',
            accionPendiente: null,
            historialAcciones
        });

        logger.registrarEvento('ACCION_CANCELADA_POR_NOPE', {
            codigoSala: partida.codigoSala,
            tipoCarta: accion.tipoCarta,
            totalNopes
        });

        return {
            evento: 'ACCION_CANCELADA_POR_NOPE',
            tipoCarta: accion.tipoCarta,
            autorUserId: String(accion.autorUserId),
            totalNopes,
            partida: actualizada
        };
    }

    return await aplicarEfectoAccion(partida, accion, rng);
}

/**
 * Recupera la sesión de juego activa de un usuario (partida en curso o sala en espera)
 * para restaurar su estado tras recargar el navegador.
 */
async function obtenerSesionJuegoActiva(userId) {
    if (!userId) {
        throw crearErrorHttp('El identificador del usuario es obligatorio', 400);
    }

    const partida = await gameModel.buscarPartidaActivaPorJugador(userId);
    if (partida) {
        const sala = await roomModel.buscarPorCodigo(partida.codigoSala);
        return {
            enCurso: true,
            tipo: 'PARTIDA',
            codigoSala: partida.codigoSala,
            sala,
            vistaJugador: obtenerVistaJugador(partida, userId)
        };
    }

    const sala = await roomModel.buscarSalaActivaPorJugador(userId);
    if (sala && sala.estado === 'WAITING') {
        return {
            enCurso: true,
            tipo: 'SALA',
            codigoSala: sala.codigo,
            sala,
            vistaJugador: null
        };
    }

    return {
        enCurso: false,
        tipo: null,
        codigoSala: null,
        sala: null,
        vistaJugador: null
    };
}

module.exports = {
    CATALOGO_CARTAS,
    TIPOS_GATO,
    DURACION_VENTANA_NOPE_MS,
    barajarArray,
    construirMazoInicial,
    iniciarPartidaDirecta,
    iniciarPartidaDesdeSala,
    obtenerPartida,
    obtenerVistaJugador,
    obtenerPartidaVistaJugador,
    obtenerSesionJuegoActiva,
    avanzarTurno,
    robarCarta,
    reinsertarBomba,
    jugarCarta,
    jugarNope,
    resolverAccionPendiente
};
