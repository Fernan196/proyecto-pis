import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { obtenerUsuarios, eliminarUsuario } from './services/api';

function Dashboard() {
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [esAdmin, setEsAdmin] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // 1. Miramos si hay un token en la URL (venimos de GitHub)
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');

        if (tokenFromUrl) {
            // Si hay token, lo guardamos y limpiamos la URL para que no se vea el choricillo de letras
            localStorage.setItem('token', tokenFromUrl);
            window.history.replaceState({}, document.title, "/dashboard");
        }

        // 2. Flujo normal: comprobamos si hay token en localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        // Intentamos obtener usuarios. Si el backend nos deja, somos admin.
        obtenerUsuarios(token)
            .then((data) => {
                setUsuarios(data);
                setEsAdmin(true);
            })
            .catch(() => {
                setEsAdmin(false); // Si da error 403, es un usuario normal
            });
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleEliminar = async (id) => {
        const token = localStorage.getItem('token');
        try {
            await eliminarUsuario(id, token);
            // Actualizamos la tabla borrando al usuario eliminado visualmente
            setUsuarios(usuarios.filter(user => user.id !== id));
            setError('');
        } catch (err) {
            setError('No puedes eliminar a este usuario (Regla: Un admin no puede borrarse a sí mismo).');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Dashboard</h1>
                <button onClick={handleLogout} style={{ padding: '10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '5px' }}>
                    Cerrar Sesión
                </button>
            </div>

            {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

            {esAdmin ? (
                <div>
                    <h2>👨‍💻 Panel de Administración</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f2f2f2', textAlign: 'left' }}>
                                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Email</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Rol</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Estado</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map(user => (
                                <tr key={user.id}>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{user.email}</td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{user.rol}</td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{user.estado}</td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                        <button onClick={() => handleEliminar(user.id)} style={{ backgroundColor: '#ff9800', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer' }}>
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div>
                    <h2>👋 Bienvenido a tu área personal</h2>
                    <p>Tu cuenta tiene perfil de <strong>usuario estándar</strong>. No tienes privilegios para ver ni gestionar a otros miembros de la plataforma.</p>
                </div>
            )}
        </div>
    );
}

export default Dashboard;