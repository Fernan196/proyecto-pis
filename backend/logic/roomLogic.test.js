const net = require('net');
const mongoose = require('mongoose');
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

describe('Pruebas Unitarias de la Capa Lógica - Salas / Lobby (roomLogic)', () => {
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
        await roomModel.limpiarSalas();
    });

    afterAll(async () => {
        await roomModel.limpiarSalas();
        if (conectadaPorTest && mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
        consoleLogSpy.mockRestore();
    });

    test('Debe crear una sala válida de 4 jugadores con el anfitrión dentro y estado WAITING', async () => {
        const sala = await roomLogic.crearSala({
            hostId: 'u1',
            hostUsername: 'michi_host',
            nombre: 'Mesa Gatuna',
            maxJugadores: 4
        });

        expect(sala.codigo).toMatch(/^[A-Z0-9]{6}$/);
        expect(sala.nombre).toBe('Mesa Gatuna');
        expect(sala.hostId).toBe('u1');
        expect(sala.maxJugadores).toBe(4);
        expect(sala.estado).toBe('WAITING');
        expect(sala.jugadores).toEqual([{ userId: 'u1', username: 'michi_host' }]);

        const abiertas = await roomLogic.listarSalasDisponibles();
        expect(abiertas).toHaveLength(1);
        expect(abiertas[0].codigo).toBe(sala.codigo);
    });

    test('Error: No debe permitir crear una sala con maxJugadores fuera del rango 2-4 o nombre inválido', async () => {
        await expect(
            roomLogic.crearSala({ hostId: 'u1', hostUsername: 'host', nombre: 'Sala Pequeña', maxJugadores: 1 })
        ).rejects.toThrow('entre 2 y 4');

        await expect(
            roomLogic.crearSala({ hostId: 'u1', hostUsername: 'host', nombre: 'Sala Grande', maxJugadores: 5 })
        ).rejects.toThrow('entre 2 y 4');

        await expect(
            roomLogic.crearSala({ hostId: 'u1', hostUsername: 'host', nombre: 'AB', maxJugadores: 4 })
        ).rejects.toThrow('entre 3 y 40');
    });

    test('Debe permitir unirse hasta 4 jugadores y ser idempotente si el mismo jugador repite', async () => {
        const sala = await roomLogic.crearSala({
            hostId: 'u1',
            hostUsername: 'jugador1',
            nombre: 'Arena Neón',
            maxJugadores: 4
        });

        await roomLogic.unirseASala({ codigo: sala.codigo, userId: 'u2', username: 'jugador2' });
        await roomLogic.unirseASala({ codigo: sala.codigo, userId: 'u2', username: 'jugador2' });
        await roomLogic.unirseASala({ codigo: sala.codigo, userId: 'u3', username: 'jugador3' });
        const salaCompleta = await roomLogic.unirseASala({ codigo: sala.codigo, userId: 'u4', username: 'jugador4' });

        expect(salaCompleta.jugadores).toHaveLength(4);
        expect(salaCompleta.jugadores.map(j => j.userId)).toEqual(['u1', 'u2', 'u3', 'u4']);
    });

    test('Error: No debe permitir unirse a una sala cuando ya alcanzó maxJugadores', async () => {
        const sala = await roomLogic.crearSala({
            hostId: 'u1',
            hostUsername: 'jugador1',
            nombre: 'Duelo 1v1',
            maxJugadores: 2
        });

        await roomLogic.unirseASala({ codigo: sala.codigo, userId: 'u2', username: 'jugador2' });

        await expect(
            roomLogic.unirseASala({ codigo: sala.codigo, userId: 'u3', username: 'jugador3' })
        ).rejects.toThrow('La sala está llena');
    });

    test('Debe transferir el rol de anfitrión al siguiente jugador cuando el anfitrión sale de la sala', async () => {
        const sala = await roomLogic.crearSala({
            hostId: 'u1',
            hostUsername: 'anfitrion_original',
            nombre: 'Sala Relevos',
            maxJugadores: 4
        });

        await roomLogic.unirseASala({ codigo: sala.codigo, userId: 'u2', username: 'nuevo_anfitrion' });
        const resultado = await roomLogic.salirDeSala({ codigo: sala.codigo, userId: 'u1' });

        expect(resultado.eliminada).toBe(false);
        expect(resultado.sala.hostId).toBe('u2');
        expect(resultado.sala.hostUsername).toBe('nuevo_anfitrion');
        expect(resultado.sala.jugadores).toEqual([{ userId: 'u2', username: 'nuevo_anfitrion' }]);
    });

    test('Debe eliminar automáticamente la sala cuando el último jugador sale de ella', async () => {
        const sala = await roomLogic.crearSala({
            hostId: 'u1',
            hostUsername: 'solitario',
            nombre: 'Sala Temporal',
            maxJugadores: 3
        });

        const resultado = await roomLogic.salirDeSala({ codigo: sala.codigo, userId: 'u1' });
        expect(resultado).toEqual({ eliminada: true, codigo: sala.codigo });

        await expect(roomLogic.obtenerSala(sala.codigo)).rejects.toThrow('Sala no encontrada');
    });

    test('Debe iniciar la partida cuando lo solicita el anfitrión con entre 2 y 4 jugadores', async () => {
        const sala = await roomLogic.crearSala({
            hostId: 'u1',
            hostUsername: 'host',
            nombre: 'Sala Lista',
            maxJugadores: 4
        });

        await roomLogic.unirseASala({ codigo: sala.codigo, userId: 'u2', username: 'invitado' });
        const iniciada = await roomLogic.marcarSalaEnCurso({
            codigo: sala.codigo,
            solicitanteId: 'u1',
            partidaId: 'partida-123'
        });

        expect(iniciada.estado).toBe('IN_PROGRESS');
        expect(iniciada.partidaId).toBe('partida-123');
    });

    test('Error: Solo el anfitrión puede iniciar la partida (error 403)', async () => {
        const sala = await roomLogic.crearSala({
            hostId: 'u1',
            hostUsername: 'host',
            nombre: 'Sala Protegida',
            maxJugadores: 4
        });

        await roomLogic.unirseASala({ codigo: sala.codigo, userId: 'u2', username: 'intruso' });

        await expect(
            roomLogic.marcarSalaEnCurso({ codigo: sala.codigo, solicitanteId: 'u2' })
        ).rejects.toMatchObject({
            message: 'Solo el anfitrión puede iniciar la partida',
            statusCode: 403
        });
    });

    test('Error: No se puede iniciar la partida con un solo jugador en la sala (error 400)', async () => {
        const sala = await roomLogic.crearSala({
            hostId: 'u1',
            hostUsername: 'host',
            nombre: 'Sala Incompleta',
            maxJugadores: 4
        });

        await expect(
            roomLogic.marcarSalaEnCurso({ codigo: sala.codigo, solicitanteId: 'u1' })
        ).rejects.toMatchObject({
            message: 'Se requieren entre 2 y 4 jugadores para iniciar la partida',
            statusCode: 400
        });
    });

    test('Error: No debe permitir unirse a una sala cuya partida ya está IN_PROGRESS', async () => {
        const sala = await roomLogic.crearSala({
            hostId: 'u1',
            hostUsername: 'host',
            nombre: 'Sala Iniciada',
            maxJugadores: 4
        });

        await roomLogic.unirseASala({ codigo: sala.codigo, userId: 'u2', username: 'p2' });
        await roomLogic.marcarSalaEnCurso({ codigo: sala.codigo, solicitanteId: 'u1' });

        await expect(
            roomLogic.unirseASala({ codigo: sala.codigo, userId: 'u3', username: 'tardio' })
        ).rejects.toMatchObject({
            message: 'La partida en esta sala ya ha comenzado o ha finalizado',
            statusCode: 400
        });
    });
});
