const express = require('express');
const { registrarUsuario } = require('./logic/userLogic'); // Importamos la lógica
const app = express();
const port = process.env.PORT || 3000;

// Middleware para que Express entienda JSON
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API funcionando' });
});

// Capa de Presentación del servidor
app.post('/api/usuarios', (req, res) => {
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

app.listen(port, () => {
  console.log(`Servidor backend escuchando en el puerto ${port}`);
});