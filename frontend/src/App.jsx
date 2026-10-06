import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Login from './login';
import Register from './register';
import Dashboard from './dashboard';
import ProtectedRoute from './protectedRoutes';


function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <nav style={{ marginBottom: '20px' }}>
          <Link to="/login" style={{ marginRight: '10px' }}>Iniciar Sesión</Link>
          <Link to="/register">Registrarse</Link>
        </nav>

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute> <Dashboard /> </ProtectedRoute>}/>
          <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;