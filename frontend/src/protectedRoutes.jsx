import { Navigate, useLocation} from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    // Usamos useLocation para poder leer la URL actual
    const location = useLocation();
    
    // 1. Miramos si la URL trae un token (venimos de GitHub)
    const urlParams = new URLSearchParams(location.search);
    const tokenFromUrl = urlParams.get('token');

    if (tokenFromUrl) {
        // Lo guardamos inmediatamente antes de que salte el bloqueo
        localStorage.setItem('token', tokenFromUrl);
    }

    // 2. Comprobamos el token normal en localStorage
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/login" />;
    }

    return children;
};

export default ProtectedRoute;