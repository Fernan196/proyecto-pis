const express = require('express');
const cors = require('cors');
const { registrarUsuario, listarUsuarios, comprobarActivo, eliminarUsuario } = require('./logic/userLogic'); // Importamos la lógica
const app = express();
const port = process.env.PORT || 3000;


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


// Listar usuarios
app.get('/api/usuarios', (req, res) => {
  res.json(listarUsuarios());
});

// Comprobar activo
app.get('/api/usuarios/:id/activo', (req, res) => {
  try {
    const isActivo = comprobarActivo(req.params.id);
    res.json({ activo: isActivo });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Eliminar usuario
app.delete('/api/usuarios/:id', (req, res) => {
  try {
    eliminarUsuario(req.params.id);
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor backend escuchando en el puerto ${port}`);
});