// backend/logic/userLogic.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../data/userModel'); // Importamos la Capa de Datos
const SECRET_KEY = process.env.JWT_SECRET 

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

// Exportamos la función y el array para poder testearlos
module.exports = { registrarUsuario, loginUsuario, listarUsuarios, comprobarActivo, eliminarUsuario };