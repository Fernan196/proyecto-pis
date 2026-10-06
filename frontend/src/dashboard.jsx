import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Eliminamos el token para invalidar la sesión
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', textAlign: 'center' }}>
      <h2>Dashboard Privado</h2>
      <p>¡Bienvenido! Has iniciado sesión correctamente.</p>
      <button 
        onClick={handleLogout} 
        style={{ backgroundColor: 'red', color: 'white', padding: '10px', marginTop: '20px' }}>
        Cerrar Sesión
      </button>
    </div>
  );
}