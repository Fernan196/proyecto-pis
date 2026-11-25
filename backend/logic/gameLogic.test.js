const net = require('net');
const mongoose = require('mongoose');
const gameLogic = require('./gameLogic');
const gameModel = require('../data/gameModel');
const roomLogic = require('./roomLogic');
const roomModel = require('../data/roomModel');
const User = require('../data/userModel');
const { createUserLogic } = require('./userLogic');
const logger = require('./logger');

const userLogic = createUserLogic({
    userRepo: User,
    mailer: { enviarCorreoConfirmacion: jest.fn().mockResolvedValue(true) },
    logger
});

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
        User.limpiarEstadisticasMemoria();
    });

    afterAll(async () => {
        await gameModel.limpiarPartidas();
        await roomModel.limpiarSalas();
        User.limpiarEstadisticasMemoria();
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
            const nopesTotales = [...manosJugadores.flat(), ...mazo].filter(c => c === 'NOPE').length;
            expect(bombasEnMazo).toBe(n - 1);
            expect(defusesEnMazo).toBe(2);
            expect(nopesTotales).toBe(5);
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

    test('SKIP termina el turno sin robar y si estaba bajo ATTACK solo descuenta 1 turno', async () => {
        await gameModel.crearPartidaDatos({
            codigoSala: 'SKIP01',
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['SKIP', 'DEFUSE'], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['SKIP', 'CAT_1'], vivo: true }
            ],
            mazo: ['SHUFFLE', 'BOMB'],
            descartes: [],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 2
        });

        const ventana1 = await gameLogic.jugarCarta({
            codigoSala: 'SKIP01',
            userId: 'u1',
            tipoCarta: 'SKIP'
        });
        expect(ventana1.evento).toBe('VENTANA_NOPE_ABIERTA');

        const primerSalto = await gameLogic.resolverAccionPendiente({
            codigoSala: 'SKIP01',
            forzar: true
        });

        expect(primerSalto.evento).toBe('CARTA_JUGADA');
        expect(primerSalto.partida.turnoActualUserId).toBe('u1');
        expect(primerSalto.partida.turnosPendientes).toBe(1);
        expect(primerSalto.partida.mazo).toEqual(['SHUFFLE', 'BOMB']);

        await gameModel.actualizarPartidaDatos('SKIP01', {
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['SKIP', 'DEFUSE'], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['SKIP', 'CAT_1'], vivo: true }
            ]
        });

        await gameLogic.jugarCarta({
            codigoSala: 'SKIP01',
            userId: 'u1',
            tipoCarta: 'SKIP'
        });

        const segundoSalto = await gameLogic.resolverAccionPendiente({
            codigoSala: 'SKIP01',
            forzar: true
        });

        expect(segundoSalto.partida.turnoActualUserId).toBe('u2');
        expect(segundoSalto.partida.turnosPendientes).toBe(1);
    });

    test('ATTACK termina el turno sin robar y asigna 2 turnos pendientes al siguiente jugador vivo', async () => {
        await gameModel.crearPartidaDatos({
            codigoSala: 'ATTK01',
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['ATTACK', 'DEFUSE'], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['CAT_1'], vivo: false },
                { userId: 'u3', username: 'p3', mano: ['DEFUSE'], vivo: true }
            ],
            mazo: ['SKIP', 'SHUFFLE'],
            descartes: [],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        await gameLogic.jugarCarta({
            codigoSala: 'ATTK01',
            userId: 'u1',
            tipoCarta: 'ATTACK'
        });
        const res = await gameLogic.resolverAccionPendiente({
            codigoSala: 'ATTK01',
            forzar: true
        });

        expect(res.evento).toBe('CARTA_JUGADA');
        expect(res.partida.jugadores[0].mano).toEqual(['DEFUSE']);
        expect(res.partida.descartes).toEqual(['ATTACK']);
        expect(res.partida.turnoActualIndex).toBe(2);
        expect(res.partida.turnoActualUserId).toBe('u3');
        expect(res.partida.turnosPendientes).toBe(2);
        expect(res.partida.mazo).toEqual(['SKIP', 'SHUFFLE']);
    });

    test('SEE_FUTURE devuelve las 3 primeras cartas del mazo sin alterar el mazo ni cambiar turno', async () => {
        await gameModel.crearPartidaDatos({
            codigoSala: 'FUTU01',
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

        await gameLogic.jugarCarta({
            codigoSala: 'FUTU01',
            userId: 'u1',
            tipoCarta: 'SEE_FUTURE'
        });
        const res = await gameLogic.resolverAccionPendiente({
            codigoSala: 'FUTU01',
            forzar: true
        });

        expect(res.evento).toBe('VISION_FUTURO');
        expect(res.cartasFuturo).toEqual(['BOMB', 'SKIP', 'FAVOR']);
        expect(res.partida.mazo).toEqual(['BOMB', 'SKIP', 'FAVOR', 'CAT_1']);
        expect(res.partida.jugadores[0].mano).toEqual(['DEFUSE']);
        expect(res.partida.descartes).toEqual(['SEE_FUTURE']);
        expect(res.partida.turnoActualUserId).toBe('u1');
    });

    test('SHUFFLE consume la carta, baraja el mazo conservando todas sus cartas y mantiene el turno', async () => {
        const mazoOriginal = ['BOMB', 'SKIP', 'FAVOR', 'CAT_1'];
        await gameModel.crearPartidaDatos({
            codigoSala: 'SHUF01',
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['SHUFFLE', 'DEFUSE'], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['DEFUSE'], vivo: true }
            ],
            mazo: mazoOriginal,
            descartes: [],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        await gameLogic.jugarCarta({
            codigoSala: 'SHUF01',
            userId: 'u1',
            tipoCarta: 'SHUFFLE'
        });
        const res = await gameLogic.resolverAccionPendiente({
            codigoSala: 'SHUF01',
            forzar: true,
            rng: () => 0
        });

        expect(res.evento).toBe('MAZO_BARAJADO');
        expect(res.partida.jugadores[0].mano).toEqual(['DEFUSE']);
        expect(res.partida.descartes).toEqual(['SHUFFLE']);
        expect(res.partida.turnoActualUserId).toBe('u1');
        expect([...res.partida.mazo].sort()).toEqual([...mazoOriginal].sort());
        expect(res.partida.mazo).not.toEqual(mazoOriginal);
    });

    test('FAVOR roba 1 carta de la mano del rival objetivo y la añade a la mano del jugador en turno', async () => {
        await gameModel.crearPartidaDatos({
            codigoSala: 'FAVR01',
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['FAVOR'], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['SKIP', 'DEFUSE'], vivo: true }
            ],
            mazo: ['BOMB'],
            descartes: [],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        await gameLogic.jugarCarta({
            codigoSala: 'FAVR01',
            userId: 'u1',
            tipoCarta: 'FAVOR',
            objetivoUserId: 'u2'
        });
        const res = await gameLogic.resolverAccionPendiente({
            codigoSala: 'FAVR01',
            forzar: true,
            rng: () => 0
        });

        expect(res.evento).toBe('CARTA_ROBADA_RIVAL');
        expect(res.cartaRobadaRival).toBe('SKIP');
        expect(res.partida.jugadores[0].mano).toEqual(['SKIP']);
        expect(res.partida.jugadores[1].mano).toEqual(['DEFUSE']);
        expect(res.partida.descartes).toEqual(['FAVOR']);
        expect(res.partida.turnoActualUserId).toBe('u1');
    });

    test('Pareja de CAT_1 consume las 2 cartas iguales y roba 1 carta de la mano del rival objetivo', async () => {
        await gameModel.crearPartidaDatos({
            codigoSala: 'CATS01',
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['CAT_1', 'DEFUSE', 'CAT_1'], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['ATTACK'], vivo: true }
            ],
            mazo: ['BOMB'],
            descartes: [],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        await gameLogic.jugarCarta({
            codigoSala: 'CATS01',
            userId: 'u1',
            tipoCarta: 'CAT_1',
            objetivoUserId: 'u2'
        });
        const res = await gameLogic.resolverAccionPendiente({
            codigoSala: 'CATS01',
            forzar: true,
            rng: () => 0
        });

        expect(res.evento).toBe('CARTA_ROBADA_RIVAL');
        expect(res.cartaRobadaRival).toBe('ATTACK');
        expect(res.partida.jugadores[0].mano).toEqual(['DEFUSE', 'ATTACK']);
        expect(res.partida.jugadores[1].mano).toEqual([]);
        expect(res.partida.descartes).toEqual(['CAT_1', 'CAT_1']);
    });

    test('Error: No permite jugar una carta de gato (CAT_1) teniendo solo 1 copia en mano (error 400)', async () => {
        await gameModel.crearPartidaDatos({
            codigoSala: 'CATS02',
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['CAT_1', 'CAT_2'], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['DEFUSE'], vivo: true }
            ],
            mazo: ['BOMB'],
            descartes: [],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        await expect(
            gameLogic.jugarCarta({
                codigoSala: 'CATS02',
                userId: 'u1',
                tipoCarta: 'CAT_1',
                objetivoUserId: 'u2'
            })
        ).rejects.toMatchObject({
            message: 'Necesitas una pareja de cartas iguales de Michi para jugarlas',
            statusCode: 400
        });
    });

    test('Error: Rechaza jugar carta que no posee, fuera de turno, o BOMB/DEFUSE manualmente', async () => {
        await gameModel.crearPartidaDatos({
            codigoSala: 'ERRJ01',
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['DEFUSE'], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['SKIP'], vivo: true }
            ],
            mazo: ['BOMB'],
            descartes: [],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        await expect(
            gameLogic.jugarCarta({ codigoSala: 'ERRJ01', userId: 'u2', tipoCarta: 'SKIP' })
        ).rejects.toMatchObject({ statusCode: 403 });

        await expect(
            gameLogic.jugarCarta({ codigoSala: 'ERRJ01', userId: 'u1', tipoCarta: 'SKIP' })
        ).rejects.toMatchObject({ message: 'No tienes esa carta en tu mano', statusCode: 400 });

        await expect(
            gameLogic.jugarCarta({ codigoSala: 'ERRJ01', userId: 'u1', tipoCarta: 'DEFUSE' })
        ).rejects.toMatchObject({ statusCode: 400 });

        await expect(
            gameLogic.jugarCarta({ codigoSala: 'ERRJ01', userId: 'u1', tipoCarta: 'BOMB' })
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    test('Error: Rechaza FAVOR o pareja contra uno mismo, rival eliminado o rival sin cartas (error 400)', async () => {
        await gameModel.crearPartidaDatos({
            codigoSala: 'ERROBJ',
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['FAVOR', 'CAT_1', 'CAT_1'], vivo: true },
                { userId: 'u2', username: 'p2', mano: [], vivo: false },
                { userId: 'u3', username: 'p3', mano: [], vivo: true }
            ],
            mazo: ['BOMB'],
            descartes: [],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        await expect(
            gameLogic.jugarCarta({ codigoSala: 'ERROBJ', userId: 'u1', tipoCarta: 'FAVOR', objetivoUserId: 'u1' })
        ).rejects.toMatchObject({ statusCode: 400 });

        await expect(
            gameLogic.jugarCarta({ codigoSala: 'ERROBJ', userId: 'u1', tipoCarta: 'FAVOR', objetivoUserId: 'u2' })
        ).rejects.toMatchObject({ statusCode: 400 });

        await expect(
            gameLogic.jugarCarta({ codigoSala: 'ERROBJ', userId: 'u1', tipoCarta: 'CAT_1', objetivoUserId: 'u3' })
        ).rejects.toMatchObject({ message: 'El jugador objetivo no tiene cartas en su mano', statusCode: 400 });
    });

    test('obtenerVistaJugador expone miMano y numCartas, pero oculta mazo y manos rivales', async () => {
        const partida = await gameModel.crearPartidaDatos({
            codigoSala: 'VIST01',
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'p1', mano: ['DEFUSE', 'SKIP'], vivo: true },
                { userId: 'u2', username: 'p2', mano: ['ATTACK', 'SEE_FUTURE', 'CAT_1'], vivo: true }
            ],
            mazo: ['BOMB', 'SHUFFLE', 'FAVOR', 'CAT_2'],
            descartes: ['SKIP'],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        const vista = gameLogic.obtenerVistaJugador(partida, 'u1');

        expect(vista.miMano).toEqual(['DEFUSE', 'SKIP']);
        expect(vista.cartasRestantesMazo).toBe(4);
        expect(vista.riesgoBombaPorcentaje).toBe(25);
        expect(vista.ultimaCartaDescartada).toBe('SKIP');
        expect(vista.mazo).toBeUndefined();
        expect(vista.jugadores).toEqual([
            { userId: 'u1', username: 'p1', vivo: true, numCartas: 2 },
            { userId: 'u2', username: 'p2', vivo: true, numCartas: 3 }
        ]);
        expect(vista.jugadores[1].mano).toBeUndefined();
    });

    test('Al finalizar una partida se incrementan partidasJugadas en todos y partidasGanadas al ganador', async () => {
        await gameModel.crearPartidaDatos({
            codigoSala: 'STAT01',
            estado: 'PLAYING',
            jugadores: [
                { userId: 'u1', username: 'perdedor', mano: [], vivo: true },
                { userId: 'u2', username: 'campeon', mano: ['DEFUSE'], vivo: true }
            ],
            mazo: ['BOMB'],
            descartes: [],
            turnoActualIndex: 0,
            turnoActualUserId: 'u1',
            turnosPendientes: 1
        });

        await gameLogic.robarCarta({ codigoSala: 'STAT01', userId: 'u1' });

        const ranking = await userLogic.obtenerRanking();
        const ganador = ranking.find(r => r.userId === 'u2');
        const perdedor = ranking.find(r => r.userId === 'u1');

        expect(ganador).toEqual({
            userId: 'u2',
            username: 'campeon',
            partidasJugadas: 1,
            partidasGanadas: 1,
            porcentajeVictorias: 100
        });
        expect(perdedor).toEqual({
            userId: 'u1',
            username: 'perdedor',
            partidasJugadas: 1,
            partidasGanadas: 0,
            porcentajeVictorias: 0
        });
    });

    test('userLogic.obtenerRanking devuelve la clasificación ordenada por victorias y porcentaje', async () => {
        await User.registrarResultadoPartidaUsuarios({
            jugadores: [
                { userId: 'u1', username: 'ana' },
                { userId: 'u2', username: 'luis' }
            ],
            ganadorId: 'u1'
        });
        await User.registrarResultadoPartidaUsuarios({
            jugadores: [
                { userId: 'u1', username: 'ana' },
                { userId: 'u3', username: 'marta' }
            ],
            ganadorId: 'u3'
        });
        await User.registrarResultadoPartidaUsuarios({
            jugadores: [
                { userId: 'u2', username: 'luis' },
                { userId: 'u3', username: 'marta' }
            ],
            ganadorId: 'u3'
        });

        const ranking = await userLogic.obtenerRanking(10);

        expect(ranking).toHaveLength(3);
        expect(ranking[0]).toMatchObject({ userId: 'u3', partidasGanadas: 2, partidasJugadas: 2, porcentajeVictorias: 100 });
        expect(ranking[1]).toMatchObject({ userId: 'u1', partidasGanadas: 1, partidasJugadas: 2, porcentajeVictorias: 50 });
        expect(ranking[2]).toMatchObject({ userId: 'u2', partidasGanadas: 0, partidasJugadas: 2, porcentajeVictorias: 0 });
    });

    test('obtenerSesionJuegoActiva recupera la sala en espera (tipo SALA) tras recargar', async () => {
        const sala = await roomLogic.crearSala({
            hostId: 'u1',
            hostUsername: 'host',
            nombre: 'Sala Reconexion',
            maxJugadores: 4
        });
        await roomLogic.unirseASala({ codigo: sala.codigo, userId: 'u2', username: 'invitado' });

        const sesion = await gameLogic.obtenerSesionJuegoActiva('u2');

        expect(sesion.enCurso).toBe(true);
        expect(sesion.tipo).toBe('SALA');
        expect(sesion.codigoSala).toBe(sala.codigo);
        expect(sesion.sala.codigo).toBe(sala.codigo);
        expect(sesion.vistaJugador).toBeNull();
    });

    test('obtenerSesionJuegoActiva recupera la partida activa (tipo PARTIDA) con vistaJugador segura tras recargar', async () => {
        const sala = await roomLogic.crearSala({
            hostId: 'u1',
            hostUsername: 'host',
            nombre: 'Partida Reconexion',
            maxJugadores: 2
        });
        await roomLogic.unirseASala({ codigo: sala.codigo, userId: 'u2', username: 'rival' });
        await gameLogic.iniciarPartidaDesdeSala({ codigoSala: sala.codigo, solicitanteId: 'u1' });

        const sesion = await gameLogic.obtenerSesionJuegoActiva('u2');

        expect(sesion.enCurso).toBe(true);
        expect(sesion.tipo).toBe('PARTIDA');
        expect(sesion.codigoSala).toBe(sala.codigo);
        expect(sesion.vistaJugador).not.toBeNull();
        expect(sesion.vistaJugador.miMano).toHaveLength(8);
        expect(sesion.vistaJugador.mazo).toBeUndefined();
    });

    test('obtenerSesionJuegoActiva devuelve enCurso false cuando la partida termina o el usuario sale de la sala', async () => {
        const sala = await roomLogic.crearSala({
            hostId: 'u1',
            hostUsername: 'host',
            nombre: 'Sala Salida',
            maxJugadores: 3
        });
        await roomLogic.unirseASala({ codigo: sala.codigo, userId: 'u2', username: 'p2' });
        await roomLogic.salirDeSala({ codigo: sala.codigo, userId: 'u2' });

        const sesionTrasSalir = await gameLogic.obtenerSesionJuegoActiva('u2');
        expect(sesionTrasSalir).toEqual({
            enCurso: false,
            tipo: null,
            codigoSala: null,
            sala: null,
            vistaJugador: null
        });

        await gameModel.crearPartidaDatos({
            codigoSala: 'ACAB01',
            estado: 'FINISHED',
            jugadores: [
                { userId: 'u3', username: 'p3', mano: [], vivo: false },
                { userId: 'u4', username: 'p4', mano: ['DEFUSE'], vivo: true }
            ],
            mazo: ['SKIP'],
            descartes: ['BOMB'],
            turnoActualIndex: 1,
            turnoActualUserId: 'u4',
            turnosPendientes: 1,
            ganadorId: 'u4',
            ganadorUsername: 'p4'
        });

        const sesionFinalizada = await gameLogic.obtenerSesionJuegoActiva('u4');
        expect(sesionFinalizada.enCurso).toBe(false);
    });

    test('Error: obtenerSesionJuegoActiva exige userId (error 400)', async () => {
        await expect(
            gameLogic.obtenerSesionJuegoActiva('')
        ).rejects.toMatchObject({
            message: 'El identificador del usuario es obligatorio',
            statusCode: 400
        });
    });

    describe('Carta NOPE (¡Alto ahí!) y contra-Stop (¡Yup!)', () => {
        test('Jugar carta cancelable abre WAITING_NOPE_WINDOW, la muestra en vistaJugador y bloquea otras jugadas o robos', async () => {
            await gameModel.crearPartidaDatos({
                codigoSala: 'NOPE01',
                estado: 'PLAYING',
                jugadores: [
                    { userId: 'u1', username: 'p1', mano: ['SKIP', 'SHUFFLE'], vivo: true },
                    { userId: 'u2', username: 'p2', mano: ['DEFUSE'], vivo: true }
                ],
                mazo: ['BOMB', 'SKIP'],
                descartes: [],
                turnoActualIndex: 0,
                turnoActualUserId: 'u1',
                turnosPendientes: 1
            });

            const res = await gameLogic.jugarCarta({
                codigoSala: 'NOPE01',
                userId: 'u1',
                tipoCarta: 'SKIP'
            });

            expect(res.evento).toBe('VENTANA_NOPE_ABIERTA');
            expect(res.partida.estado).toBe('WAITING_NOPE_WINDOW');
            expect(res.accionPendiente).toMatchObject({
                autorUserId: 'u1',
                tipoCarta: 'SKIP',
                nopes: []
            });

            const vistaU2 = gameLogic.obtenerVistaJugador(res.partida, 'u2');
            expect(vistaU2.estado).toBe('WAITING_NOPE_WINDOW');
            expect(vistaU2.accionPendiente).toMatchObject({
                tipoCarta: 'SKIP',
                totalNopes: 0,
                canceladaActualmente: false
            });

            await expect(
                gameLogic.robarCarta({ codigoSala: 'NOPE01', userId: 'u1' })
            ).rejects.toMatchObject({ statusCode: 400 });

            await expect(
                gameLogic.jugarCarta({ codigoSala: 'NOPE01', userId: 'u1', tipoCarta: 'SHUFFLE' })
            ).rejects.toMatchObject({ statusCode: 400 });
        });

        test('Un NOPE impar jugado fuera de turno cancela la acción al expirar la ventana y mantiene el turno', async () => {
            await gameModel.crearPartidaDatos({
                codigoSala: 'NOPE02',
                estado: 'PLAYING',
                jugadores: [
                    { userId: 'u1', username: 'p1', mano: ['ATTACK', 'DEFUSE'], vivo: true },
                    { userId: 'u2', username: 'p2', mano: ['NOPE'], vivo: true }
                ],
                mazo: ['SKIP', 'BOMB'],
                descartes: [],
                turnoActualIndex: 0,
                turnoActualUserId: 'u1',
                turnosPendientes: 1
            });

            const abierta = await gameLogic.jugarCarta({
                codigoSala: 'NOPE02',
                userId: 'u1',
                tipoCarta: 'ATTACK',
                duracionVentanaMs: 5000
            });
            const expiraInicial = new Date(abierta.accionPendiente.expiraEn).getTime();

            const nope1 = await gameLogic.jugarNope({
                codigoSala: 'NOPE02',
                userId: 'u2',
                duracionVentanaMs: 8000
            });
            expect(nope1.evento).toBe('NOPE_JUGADO');
            expect(nope1.canceladaActualmente).toBe(true);
            expect(nope1.totalNopes).toBe(1);
            expect(new Date(nope1.accionPendiente.expiraEn).getTime()).toBeGreaterThanOrEqual(expiraInicial);

            const resuelta = await gameLogic.resolverAccionPendiente({
                codigoSala: 'NOPE02',
                forzar: true
            });

            expect(resuelta.evento).toBe('ACCION_CANCELADA_POR_NOPE');
            expect(resuelta.partida.estado).toBe('PLAYING');
            expect(resuelta.partida.accionPendiente).toBeNull();
            expect(resuelta.partida.turnoActualUserId).toBe('u1');
            expect(resuelta.partida.turnosPendientes).toBe(1);
            expect(resuelta.partida.descartes).toEqual(['ATTACK', 'NOPE']);
        });

        test('Dos NOPE encadenados (¡YUP!) reactivan la acción original y la ejecutan al resolverse', async () => {
            await gameModel.crearPartidaDatos({
                codigoSala: 'NOPE03',
                estado: 'PLAYING',
                jugadores: [
                    { userId: 'u1', username: 'p1', mano: ['ATTACK', 'NOPE'], vivo: true },
                    { userId: 'u2', username: 'p2', mano: ['NOPE', 'DEFUSE'], vivo: true }
                ],
                mazo: ['SKIP', 'BOMB'],
                descartes: [],
                turnoActualIndex: 0,
                turnoActualUserId: 'u1',
                turnosPendientes: 1
            });

            await gameLogic.jugarCarta({ codigoSala: 'NOPE03', userId: 'u1', tipoCarta: 'ATTACK' });
            await gameLogic.jugarNope({ codigoSala: 'NOPE03', userId: 'u2' });

            const yup = await gameLogic.jugarNope({ codigoSala: 'NOPE03', userId: 'u1' });
            expect(yup.canceladaActualmente).toBe(false);
            expect(yup.totalNopes).toBe(2);

            const resuelta = await gameLogic.resolverAccionPendiente({
                codigoSala: 'NOPE03',
                forzar: true
            });

            expect(resuelta.evento).toBe('CARTA_JUGADA');
            expect(resuelta.tipoCarta).toBe('ATTACK');
            expect(resuelta.partida.estado).toBe('PLAYING');
            expect(resuelta.partida.turnoActualUserId).toBe('u2');
            expect(resuelta.partida.turnosPendientes).toBe(2);
            expect(resuelta.partida.descartes).toEqual(['ATTACK', 'NOPE', 'NOPE']);
        });

        test('Error: Rechaza NOPE inválido (en turno normal, sin carta o eliminado) y BOMB/DEFUSE no abren ventana', async () => {
            await gameModel.crearPartidaDatos({
                codigoSala: 'NOPE04',
                estado: 'PLAYING',
                jugadores: [
                    { userId: 'u1', username: 'p1', mano: ['NOPE', 'DEFUSE'], vivo: true },
                    { userId: 'u2', username: 'p2', mano: ['SKIP'], vivo: true },
                    { userId: 'u3', username: 'p3', mano: ['NOPE'], vivo: false }
                ],
                mazo: ['BOMB'],
                descartes: [],
                turnoActualIndex: 0,
                turnoActualUserId: 'u1',
                turnosPendientes: 1
            });

            await expect(
                gameLogic.jugarCarta({ codigoSala: 'NOPE04', userId: 'u1', tipoCarta: 'NOPE' })
            ).rejects.toMatchObject({ statusCode: 400 });

            await expect(
                gameLogic.jugarNope({ codigoSala: 'NOPE04', userId: 'u1' })
            ).rejects.toMatchObject({ statusCode: 400 });

            const roboBomba = await gameLogic.robarCarta({ codigoSala: 'NOPE04', userId: 'u1' });
            expect(roboBomba.evento).toBe('BOMBA_DESACTIVADA_PENDIENTE_POSICION');
            expect(roboBomba.partida.estado).toBe('WAITING_DEFUSE_INSERT');

            await expect(
                gameLogic.jugarNope({ codigoSala: 'NOPE04', userId: 'u1' })
            ).rejects.toMatchObject({ statusCode: 400 });

            await gameLogic.reinsertarBomba({ codigoSala: 'NOPE04', userId: 'u1', posicionBomba: 0 });
            await gameLogic.jugarCarta({ codigoSala: 'NOPE04', userId: 'u2', tipoCarta: 'SKIP' });

            await expect(
                gameLogic.jugarNope({ codigoSala: 'NOPE04', userId: 'u2' })
            ).rejects.toMatchObject({ message: 'No tienes ninguna carta ¡Alto ahí! en tu mano', statusCode: 400 });

            await expect(
                gameLogic.jugarNope({ codigoSala: 'NOPE04', userId: 'u3' })
            ).rejects.toMatchObject({ statusCode: 403 });
        });

        test('Error: resolverAccionPendiente exige expiración si forzar es false', async () => {
            await gameModel.crearPartidaDatos({
                codigoSala: 'NOPE05',
                estado: 'PLAYING',
                jugadores: [
                    { userId: 'u1', username: 'p1', mano: ['SKIP'], vivo: true },
                    { userId: 'u2', username: 'p2', mano: ['DEFUSE'], vivo: true }
                ],
                mazo: ['BOMB'],
                descartes: [],
                turnoActualIndex: 0,
                turnoActualUserId: 'u1',
                turnosPendientes: 1
            });

            await gameLogic.jugarCarta({
                codigoSala: 'NOPE05',
                userId: 'u1',
                tipoCarta: 'SKIP',
                duracionVentanaMs: 5000
            });

            await expect(
                gameLogic.resolverAccionPendiente({ codigoSala: 'NOPE05', forzar: false })
            ).rejects.toMatchObject({
                message: 'La ventana de ¡Alto ahí! aún no ha expirado',
                statusCode: 400
            });
        });
    });
});
