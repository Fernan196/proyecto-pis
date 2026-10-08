require('dotenv').config(); // Carga las variables de entorno
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Importamos mongoose

const { registrarUsuario, loginUsuario, listarUsuarios, comprobarActivo, eliminarUsuario, confirmarCuenta, loginConGitHub } = require('./logic/userLogic'); // Importamos la lógica
const app = express();
const port = process.env.PORT || 3000;

const verificarToken = require('./logic/authMiddleware');
const verificarAdmin = require('./logic/adminMiddleware');

// Conexión a la base de datos
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado a MongoDB local'))
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
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña obligatorios" });
    }
    const nuevoUsuario = registrarUsuario(email, password);
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Endpoint para confirmar el correo desde el enlace
app.get('/api/usuarios/confirmar/:token', async (req, res) => {
    try {
        await confirmarCuenta(req.params.token);
        // Si va bien, mostramos un mensaje de éxito HTML
        res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #4CAF50;">¡Cuenta activada con éxito! 🎉</h1>
                <p>Tu correo ha sido verificado. Ya puedes volver a la aplicación e iniciar sesión.</p>
            </div>
        `);
    } catch (error) {
        // Si el token es falso o caducado, mostramos error
        res.status(400).send(`
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #f44336;">Error al activar la cuenta</h1>
                <p>${error.message}</p>
            </div>
        `);
    }
});

// Endpoint que recibe la respuesta de GitHub
app.get('/api/auth/github/callback', async (req, res) => {
    const code = req.query.code; // GitHub nos pasa esto en la URL
    
    try {
        const token = await loginConGitHub(code);
        // Redirigimos al Dashboard de React y le pasamos el token
        res.redirect(`http://localhost:5173/dashboard?token=${token}`);
    } catch (error) {
        console.error("Error real de OAuth:", error.message);
        // Si algo falla, lo mandamos al login con un error
        res.redirect(`http://localhost:5173/login?error=Fallo_OAuth`);
    }
});

//Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginUsuario(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
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

app.listen(port, () => {
  console.log(`Servidor backend escuchando en el puerto ${port}`);
});