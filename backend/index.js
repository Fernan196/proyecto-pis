const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API funcionando' });
});

app.listen(port, () => {
  console.log(`Servidor backend escuchando en el puerto ${port}`);
});