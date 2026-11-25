import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    obtenerUsuarios,
    cambiarRol,
    eliminarUsuario,
    crearSala,
    obtenerSalas,
    unirseSala,
    salirSala,
    iniciarPartida,
    obtenerRanking,
    obtenerSesionJuegoActiva
} from './services/api';
import {
    conectarSocket,
    desconectarSocket,
    suscribirSalaSocket,
    desuscribirSalaSocket
} from './services/socket';

export default function Dashboard() {
    const [user, setUser] = useState(null);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Estados del Lobby y Ranking (Michis Explosivos)
    const [salas, setSalas] = useState([]);
    const [salaActiva, setSalaActiva] = useState(null);
    const [partidaActivaCodigo, setPartidaActivaCodigo] = useState(null);
    const [ranking, setRanking] = useState([]);
    const [nombreSala, setNombreSala] = useState('');
    const [maxJugadores, setMaxJugadores] = useState(4);
    const [codigoUnirse, setCodigoUnirse] = useState('');
    const [lobbyError, setLobbyError] = useState('');
    const [lobbyLoading, setLobbyLoading] = useState(false);

    const salaActivaRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        salaActivaRef.current = salaActiva;
    }, [salaActiva]);

    const cargarLobbyYRanking = useCallback(async (token) => {
        const [salasRes, rankingRes, sesionRes] = await Promise.allSettled([
            obtenerSalas(token),
            obtenerRanking(token),
            obtenerSesionJuegoActiva(token)
        ]);

        if (salasRes.status === 'fulfilled' && Array.isArray(salasRes.value)) {
            setSalas(salasRes.value);
        }
        if (rankingRes.status === 'fulfilled' && Array.isArray(rankingRes.value)) {
            setRanking(rankingRes.value);
        }
        if (sesionRes.status === 'fulfilled' && sesionRes.value?.enCurso) {
            if (sesionRes.value.tipo === 'PARTIDA') {
                setPartidaActivaCodigo(sesionRes.value.codigoSala);
                setSalaActiva(null);
            } else if (sesionRes.value.tipo === 'SALA' && sesionRes.value.sala) {
                setSalaActiva(sesionRes.value.sala);
                setPartidaActivaCodigo(null);
                suscribirSalaSocket(sesionRes.value.sala.codigo);
            }
        }
    }, []);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!storedUser || !token) {
            navigate('/login');
            return;
        }

        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        const socket = conectarSocket(token);
        cargarLobbyYRanking(token);

        if (parsedUser.rol === 'admin') {
            cargarUsuarios(token);
        } else {
            setLoading(false);
        }

        const onRoomUpdated = (salaActualizada) => {
            if (!salaActualizada) return;
            setSalaActiva(salaActualizada);
            if (salaActualizada.estado === 'IN_PROGRESS') {
                navigate(`/partida/${salaActualizada.codigo}`);
            }
        };

        const onRoomDeleted = () => {
            setSalaActiva(null);
            obtenerSalas(token).then(setSalas).catch(() => {});
        };

        const onGameState = (payload) => {
            if (payload?.evento === 'PARTIDA_INICIADA' && payload?.vistaJugador?.codigoSala) {
                navigate(`/partida/${payload.vistaJugador.codigoSala}`);
            }
        };

        const onLobbyUpdated = (salasActualizadas) => {
            if (Array.isArray(salasActualizadas)) {
                setSalas(salasActualizadas);
            }
        };

        const onReconnect = () => {
            obtenerSalas(token).then(setSalas).catch(() => {});
            if (salaActivaRef.current?.codigo) {
                suscribirSalaSocket(salaActivaRef.current.codigo);
            }
        };

        socket?.on('room:updated', onRoomUpdated);
        socket?.on('room:deleted', onRoomDeleted);
        socket?.on('game:state', onGameState);
        socket?.on('lobby:updated', onLobbyUpdated);
        socket?.on('connect', onReconnect);

        return () => {
            socket?.off('room:updated', onRoomUpdated);
            socket?.off('room:deleted', onRoomDeleted);
            socket?.off('game:state', onGameState);
            socket?.off('lobby:updated', onLobbyUpdated);
            socket?.off('connect', onReconnect);
        };
    }, [navigate, cargarLobbyYRanking]);

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
        desconectarSocket();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleCrearSala = async (e) => {
        e.preventDefault();
        setLobbyError('');
        setLobbyLoading(true);
        const token = localStorage.getItem('token');
        try {
            const sala = await crearSala(nombreSala, Number(maxJugadores), token);
            setSalaActiva(sala);
            setNombreSala('');
            suscribirSalaSocket(sala.codigo);
        } catch (err) {
            setLobbyError(err.message);
        } finally {
            setLobbyLoading(false);
        }
    };

    const handleUnirseSala = async (codigo) => {
        const codigoLimpio = String(codigo || '').trim().toUpperCase();
        if (!codigoLimpio) {
            setLobbyError('Introduce el código de la sala.');
            return;
        }
        setLobbyError('');
        setLobbyLoading(true);
        const token = localStorage.getItem('token');
        try {
            const sala = await unirseSala(codigoLimpio, token);
            setSalaActiva(sala);
            setCodigoUnirse('');
            suscribirSalaSocket(sala.codigo);
        } catch (err) {
            setLobbyError(err.message);
        } finally {
            setLobbyLoading(false);
        }
    };

    const handleSalirSala = async () => {
        if (!salaActiva) return;
        setLobbyError('');
        setLobbyLoading(true);
        const token = localStorage.getItem('token');
        const codigo = salaActiva.codigo;
        try {
            await salirSala(codigo, token);
            desuscribirSalaSocket(codigo);
            setSalaActiva(null);
            const lista = await obtenerSalas(token);
            setSalas(lista);
        } catch (err) {
            setLobbyError(err.message);
        } finally {
            setLobbyLoading(false);
        }
    };

    const handleIniciarPartida = async () => {
        if (!salaActiva) return;
        setLobbyError('');
        setLobbyLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await iniciarPartida(salaActiva.codigo, token);
            navigate(`/partida/${res.codigo || salaActiva.codigo}`);
        } catch (err) {
            setLobbyError(err.message);
        } finally {
            setLobbyLoading(false);
        }
    };

    const currentUserId = String(user?.id || user?._id || '');
    const esHostSalaActiva = Boolean(salaActiva && String(salaActiva.hostId) === currentUserId);

    return (
        <div>
            <nav className="dashboard-nav">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="brand-badge">PIS</div>
                    <div>
                        <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Michis Explosivos</h2>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Plataforma SaaS · Lobby</span>
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
                        Crea una sala o únete con amigos para jugar online a Michis Explosivos (2 a 4 jugadores).
                    </p>

                    {user?.rol !== 'admin' && (
                        <div style={{ marginTop: '1.25rem' }}>
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

                {partidaActivaCodigo && (
                    <div className="game-banner game-banner-info" style={{ marginBottom: '1.5rem' }}>
                        <div>
                            <h3>⚡ Tienes una partida en curso (Sala #{partidaActivaCodigo})</h3>
                            <p>Pulsa para volver directamente a tu mesa.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate(`/partida/${partidaActivaCodigo}`)}
                            className="btn-primary"
                            style={{ width: 'auto', marginTop: 0 }}
                        >
                            ⚡ Reconectar a la partida #{partidaActivaCodigo}
                        </button>
                    </div>
                )}

                {lobbyError && (
                    <div className="alert alert-error">
                        <span>{lobbyError}</span>
                    </div>
                )}

                {/* Lobby de Salas */}
                <section className="data-table-container" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Lobby — Michis Explosivos (2 a 4 jugadores)</h3>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                Salas en tiempo real sincronizadas automáticamente con Socket.IO
                            </p>
                        </div>
                    </div>

                    {salaActiva ? (
                        <div className="room-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <span className="role-badge role-admin">SALA EN ESPERA</span>
                                    <h4 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.5rem' }}>
                                        {salaActiva.nombre} · Código: <span style={{ color: '#818cf8' }}>#{salaActiva.codigo}</span>
                                    </h4>
                                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                        Jugadores unidos ({salaActiva.jugadores.length} / {salaActiva.maxJugadores}) — Se necesitan mínimo 2 jugadores para empezar.
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    {esHostSalaActiva && (
                                        <button
                                            type="button"
                                            disabled={lobbyLoading || salaActiva.jugadores.length < 2}
                                            onClick={handleIniciarPartida}
                                            className="btn-primary"
                                            style={{ width: 'auto', marginTop: 0 }}
                                        >
                                            🚀 Iniciar Partida
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        disabled={lobbyLoading}
                                        onClick={handleSalirSala}
                                        className="btn-action btn-delete"
                                        style={{ padding: '0.65rem 1rem' }}
                                    >
                                        Salir de la sala
                                    </button>
                                </div>
                            </div>

                            <div className="room-players-grid">
                                {salaActiva.jugadores.map((j) => (
                                    <div key={j.userId} className="room-player-chip">
                                        <strong>{j.username}</strong>
                                        {String(j.userId) === String(salaActiva.hostId) && (
                                            <span style={{ fontSize: '0.7rem', color: '#fcd34d', marginLeft: '0.4rem' }}>★ Anfitrión</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="lobby-grid">
                            <form onSubmit={handleCrearSala} className="room-card">
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.85rem' }}>Crear nueva sala</h4>
                                <div className="form-group">
                                    <label className="form-label">Nombre de la sala</label>
                                    <input
                                        type="text"
                                        required
                                        minLength={3}
                                        maxLength={40}
                                        placeholder="Mesa Gatuna"
                                        value={nombreSala}
                                        onChange={(e) => setNombreSala(e.target.value)}
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Máximo de jugadores</label>
                                    <select
                                        value={maxJugadores}
                                        onChange={(e) => setMaxJugadores(Number(e.target.value))}
                                        className="form-input"
                                    >
                                        <option value={2}>2 jugadores</option>
                                        <option value={3}>3 jugadores</option>
                                        <option value={4}>4 jugadores</option>
                                    </select>
                                </div>
                                <button type="submit" disabled={lobbyLoading} className="btn-primary">
                                    {lobbyLoading ? 'Creando...' : 'Crear sala'}
                                </button>
                            </form>

                            <div className="room-card">
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.85rem' }}>Unirse por código o lista</h4>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleUnirseSala(codigoUnirse);
                                    }}
                                    style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
                                >
                                    <input
                                        type="text"
                                        placeholder="Código (ej. A7K9P2)"
                                        value={codigoUnirse}
                                        onChange={(e) => setCodigoUnirse(e.target.value.toUpperCase())}
                                        className="form-input"
                                    />
                                    <button
                                        type="submit"
                                        disabled={lobbyLoading}
                                        className="btn-primary"
                                        style={{ width: 'auto', marginTop: 0, whiteSpace: 'nowrap' }}
                                    >
                                        Unirse
                                    </button>
                                </form>

                                {salas.length === 0 ? (
                                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                        No hay salas abiertas en este momento. ¡Crea la primera!
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        {salas.map((s) => (
                                            <div key={s.codigo} className="room-list-item">
                                                <div>
                                                    <strong>{s.nombre}</strong> <span style={{ color: '#818cf8' }}>#{s.codigo}</span>
                                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                                        Anfitrión: {s.hostUsername} · {s.jugadores.length}/{s.maxJugadores} jugadores
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={lobbyLoading || s.jugadores.length >= s.maxJugadores}
                                                    onClick={() => handleUnirseSala(s.codigo)}
                                                    className="btn-action btn-role"
                                                >
                                                    {s.jugadores.length >= s.maxJugadores ? 'Llena' : 'Unirse'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                {/* Ranking de Jugadores */}
                <section className="data-table-container" style={{ marginBottom: '2rem' }}>
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>🏆 Ranking de Jugadores</h3>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                            Clasificación ordenada por victorias en Michis Explosivos
                        </p>
                    </div>
                    {ranking.length === 0 ? (
                        <div style={{ padding: '1.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                            Todavía no hay estadísticas registradas.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Jugador</th>
                                        <th>Victorias</th>
                                        <th>Partidas jugadas</th>
                                        <th>% Victoria</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ranking.map((r, idx) => (
                                        <tr key={r.userId}>
                                            <td style={{ fontWeight: 700, color: idx === 0 ? '#fcd34d' : '#cbd5e1' }}>{idx + 1}</td>
                                            <td style={{ fontWeight: 600 }}>{r.username}</td>
                                            <td>{r.partidasGanadas}</td>
                                            <td>{r.partidasJugadas}</td>
                                            <td>{r.porcentajeVictorias}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

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
