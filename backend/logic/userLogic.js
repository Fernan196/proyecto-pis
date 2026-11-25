// backend/logic/userLogic.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NOOP_LOGGER = {
    registrarEvento() {},
    registrarError() {}
};

/**
 * Crea la capa lógica de usuarios y ranking con dependencias inyectadas,
 * sin conocimiento directo de HTTP, Mongoose ni proveedores SMTP externos.
 */
function createUserLogic({ userRepo, mailer, logger } = {}) {
    if (!userRepo) {
        throw new Error('userRepo es obligatorio para inicializar userLogic');
    }

    const log = logger || NOOP_LOGGER;

    async function registrarUsuario(params, legacyPassword, legacyRol) {
        let email, password, username;

        if (typeof params === 'string') {
            email = params;
            password = legacyPassword;
            username = email ? email.split('@')[0] : 'usuario';
        } else {
            email = params?.email;
            password = params?.password;
            username = params?.username || (email ? email.split('@')[0] : 'usuario');
        }

        if (!email || !password) {
            throw new Error('Todos los campos son obligatorios');
        }

        if (!EMAIL_REGEX.test(email)) {
            throw new Error('El formato del correo electrónico no es válido');
        }

        if (password.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }

        const usuarioExistente = await userRepo.buscarPorEmail(email);
        if (usuarioExistente) {
            throw new Error('El correo electrónico ya está registrado');
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const usuarioGuardado = await userRepo.crearUsuarioDatos({
            username,
            email,
            password: passwordHash,
            rol: 'user', // forzar siempre rol user en registro público (seguridad)
            confirmado: false
        });

        const tokenConfirmacion = jwt.sign(
            { id: usuarioGuardado.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        if (!mailer || typeof mailer.enviarCorreoConfirmacion !== 'function') {
            throw new Error('Servicio de correo no configurado');
        }

        await mailer.enviarCorreoConfirmacion({
            email: usuarioGuardado.email,
            username: usuarioGuardado.username,
            token: tokenConfirmacion
        });

        log.registrarEvento('USUARIO_REGISTRADO', {
            userId: String(usuarioGuardado.id),
            username: usuarioGuardado.username,
            rol: usuarioGuardado.rol
        });

        return {
            mensaje: 'Usuario registrado. Por favor, revisa tu correo para activar tu cuenta.',
            userId: usuarioGuardado.id
        };
    }

    async function loginUsuario({ email, password }) {
        if (!email || !password) {
            throw new Error('Email y contraseña requeridos');
        }

        const usuario = await userRepo.buscarPorEmail(email);
        if (!usuario) {
            throw new Error('Credenciales incorrectas');
        }

        if (!usuario.confirmado) {
            const error = new Error('Debes confirmar tu cuenta por correo electrónico antes de poder iniciar sesión.');
            error.code = 'ACCOUNT_NOT_CONFIRMED';
            throw error;
        }

        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) {
            throw new Error('Credenciales incorrectas');
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                email: usuario.email,
                username: usuario.username,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        log.registrarEvento('LOGIN_EXITOSO', {
            userId: String(usuario.id),
            rol: usuario.rol,
            metodo: 'local'
        });

        return {
            token,
            user: {
                id: usuario.id,
                username: usuario.username,
                email: usuario.email,
                rol: usuario.rol
            }
        };
    }

    async function confirmarCuenta(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const usuario = await userRepo.buscarPorId(decoded.id);

            if (!usuario) throw new Error('Usuario no encontrado');
            if (usuario.confirmado) return { yaConfirmado: true };

            await userRepo.actualizarUsuarioDatos(usuario.id, { confirmado: true });
            log.registrarEvento('CUENTA_CONFIRMADA', { userId: String(usuario.id) });
            return { yaConfirmado: false };
        } catch (err) {
            throw new Error('Enlace de activación inválido o expirado');
        }
    }

    async function listarUsuarios() {
        return await userRepo.listarUsuariosDatos();
    }

    async function comprobarActivo(id) {
        if (!userRepo.esIdValido(id)) {
            throw new Error('ID de usuario no válido');
        }
        const usuario = await userRepo.buscarPorId(id);
        if (!usuario) throw new Error('Usuario no encontrado');
        return {
            id: usuario.id,
            email: usuario.email,
            activo: Boolean(usuario.confirmado)
        };
    }

    // CAMBIAR ROL: Protege contra la degradación del último administrador
    async function cambiarRolUsuario(id, nuevoRol) {
        if (!userRepo.esIdValido(id)) {
            throw new Error('ID de usuario no válido');
        }

        if (!['user', 'admin'].includes(nuevoRol)) {
            throw new Error('Rol no válido');
        }

        const usuario = await userRepo.buscarPorId(id);
        if (!usuario) {
            throw new Error('Usuario no encontrado');
        }

        // Regla de integridad: no degradar al último administrador
        if (usuario.rol === 'admin' && nuevoRol === 'user') {
            const totalAdmins = await userRepo.contarPorRol('admin');
            if (totalAdmins <= 1) {
                throw new Error('Operación cancelada: no puedes quitar privilegios al único administrador del sistema.');
            }
        }

        const actualizado = await userRepo.actualizarUsuarioDatos(id, { rol: nuevoRol });

        log.registrarEvento('CAMBIO_ROL', {
            objetivoId: String(usuario.id),
            nuevoRol
        });

        return actualizado;
    }

    // ELIMINAR USUARIO: Protege contra la eliminación del último administrador
    async function eliminarUsuario({ solicitanteId, solicitanteRol, objetivoId }) {
        if (!userRepo.esIdValido(objetivoId)) {
            const error = new Error('ID de usuario no válido');
            error.statusCode = 400;
            throw error;
        }

        if (solicitanteRol !== 'admin' && String(solicitanteId) !== String(objetivoId)) {
            const error = new Error('No tienes permiso para eliminar esta cuenta');
            error.statusCode = 403;
            throw error;
        }

        const usuarioAEliminar = await userRepo.buscarPorId(objetivoId);
        if (!usuarioAEliminar) {
            const error = new Error('Usuario no encontrado');
            error.statusCode = 404;
            throw error;
        }

        // Regla de integridad: no borrar al último administrador
        if (usuarioAEliminar.rol === 'admin') {
            const totalAdmins = await userRepo.contarPorRol('admin');
            if (totalAdmins <= 1) {
                const error = new Error('Operación cancelada: no es posible eliminar al único administrador del sistema.');
                error.statusCode = 400;
                throw error;
            }
        }

        await userRepo.eliminarPorId(objetivoId);
        log.registrarEvento('USUARIO_ELIMINADO', {
            solicitanteId: String(solicitanteId),
            solicitanteRol,
            objetivoId: String(objetivoId)
        });
        return { mensaje: 'Cuenta eliminada exitosamente' };
    }

    async function autenticarUsuarioOAuth({
        proveedor,
        campoId,
        proveedorId,
        email,
        username,
        defaultUsername,
        eventoLog,
        metodo
    }) {
        if (!email) {
            throw new Error(`El perfil de ${proveedor} no proporciona un correo electrónico`);
        }

        const idExterno = proveedorId !== undefined && proveedorId !== null ? String(proveedorId) : null;
        let usuario = await userRepo.buscarPorEmail(email);

        if (!usuario) {
            usuario = await userRepo.crearUsuarioDatos({
                username: username || defaultUsername,
                email,
                [campoId]: idExterno,
                rol: 'user',
                confirmado: true
            });
        } else if (!usuario.confirmado || (idExterno && !usuario[campoId])) {
            const cambios = { confirmado: true };
            if (idExterno && !usuario[campoId]) {
                cambios[campoId] = idExterno;
            }
            usuario = await userRepo.actualizarUsuarioDatos(usuario.id, cambios);
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                email: usuario.email,
                username: usuario.username,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        log.registrarEvento(eventoLog, {
            userId: String(usuario.id),
            rol: usuario.rol,
            metodo
        });

        return {
            token,
            user: {
                id: usuario.id,
                username: usuario.username,
                email: usuario.email,
                rol: usuario.rol
            }
        };
    }

    async function procesarLoginGitHub({ githubId, email, username }) {
        return await autenticarUsuarioOAuth({
            proveedor: 'GitHub',
            campoId: 'githubId',
            proveedorId: githubId,
            email,
            username,
            defaultUsername: 'Usuario GitHub',
            eventoLog: 'LOGIN_OAUTH_GITHUB',
            metodo: 'github'
        });
    }

    async function procesarLoginGoogle({ googleId, email, username }) {
        return await autenticarUsuarioOAuth({
            proveedor: 'Google',
            campoId: 'googleId',
            proveedorId: googleId,
            email,
            username,
            defaultUsername: 'Usuario Google',
            eventoLog: 'LOGIN_OAUTH_GOOGLE',
            metodo: 'google'
        });
    }

    /**
     * Obtiene la clasificación de jugadores ordenada por victorias y porcentaje de éxito.
     */
    async function obtenerRanking(limite = 10) {
        return await userRepo.obtenerRankingUsuarios(limite);
    }

    return {
        registrarUsuario,
        loginUsuario,
        confirmarCuenta,
        listarUsuarios,
        comprobarActivo,
        eliminarUsuario,
        procesarLoginGitHub,
        procesarLoginGoogle,
        cambiarRolUsuario,
        obtenerRanking
    };
}

module.exports = { createUserLogic };
