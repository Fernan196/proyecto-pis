const net = require('net');
const mongoose = require('mongoose');
const gameLogic = require('./gameLogic');
const gameModel = require('../data/gameModel');
const roomLogic = require('./roomLogic');
const roomModel = require('../data/roomModel');

function puertoMongoDisponible(host = '127.0.0.1', port = 27017) {
    return new Promise((resolve) => {
        const socket = net.connect(port, host);
        socket.setTimeout(500);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.on('error', () => {
            resolve(false);
        });
    });
}

describe('Pruebas Unitarias de la Capa Lógica - Motor de Juego (gameLogic)', () => {
    let conectadaPorTest = false;
    let consoleLogSpy;

    beforeAll(async () => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/proyecto_pis_test';

        if (mongoose.connection.readyState === 0 && await puertoMongoDisponible()) {
            await mongoose.connect(uri);
            conectadaPorTest = true;
        }
    });

    beforeEach(async () => {
        await gameModel.limpiarPartidas();
        await roomModel.limpiarSalas();
    });

    afterAll(async () => {
        await gameModel.limpiarPartidas();
        await roomModel.limpiarSalas();
        if (conectadaPorTest && mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
        consoleLogSpy.mockRestore();
    });

    test('Reparto inicial para 2, 3 y 4 jugadores: 8 cartas con DEFUSE y N-1 bombas en mazo', async () => {
        for (const n of [2, 3, 4]) {
            const jugadores = Array.from({ length: n }, (_, i) => ({
                userId: `u${i + 1}`,
                username: `jugador${i + 1}`
            }));

            const { manosJugadores, mazo } = gameLogic.construirMazoInicial(jugadores);
            expect(manosJugadores).toHaveLength(n);

            for (const mano of manosJugadores) {
                expect(mano).toHaveLength(8);
                expect(mano).toContain('DEFUSE');
                expect(mano).not.toContain('BOMB');
            }

            const bombasEnMazo = mazo.filter(c => c === 'BOMB').length;
            const defusesEnMazo = mazo.filter(c => c === 'DEFUSE').length;
            expect(bombasEnMazo).toBe(n - 1);
            expect(defusesEnMazo).toBe(2);
        }

        const sala = await roomLogic.crearSala({
            hostId: 'u1',
            hostUsername: 'host',
            nombre: 'Sala Inicio',
            maxJugadores: 4
        });
        await roomLogic.unirseASala({ codigo: sala.codigo, userId: 'u2', username: 'p2' });
        const inicio = await gameLogic.iniciarPartidaDesdeSala({
            codigoSala: sala.codigo,
            solicitanteId: 'u1'
        });

        expect(inicio.estado).toBe('IN_PROGRESS');
        expect(inicio.partidaId).toBe(inicio.partida.id);
        expect(inicio.partida.jugadores).toHaveLength(2);
    });

    test('Error: No permite construir mazo ni iniciar partida con menos de 2 o más de 4 jugadores', async () => {
        expect(() => gameLogic.construirMazoInicial([{ userId: 'u1', username: 'solo' }])).toThrow('entre 2 y 4');
        expect(() => gameLogic.construirMazoInicial([
            { userId: 'u1', username: 'p1' },
            { userId: 'u2', username: 'p2' },
            { userId: 'u3', username: 'p3' },
            { userId: 'u4', username: 'p4' },
            { userId: 'u5', username: 'p5' }
        ])).toThrow('entre 2 y 4');

        await expect(
            gameLogic.iniciarPartidaDirecta({
                codigoSala: 'SALA01',
                jugadores: [{ userId: 'u1', username: 'solo' }]
            })
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    test('Robo de carta normal: añade la carta a la mano y avanza el turno al siguiente jugador vivo', async () => {
        await gameModel.crearPartidaDatos({
            codigoSala: 'ROBO01',
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['DEFUSE'], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['DEFUSE'], vivo: true }
            ],
            mazo: ['SKIP', 'SEE_FUTURE', 'BOMB'],
            descartes: [],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        const res = await gameLogic.robarCarta({ codigoSala: 'ROBO01', userId: 'u1' });

        expect(res.evento).toBe('CARTA_ROBADA');
        expect(res.cartaRobada).toBe('SKIP');
        expect(res.partida.jugadores[0].mano).toEqual(['DEFUSE', 'SKIP']);
        expect(res.partida.mazo).toEqual(['SEE_FUTURE', 'BOMB']);
        expect(res.partida.turnoActualIndex).toBe(1);
        expect(res.partida.turnoActualUserId).toBe('u2');
    });

    test('Error: Rechaza el robo si no es el turno del jugador (error 403)', async () => {
        await gameModel.crearPartidaDatos({
            codigoSala: 'TURN01',
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

        await expect(
            gameLogic.robarCarta({ codigoSala: 'TURN01', userId: 'u2' })
        ).rejects.toMatchObject({
            message: 'No es tu turno',
            statusCode: 403
        });
    });

    test('Desactivación con DEFUSE pasando posicionBomba: consume DEFUSE, reinserta BOMB y avanza turno', async () => {
        await gameModel.crearPartidaDatos({
            codigoSala: 'DEFU01',
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['DEFUSE', 'CAT_1'], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['DEFUSE'], vivo: true }
            ],
            mazo: ['BOMB', 'SKIP', 'SHUFFLE'],
            descartes: [],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        const res = await gameLogic.robarCarta({
            codigoSala: 'DEFU01',
            userId: 'u1',
            posicionBomba: 1
        });

        expect(res.evento).toBe('BOMBA_DESACTIVADA');
        expect(res.requierePosicionBomba).toBe(false);
        expect(res.partida.estado).toBe('PLAYING');
        expect(res.partida.jugadores[0].vivo).toBe(true);
        expect(res.partida.jugadores[0].mano).toEqual(['CAT_1']);
        expect(res.partida.descartes).toEqual(['DEFUSE']);
        expect(res.partida.mazo).toEqual(['SKIP', 'BOMB', 'SHUFFLE']);
        expect(res.partida.turnoActualUserId).toBe('u2');
    });

    test('Desactivación en dos pasos (WAITING_DEFUSE_INSERT): bloquea otros robos hasta reinsertarBomba', async () => {
        await gameModel.crearPartidaDatos({
            codigoSala: 'DEFU02',
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['DEFUSE'], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['DEFUSE'], vivo: true }
            ],
            mazo: ['BOMB', 'SKIP', 'FAVOR'],
            descartes: [],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        const paso1 = await gameLogic.robarCarta({ codigoSala: 'DEFU02', userId: 'u1' });
        expect(paso1.evento).toBe('BOMBA_DESACTIVADA_PENDIENTE_POSICION');
        expect(paso1.requierePosicionBomba).toBe(true);
        expect(paso1.partida.estado).toBe('WAITING_DEFUSE_INSERT');
        expect(paso1.partida.jugadorDesactivando).toBe('u1');

        await expect(
            gameLogic.robarCarta({ codigoSala: 'DEFU02', userId: 'u1' })
        ).rejects.toMatchObject({ statusCode: 400 });

        await expect(
            gameLogic.reinsertarBomba({ codigoSala: 'DEFU02', userId: 'u2', posicionBomba: 0 })
        ).rejects.toMatchObject({ statusCode: 403 });

        const paso2 = await gameLogic.reinsertarBomba({
            codigoSala: 'DEFU02',
            userId: 'u1',
            posicionBomba: 2
        });

        expect(paso2.evento).toBe('BOMBA_DESACTIVADA');
        expect(paso2.partida.estado).toBe('PLAYING');
        expect(paso2.partida.jugadorDesactivando).toBeNull();
        expect(paso2.partida.mazo).toEqual(['SKIP', 'FAVOR', 'BOMB']);
        expect(paso2.partida.turnoActualUserId).toBe('u2');
    });

    test('Error: Rechaza posicionBomba fuera de rango en reinsertarBomba (error 400)', async () => {
        await gameModel.crearPartidaDatos({
            codigoSala: 'DEFU03',
            estado: 'WAITING_DEFUSE_INSERT',
            jugadorDesactivando: 'u1',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: [], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['DEFUSE'], vivo: true }
            ],
            mazo: ['SKIP', 'FAVOR'],
            descartes: ['DEFUSE'],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        await expect(
            gameLogic.reinsertarBomba({ codigoSala: 'DEFU03', userId: 'u1', posicionBomba: -1 })
        ).rejects.toMatchObject({
            message: 'Posición del mazo no válida',
            statusCode: 400
        });

        await expect(
            gameLogic.reinsertarBomba({ codigoSala: 'DEFU03', userId: 'u1', posicionBomba: 3 })
        ).rejects.toMatchObject({
            message: 'Posición del mazo no válida',
            statusCode: 400
        });
    });

    test('Eliminación de jugador sin DEFUSE en partida de 3: descarta su mano y avanza al siguiente vivo', async () => {
        await gameModel.crearPartidaDatos({
            codigoSala: 'ELIM01',
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['CAT_1', 'SKIP'], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['DEFUSE'], vivo: true },
                { userId: 'u3', username: 'p3', mano: ['DEFUSE'], vivo: true }
            ],
            mazo: ['BOMB', 'BOMB', 'FAVOR'],
            descartes: [],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        const res = await gameLogic.robarCarta({ codigoSala: 'ELIM01', userId: 'u1' });

        expect(res.evento).toBe('JUGADOR_ELIMINADO');
        expect(res.partida.estado).toBe('PLAYING');
        expect(res.partida.jugadores[0].vivo).toBe(false);
        expect(res.partida.jugadores[0].mano).toEqual([]);
        expect(res.partida.descartes).toEqual(['CAT_1', 'SKIP', 'BOMB']);
        expect(res.partida.turnoActualIndex).toBe(1);
        expect(res.partida.turnoActualUserId).toBe('u2');
    });

    test('Victoria automática cuando solo queda 1 jugador vivo tras explotar su último rival', async () => {
        const sala = await roomLogic.crearSala({
            hostId: 'u1',
            hostUsername: 'p1',
            nombre: 'Final',
            maxJugadores: 2
        });
        await roomLogic.unirseASala({ codigo: sala.codigo, userId: 'u2', username: 'p2' });
        await roomLogic.marcarSalaEnCurso({ codigo: sala.codigo, solicitanteId: 'u1' });

        await gameModel.crearPartidaDatos({
            codigoSala: sala.codigo,
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['CAT_2'], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['DEFUSE'], vivo: true }
            ],
            mazo: ['BOMB', 'SKIP'],
            descartes: [],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        const res = await gameLogic.robarCarta({ codigoSala: sala.codigo, userId: 'u1' });

        expect(res.evento).toBe('JUGADOR_ELIMINADO');
        expect(res.partida.estado).toBe('FINISHED');
        expect(res.partida.ganadorId).toBe('u2');
        expect(res.partida.ganadorUsername).toBe('p2');

        const salaActualizada = await roomModel.buscarPorCodigo(sala.codigo);
        expect(salaActualizada.estado).toBe('FINISHED');
    });

    test('Error: No permite robar carta en una partida que ya está FINISHED (error 400)', async () => {
        await gameModel.crearPartidaDatos({
            codigoSala: 'FIN001',
            estado: 'FINISHED',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: [], vivo: false },
                { userId: 'u2', username: 'p2', mano: ['DEFUSE'], vivo: true }
            ],
            mazo: ['SKIP'],
            descartes: ['BOMB'],
            turnoActualIndex: 1,
            turnoActualUserId: 'u2',
            turnosPendientes: 1,
            ganadorId: 'u2',
            ganadorUsername: 'p2'
        });

        await expect(
            gameLogic.robarCarta({ codigoSala: 'FIN001', userId: 'u2' })
        ).rejects.toMatchObject({
            message: 'La partida ya ha finalizado',
            statusCode: 400
        });
    });
});
