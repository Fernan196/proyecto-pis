// backend/logic/userLogic.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../data/userModel'); // Importamos la Capa de Datos
const SECRET_KEY = process.env.JWT_SECRET || 'clave_secreta_para_los_tests';

const { enviarCorreoConfirmacion } = require('./mailer');

async function registrarUsuario(email, password) {
    // Consultamos a la BD si el email ya existe
    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) throw new Error("El usuario ya existe");
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Mongoose crea el registro en la base de datos
    const newUser = await User.create({
        email,
        password: hashedPassword, // En el Hito 2 (Sesiones) aplicaremos el hash bcrypt
        estado: 'pendiente', // Según el apartado 4.1
        rol: 'usuario'
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
   
    return newUser;
}

async function loginUsuario(email, password) {
    const user = await User.findOne({ email });
    if (!user) throw new Error("Credenciales inválidas");

    // Comparamos el texto plano con el hash guardado
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Credenciales inválidas");

    // Generamos el token de sesión (JWT)
    const token = jwt.sign(
        { id: user._id, email: user.email, rol: user.rol, estado: user.estado },
        SECRET_KEY,
        { expiresIn: '2h' }
    );
    return { token, user: { id: user._id, email: user.email, rol: user.rol } };
}

async function listarUsuarios() {
    // El apartado 4.2 dice que el listado no debe incluir contraseñas
    return await User.find({}); // Devuelve todos los usuarios
}

async function comprobarActivo(id) {
    const user = await User.findById(id);
    if (!user) throw new Error("Usuario no encontrado");
    // Según el apartado 4.2: está activo si su estado es 'activo' y no está eliminado
    return user.estado === 'activo';
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
        if (user.estado === 'activo') return true; // Si ya estaba activo, no hacemos nada

        // Cambiamos el estado a activo y guardamos
        user.estado = 'activo';
        await user.save();
        return true;
    } catch (error) {
        throw new Error("El enlace de confirmación es inválido o ha expirado.");
    }
}

// Exportamos la función y el array para poder testearlos
module.exports = { registrarUsuario, loginUsuario, listarUsuarios, comprobarActivo, eliminarUsuario, confirmarCuenta };