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

        // Si es admin, cargar la lista de todos los usuarios
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
        const token = localStorage.getItem('token');
        const nuevoRol = rolActual === 'admin' ? 'user' : 'admin';
        try {
            await cambiarRol(id, nuevoRol, token);
            setUsuarios(usuarios.map(u => u._id === id ? { ...u, rol: nuevoRol } : u));
        } catch (err) {
            alert(err.message);
        }
    };

    const handleEliminar = async (id) => {
        if (!window.confirm('¿Seguro que deseas eliminar este usuario?')) return;
        const token = localStorage.getItem('token');
        try {
            await eliminarUsuario(id, token);
            setUsuarios(usuarios.filter(u => u._id !== id));
        } catch (err) {
            alert(err.message);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            {/* Navbar */}
            <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
                        PIS
                    </div>
                    <div>
                        <h2 className="font-bold text-base text-white leading-tight">Proyecto PIS</h2>
                        <span className="text-xs text-slate-400">Panel de Control</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-white">{user?.username || user?.email}</p>
                        <span className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            user?.rol === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}>
                            {user?.rol === 'admin' ? 'Administrador' : 'Usuario'}
                        </span>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/40 rounded-xl text-sm font-medium transition flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="hidden sm:inline">Cerrar Sesión</span>
                    </button>
                </div>
            </nav>

            {/* Contenido Principal */}
            <main className="max-w-6xl mx-auto p-6 space-y-8">
                {/* Banner de Bienvenida */}
                <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/20 rounded-3xl p-8 shadow-xl">
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Dashboard General</span>
                    <h1 className="text-3xl font-extrabold text-white mt-1">¡Hola, {user?.username || user?.email}! 👋</h1>
                    <p className="text-slate-400 text-sm mt-2 max-w-xl">
                        Has iniciado sesión satisfactoriamente en la plataforma. Tu cuenta está verificada y activa.
                    </p>
                </div>

                {/* Sección de Administrador */}
                {user?.rol === 'admin' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Gestión de Usuarios del Sistema
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Control de roles, activaciones y eliminación de usuarios
                                </p>
                            </div>
                            <span className="text-xs font-semibold bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700">
                                Total: {usuarios.length} cuentas
                            </span>
                        </div>

                        {error && <div className="p-4 text-red-400 text-sm bg-red-500/10 border-b border-red-500/20">{error}</div>}

                        {loading ? (
                            <div className="p-8 text-center text-slate-400 text-sm">Cargando usuarios...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4">Usuario</th>
                                            <th className="px-6 py-4">Correo</th>
                                            <th className="px-6 py-4">Estado</th>
                                            <th className="px-6 py-4">Rol</th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {usuarios.map((u) => (
                                            <tr key={u._id} className="hover:bg-slate-800/40 transition">
                                                <td className="px-6 py-4 font-semibold text-white">
                                                    {u.username || 'Sin nombre'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-300">
                                                    {u.email}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {u.confirmado ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                            Activo
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                                            Pendiente
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg ${
                                                        u.rol === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                                                    }`}>
                                                        {u.rol}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    {/* Botón para cambiar rol */}
                                                    <button
                                                        onClick={() => handleToggleRol(u._id, u.rol)}
                                                        disabled={u._id === user?.id}
                                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                                                            u.rol === 'admin'
                                                                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                                                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                                                    >
                                                        {u.rol === 'admin' ? 'Hacer Usuario' : 'Promover a Admin'}
                                                    </button>

                                                    {/* Botón para eliminar */}
                                                    <button
                                                        onClick={() => handleEliminar(u._id)}
                                                        disabled={u._id === user?.id}
                                                        className="px-3 py-1.5 text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
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