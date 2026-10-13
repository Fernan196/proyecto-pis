const User = require('../data/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { enviarCorreoConfirmacion } = require('./mailer');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 1. REGISTRAR USUARIO
async function registrarUsuario(params, legacyPassword, legacyRol) {
    let email, password, username, rol;

    if (typeof params === 'string') {
        email = params;
        password = legacyPassword;
        rol = legacyRol || 'user';
        username = email ? email.split('@')[0] : 'usuario';
    } else {
        email = params.email;
        password = params.password;
        username = params.username || (email ? email.split('@')[0] : 'usuario');
        rol = params.rol || 'user';
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

    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) {
        throw new Error('El correo electrónico ya está registrado');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const nuevoUsuario = new User({
        username,
        email,
        password: passwordHash,
        rol,
        confirmado: false
    });

    const usuarioGuardado = await nuevoUsuario.save();

    const tokenConfirmacion = jwt.sign(
        { id: usuarioGuardado._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    await enviarCorreoConfirmacion(usuarioGuardado.email, tokenConfirmacion);

    return {
        mensaje: 'Usuario registrado. Por favor, revisa tu correo para activar tu cuenta.',
        userId: usuarioGuardado._id
    };
}

// 2. LOGIN USUARIO LOCAL
async function loginUsuario({ email, password }) {
    if (!email || !password) {
        throw new Error('Email y contraseña requeridos');
    }

    const usuario = await User.findOne({ email });
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
            id: usuario._id, 
            email: usuario.email, 
            username: usuario.username, 
            rol: usuario.rol 
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    return {
        token,
        user: {
            id: usuario._id,
            username: usuario.username,
            email: usuario.email,
            rol: usuario.rol
        }
    };
}

// 3. CONFIRMAR CUENTA
async function confirmarCuenta(token) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const usuario = await User.findById(decoded.id);

        if (!usuario) {
            throw new Error('Usuario no encontrado');
        }

        if (usuario.confirmado) {
            return { yaConfirmado: true };
        }

        usuario.confirmado = true;
        await usuario.save();

        return { yaConfirmado: false };
    } catch (err) {
        throw new Error('Enlace de activación inválido o expirado');
    }
}

// 4. LISTAR USUARIOS (Solo admin)
async function listarUsuarios() {
    return await User.find().select('-password');
}

// 5. COMPROBAR SI UN USUARIO ESTÁ ACTIVO
async function comprobarActivo(id) {
    const usuario = await User.findById(id);
    if (!usuario) {
        throw new Error('Usuario no encontrado');
    }
    // Según apartado 4.2: activo si está confirmado y no eliminado
    return {
        id: usuario._id,
        email: usuario.email,
        activo: Boolean(usuario.confirmado)
    };
}

// 6. ELIMINAR USUARIO (Aplica reglas de seguridad del apartado 4.2)
async function eliminarUsuario({ solicitanteId, solicitanteRol, objetivoId }) {
    if (solicitanteRol !== 'admin' && solicitanteId.toString() !== objetivoId.toString()) {
        const error = new Error('No tienes permiso para eliminar esta cuenta');
        error.statusCode = 403;
        throw error;
    }

    const usuarioEliminado = await User.findByIdAndDelete(objetivoId);
    if (!usuarioEliminado) {
        const error = new Error('Usuario no encontrado');
        error.statusCode = 404;
        throw error;
    }

    return { mensaje: 'Cuenta eliminada exitosamente' };
}

// 7. LOGIN / REGISTRO MEDIANTE GITHUB OAUTH
async function procesarLoginGitHub({ githubId, email, username }) {
    if (!email) {
        throw new Error('El perfil de GitHub no proporciona un correo electrónico');
    }

    let usuario = await User.findOne({ email });

    if (!usuario) {
        usuario = new User({
            username: username || 'Usuario GitHub',
            email,
            githubId: githubId.toString(),
            rol: 'user',
            confirmado: true // Según apartado 4.2: OAuth activa directamente la cuenta
        });
        await usuario.save();
    } else if (!usuario.confirmado) {
        usuario.confirmado = true;
        if (!usuario.githubId) usuario.githubId = githubId.toString();
        await usuario.save();
    }

    const token = jwt.sign(
        { 
            id: usuario._id, 
            email: usuario.email, 
            username: usuario.username, 
            rol: usuario.rol 
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    return {
        token,
        user: {
            id: usuario._id,
            username: usuario.username,
            email: usuario.email,
            rol: usuario.rol
        }
    };
}

// 8. CAMBIAR ROL DE USUARIO
async function cambiarRolUsuario(id, nuevoRol) {
    if (!['user', 'admin'].includes(nuevoRol)) {
        throw new Error('Rol no válido');
    }
    const usuario = await User.findByIdAndUpdate(
        id, 
        { rol: nuevoRol }, 
        { new: true }
    ).select('-password');

    if (!usuario) {
        throw new Error('Usuario no encontrado');
    }

    return usuario;
}

module.exports = {
    registrarUsuario,
    loginUsuario,
    confirmarCuenta,
    listarUsuarios,
    comprobarActivo,
    eliminarUsuario,
    procesarLoginGitHub,
    cambiarRolUsuario
};