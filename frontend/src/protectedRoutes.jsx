import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  
  // Si no hay token guardado, redirige automáticamente al login
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  // Si hay token, renderiza el componente hijo (ej. el Dashboard)
  return children;
}