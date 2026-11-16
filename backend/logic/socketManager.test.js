const jwt = require('jsonwebtoken');
const socketManager = require('./socketManager');
const gameModel = require('../data/gameModel');

function crearMockIO() {
    const middlewares = [];
    const handlers = {};
    const emittedRooms = {};

    const to = (room) => ({
        emit: (event, data) => {
            if (!emittedRooms[room]) emittedRooms[room] = [];
            emittedRooms[room].push({ event, data });
        }
    });

    const io = {
        use: (fn) => middlewares.push(fn),
        on: (event, fn) => {
            handlers[event] = fn;
        },
        to,
        _middlewares: middlewares,
        _handlers: handlers,
        _emittedRooms: emittedRooms
    };

    return io;
}

function crearMockSocket(user) {
    const events = {};
    const joined = [];
    const left = [];
    const selfEmitted = [];

    return {
        user,
        handshake: { auth: {}, headers: {} },
        join: (room) => joined.push(room),
        leave: (room) => left.push(room),
        on: (event, fn) => {
            events[event] = fn;
        },
        emit: (event, data) => selfEmitted.push({ event, data }),
        _events: events,
        _joined: joined,
        _left: left,
        _selfEmitted: selfEmitted
    };
}

describe('Pruebas Unitarias de Tiempo Real (socketManager)', () => {
    const secretOriginal = process.env.JWT_SECRET;
    let consoleLogSpy;

    beforeAll(() => {
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-socket-test';
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    beforeEach(async () => {
        await gameModel.limpiarPartidas();
    });

    afterAll(async () => {
        await gameModel.limpiarPartidas();
        process.env.JWT_SECRET = secretOriginal;
        consoleLogSpy.mockRestore();
    });

    test('autenticarSocketMiddleware acepta un JWT válido en handshake.auth.token y adjunta socket.user', () => {
        const token = jwt.sign({ id: 'u1', username: 'michi1', rol: 'user' }, process.env.JWT_SECRET);
        const socket = { handshake: { auth: { token }, headers: {} } };
        const next = jest.fn();

        socketManager.autenticarSocketMiddleware(socket, next);

        expect(next).toHaveBeenCalledWith();
        expect(socket.user.id).toBe('u1');
        expect(socket.user.username).toBe('michi1');
    });

    test('autenticarSocketMiddleware acepta un JWT válido en cabecera Authorization Bearer', () => {
        const token = jwt.sign({ id: 'u2', username: 'michi2', rol: 'user' }, process.env.JWT_SECRET);
        const socket = { handshake: { auth: {}, headers: { authorization: `Bearer ${token}` } } };
        const next = jest.fn();

        socketManager.autenticarSocketMiddleware(socket, next);

        expect(next).toHaveBeenCalledWith();
        expect(socket.user.id).toBe('u2');
    });

    test('autenticarSocketMiddleware rechaza conexiones sin token o con token inválido', () => {
        const socketSinToken = { handshake: { auth: {}, headers: {} } };
        const nextSinToken = jest.fn();
        socketManager.autenticarSocketMiddleware(socketSinToken, nextSinToken);
        expect(nextSinToken.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(nextSinToken.mock.calls[0][0].message).toContain('Token no proporcionado');

        const socketInvalido = { handshake: { auth: { token: 'token.falso.123' }, headers: {} } };
        const nextInvalido = jest.fn();
        socketManager.autenticarSocketMiddleware(socketInvalido, nextInvalido);
        expect(nextInvalido.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(nextInvalido.mock.calls[0][0].message).toContain('Token inválido');
    });

    test('emitirEstadoPartidaPorJugador envía a cada usuario únicamente su vistaJugador segura', async () => {
        const io = crearMockIO();
        socketManager.configurarSocketIO(io);

        const partida = await gameModel.crearPartidaDatos({
            codigoSala: 'SOCK01',
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['SKIP', 'DEFUSE'], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['ATTACK', 'CAT_1'], vivo: true }
            ],
            mazo: ['BOMB', 'FAVOR'],
            descartes: [],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        socketManager.emitirEstadoPartidaPorJugador(partida, { evento: 'SYNC' });

        const eventoU1 = io._emittedRooms['user:u1'][0];
        const eventoU2 = io._emittedRooms['user:u2'][0];

        expect(eventoU1.event).toBe('game:state');
        expect(eventoU1.data.vistaJugador.miMano).toEqual(['SKIP', 'DEFUSE']);
        expect(eventoU1.data.vistaJugador.mazo).toBeUndefined();
        expect(eventoU1.data.vistaJugador.jugadores[1].mano).toBeUndefined();

        expect(eventoU2.event).toBe('game:state');
        expect(eventoU2.data.vistaJugador.miMano).toEqual(['ATTACK', 'CAT_1']);
        expect(eventoU2.data.vistaJugador.jugadores[0].mano).toBeUndefined();
    });

    test('Evento game:play_card con SEE_FUTURE emite game:future_cards en privado y game:state a todos', async () => {
        const io = crearMockIO();
        socketManager.configurarSocketIO(io);

        await gameModel.crearPartidaDatos({
            codigoSala: 'SOCK02',
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['SEE_FUTURE', 'DEFUSE'], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['DEFUSE'], vivo: true }
            ],
            mazo: ['BOMB', 'SKIP', 'FAVOR', 'CAT_1'],
            descartes: [],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        const socketU1 = crearMockSocket({ id: 'u1', username: 'p1' });
        io._handlers.connection(socketU1);
        expect(socketU1._joined).toContain('user:u1');

        const ack = jest.fn();
        await socketU1._events['game:play_card']({ codigoSala: 'SOCK02', tipoCarta: 'SEE_FUTURE' }, ack);

        expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: true, evento: 'VISION_FUTURO' }));

        const mensajesU1 = io._emittedRooms['user:u1'].map(m => m.event);
        const mensajesU2 = io._emittedRooms['user:u2'].map(m => m.event);

        expect(mensajesU1).toContain('game:future_cards');
        expect(mensajesU1).toContain('game:state');
        expect(mensajesU2).toEqual(['game:state']);
        expect(io._emittedRooms['user:u1'][0].data.cartasFuturo).toEqual(['BOMB', 'SKIP', 'FAVOR']);
    });

    test('Evento game:draw_card procesa el robo de carta, emite game:state y responde ok en ack', async () => {
        const io = crearMockIO();
        socketManager.configurarSocketIO(io);

        await gameModel.crearPartidaDatos({
            codigoSala: 'SOCK03',
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['DEFUSE'], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['DEFUSE'], vivo: true }
            ],
            mazo: ['SKIP', 'BOMB'],
            descartes: [],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        const socketU1 = crearMockSocket({ id: 'u1', username: 'p1' });
        io._handlers.connection(socketU1);

        const ack = jest.fn();
        await socketU1._events['game:draw_card']({ codigoSala: 'SOCK03' }, ack);

        expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: true, evento: 'CARTA_ROBADA' }));
        expect(io._emittedRooms['user:u1'][0].data.vistaJugador.miMano).toEqual(['DEFUSE', 'SKIP']);
        expect(io._emittedRooms['user:u2'][0].data.vistaJugador.turnoActualUserId).toBe('u2');
    });
});
