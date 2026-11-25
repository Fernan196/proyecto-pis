import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './home';
import Login from './login';
import Register from './register';
import Dashboard from './dashboard';
import GameBoard from './gameBoard';
import ProtectedRoute from './protectedRoutes';

function NotFoundPage() {
  return (
    <div className="not-found-wrapper">
      <div className="not-found-card">
        <span className="landing-pill">Error 404</span>
        <h1>Página no encontrada</h1>
        <p>
          La mesa o ruta que buscas no existe o ha cambiado de dirección.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="btn-nav-primary">Volver al Inicio</Link>
          <Link to="/login" className="btn-nav-ghost">Iniciar sesión</Link>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/partida/:codigo" element={<ProtectedRoute><GameBoard /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
