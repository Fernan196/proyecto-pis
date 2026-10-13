function adminMiddleware(req, res, next) {
    if (!req.user || req.user.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
    }
    next();
}

module.exports = adminMiddleware;