import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MichiCard, { INFO_CARTAS } from './michiCard';
import {
    obtenerPartida,
    jugarCarta,
    robarCarta,
    reinsertarBomba
} from './services/api';
import {
    conectarSocket,
    suscribirSalaSocket,
    desuscribirSalaSocket
} from './services/socket';

const TIPOS_GATO = ['CAT_1', 'CAT_2', 'CAT_3', 'CAT_4'];
const TIPOS_CON_OBJETIVO = ['FAVOR', ...TIPOS_GATO];

export default function GameBoard() {
    const { codigo } = useParams();
    const codigoNorm = (codigo || '').trim().toUpperCase();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [vista, setVista] = useState(null);
    const [loading, setLoading] = useState(true);
    const [accionEnCurso, setAccionEnCurso] = useState(false);
    const [error, setError] = useState('');
    const [cartasFuturo, setCartasFuturo] = useState([]);
    const [cartaPendienteObjetivo, setCartaPendienteObjetivo] = useState(null);
    const [posicionBomba, setPosicionBomba] = useState(0);

    const cargarPartida = useCallback(async (token) => {
        try {
            const data = await obtenerPartida(codigoNorm, token);
            setVista(data);
            setError('');
        } catch (err) {
            setError(err.message || 'No se pudo cargar la partida');
        } finally {
            setLoading(false);
        }
    }, [codigoNorm]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!storedUser || !token) {
            navigate('/login');
            return;
        }

        setUser(JSON.parse(storedUser));
        cargarPartida(token);

        const socket = conectarSocket(token);
        if (socket) {
            suscribirSalaSocket(codigoNorm);
        }

        const onGameState = (payload) => {
            if (payload?.vistaJugador?.codigoSala === codigoNorm) {
                setVista(payload.vistaJugador);
                setError('');
                if (payload.vistaJugador.estado !== 'WAITING_DEFUSE_INSERT') {
                    setPosicionBomba(0);
                }
            }
        };

        const onFutureCards = (payload) => {
            if (payload?.codigoSala === codigoNorm && Array.isArray(payload?.cartasFuturo)) {
                setCartasFuturo(payload.cartasFuturo);
            }
        };

        socket?.on('game:state', onGameState);
        socket?.on('game:future_cards', onFutureCards);

        return () => {
            socket?.off('game:state', onGameState);
            socket?.off('game:future_cards', onFutureCards);
            desuscribirSalaSocket(codigoNorm);
        };
    }, [codigoNorm, navigate, cargarPartida]);

    const currentUserId = String(user?.id || user?._id || '');
    const esMiTurno = Boolean(
        vista
        && vista.estado === 'PLAYING'
        && String(vista.turnoActualUserId) === currentUserId
    );
    const estoyDesactivando = Boolean(
        vista
        && vista.estado === 'WAITING_DEFUSE_INSERT'
        && String(vista.jugadorDesactivando) === currentUserId
    );

    const miJugador = vista?.jugadores?.find(j => String(j.userId) === currentUserId);
    const jugadorEnTurno = vista?.jugadores?.find(
        j => String(j.userId) === String(vista?.turnoActualUserId)
    );
    const rivales = vista?.jugadores?.filter(j => String(j.userId) !== currentUserId) || [];
    const rivalesConCartas = rivales.filter(j => j.vivo && j.numCartas > 0);

    const ejecutarJugarCarta = async (tipoCarta, objetivoUserId = null) => {
        const token = localStorage.getItem('token');
        setError('');
        setAccionEnCurso(true);
        try {
            const res = await jugarCarta(codigoNorm, tipoCarta, objetivoUserId, token);
            if (res?.vistaJugador) {
                setVista(res.vistaJugador);
            }
            if (res?.evento === 'VISION_FUTURO' && Array.isArray(res?.cartasFuturo)) {
                setCartasFuturo(res.cartasFuturo);
            }
            setCartaPendienteObjetivo(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setAccionEnCurso(false);
        }
    };

    const handlePulsarCarta = (tipo) => {
        if (!esMiTurno || accionEnCurso) return;
        if (tipo === 'DEFUSE' || tipo === 'BOMB') return;

        if (TIPOS_CON_OBJETIVO.includes(tipo)) {
            if (rivalesConCartas.length === 0) {
                setError('No hay ningún rival vivo con cartas para robar.');
                return;
            }
            if (rivalesConCartas.length === 1) {
                ejecutarJugarCarta(tipo, rivalesConCartas[0].userId);
                return;
            }
            setCartaPendienteObjetivo(tipo);
            return;
        }

        ejecutarJugarCarta(tipo, null);
    };

    const handleRobar = async () => {
        if (!esMiTurno || accionEnCurso) return;
        const token = localStorage.getItem('token');
        setError('');
        setCartasFuturo([]);
        setAccionEnCurso(true);
        try {
            const res = await robarCarta(codigoNorm, undefined, token);
            if (res?.vistaJugador) {
                setVista(res.vistaJugador);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setAccionEnCurso(false);
        }
    };

    const handleReinsertarBomba = async (indice) => {
        if (!estoyDesactivando || accionEnCurso) return;
        const token = localStorage.getItem('token');
        setError('');
        setAccionEnCurso(true);
        try {
            const res = await reinsertarBomba(codigoNorm, Number(indice), token);
            if (res?.vistaJugador) {
                setVista(res.vistaJugador);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setAccionEnCurso(false);
        }
    };

    const conteoCartas = (vista?.miMano || []).reduce((acc, tipo) => {
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="welcome-card" style={{ textAlign: 'center' }}>
                    Cargando mesa de Michis Explosivos...
                </div>
            </div>
        );
    }

    return (
        <div>
            <nav className="dashboard-nav">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="brand-badge">ME</div>
                    <div>
                        <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                            Michis Explosivos · Sala #{codigoNorm}
                        </h2>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {vista?.estado === 'FINISHED'
                                ? 'Partida finalizada'
                                : esMiTurno
                                    ? `¡Es tu turno! (${vista?.turnosPendientes || 1} pendiente${vista?.turnosPendientes > 1 ? 's' : ''})`
                                    : `Turno de ${jugadorEnTurno?.username || '...'}`}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {miJugador && (
                        <span className={`status-badge ${miJugador.vivo ? 'status-active' : 'status-eliminated'}`}>
                            {miJugador.vivo ? '● En juego' : '✕ Explotado'}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="btn-action"
                        style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0' }}
                    >
                        Volver al Lobby
                    </button>
                </div>
            </nav>

            <main className="dashboard-container">
                {error && (
                    <div className="alert alert-error">
                        <span>{error}</span>
                    </div>
                )}

                {vista?.estado === 'FINISHED' && (
                    <div className="game-banner game-banner-victory">
                        <div>
                            <h3>🏆 ¡{vista.ganadorUsername} ha ganado la partida!</h3>
                            <p>Los demás jugadores han explotado por un Michi Explosivo.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            className="btn-primary"
                            style={{ width: 'auto', marginTop: 0 }}
                        >
                            Volver al Lobby y Ranking
                        </button>
                    </div>
                )}

                {estoyDesactivando && (
                    <div className="game-banner game-banner-defuse">
                        <div style={{ flex: 1 }}>
                            <h3>🔫 ¡Desactivaste el Michi Explosivo con tu Puntero Láser!</h3>
                            <p>
                                Elige en qué índice del mazo (0 = siguiente carta en robarse, {vista.cartasRestantesMazo} = al fondo) quieres esconderlo:
                            </p>
                            <div className="defuse-controls">
                                <button
                                    type="button"
                                    disabled={accionEnCurso}
                                    onClick={() => handleReinsertarBomba(0)}
                                    className="btn-action btn-role"
                                >
                                    Arriba del todo (0)
                                </button>
                                <button
                                    type="button"
                                    disabled={accionEnCurso}
                                    onClick={() => handleReinsertarBomba(Math.floor(vista.cartasRestantesMazo / 2))}
                                    className="btn-action btn-role"
                                >
                                    En medio ({Math.floor(vista.cartasRestantesMazo / 2)})
                                </button>
                                <button
                                    type="button"
                                    disabled={accionEnCurso}
                                    onClick={() => handleReinsertarBomba(vista.cartasRestantesMazo)}
                                    className="btn-action btn-role"
                                >
                                    Al fondo ({vista.cartasRestantesMazo})
                                </button>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="number"
                                        min={0}
                                        max={vista.cartasRestantesMazo}
                                        value={posicionBomba}
                                        onChange={(e) => setPosicionBomba(e.target.value)}
                                        className="form-input"
                                        style={{ width: '80px', padding: '0.35rem 0.5rem' }}
                                    />
                                    <button
                                        type="button"
                                        disabled={accionEnCurso}
                                        onClick={() => handleReinsertarBomba(posicionBomba)}
                                        className="btn-primary"
                                        style={{ width: 'auto', marginTop: 0, padding: '0.45rem 0.85rem' }}
                                    >
                                        Confirmar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {vista?.estado === 'WAITING_DEFUSE_INSERT' && !estoyDesactivando && (
                    <div className="game-banner game-banner-info">
                        <span>⏳ {jugadorEnTurno?.username || 'Un jugador'} está escondiendo un Michi Explosivo en el mazo...</span>
                    </div>
                )}

                {cartasFuturo.length > 0 && (
                    <div className="game-banner game-banner-future">
                        <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <h3>🔮 Visión Felina — Próximas {cartasFuturo.length} cartas (izq. = siguiente en robar)</h3>
                                <button
                                    type="button"
                                    onClick={() => setCartasFuturo([])}
                                    className="btn-action"
                                    style={{ background: 'rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                                >
                                    Ocultar
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {cartasFuturo.map((tipo, i) => (
                                    <MichiCard key={`futuro-${i}-${tipo}`} tipo={tipo} compacta disabled badge={`#${i + 1}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {cartaPendienteObjetivo && (
                    <div className="game-banner game-banner-info">
                        <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <h3>🎯 Elige a qué rival robar 1 carta con {INFO_CARTAS[cartaPendienteObjetivo]?.nombre}</h3>
                                <button
                                    type="button"
                                    onClick={() => setCartaPendienteObjetivo(null)}
                                    className="btn-action btn-delete"
                                >
                                    Cancelar
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {rivalesConCartas.map(r => (
                                    <button
                                        key={r.userId}
                                        type="button"
                                        disabled={accionEnCurso}
                                        onClick={() => ejecutarJugarCarta(cartaPendienteObjetivo, r.userId)}
                                        className="btn-primary"
                                        style={{ width: 'auto', marginTop: 0 }}
                                    >
                                        Robar a {r.username} ({r.numCartas} cartas)
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {vista && (
                    <div className="game-layout">
                        <div className="game-main">
                            {/* Rivales */}
                            <section className="rivals-bar">
                                {rivales.map((rival) => {
                                    const turnoRival = vista.estado !== 'FINISHED'
                                        && String(vista.turnoActualUserId) === String(rival.userId);
                                    return (
                                        <div
                                            key={rival.userId}
                                            className={`rival-card ${turnoRival ? 'rival-card-active' : ''} ${!rival.vivo ? 'rival-card-dead' : ''}`}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                                <strong>{rival.username}</strong>
                                                <span className={`status-badge ${rival.vivo ? 'status-active' : 'status-eliminated'}`}>
                                                    {rival.vivo ? 'Vivo' : 'Explotó'}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                🃏 {rival.numCartas} {rival.numCartas === 1 ? 'carta' : 'cartas'}
                                            </span>
                                            {turnoRival && (
                                                <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700 }}>
                                                    ▶ En turno ({vista.turnosPendientes})
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </section>

                            {/* Mesa central: Mazo y Descartes */}
                            <section className="table-center">
                                <div className="deck-panel">
                                    <span className="deck-label">MAZO DE ROBO</span>
                                    <div className="deck-count">{vista.cartasRestantesMazo}</div>
                                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>cartas restantes</span>
                                    <span className="risk-pill">
                                        💣 Riesgo de bomba: <strong>{vista.riesgoBombaPorcentaje}%</strong>
                                    </span>
                                    <button
                                        type="button"
                                        disabled={!esMiTurno || accionEnCurso}
                                        onClick={handleRobar}
                                        className="btn-primary"
                                        style={{ marginTop: '0.75rem' }}
                                    >
                                        {accionEnCurso ? 'Procesando...' : esMiTurno ? 'Robar carta y terminar turno' : 'Esperando turno...'}
                                    </button>
                                </div>

                                <div className="discard-panel">
                                    <span className="deck-label">DESCARTES ({vista.descartes.length})</span>
                                    {vista.ultimaCartaDescartada ? (
                                        <MichiCard tipo={vista.ultimaCartaDescartada} compacta disabled />
                                    ) : (
                                        <div className="empty-discard">Pila vacía</div>
                                    )}
                                </div>
                            </section>

                            {/* Mano del jugador */}
                            <section className="hand-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                                    <h3>Tu mano ({vista.miMano.length} cartas)</h3>
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                        {esMiTurno
                                            ? 'Pulsa una carta para jugarla o roba del mazo para terminar tu turno.'
                                            : 'Espera a tu turno para jugar cartas.'}
                                    </span>
                                </div>

                                {vista.miMano.length === 0 ? (
                                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No tienes cartas en la mano.</p>
                                ) : (
                                    <div className="hand-container">
                                        {vista.miMano.map((tipo, idx) => {
                                            const esGato = TIPOS_GATO.includes(tipo);
                                            const copias = conteoCartas[tipo] || 0;
                                            const esJugable = esMiTurno
                                                && !accionEnCurso
                                                && tipo !== 'DEFUSE'
                                                && tipo !== 'BOMB'
                                                && (!esGato || copias >= 2);

                                            const badge = tipo === 'DEFUSE'
                                                ? 'Automática'
                                                : esGato && copias >= 2
                                                    ? 'Pareja lista'
                                                    : null;

                                            return (
                                                <MichiCard
                                                    key={`${tipo}-${idx}`}
                                                    tipo={tipo}
                                                    disabled={!esJugable}
                                                    badge={badge}
                                                    onClick={esJugable ? () => handlePulsarCarta(tipo) : undefined}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Registro lateral de acciones */}
                        <aside className="action-log">
                            <h3>Historial de jugadas</h3>
                            <ul>
                                {[...vista.historialAcciones].reverse().map((entrada, i) => (
                                    <li key={`log-${i}`}>{entrada}</li>
                                ))}
                            </ul>
                        </aside>
                    </div>
                )}
            </main>
        </div>
    );
}
