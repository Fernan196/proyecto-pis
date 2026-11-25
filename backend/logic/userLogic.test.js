const net = require('net');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { createUserLogic } = require('./userLogic');
const User = require('../data/userModel');
const logger = require('./logger');

function puertoMongoDisponible(host = '127.0.0.1', port = 27017) {
    return new Promise((resolve) => {
        const socket = net.connect(port, host);
        socket.setTimeout(400);
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

describe('Pruebas Unitarias de la Capa Lógica (userLogic)', () => {
    const mailerDouble = {
        enviarCorreoConfirmacion: jest.fn().mockResolvedValue(true)
    };
    const userLogic = createUserLogic({
        userRepo: User,
        mailer: mailerDouble,
        logger
    });

    beforeAll(async () => {
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-tests-ci';

        if (process.env.MONGODB_URI || await puertoMongoDisponible()) {
            const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/proyecto_pis_test';
            if (mongoose.connection.readyState === 0) {
                await mongoose.connect(uri);
            }
        }
    });

    beforeEach(async () => {
        await User.limpiarUsuarios();
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await User.limpiarUsuarios();
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
    });

    // ==========================================
    // 1. REGLAS DE REGISTRO DE USUARIOS
    // ==========================================
    describe('Registro de usuarios', () => {

        test('Debe registrar un nuevo usuario con éxito y enviar el correo de activación', async () => {
            const resultado = await userLogic.registrarUsuario({
                username: 'fernando',
                email: 'fernando@test.com',
                password: 'password123'
            });

            expect(resultado).toHaveProperty('userId');
            expect(resultado.mensaje).toContain('revisa tu correo');

            const usuarioGuardado = await User.buscarPorId(resultado.userId, { incluirPassword: true });
            expect(usuarioGuardado).not.toBeNull();
            expect(usuarioGuardado.confirmado).toBe(false);
            expect(usuarioGuardado.rol).toBe('user');
            expect(usuarioGuardado.password).not.toBe('password123');

            expect(mailerDouble.enviarCorreoConfirmacion).toHaveBeenCalledTimes(1);
            expect(mailerDouble.enviarCorreoConfirmacion).toHaveBeenCalledWith({
                email: 'fernando@test.com',
                username: 'fernando',
                token: expect.any(String)
            });
        });

        test('Permite registrar correos de cualquier dominio sin restricción', async () => {
            const envOriginal = process.env.ALLOWED_DOMAINS;
            process.env.ALLOWED_DOMAINS = 'solo-uni.es';

            try {
                const resultado = await userLogic.registrarUsuario({
                    username: 'libre',
                    email: 'libre@cualquierdominio.com',
                    password: 'password123'
                });

                expect(resultado).toHaveProperty('userId');
                expect(mailerDouble.enviarCorreoConfirmacion).toHaveBeenCalledTimes(1);
            } finally {
                if (envOriginal === undefined) {
                    delete process.env.ALLOWED_DOMAINS;
                } else {
                    process.env.ALLOWED_DOMAINS = envOriginal;
                }
            }
        });

        test('Error: No debe permitir registrar un usuario con un email que ya existe', async () => {
            await userLogic.registrarUsuario({
                username: 'primer_usuario',
                email: 'duplicado@test.com',
                password: 'password123'
            });

            await expect(
                userLogic.registrarUsuario({
                    username: 'segundo_usuario',
                    email: 'duplicado@test.com',
                    password: 'otraPassword456'
                })
            ).rejects.toThrow('El correo electrónico ya está registrado');
        });

        test('Error: No debe permitir registrar si el formato de correo es inválido', async () => {
            await expect(
                userLogic.registrarUsuario({
                    username: 'invalido',
                    email: 'correo-sin-arroba',
                    password: 'password123'
                })
            ).rejects.toThrow('El formato del correo electrónico no es válido');
        });

        test('Error: No debe permitir registrar contraseñas menores a 6 caracteres', async () => {
            await expect(
                userLogic.registrarUsuario({
                    username: 'corto',
                    email: 'corto@test.com',
                    password: '123'
                })
            ).rejects.toThrow('La contraseña debe tener al menos 6 caracteres');
        });
    });

    // ==========================================
    // 2. REGLAS DE CONFIRMACIÓN DE CUENTA
    // ==========================================
    describe('Confirmación de cuenta por correo', () => {

        test('Debe activar la cuenta cuando el token es válido', async () => {
            const registro = await userLogic.registrarUsuario({
                username: 'por_activar',
                email: 'activar@test.com',
                password: 'password123'
            });

            const tokenValido = jwt.sign(
                { id: registro.userId },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            const resultado = await userLogic.confirmarCuenta(tokenValido);
            expect(resultado.yaConfirmado).toBe(false);

            const usuario = await User.buscarPorId(registro.userId);
            expect(usuario.confirmado).toBe(true);
        });

        test('Error: Debe rechazar tokens de confirmación inválidos o alterados', async () => {
            await expect(
                userLogic.confirmarCuenta('token-completamente-falso.jwt.123')
            ).rejects.toThrow('Enlace de activación inválido o expirado');
        });
    });

    // ==========================================
    // 3. REGLAS DE INICIO DE SESIÓN (LOGIN)
    // ==========================================
    describe('Inicio de sesión', () => {

        test('Error: No debe permitir iniciar sesión si la cuenta está pendiente de confirmación', async () => {
            await userLogic.registrarUsuario({
                username: 'pendiente',
                email: 'pendiente@test.com',
                password: 'password123'
            });

            await expect(
                userLogic.loginUsuario({
                    email: 'pendiente@test.com',
                    password: 'password123'
                })
            ).rejects.toThrow('Debes confirmar tu cuenta por correo electrónico');
        });

        test('Debe permitir iniciar sesión cuando la cuenta está confirmada y las credenciales son válidas', async () => {
            const registro = await userLogic.registrarUsuario({
                username: 'confirmado',
                email: 'confirmado@test.com',
                password: 'password123'
            });

            await User.actualizarUsuarioDatos(registro.userId, { confirmado: true });

            const loginRes = await userLogic.loginUsuario({
                email: 'confirmado@test.com',
                password: 'password123'
            });

            expect(loginRes).toHaveProperty('token');
            expect(loginRes.user.email).toBe('confirmado@test.com');
            expect(loginRes.user.username).toBe('confirmado');

            const decoded = jwt.verify(loginRes.token, process.env.JWT_SECRET);
            expect(decoded.email).toBe('confirmado@test.com');
        });

        test('Error: Debe rechazar contraseña incorrecta', async () => {
            const registro = await userLogic.registrarUsuario({
                username: 'usuario1',
                email: 'usuario1@test.com',
                password: 'password123'
            });
            await User.actualizarUsuarioDatos(registro.userId, { confirmado: true });

            await expect(
                userLogic.loginUsuario({
                    email: 'usuario1@test.com',
                    password: 'clave_erronea'
                })
            ).rejects.toThrow('Credenciales incorrectas');
        });
    });

    // ==========================================
    // 4. REGLAS DE ELIMINACIÓN DE USUARIOS
    // ==========================================
    describe('Eliminación de usuarios y control de permisos', () => {

        test('Un usuario normal puede eliminar su propia cuenta', async () => {
            const user = await User.crearUsuarioDatos({
                username: 'usuario_a',
                email: 'a@test.com',
                password: 'hash',
                rol: 'user',
                confirmado: true
            });

            const res = await userLogic.eliminarUsuario({
                solicitanteId: user.id,
                solicitanteRol: 'user',
                objetivoId: user.id
            });

            expect(res.mensaje).toBe('Cuenta eliminada exitosamente');
            const enDb = await User.buscarPorId(user.id);
            expect(enDb).toBeNull();
        });

        test('Error: Un usuario normal no puede eliminar la cuenta de otro usuario', async () => {
            const userA = await User.crearUsuarioDatos({
                username: 'usuario_a',
                email: 'a@test.com',
                password: 'hash',
                rol: 'user',
                confirmado: true
            });

            const userB = await User.crearUsuarioDatos({
                username: 'usuario_b',
                email: 'b@test.com',
                password: 'hash',
                rol: 'user',
                confirmado: true
            });

            await expect(
                userLogic.eliminarUsuario({
                    solicitanteId: userA.id,
                    solicitanteRol: 'user',
                    objetivoId: userB.id
                })
            ).rejects.toThrow('No tienes permiso para eliminar esta cuenta');

            const enDb = await User.buscarPorId(userB.id);
            expect(enDb).not.toBeNull();
        });

        test('Un administrador puede eliminar la cuenta de cualquier usuario', async () => {
            const admin = await User.crearUsuarioDatos({
                username: 'admin',
                email: 'admin@test.com',
                password: 'hash',
                rol: 'admin',
                confirmado: true
            });

            const targetUser = await User.crearUsuarioDatos({
                username: 'target',
                email: 'target@test.com',
                password: 'hash',
                rol: 'user',
                confirmado: true
            });

            const res = await userLogic.eliminarUsuario({
                solicitanteId: admin.id,
                solicitanteRol: 'admin',
                objetivoId: targetUser.id
            });

            expect(res.mensaje).toBe('Cuenta eliminada exitosamente');
            const enDb = await User.buscarPorId(targetUser.id);
            expect(enDb).toBeNull();
        });

        test('Error: No se permite eliminar al único administrador del sistema', async () => {
            const unicoAdmin = await User.crearUsuarioDatos({
                username: 'admin_unico',
                email: 'unico@test.com',
                password: 'hash',
                rol: 'admin',
                confirmado: true
            });

            await expect(
                userLogic.eliminarUsuario({
                    solicitanteId: unicoAdmin.id,
                    solicitanteRol: 'admin',
                    objetivoId: unicoAdmin.id
                })
            ).rejects.toThrow('no es posible eliminar al único administrador');
        });
    });

    // ==========================================
    // 5. CAMBIO DE ROLES, ESTADO ACTIVO Y OAUTH
    // ==========================================
    describe('Gestión de roles, estado activo y OAuth GitHub', () => {

        test('Debe permitir promover un usuario normal a administrador', async () => {
            const user = await User.crearUsuarioDatos({
                username: 'promovible',
                email: 'promo@test.com',
                password: 'hash',
                rol: 'user',
                confirmado: true
            });

            const actualizado = await userLogic.cambiarRolUsuario(user.id, 'admin');
            expect(actualizado.rol).toBe('admin');
        });

        test('Error: No permite degradar a usuario al único administrador del sistema', async () => {
            const unicoAdmin = await User.crearUsuarioDatos({
                username: 'admin_solitario',
                email: 'solitario@test.com',
                password: 'hash',
                rol: 'admin',
                confirmado: true
            });

            await expect(
                userLogic.cambiarRolUsuario(unicoAdmin.id, 'user')
            ).rejects.toThrow('no puedes quitar privilegios al único administrador');
        });

        test('Comprobar estado activo retorna el estado correcto del usuario', async () => {
            const user = await User.crearUsuarioDatos({
                username: 'activo_check',
                email: 'check@test.com',
                password: 'hash',
                rol: 'user',
                confirmado: true
            });

            const estado = await userLogic.comprobarActivo(user.id);
            expect(estado.activo).toBe(true);
            expect(estado.email).toBe('check@test.com');
        });

        test('procesarLoginGitHub crea cuenta confirmada con rol user sin enviar correo', async () => {
            const res = await userLogic.procesarLoginGitHub({
                githubId: 98765,
                email: 'octocat@test.com',
                username: 'octocat'
            });

            expect(res).toHaveProperty('token');
            expect(res.user.rol).toBe('user');
            expect(mailerDouble.enviarCorreoConfirmacion).not.toHaveBeenCalled();

            const guardado = await User.buscarPorId(res.user.id);
            expect(guardado.confirmado).toBe(true);
        });
    });
});
