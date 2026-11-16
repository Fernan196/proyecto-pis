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
    const [mostrarModalFinal, setMostrarModalFinal] = useState(false);
    const [mostrarModalReglas, setMostrarModalReglas] = useState(false);

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

    useEffect(() => {
        if (vista?.estado === 'FINISHED') {
            setMostrarModalFinal(true);
        } else {
            setMostrarModalFinal(false);
        }
    }, [vista?.estado]);

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

    const maxIndiceMazo = Math.max(0, vista?.cartasRestantesMazo || 0);
    const posicionBombaSegura = Math.min(Math.max(0, Number(posicionBomba) || 0), maxIndiceMazo);
    const soyGanador = Boolean(
        vista?.estado === 'FINISHED' && String(vista?.ganadorUserId) === currentUserId
    );

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

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {miJugador && (
                        <span className={`status-badge ${miJugador.vivo ? 'status-active' : 'status-eliminated'}`}>
                            {miJugador.vivo ? '● En juego' : '✕ Explotado'}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => setMostrarModalReglas(true)}
                        className="btn-action"
                        style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#c7d2fe', border: '1px solid rgba(99, 102, 241, 0.35)' }}
                    >
                        📖 Reglas y Cartas
                    </button>
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
                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={() => setMostrarModalFinal(true)}
                                className="btn-action"
                                style={{ background: 'rgba(255,255,255,0.12)', color: '#f8fafc', padding: '0.55rem 0.9rem' }}
                            >
                                Ver resumen
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard')}
                                className="btn-primary"
                                style={{ width: 'auto', marginTop: 0 }}
                            >
                                Volver al Lobby y Ranking
                            </button>
                        </div>
                    </div>
                )}

                {vista?.estado === 'WAITING_DEFUSE_INSERT' && !estoyDesactivando && (
                    <div className="game-banner game-banner-info">
                        <span>⏳ {jugadorEnTurno?.username || 'Un jugador'} está escondiendo un Michi Explosivo en el mazo...</span>
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

            {/* Modal 1: Reinserción secreta del Michi Explosivo (DEFUSE) */}
            {estoyDesactivando && (
                <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Esconder Michi Explosivo">
                    <div className="modal-card modal-card-defuse">
                        <div className="modal-header">
                            <div>
                                <span className="deck-label" style={{ color: '#6ee7b7' }}>PUNTERO LÁSER ACTIVADO</span>
                                <h3>🔫 ¡Desactivaste el Michi Explosivo!</h3>
                            </div>
                        </div>

                        <div className="modal-intro-row">
                            <MichiCard tipo="BOMB" compacta disabled />
                            <div style={{ flex: 1 }}>
                                <p className="modal-subtitle">
                                    Elige en secreto dónde volver a esconder el <strong>Michi Explosivo</strong> dentro del mazo ({maxIndiceMazo} {maxIndiceMazo === 1 ? 'carta actual' : 'cartas actuales'}).
                                </p>
                                <p className="modal-hint">
                                    Índice <strong>0</strong> = próxima carta en robarse · Índice <strong>{maxIndiceMazo}</strong> = al fondo del mazo.
                                </p>
                            </div>
                        </div>

                        <div className="defuse-slider-box">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Posición elegida en el mazo:</span>
                                <span className="status-badge status-active">
                                    Índice #{posicionBombaSegura} / {maxIndiceMazo}
                                </span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={maxIndiceMazo}
                                value={posicionBombaSegura}
                                onChange={(e) => setPosicionBomba(Number(e.target.value))}
                                className="range-slider"
                                disabled={accionEnCurso}
                            />
                            <div className="defuse-controls" style={{ marginTop: '0.75rem' }}>
                                <button
                                    type="button"
                                    disabled={accionEnCurso}
                                    onClick={() => setPosicionBomba(0)}
                                    className="btn-action btn-role"
                                >
                                    Arriba (0)
                                </button>
                                <button
                                    type="button"
                                    disabled={accionEnCurso}
                                    onClick={() => setPosicionBomba(Math.floor(maxIndiceMazo / 2))}
                                    className="btn-action btn-role"
                                >
                                    Mitad ({Math.floor(maxIndiceMazo / 2)})
                                </button>
                                <button
                                    type="button"
                                    disabled={accionEnCurso}
                                    onClick={() => setPosicionBomba(maxIndiceMazo)}
                                    className="btn-action btn-role"
                                >
                                    Fondo ({maxIndiceMazo})
                                </button>
                                <button
                                    type="button"
                                    disabled={accionEnCurso}
                                    onClick={() => setPosicionBomba(Math.floor(Math.random() * (maxIndiceMazo + 1)))}
                                    className="btn-action"
                                    style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#e9d5ff' }}
                                >
                                    🎲 Aleatorio
                                </button>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                disabled={accionEnCurso}
                                onClick={() => handleReinsertarBomba(posicionBombaSegura)}
                                className="btn-primary"
                                style={{ width: 'auto', marginTop: 0 }}
                            >
                                {accionEnCurso ? 'Guardando...' : `Confirmar en posición #${posicionBombaSegura}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 2: Visión Felina (SEE_FUTURE) */}
            {cartasFuturo.length > 0 && (
                <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Visión Felina" onClick={() => setCartasFuturo([])}>
                    <div className="modal-card modal-card-future" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <span className="deck-label" style={{ color: '#d8b4fe' }}>VISIÓN PRIVADA</span>
                                <h3>🔮 Visión Felina — Próximas {cartasFuturo.length} cartas</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCartasFuturo([])}
                                className="modal-close-btn"
                                aria-label="Cerrar visión del futuro"
                            >
                                ✕
                            </button>
                        </div>
                        <p className="modal-subtitle">
                            Orden exacto del mazo sin modificarlo: la carta <strong>#1</strong> será la siguiente en robarse.
                        </p>
                        <div className="modal-cards-row">
                            {cartasFuturo.map((tipo, i) => (
                                <MichiCard key={`futuro-modal-${i}-${tipo}`} tipo={tipo} disabled badge={`#${i + 1}`} />
                            ))}
                        </div>
                        <div className="modal-actions">
                            <button
                                type="button"
                                onClick={() => setCartasFuturo([])}
                                className="btn-primary"
                                style={{ width: 'auto', marginTop: 0 }}
                            >
                                Entendido, cerrar visión
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 3: Selección de rival objetivo (FAVOR o pareja de gatos) */}
            {cartaPendienteObjetivo && (
                <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Seleccionar rival" onClick={() => setCartaPendienteObjetivo(null)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <span className="deck-label" style={{ color: '#f9a8d4' }}>ROBO DE CARTA</span>
                                <h3>🎯 Elige a qué rival robar 1 carta</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCartaPendienteObjetivo(null)}
                                className="modal-close-btn"
                                aria-label="Cancelar robo"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="modal-intro-row">
                            <MichiCard tipo={cartaPendienteObjetivo} compacta disabled />
                            <div style={{ flex: 1 }}>
                                <p className="modal-subtitle">
                                    Vas a jugar <strong>{INFO_CARTAS[cartaPendienteObjetivo]?.nombre}</strong>.
                                </p>
                                <p className="modal-hint">
                                    El rival perderá una carta aleatoria de su mano y pasará directamente a la tuya.
                                </p>
                            </div>
                        </div>

                        <div className="target-grid">
                            {rivalesConCartas.map(r => (
                                <button
                                    key={r.userId}
                                    type="button"
                                    disabled={accionEnCurso}
                                    onClick={() => ejecutarJugarCarta(cartaPendienteObjetivo, r.userId)}
                                    className="target-option-btn"
                                >
                                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.username}</span>
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                        🃏 {r.numCartas} {r.numCartas === 1 ? 'carta en mano' : 'cartas en mano'}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                onClick={() => setCartaPendienteObjetivo(null)}
                                className="btn-action"
                                style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', padding: '0.55rem 1rem' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 4: Fin de partida y victoria */}
            {vista?.estado === 'FINISHED' && mostrarModalFinal && (
                <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Fin de la partida" onClick={() => setMostrarModalFinal(false)}>
                    <div className="modal-card modal-card-victory" onClick={(e) => e.stopPropagation()}>
                        <div className="victory-trophy">🏆</div>
                        <h3 style={{ textAlign: 'center', fontSize: '1.35rem', marginBottom: '0.4rem' }}>
                            {soyGanador ? '¡Has ganado la partida!' : `¡${vista.ganadorUsername} se lleva la victoria!`}
                        </h3>
                        <p className="modal-subtitle" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                            {soyGanador
                                ? 'Sobreviviste a todos los Michis Explosivos y sumaste +1 victoria al ranking.'
                                : 'Todos los demás jugadores han quedado eliminados. Tus estadísticas se han actualizado en el ranking.'}
                        </p>

                        <div className="modal-summary-strip">
                            <div>
                                <span className="deck-label">SALA</span>
                                <strong>#{codigoNorm}</strong>
                            </div>
                            <div>
                                <span className="deck-label">GANADOR</span>
                                <strong>{vista.ganadorUsername}</strong>
                            </div>
                            <div>
                                <span className="deck-label">JUGADORES</span>
                                <strong>{vista.jugadores?.length || 0}</strong>
                            </div>
                        </div>

                        <div className="modal-actions" style={{ justifyContent: 'center' }}>
                            <button
                                type="button"
                                onClick={() => setMostrarModalFinal(false)}
                                className="btn-action"
                                style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', padding: '0.6rem 1.1rem' }}
                            >
                                Ver tablero final
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard')}
                                className="btn-primary"
                                style={{ width: 'auto', marginTop: 0 }}
                            >
                                Volver al Lobby y Ranking
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 5: Reglas y galería de cartas */}
            {mostrarModalReglas && (
                <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Reglas y Catálogo de Cartas" onClick={() => setMostrarModalReglas(false)}>
                    <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <span className="deck-label" style={{ color: '#a5b4fc' }}>GUÍA RÁPIDA</span>
                                <h3>📖 Reglas y Cartas — Michis Explosivos</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMostrarModalReglas(false)}
                                className="modal-close-btn"
                                aria-label="Cerrar guía de reglas"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="rules-summary-box">
                            <p>
                                <strong>1. Tu turno:</strong> Juega todas las cartas de acción (o parejas de gatos iguales) que quieras para manipular el mazo o robar a tus rivales.
                            </p>
                            <p>
                                <strong>2. Fin de turno:</strong> Pulsa <em>Robar carta y terminar turno</em> (salvo que juegues Salto Gatuno o Emboscada Felina). Si robas un <strong>Michi Explosivo</strong> sin Puntero Láser, explotas.
                            </p>
                            <p>
                                <strong>3. Victoria:</strong> El último jugador que quede vivo en la sala gana la partida.
                            </p>
                        </div>

                        <div className="rules-cards-grid">
                            {Object.keys(INFO_CARTAS).map((tipo) => (
                                <MichiCard key={`regla-${tipo}`} tipo={tipo} compacta disabled />
                            ))}
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                onClick={() => setMostrarModalReglas(false)}
                                className="btn-primary"
                                style={{ width: 'auto', marginTop: 0 }}
                            >
                                Cerrar guía
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
