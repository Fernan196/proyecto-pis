// backend/logic/userLogic.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../data/userModel'); // Importamos la Capa de Datos
const SECRET_KEY = process.env.JWT_SECRET || 'clave_secreta_para_los_tests';

const { enviarCorreoConfirmacion } = require('./mailer');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function registrarUsuario({ username, email, password, rol = 'user' }) {
    if (!username || !email || !password) {
        throw new Error('Todos los campos son obligatorios');
    }

    if (!EMAIL_REGEX.test(email)) {
        throw new Error('El formato del correo electrónico no es válido');
    }

    if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
    // Consultamos a la BD si el email ya existe
    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) throw new Error("El usuario ya existe");
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Mongoose crea el registro en la base de datos
    const newUser = await User.create({
        username,
        email,
        password: hashedPassword, // En el Hito 2 (Sesiones) aplicaremos el hash bcrypt
        confirmado: false, // Según el apartado 4.1
        rol
    });
   
    // Generamos un token temporal válido por 1 hora
    const tokenConfirmacion = jwt.sign({ id: newUser._id }, SECRET_KEY, { expiresIn: '1h' });

    // Si no estamos ejecutando los tests, enviamos el correo
    if (process.env.NODE_ENV !== 'test') {
        try {
            await enviarCorreoConfirmacion(email, tokenConfirmacion);
        } catch (error) {
            console.error("Error al enviar el email:", error.message);
        }
    }
   
    return {
        mensaje: 'Usuario registrado. Por favor, revisa tu correo para activar tu cuenta.',
        userId: newUser._id
    };
}

async function loginUsuario({email, password}) {
    if (!email || !password) {
        throw new Error('Email y contraseña requeridos');
    }

    const usuario = await User.findOne({ email });
    if (!usuario) {
        throw new Error('Credenciales incorrectas');
    }

    // BLOQUEO: Comprobar si la cuenta está activada
    if (!usuario.confirmado) {
        const error = new Error('Debes confirmar tu cuenta por correo electrónico antes de poder iniciar sesión.');
        error.code = 'ACCOUNT_NOT_CONFIRMED';
        throw error;
    }

    // Comparamos el texto plano con el hash guardado
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Credenciales inválidas");

    // Generamos el token de sesión (JWT)
    const token = jwt.sign(
        { id: usuario._id, email: usuario.email, rol: usuario.rol, confirmado: usuario.confirmado },
        SECRET_KEY,
        { expiresIn: '2h' }
    );
    return { token,  user: { id: usuario._id, email: usuario.email, rol: usuario.rol } };
}

async function listarUsuarios() {
    // El apartado 4.2 dice que el listado no debe incluir contraseñas
    return await User.find({}); // Devuelve todos los usuarios
}

async function comprobarActivo(id) {
    const user = await User.findById(id);
    if (!user) throw new Error("Usuario no encontrado");
    // Según el apartado 4.2: está activo si su estado es 'activo' y no está eliminado
    return user.confirmado === true;
}

async function eliminarUsuario(id) {
    const user = await User.findByIdAndDelete(id);
    if (!user) throw new Error("Usuario no encontrado");
    return true;
}

async function confirmarCuenta(token) {
    try {
        // Verificamos que el token sea válido y no haya caducado
        const decoded = jwt.verify(token, SECRET_KEY);
        const user = await User.findById(decoded.id);
        
        if (!user) throw new Error("Usuario no encontrado");
        if (user.confirmado === true) return true; // Si ya estaba activo, no hacemos nada

        // Cambiamos el estado a activo y guardamos
        user.confirmado = true;
        await user.save();
        return true;
    } catch (error) {
        throw new Error("El enlace de confirmación es inválido o ha expirado.");
    }
}
async function cambiarRolUsuario(id, nuevoRol) {
    if (!['user', 'admin'].includes(nuevoRol)) {
        throw new Error('Rol no válido');
    }
    const usuario = await User.findByIdAndUpdate(id, { rol: nuevoRol }, { new: true }).select('-password');
    if (!usuario) throw new Error('Usuario no encontrado');
    return usuario;
}

async function loginConGitHub(code) {
    // 1. Intercambiamos el 'code' por un token de acceso de GitHub
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json' // Pedimos que nos responda en JSON
        },
        body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code: code
        })
    });
    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
    console.error("Motivo del rechazo de GitHub:", tokenData);
    throw new Error("Error al autenticar con GitHub");
}

    // 2. Usamos el token de GitHub para pedir el email del usuario
    const userResponse = await fetch('https://api.github.com/user/emails', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}`,
                    'User-Agent': 'Proyecto PIS'
                }
    });
    const emails = await userResponse.json();
    
    // Buscamos el email principal de su cuenta
    const emailPrincipal = emails.find(e => e.primary).email;

    // 3. Buscamos al usuario en nuestra BBDD
    let user = await User.findOne({ email: emailPrincipal });
    
    if (!user) {
        // Si no existe, lo registramos automáticamente como activo
        user = await User.create({
            email: emailPrincipal,
            password: 'OAUTH_GITHUB_USER', // Contraseña inútil por diseño
            confirmado: true,
            rol: 'usuario'
        });
    } else if (user.confirmado !== true) {
        // Si existía pero estaba pendiente, lo activamos
        user.confirmado = true;
        await user.save();
    }

    // 4. Generamos nuestro token JWT normal para que el frontend lo entienda
    const token = jwt.sign(
        { id: user._id, rol: user.rol }, 
        SECRET_KEY, 
        { expiresIn: '1h' }
    );

    return token;
}

// Exportamos la función y el array para poder testearlos
module.exports = { registrarUsuario, loginUsuario, listarUsuarios, comprobarActivo, eliminarUsuario, confirmarCuenta, loginConGitHub, cambiarRolUsuario };