// backend/logic/userLogic.test.js
const { registrarUsuario, users } = require('./userLogic');

describe('Gestión de Usuarios - Capa Lógica', () => {
    beforeEach(() => {
        // Vaciamos la memoria antes de cada prueba para que sean independientes
        users.length = 0; 
    });

    test('Debe registrar un usuario nuevo en estado pendiente', () => {
        const user = registrarUsuario('juan@correo.com', '123456');
        expect(user.email).toBe('juan@correo.com');
        expect(user.estado).toBe('pendiente');
        expect(users.length).toBe(1);
    });

    test('Debe dar error si intentas registrar un email ya existente', () => {
        registrarUsuario('juan@correo.com', '123456');
        // Intentamos registrar el mismo y esperamos que lance un error
        expect(() => registrarUsuario('juan@correo.com', 'otrapass')).toThrow("El usuario ya existe");
    });
});