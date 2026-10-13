import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { obtenerUsuarios, cambiarRol, eliminarUsuario } from './services/api';

export default function Dashboard() {
    const [user, setUser] = useState(null);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!storedUser || !token) {
            navigate('/login');
            return;
        }

        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        if (parsedUser.rol === 'admin') {
            cargarUsuarios(token);
        } else {
            setLoading(false);
        }
    }, [navigate]);

    const cargarUsuarios = async (token) => {
        try {
            const data = await obtenerUsuarios(token);
            setUsuarios(data);
        } catch (err) {
            setError('Error al cargar la lista de usuarios');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleRol = async (id, rolActual) => {
        if (!id) {
            alert('Error: ID de usuario no encontrado');
            return;
        }
        const token = localStorage.getItem('token');
        const nuevoRol = rolActual === 'admin' ? 'user' : 'admin';
        try {
            await cambiarRol(id, nuevoRol, token);
            setUsuarios(usuarios.map(u => (u._id === id || u.id === id) ? { ...u, rol: nuevoRol } : u));
        } catch (err) {
            alert(err.message);
        }
    };

    const handleEliminar = async (id) => {
        if (!id) {
            alert('Error: ID de usuario no encontrado');
            return;
        }
        if (!window.confirm('¿Seguro que deseas eliminar este usuario?')) return;
        const token = localStorage.getItem('token');
        try {
            await eliminarUsuario(id, token);
            const currentUserId = user?.id || user?._id;
            if (id === currentUserId) {
                handleLogout();
            } else {
                setUsuarios(usuarios.filter(u => (u._id !== id && u.id !== id)));
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const currentUserId = user?.id || user?._id;

    return (
        <div>
            <nav className="dashboard-nav">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '0.75rem',
                        background: '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700
                    }}>
                        PIS
                    </div>
                    <div>
                        <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Proyecto PIS</h2>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Panel SaaS</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.username || user?.email}</p>
                        <span className={`role-badge ${user?.rol === 'admin' ? 'role-admin' : 'role-user'}`}>
                            {user?.rol === 'admin' ? 'Administrador' : 'Usuario'}
                        </span>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="btn-action"
                        style={{ background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </nav>

            <main className="dashboard-container">
                <div className="welcome-card">
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#818cf8' }}>
                        Dashboard General
                    </span>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
                        ¡Hola, {user?.username || user?.email}! 👋
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        Has iniciado sesión satisfactoriamente en la plataforma. Tu cuenta está verificada y activa.
                    </p>

                    {user?.rol !== 'admin' && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <button
                                onClick={() => handleEliminar(currentUserId)}
                                className="btn-action btn-delete"
                                style={{ padding: '0.5rem 1rem' }}
                            >
                                Eliminar mi cuenta
                            </button>
                        </div>
                    )}
                </div>

                {user?.rol === 'admin' && (
                    <div className="data-table-container">
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Gestión de Usuarios del Sistema</h3>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                Control de roles, comprobación de estado y eliminación (Total: {usuarios.length} cuentas)
                            </p>
                        </div>

                        {error && <div className="alert alert-error" style={{ margin: '1rem' }}>{error}</div>}

                        {loading ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Usuario</th>
                                            <th>Correo</th>
                                            <th>Estado</th>
                                            <th>Rol</th>
                                            <th style={{ textAlign: 'right' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usuarios.map((u) => {
                                            const uid = u._id || u.id;
                                            const esMismoUsuario = uid === currentUserId;

                                            return (
                                                <tr key={uid}>
                                                    <td style={{ fontWeight: 600 }}>{u.username || 'Sin nombre'}</td>
                                                    <td style={{ color: '#cbd5e1' }}>{u.email}</td>
                                                    <td>
                                                        <span className={`status-badge ${u.confirmado ? 'status-active' : 'status-pending'}`}>
                                                            {u.confirmado ? '● Activo' : '● Pendiente'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`role-badge ${u.rol === 'admin' ? 'role-admin' : 'role-user'}`}>
                                                            {u.rol}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                        <button
                                                            onClick={() => handleToggleRol(uid, u.rol)}
                                                            disabled={esMismoUsuario}
                                                            title={esMismoUsuario ? 'No puedes cambiar tu propio rol' : ''}
                                                            className="btn-action btn-role"
                                                            style={esMismoUsuario ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                                                        >
                                                            {u.rol === 'admin' ? 'Hacer Usuario' : 'Promover a Admin'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleEliminar(uid)}
                                                            disabled={esMismoUsuario}
                                                            title={esMismoUsuario ? 'Usa la opción de perfil para autoeliminarte' : ''}
                                                            className="btn-action btn-delete"
                                                            style={esMismoUsuario ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}