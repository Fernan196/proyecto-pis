// backend/logic/adminMiddleware.js
function verificarAdmin(req, res, next) {
    // req.user existe gracias a que antes pasamos por el verificarToken
    if (req.user && req.user.rol === 'administrador') {
        next(); // Es admin, le dejamos pasar
    } else {
        res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }
}

module.exports = verificarAdmin;