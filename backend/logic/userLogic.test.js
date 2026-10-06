// backend/logic/userLogic.test.js
const { registrarUsuario, listarUsuarios, comprobarActivo, eliminarUsuario, users } = require('./userLogic');

describe('Gestión de Usuarios - Capa Lógica', () => {
    beforeEach(() => {
        // Vaciamos la memoria antes de cada prueba para que sean independientes
        users.length = 0; 
    });

    test('Debe registrar un usuario nuevo en estado pendiente', async () => {
        const user = await registrarUsuario('juan@correo.com', '123456');
        expect(user.email).toBe('juan@correo.com');
        expect(user.estado).toBe('pendiente');
        expect(users.length).toBe(1);
    });

    test('Debe dar error si intentas registrar un email ya existente', async () => {
        await registrarUsuario('juan@correo.com', '123456');
        // Intentamos registrar el mismo y esperamos que lance un error
        await expect(() => registrarUsuario('juan@correo.com', 'otrapass')).rejects.toThrow("El usuario ya existe");
    });

    test('Debe listar los usuarios sin incluir la contraseña', async () => {
    await registrarUsuario('ana@correo.com', 'secreta');
    const lista = listarUsuarios();
    expect(lista.length).toBe(1);
    expect(lista[0].password).toBeUndefined(); // Comprueba que no hay contraseña
    });

    test('Debe comprobar si un usuario está activo', async () => {
        const user = await registrarUsuario('luis@correo.com', '123');
        expect(comprobarActivo(user.id)).toBe(false); // Por defecto nace 'pendiente'
    
        user.estado = 'activo'; // Simulamos que se ha activado
        expect(comprobarActivo(user.id)).toBe(true);
    });

    test('Debe eliminar un usuario correctamente', async () => {
        const user = await registrarUsuario('carlos@correo.com', '123');
        expect(users.length).toBe(1);
    
        eliminarUsuario(user.id);
        expect(users.length).toBe(0);
    });
});