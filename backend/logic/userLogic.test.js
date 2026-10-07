// Cargar variables de entorno para los tests
require('dotenv').config();


const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// backend/logic/userLogic.test.js
const { registrarUsuario, listarUsuarios, comprobarActivo, eliminarUsuario, users } = require('./userLogic');

const User = require('../data/userModel'); // Importamos el modelo real


// Aumentamos el tiempo de espera a 60 segundos para que le dé tiempo a descargar MongoDB
jest.setTimeout(60000);

let mongoServer;

// Antes de todas las pruebas: arrancar el MongoDB fantasma
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create(); 
    const uri = mongoServer.getUri();
    await mongoose.connect(uri,{});
});

// Antes de CADA prueba: vaciar la colección para que sean independientes
beforeEach(async () => {
    if (mongoose.connection.readyState !== 0) {
        await User.deleteMany({});
    }
});

// Al terminar todas las pruebas: desconectar y apagar el servidor
afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
});

describe('Gestión de Usuarios - Capa Lógica (MongoDB)', () => {

    test('Debe registrar un usuario nuevo en estado pendiente', async () => {
        const user = await registrarUsuario('juan@correo.com', '123456');
        expect(user.email).toBe('juan@correo.com');
        expect(user.estado).toBe('pendiente');

        // Comprobamos en la base de datos real
        const count = await User.countDocuments();
        expect(count).toBe(1);
    });

    test('Debe dar error si intentas registrar un email ya existente', async () => {
        await registrarUsuario('juan@correo.com', '123456');
        // Intentamos registrar el mismo y esperamos que lance un error
        await expect( registrarUsuario('juan@correo.com', 'otrapass')).rejects.toThrow("El usuario ya existe");
    });

    test('Debe listar los usuarios sin incluir la contraseña', async () => {
        await registrarUsuario('ana@correo.com', 'secreta');
        const lista = await listarUsuarios();
        expect(lista.length).toBe(1);

        // Al convertirlo a JSON (como hace Express) la contraseña desaparece gracias a tu userSchema
        const userJSON = lista[0].toJSON();
        expect(userJSON.password).toBeUndefined(); // Comprueba que no hay contraseña
    });

    test('Debe comprobar si un usuario está activo', async () => {
        const user = await registrarUsuario('luis@correo.com', '123');
        expect(await comprobarActivo(user._id)).toBe(false); // Por defecto nace 'pendiente'
    
        // Lo activamos a la fuerza en la BD para probar la comprobación
        await User.findByIdAndUpdate(user._id, { estado: 'activo' });
        expect(await comprobarActivo(user._id)).toBe(true);
    });

    test('Debe eliminar un usuario correctamente', async () => {
        const user = await registrarUsuario('carlos@correo.com', '123');
        expect(await User.countDocuments()).toBe(1);
    
        await eliminarUsuario(user._id);
        expect(await User.countDocuments()).toBe(0); //Tiene que quedar vacío
    });
});