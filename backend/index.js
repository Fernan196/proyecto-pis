require('dotenv').config(); // Carga las variables de entorno
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Importamos mongoose

const { registrarUsuario, loginUsuario, listarUsuarios, comprobarActivo, eliminarUsuario, confirmarCuenta, loginConGitHub, cambiarRolUsuario } = require('./logic/userLogic'); // Importamos la lógica
const app = express();
const port = process.env.PORT || 3000;

const verificarToken = require('./logic/authMiddleware');
const verificarAdmin = require('./logic/adminMiddleware');

// Conexión a la base de datos
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch(err => console.error('Error conectando a MongoDB:', err));

app.use(cors()); // Permite peticiones desde el frontend (puerto 5173)
// Middleware para que Express entienda JSON
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API funcionando' });
});



// Capa de Presentación del servidor
app.post('/api/usuarios', async(req, res) => {
  try {
    const resultado = await registrarUsuario(req.body);
    res.status(201).json(resultado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Endpoint para confirmar el correo desde el enlace
app.get('/api/usuarios/confirmar/:token', async (req, res) => {
    try {
      await confirmarCuenta(req.params.token);
      // Redirige al frontend con query param de éxito
      return res.redirect(`${FRONTEND_URL}/login?confirmed=true`);
    } catch (error) {
      return res.redirect(`${FRONTEND_URL}/login?error=token_invalido`);
    }
});

app.get('/api/auth/github', (req, res) => {
    const redirectUri = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user:email`;
    res.redirect(redirectUri);
});

// Endpoint que recibe la respuesta de GitHub
app.get('/api/auth/github/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect(`${FRONTEND_URL}/login?error=oauth_fallido`);

    try {
        // 1. Obtener token de acceso de GitHub
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code
            })
        });
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) throw new Error('No access token de GitHub');

        // 2. Obtener datos de usuario de GitHub
        const userRes = await fetch('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const ghUser = await userRes.json();

        // 3. Obtener correo principal de GitHub
        let email = ghUser.email;
        if (!email) {
            const emailsRes = await fetch('https://api.github.com/user/emails', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const emails = await emailsRes.json();
            const primary = emails.find(e => e.primary && e.verified);
            email = primary ? primary.email : (emails[0] ? emails[0].email : null);
        }

        if (!email) {
            return res.redirect(`${FRONTEND_URL}/login?error=sin_email_en_github`);
        }

        // 4. Buscar o crear el usuario
        let usuario = await User.findOne({ email });

        if (!usuario) {
            // Se crea pero NO confirmado
            usuario = new User({
                username: ghUser.login || ghUser.name || 'Usuario GitHub',
                email,
                githubId: ghUser.id.toString(),
                rol: 'user',
                confirmado: false
            });
            await usuario.save();

            // Enviar email de activación
            const confirmToken = jwt.sign({ id: usuario._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            await enviarCorreoConfirmacion(usuario.email, confirmToken);

            return res.redirect(`${FRONTEND_URL}/login?github_pending=true&email=${encodeURIComponent(email)}`);
        }

        // Si ya existía pero aún no ha confirmado el correo:
        if (!usuario.confirmado) {
            const confirmToken = jwt.sign({ id: usuario._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            await enviarCorreoConfirmacion(usuario.email, confirmToken);
            return res.redirect(`${FRONTEND_URL}/login?github_pending=true&email=${encodeURIComponent(email)}`);
        }

        // Si ya está confirmado, se genera sesión y se entra al dashboard
        const sessionToken = jwt.sign(
            { id: usuario._id, email: usuario.email, username: usuario.username, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        return res.redirect(`${FRONTEND_URL}/login?oauth_token=${sessionToken}&user=${encodeURIComponent(JSON.stringify({
            id: usuario._id,
            username: usuario.username,
            email: usuario.email,
            rol: usuario.rol
        }))}`);

    } catch (err) {
        console.error('Error OAuth:', err);
        return res.redirect(`${FRONTEND_URL}/login?error=oauth_error`);
    }
});

//Login
app.post('/api/login', async (req, res) => {
  try {
    const data = await loginUsuario(req.body);
    res.json(data);
  } catch (error) {
    const status = error.code === 'ACCOUNT_NOT_CONFIRMED' ? 403 : 401;
    res.status(status).json({ error: error.message, code: error.code });
  }
});


// Listar usuarios solo para el admin
app.get('/api/usuarios', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const usuarios = await listarUsuarios();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Comprobar activo solo para el admin
app.get('/api/usuarios/:id/activo', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const isActivo = await comprobarActivo(req.params.id);
    res.json({ activo: isActivo });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Eliminar usuario solo para el admin y sin poder eliminarse a si mismo
app.delete('/api/usuarios/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    // Regla del apartado 4.2: El administrador no puede eliminar su propia cuenta
    if (req.user.id === req.params.id) {
        return res.status(400).json({ error: "No puedes eliminar tu propia cuenta de administrador" });
    }
    await eliminarUsuario(req.params.id);
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Cambiar rol de usuario (solo admin)
app.patch('/api/usuarios/:id/rol', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { nuevoRol } = req.body;
        const usuarioActualizado = await cambiarRolUsuario(req.params.id, nuevoRol);
        res.json({ mensaje: 'Rol actualizado con éxito', usuario: usuarioActualizado });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.listen(port, () => {
  console.log(`Servidor backend escuchando en el puerto ${port}`);
});