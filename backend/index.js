require('dotenv').config();
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const userRepo = require('./data/userModel');
const { createMailer } = require('./services/mailer');
const { createUserLogic } = require('./logic/userLogic');
const roomLogic = require('./logic/roomLogic');
const gameLogic = require('./logic/gameLogic');
const socketManager = require('./logic/socketManager');
const authMiddleware = require('./logic/authMiddleware');
const adminMiddleware = require('./logic/adminMiddleware');
const logger = require('./logic/logger');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://proyecto-pis.vercel.app';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

const mailer = createMailer({
    emailUser: process.env.EMAIL_USER,
    emailPass: process.env.EMAIL_PASS,
    backendUrl: BACKEND_URL
});
const userLogic = createUserLogic({ userRepo, mailer, logger });

const io = new Server(server, {
    cors: { origin: FRONTEND_URL, credentials: true }
});
socketManager.configurarSocketIO(io);

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.registrarEvento('DB_CONECTADA', { motor: 'MongoDB Atlas' }))
    .catch(err => logger.registrarError('DB_ERROR_CONEXION', err));

// 1. Registro
app.post('/api/usuarios', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const resultado = await userLogic.registrarUsuario({ username, email, password });
        res.status(201).json(resultado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 2. Login
app.post('/api/login', async (req, res) => {
    try {
        const data = await userLogic.loginUsuario(req.body);
        res.json(data);
    } catch (error) {
        const status = error.code === 'ACCOUNT_NOT_CONFIRMED' ? 403 : 401;
        res.status(status).json({ error: error.message, code: error.code });
    }
});

// 3. Confirmación de cuenta
app.get('/api/usuarios/confirmar/:token', async (req, res) => {
    try {
        await userLogic.confirmarCuenta(req.params.token);
        return res.redirect(`${FRONTEND_URL}/login?confirmed=true`);
    } catch (error) {
        return res.redirect(`${FRONTEND_URL}/login?error=token_invalido`);
    }
});

// 4. OAuth GitHub
app.get('/api/auth/github', (req, res) => {
    const redirectUri = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user:email`;
    res.redirect(redirectUri);
});

app.get('/api/auth/github/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect(`${FRONTEND_URL}/login?error=oauth_fallido`);

    try {
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code
            })
        });
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) throw new Error('No access token de GitHub');

        const userRes = await fetch('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const ghUser = await userRes.json();

        let email = ghUser.email;
        if (!email) {
            const emailsRes = await fetch('https://api.github.com/user/emails', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const emails = await emailsRes.json();
            const primary = emails.find(e => e.primary && e.verified);
            email = primary ? primary.email : (emails[0] ? emails[0].email : null);
        }

        const { token, user } = await userLogic.procesarLoginGitHub({
            githubId: ghUser.id,
            email,
            username: ghUser.login || ghUser.name
        });

        return res.redirect(`${FRONTEND_URL}/login?oauth_token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
    } catch (err) {
        logger.registrarError('OAUTH_GITHUB_ERROR', err);
        return res.redirect(`${FRONTEND_URL}/login?error=oauth_error`);
    }
});

// 5. Listar usuarios (solo admin)
app.get('/api/usuarios', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const usuarios = await userLogic.listarUsuarios();
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Comprobar si un usuario está activo (solo admin)
app.get('/api/usuarios/:id/activo', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const estado = await userLogic.comprobarActivo(req.params.id);
        res.json(estado);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// 7. Cambiar rol (solo admin)
app.patch('/api/usuarios/:id/rol', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const usuarioActualizado = await userLogic.cambiarRolUsuario(req.params.id, req.body.nuevoRol);
        res.json({ mensaje: 'Rol actualizado', usuario: usuarioActualizado });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 8. Eliminar usuario (admin a cualquiera; usuario a sí mismo)
app.delete('/api/usuarios/:id', authMiddleware, async (req, res) => {
    try {
        const resultado = await userLogic.eliminarUsuario({
            solicitanteId: req.user.id,
            solicitanteRol: req.user.rol,
            objetivoId: req.params.id
        });
        res.json(resultado);
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// 9. Consultar registro de actividad (solo admin)
app.get('/api/logs', authMiddleware, adminMiddleware, (req, res) => {
    const limite = Number(req.query.limite) || 50;
    res.json(logger.obtenerLogs(limite));
});

// 10. Gestión de salas (Lobby)
app.post('/api/salas', authMiddleware, async (req, res) => {
    try {
        const sala = await roomLogic.crearSala({
            hostId: req.user.id,
            hostUsername: req.user.username || req.user.email,
            nombre: req.body?.nombre,
            maxJugadores: req.body?.maxJugadores
        });
        res.status(201).json(sala);
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
});

app.get('/api/salas', authMiddleware, async (req, res) => {
    try {
        const salas = await roomLogic.listarSalasDisponibles();
        res.json(salas);
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

app.get('/api/salas/:codigo', authMiddleware, async (req, res) => {
    try {
        const sala = await roomLogic.obtenerSala(req.params.codigo);
        res.json(sala);
    } catch (error) {
        res.status(error.statusCode || 404).json({ error: error.message });
    }
});

app.post('/api/salas/:codigo/unirse', authMiddleware, async (req, res) => {
    try {
        const sala = await roomLogic.unirseASala({
            codigo: req.params.codigo,
            userId: req.user.id,
            username: req.user.username || req.user.email
        });
        socketManager.emitirActualizacionSala(sala.codigo, sala);
        res.json(sala);
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
});

app.post('/api/salas/:codigo/salir', authMiddleware, async (req, res) => {
    try {
        const resultado = await roomLogic.salirDeSala({
            codigo: req.params.codigo,
            userId: req.user.id
        });
        if (resultado.eliminada) {
            socketManager.emitirSalaEliminada(resultado.codigo);
        } else if (resultado.sala) {
            socketManager.emitirActualizacionSala(resultado.sala.codigo, resultado.sala);
        }
        res.json(resultado);
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
});

app.post('/api/salas/:codigo/iniciar', authMiddleware, async (req, res) => {
    try {
        const resultado = await gameLogic.iniciarPartidaDesdeSala({
            codigoSala: req.params.codigo,
            solicitanteId: req.user.id
        });
        socketManager.emitirActualizacionSala(resultado.codigo, resultado);
        socketManager.emitirEstadoPartidaPorJugador(resultado.partida, {
            evento: 'PARTIDA_INICIADA',
            actorUserId: String(req.user.id)
        });
        res.json(resultado);
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
});

// 11. Motor de juego (Partidas)
app.get('/api/partidas/:codigo', authMiddleware, async (req, res) => {
    try {
        const vista = await gameLogic.obtenerPartidaVistaJugador({
            codigoSala: req.params.codigo,
            userId: req.user.id
        });
        res.json(vista);
    } catch (error) {
        res.status(error.statusCode || 404).json({ error: error.message });
    }
});

app.post('/api/partidas/:codigo/jugar', authMiddleware, async (req, res) => {
    try {
        const resultado = await gameLogic.jugarCarta({
            codigoSala: req.params.codigo,
            userId: req.user.id,
            tipoCarta: req.body?.tipoCarta,
            objetivoUserId: req.body?.objetivoUserId
        });
        if (resultado.evento === 'VISION_FUTURO') {
            socketManager.emitirCartasFuturoPrivadas(
                req.user.id,
                resultado.partida.codigoSala,
                resultado.cartasFuturo
            );
        }
        socketManager.emitirEstadoPartidaPorJugador(resultado.partida, {
            evento: resultado.evento,
            tipoCarta: resultado.tipoCarta,
            actorUserId: String(req.user.id)
        });
        res.json({
            ...resultado,
            vistaJugador: gameLogic.obtenerVistaJugador(resultado.partida, req.user.id)
        });
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
});

app.post('/api/partidas/:codigo/robar', authMiddleware, async (req, res) => {
    try {
        const resultado = await gameLogic.robarCarta({
            codigoSala: req.params.codigo,
            userId: req.user.id,
            posicionBomba: req.body?.posicionBomba
        });
        socketManager.emitirEstadoPartidaPorJugador(resultado.partida, {
            evento: resultado.evento,
            actorUserId: String(req.user.id)
        });
        res.json({
            ...resultado,
            vistaJugador: gameLogic.obtenerVistaJugador(resultado.partida, req.user.id)
        });
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
});

app.post('/api/partidas/:codigo/reinsertar-bomba', authMiddleware, async (req, res) => {
    try {
        const resultado = await gameLogic.reinsertarBomba({
            codigoSala: req.params.codigo,
            userId: req.user.id,
            posicionBomba: req.body?.posicionBomba
        });
        socketManager.emitirEstadoPartidaPorJugador(resultado.partida, {
            evento: resultado.evento,
            actorUserId: String(req.user.id)
        });
        res.json({
            ...resultado,
            vistaJugador: gameLogic.obtenerVistaJugador(resultado.partida, req.user.id)
        });
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
});

// 12. Reconexión y Ranking de jugadores
app.get('/api/ranking', authMiddleware, async (req, res) => {
    try {
        const limite = Number(req.query.limite) || 10;
        const ranking = await userLogic.obtenerRanking(limite);
        res.json(ranking);
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

app.get('/api/sesion-juego/activa', authMiddleware, async (req, res) => {
    try {
        const sesion = await gameLogic.obtenerSesionJuegoActiva(req.user.id);
        res.json(sesion);
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    logger.registrarEvento('SERVIDOR_INICIADO', { puerto: PORT });
});