const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Mock del servicio de correo para ejecutar pruebas aisladas y sin conexión externa
jest.mock('./mailer', () => ({
    enviarCorreoConfirmacion: jest.fn().mockResolvedValue(true)
}));

const userLogic = require('./userLogic');
const User = require('../data/userModel');
const { enviarCorreoConfirmacion } = require('./mailer');

describe('Pruebas Unitarias de la Capa Lógica (userLogic)', () => {

    beforeAll(async () => {
        // Asegurar variable secreta para JWT en entorno de pruebas
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-tests-ci';

        // Conectar a la base de datos configurada para tests o local
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/proyecto_pis_test';
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(uri);
        }
    });

    beforeEach(async () => {
        // Limpiar la colección antes de cada prueba para garantizar independencia
        await User.deleteMany({});
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await User.deleteMany({});
        await mongoose.connection.close();
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

            // Verificar persistencia en base de datos
            const usuarioGuardado = await User.findById(resultado.userId);
            expect(usuarioGuardado).not.toBeNull();
            expect(usuarioGuardado.confirmado).toBe(false);
            expect(usuarioGuardado.rol).toBe('user');

            // Verificar que la contraseña no se guardó en texto plano
            expect(usuarioGuardado.password).not.toBe('password123');

            // Verificar que se invocó el envío de correo con un token válido
            expect(enviarCorreoConfirmacion).toHaveBeenCalledTimes(1);
            expect(enviarCorreoConfirmacion).toHaveBeenCalledWith(
                'fernando@test.com',
                expect.any(String)
            );
        });

        test('Error: No debe permitir registrar un usuario con un email que ya existe', async () => {
            await userLogic.registrarUsuario({
                username: 'primer_usuario',
                email: 'duplicado@test.com',
                password: 'password123'
            });

            // Intentar registrar el mismo email de nuevo
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

            const usuario = await User.findById(registro.userId);
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

            // Confirmar la cuenta
            await User.findByIdAndUpdate(registro.userId, { confirmado: true });

            const loginRes = await userLogic.loginUsuario({
                email: 'confirmado@test.com',
                password: 'password123'
            });

            expect(loginRes).toHaveProperty('token');
            expect(loginRes.user.email).toBe('confirmado@test.com');
            expect(loginRes.user.username).toBe('confirmado');

            // Verificar que el token devuelto se puede decodificar
            const decoded = jwt.verify(loginRes.token, process.env.JWT_SECRET);
            expect(decoded.email).toBe('confirmado@test.com');
        });

        test('Error: Debe rechazar contraseña incorrecta', async () => {
            const registro = await userLogic.registrarUsuario({
                username: 'usuario1',
                email: 'usuario1@test.com',
                password: 'password123'
            });
            await User.findByIdAndUpdate(registro.userId, { confirmado: true });

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
            const user = await User.create({
                username: 'usuario_a',
                email: 'a@test.com',
                password: 'hash',
                rol: 'user',
                confirmado: true
            });

            const res = await userLogic.eliminarUsuario({
                solicitanteId: user._id,
                solicitanteRol: 'user',
                objetivoId: user._id
            });

            expect(res.mensaje).toBe('Cuenta eliminada exitosamente');
            const enDb = await User.findById(user._id);
            expect(enDb).toBeNull();
        });

        test('Error: Un usuario normal no puede eliminar la cuenta de otro usuario', async () => {
            const userA = await User.create({
                username: 'usuario_a',
                email: 'a@test.com',
                password: 'hash',
                rol: 'user',
                confirmado: true
            });

            const userB = await User.create({
                username: 'usuario_b',
                email: 'b@test.com',
                password: 'hash',
                rol: 'user',
                confirmado: true
            });

            await expect(
                userLogic.eliminarUsuario({
                    solicitanteId: userA._id,
                    solicitanteRol: 'user',
                    objetivoId: userB._id
                })
            ).rejects.toThrow('No tienes permiso para eliminar esta cuenta');

            // Comprobar que el usuario B sigue intacto
            const enDb = await User.findById(userB._id);
            expect(enDb).not.toBeNull();
        });

        test('Un administrador puede eliminar la cuenta de cualquier usuario', async () => {
            const admin = await User.create({
                username: 'admin',
                email: 'admin@test.com',
                password: 'hash',
                rol: 'admin',
                confirmado: true
            });

            const targetUser = await User.create({
                username: 'target',
                email: 'target@test.com',
                password: 'hash',
                rol: 'user',
                confirmado: true
            });

            const res = await userLogic.eliminarUsuario({
                solicitanteId: admin._id,
                solicitanteRol: 'admin',
                objetivoId: targetUser._id
            });

            expect(res.mensaje).toBe('Cuenta eliminada exitosamente');
            const enDb = await User.findById(targetUser._id);
            expect(enDb).toBeNull();
        });

        test('Error: No se permite eliminar al único administrador del sistema', async () => {
            const unicoAdmin = await User.create({
                username: 'admin_unico',
                email: 'unico@test.com',
                password: 'hash',
                rol: 'admin',
                confirmado: true
            });

            await expect(
                userLogic.eliminarUsuario({
                    solicitanteId: unicoAdmin._id,
                    solicitanteRol: 'admin',
                    objetivoId: unicoAdmin._id
                })
            ).rejects.toThrow('no es posible eliminar al único administrador');
        });
    });

    // ==========================================
    // 5. CAMBIO DE ROLES Y CONSULTA DE ESTADO
    // ==========================================
    describe('Gestión de roles y estado activo', () => {

        test('Debe permitir promover un usuario normal a administrador', async () => {
            const user = await User.create({
                username: 'promovible',
                email: 'promo@test.com',
                password: 'hash',
                rol: 'user',
                confirmado: true
            });

            const actualizado = await userLogic.cambiarRolUsuario(user._id, 'admin');
            expect(actualizado.rol).toBe('admin');
        });

        test('Error: No permite degradar a usuario al único administrador del sistema', async () => {
            const unicoAdmin = await User.create({
                username: 'admin_solitario',
                email: 'solitario@test.com',
                password: 'hash',
                rol: 'admin',
                confirmado: true
            });

            await expect(
                userLogic.cambiarRolUsuario(unicoAdmin._id, 'user')
            ).rejects.toThrow('no puedes quitar privilegios al único administrador');
        });

        test('Comprobar estado activo retorna el estado correcto del usuario', async () => {
            const user = await User.create({
                username: 'activo_check',
                email: 'check@test.com',
                password: 'hash',
                rol: 'user',
                confirmado: true
            });

            const estado = await userLogic.comprobarActivo(user._id);
            expect(estado.activo).toBe(true);
            expect(estado.email).toBe('check@test.com');
        });
    });

    // ==========================================
    // 6. DOMINIOS PERMITIDOS (VARIANTE 3)
    // ==========================================
    describe('Comprobación de dominios permitidos (variante3)', () => {
        const envOriginal = process.env.ALLOWED_DOMAINS;

        beforeEach(() => {
            process.env.ALLOWED_DOMAINS = 'miuni.es,alu.miuni.es';
        });

        afterAll(() => {
            process.env.ALLOWED_DOMAINS = envOriginal;
        });

        test('variante3: permite un email cuyo dominio está en ALLOWED_DOMAINS sin distinguir mayúsculas', () => {
            const res1 = userLogic.comprobarDominioPermitido('ana@miuni.es');
            const res2 = userLogic.comprobarDominioPermitido('PEDRO@ALU.MIUNI.ES');

            expect(res1).toEqual({ permitido: true });
            expect(res2).toEqual({ permitido: true });
        });

        test('variante3: rechaza un email de un dominio no listado o de un subdominio no autorizado', () => {
            const resDominioExterno = userLogic.comprobarDominioPermitido('juan@gmail.com');
            const resSubdominio = userLogic.comprobarDominioPermitido('x@sub.miuni.es');

            expect(resDominioExterno).toEqual({ permitido: false });
            expect(resSubdominio).toEqual({ permitido: false });
        });

        test('variante3: lanza un error 400 cuando el email no contiene arroba', () => {
            expect(() => {
                userLogic.comprobarDominioPermitido('correosinarroba.es');
            }).toThrow();
        });

        test('variante3: lanza un error 400 cuando el email está ausente o no es un string', () => {
            expect(() => userLogic.comprobarDominioPermitido(undefined)).toThrow();
            expect(() => userLogic.comprobarDominioPermitido(null)).toThrow();
            expect(() => userLogic.comprobarDominioPermitido(12345)).toThrow();
            expect(() => userLogic.comprobarDominioPermitido('')).toThrow();
        });
    });
});