// backend/logic/userLogic.js
let users = [];

function registrarUsuario(email, password) {
    // Comprobamos si ya existe
    if (users.find(u => u.email === email)) {
        throw new Error("El usuario ya existe");
    }
    
    const newUser = {
        id: Date.now().toString(),
        email,
        password, // En el Hito 2 (Sesiones) aplicaremos el hash bcrypt
        estado: 'pendiente', // Según el apartado 4.1
        rol: 'usuario'
    };
    
    users.push(newUser);
    return newUser;
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
module.exports = { registrarUsuario, listarUsuarios, comprobarActivo, eliminarUsuario, users };