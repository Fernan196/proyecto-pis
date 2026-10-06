const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'super-secreto-desarrollo';

function verificarToken(req, res, next) {
    // El token se suele enviar en la cabecera 'Authorization' como 'Bearer <token>'
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. No hay sesión válida.' });
    }

    try {
        const usuarioVerificado = jwt.verify(token, SECRET_KEY);
        req.user = usuarioVerificado; // Guardamos los datos del usuario en la request
        next(); // El token es válido, pasamos a la ruta
    } catch (error) {
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

module.exports = verificarToken;