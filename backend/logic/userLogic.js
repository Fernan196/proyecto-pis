// backend/logic/userLogic.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

let users = [];
const SECRET_KEY = process.env.JWT_SECRET || 'super-secreto-desarrollo'; // En el Hito 3 usaremos variables de entorno reales

async function registrarUsuario(email, password) {
    // Comprobamos si ya existe
    if (users.find(u => u.email === email)) {
        throw new Error("El usuario ya existe");
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
        id: Date.now().toString(),
        email,
        password: hashedPassword, // En el Hito 2 (Sesiones) aplicaremos el hash bcrypt
        estado: 'pendiente', // Según el apartado 4.1
        rol: 'usuario'
    };
    
    users.push(newUser);
    return newUser;
}

async function loginUsuario(email, password) {
    const user = users.find(u => u.email === email);
    if (!user) throw new Error("Credenciales inválidas");

    // Comparamos el texto plano con el hash guardado
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Credenciales inválidas");

    // Generamos el token de sesión (JWT)
    const token = jwt.sign(
        { id: user.id, email: user.email, rol: user.rol, estado: user.estado },
        SECRET_KEY,
        { expiresIn: '2h' }
    );
    return { token, user: { id: user.id, email: user.email, rol: user.rol } };
}

function listarUsuarios() {
    // El apartado 4.2 dice que el listado no debe incluir contraseñas
    return users.map(({ password, ...userSinPassword }) => userSinPassword);
}

function comprobarActivo(id) {
    const user = users.find(u => u.id === id);
    if (!user) throw new Error("Usuario no encontrado");
    // Según el apartado 4.2: está activo si su estado es 'activo' y no está eliminado
    return user.estado === 'activo';
}

function eliminarUsuario(id) {
    const index = users.findIndex(u => u.id === id);
    if (index === -1) throw new Error("Usuario no encontrado");
    users.splice(index, 1);
    return true;
}

// Exportamos la función y el array para poder testearlos
module.exports = { registrarUsuario, loginUsuario, listarUsuarios, comprobarActivo, eliminarUsuario, users };