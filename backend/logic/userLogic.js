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

// Exportamos la función y el array para poder testearlos
module.exports = { registrarUsuario, users };