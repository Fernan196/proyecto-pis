const User = require('../data/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { enviarCorreoConfirmacion } = require('./mailer');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    // Comprobar dominios permitidos si la variable ALLOWED_DOMAINS está configurada
    if (process.env.ALLOWED_DOMAINS) {
        const { permitido } = comprobarDominioPermitido(email);
        if (!permitido) {
            throw new Error('El dominio del correo electrónico no está permitido');
        }
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

async function confirmarCuenta(token) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const usuario = await User.findById(decoded.id);

        if (!usuario) throw new Error('Usuario no encontrado');
        if (usuario.confirmado) return { yaConfirmado: true };

        usuario.confirmado = true;
        await usuario.save();
        return { yaConfirmado: false };
    } catch (err) {
        throw new Error('Enlace de activación inválido o expirado');
    }
}

async function listarUsuarios() {
    return await User.find().select('-password');
}

async function comprobarActivo(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('ID de usuario no válido');
    }
    const usuario = await User.findById(id);
    if (!usuario) throw new Error('Usuario no encontrado');
    return {
        id: usuario._id,
        email: usuario.email,
        activo: Boolean(usuario.confirmado)
    };
}

// CAMBIAR ROL: Protege contra la degradación del último administrador
async function cambiarRolUsuario(id, nuevoRol) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('ID de usuario no válido');
    }

    if (!['user', 'admin'].includes(nuevoRol)) {
        throw new Error('Rol no válido');
    }

    const usuario = await User.findById(id);
    if (!usuario) {
        throw new Error('Usuario no encontrado');
    }

    // Regla de integridad: no degradar al último administrador
    if (usuario.rol === 'admin' && nuevoRol === 'user') {
        const totalAdmins = await User.countDocuments({ rol: 'admin' });
        if (totalAdmins <= 1) {
            throw new Error('Operación cancelada: no puedes quitar privilegios al único administrador del sistema.');
        }
    }

    usuario.rol = nuevoRol;
    await usuario.save();

    const resultado = usuario.toObject();
    delete resultado.password;
    return resultado;
}

// ELIMINAR USUARIO: Protege contra la eliminación del último administrador
async function eliminarUsuario({ solicitanteId, solicitanteRol, objetivoId }) {
    if (!objetivoId || !mongoose.Types.ObjectId.isValid(objetivoId)) {
        const error = new Error('ID de usuario no válido');
        error.statusCode = 400;
        throw error;
    }

    if (solicitanteRol !== 'admin' && solicitanteId.toString() !== objetivoId.toString()) {
        const error = new Error('No tienes permiso para eliminar esta cuenta');
        error.statusCode = 403;
        throw error;
    }

    const usuarioAEliminar = await User.findById(objetivoId);
    if (!usuarioAEliminar) {
        const error = new Error('Usuario no encontrado');
        error.statusCode = 404;
        throw error;
    }

    // Regla de integridad: no borrar al último administrador
    if (usuarioAEliminar.rol === 'admin') {
        const totalAdmins = await User.countDocuments({ rol: 'admin' });
        if (totalAdmins <= 1) {
            const error = new Error('Operación cancelada: no es posible eliminar al único administrador del sistema.');
            error.statusCode = 400;
            throw error;
        }
    }

    await User.findByIdAndDelete(objetivoId);
    return { mensaje: 'Cuenta eliminada exitosamente' };
}

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
            confirmado: true
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


// COMPROBAR DOMINIO PERMITIDO 
function comprobarDominioPermitido(email) {
    if (typeof email !== 'string' || email.trim() === '' || !email.includes('@')) {
        const error = new Error('El campo email es obligatorio, debe ser texto y contener @');
        error.statusCode = 400;
        throw error;
    }

    const partes = email.trim().split('@');
    if (partes.length !== 2 || !partes[0] || !partes[1]) {
        const error = new Error('El formato del correo electrónico no es válido');
        error.statusCode = 400;
        throw error;
    }

    const dominioEmail = partes[1].trim().toLowerCase();

    const dominiosPermitidos = (process.env.ALLOWED_DOMAINS || '')
        .split(',')
        .map(d => d.trim().toLowerCase())
        .filter(Boolean);

    return {
        permitido: dominiosPermitidos.includes(dominioEmail)
    };
}

module.exports = {
    registrarUsuario,
    loginUsuario,
    confirmarCuenta,
    listarUsuarios,
    comprobarActivo,
    eliminarUsuario,
    procesarLoginGitHub,
    cambiarRolUsuario,
    comprobarDominioPermitido
};